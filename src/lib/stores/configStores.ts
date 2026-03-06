/**
 * Zustand Config Stores
 * Replaces Redux chargeTemplatesSlice, permissionsSlice, and kycConfigSlice.
 * Uses zustand/middleware persist for localStorage syncing — no manual middleware needed.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChargeTemplate, KycFieldConfig } from '@/lib/types';
import type { RolePermissions } from '@/lib/permissions';

// ─── Charge Templates Store ───────────────────────────────────────────────────

interface ChargeTemplatesState {
    templates: ChargeTemplate[];
    setTemplates: (templates: ChargeTemplate[]) => void;
    addTemplate: (t: Omit<ChargeTemplate, 'id'>) => void;
    updateTemplate: (t: ChargeTemplate) => void;
    deleteTemplate: (id: string) => void;
}

export const useChargeTemplatesStore = create<ChargeTemplatesState>()(
    persist(
        (set) => ({
            templates: [],
            setTemplates: (templates) => set({ templates }),
            addTemplate: (t) =>
                set((s) => ({
                    templates: [
                        ...s.templates,
                        { ...t, id: `ct-${Date.now()}` },
                    ],
                })),
            updateTemplate: (t) =>
                set((s) => ({
                    templates: s.templates.map((x) => (x.id === t.id ? t : x)),
                })),
            deleteTemplate: (id) =>
                set((s) => ({
                    templates: s.templates.filter((x) => x.id !== id),
                })),
        }),
        {
            name: 'chargeTemplates',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ─── Permissions Store ────────────────────────────────────────────────────────

export type { RolePermissions };

interface PermissionsState {
    featurePermissions: RolePermissions | null;
    setPermissions: (perms: RolePermissions) => void;
    updatePermissions: (perms: RolePermissions) => void;
}

export const usePermissionsStore = create<PermissionsState>()(
    persist(
        (set) => ({
            featurePermissions: null,
            setPermissions: (perms) => set({ featurePermissions: perms }),
            updatePermissions: (perms) => set({ featurePermissions: perms }),
        }),
        {
            name: 'permissions',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ─── KYC Config Store ─────────────────────────────────────────────────────────

interface KycConfigState {
    kycConfigs: Record<string, KycFieldConfig[]>;
    saveKycConfig: (pgId: string, config: KycFieldConfig[]) => void;
}

export const useKycConfigStore = create<KycConfigState>()(
    persist(
        (set) => ({
            kycConfigs: {},
            saveKycConfig: (pgId, config) =>
                set((s) => ({
                    kycConfigs: { ...s.kycConfigs, [pgId]: config },
                })),
        }),
        {
            name: 'kycConfig',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
