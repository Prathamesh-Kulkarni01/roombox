/**
 * RTK Query API Slice
 * Single source of truth for all server data fetching.
 * Backed by the shared /api/* routes that support BYODB.
 * Provides automatic caching, tag-based invalidation, and auto-refetch.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { PG, Guest, Complaint, Expense, Staff } from '@/lib/types';

// ─── Response Types ────────────────────────────────────────────────────────────

export interface PropertyResponse {
    success: boolean;
    buildings?: PG[];
    stats?: any;
    error?: string;
}

export interface TenantResponse {
    success: boolean;
    tenants?: Guest[];
    summary?: { expected: number; collected: number; pending: number };
    error?: string;
}

export interface RentSummaryResponse {
    success: boolean;
    summary?: { expected: number; collected: number; pending: number };
    pendingTenants?: Guest[];
    error?: string;
}

export interface PaymentResponse {
    success: boolean;
    ledgerEntry?: any;
    newBalance?: number;
    newStatus?: string;
    error?: string;
}

export interface GuestsResponse {
    success: boolean;
    guests?: Guest[];
    error?: string;
}

export interface ComplaintsResponse {
    success: boolean;
    complaints?: Complaint[];
    error?: string;
}

export interface ExpensesResponse {
    success: boolean;
    expenses?: Expense[];
    error?: string;
}

export interface StaffResponse {
    success: boolean;
    staff?: Staff[];
    error?: string;
}


import { auth as clientAuth } from '@/lib/firebase';

// ─── API Slice ─────────────────────────────────────────────────────────────────

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: '/',
        prepareHeaders: async (headers) => {
            if (clientAuth) {
                const token = await clientAuth.currentUser?.getIdToken();
                if (token) {
                    headers.set('Authorization', `Bearer ${token}`);
                }
            }
            return headers;
        },
    }),
    tagTypes: ['Properties', 'Tenants', 'Rent', 'Guests', 'Complaints', 'Expenses', 'Staff'],
    endpoints: (builder) => ({

        // ─── Properties ────────────────────────────────────────────────
        getProperties: builder.query<PropertyResponse, void>({
            query: () => `api/properties`,
            providesTags: ['Properties'],
        }),

        createProperty: builder.mutation<{ success: boolean; pg: PG }, {
            name: string;
            location: string;
            city: string;
            gender: 'boys' | 'girls' | 'unisex';
            autoSetup?: boolean;
            floorCount?: number;
            roomsPerFloor?: number;
        }>({
            query: (body) => ({ url: 'api/properties', method: 'POST', body }),
            invalidatesTags: ['Properties'],
        }),

        deleteProperty: builder.mutation<{ success: boolean }, { pgId: string }>({
            query: ({ pgId }) => ({
                url: `api/properties?pgId=${pgId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Properties'],
        }),

        updateProperty: builder.mutation<{ success: boolean; pg: PG }, {
            pgId: string;
            updates: Partial<PG>;
        }>({
            query: (body) => ({ url: 'api/properties', method: 'PATCH', body }),
            async onQueryStarted({ pgId, updates }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    api.util.updateQueryData('getProperties', undefined, (draft) => {
                        const pg = draft.buildings?.find((p) => p.id === pgId);
                        if (pg) {
                            Object.assign(pg, updates);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ['Properties'],
        }),

        // ─── Tenants (via /api/tenants) ─────────────────────────────────
        getTenants: builder.query<TenantResponse, { status?: string; limit?: number } | void>({
            query: (params) => {
                let url = `api/tenants`;
                if (params?.status) url += `?status=${params.status}`;
                if (params?.limit) url += (params.status ? '&' : '?') + `limit=${params.limit}`;
                return url;
            },
            providesTags: ['Tenants'],
        }),

        getRentSummary: builder.query<TenantResponse, void>({
            query: () => `api/tenants?summary=true`,
            providesTags: ['Rent'],
        }),

        createTenant: builder.mutation<{ success: boolean; guest: Guest }, {
            guestData: Partial<Guest>;
        }>({
            query: (body) => ({ url: 'api/tenants', method: 'POST', body }),
            invalidatesTags: ['Tenants', 'Properties', 'Guests'],
        }),

        // ─── Guests (via /api/guests — full client-side data) ───────────
        getGuests: builder.query<GuestsResponse, { pgId?: string; vacated?: boolean } | void>({
            query: (params) => {
                let url = `api/guests`;
                if (params?.pgId) url += `${url.includes('?') ? '&' : '?'}pgId=${params.pgId}`;
                if (params?.vacated !== undefined) url += `${url.includes('?') ? '&' : '?'}vacated=${params.vacated}`;
                return url;
            },
            providesTags: ['Guests'],
        }),

        updateGuest: builder.mutation<{ success: boolean; guest: Guest }, {
            guestId: string;
            updates: Partial<Guest>;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'update' } }),
            async onQueryStarted({ guestId, updates }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    api.util.updateQueryData('getGuests', undefined, (draft) => {
                        const guest = draft.guests?.find((g) => g.id === guestId);
                        if (guest) {
                            Object.assign(guest, updates);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ['Guests', 'Tenants'],
        }),

        transferGuest: builder.mutation<{ success: boolean; guest: Guest }, {
            guestId: string;
            newPgId: string;
            newBedId: string;
            newRoomId: string;
            newRoomName: string;
            newRentAmount?: number;
            newDepositAmount?: number;
            shouldProrate?: boolean;
            prorationAmount?: number;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'transfer' } }),
            invalidatesTags: ['Guests', 'Properties'],
        }),

        addGuest: builder.mutation<{ success: boolean; guest: Guest }, any>({
            query: (body) => ({ url: 'api/guests', method: 'POST', body }),
            async onQueryStarted({ bedId, pgId, name }, { dispatch, queryFulfilled }) {
                // Optimistic update for Properties (mark bed as occupied with a temporary guest state)
                if (bedId && pgId) {
                    const propertyPatch = dispatch(
                        api.util.updateQueryData('getProperties', undefined, (draft) => {
                            const pg = draft.buildings?.find(p => p.id === pgId);
                            if (pg) {
                                pg.floors?.forEach(floor => {
                                    floor.rooms.forEach(room => {
                                        const bed = room.beds.find(b => b.id === bedId);
                                        if (bed) {
                                            bed.guestId = 'temp-id-while-loading';
                                        }
                                    });
                                });
                            }
                        })
                    );
                    try {
                        await queryFulfilled;
                    } catch {
                        propertyPatch.undo();
                    }
                }
            },
            invalidatesTags: ['Guests', 'Tenants', 'Properties'],
        }),

        initiateGuestExit: builder.mutation<{ success: boolean; exitDate: string }, {
            guestId: string;
            noticePeriodDays?: number;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'initiate-exit' } }),
            invalidatesTags: ['Guests'],
        }),

        vacateGuest: builder.mutation<{ success: boolean; guestId: string; pgId: string }, {
            guestId: string;
            sendWhatsApp?: boolean;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'vacate' } }),
            async onQueryStarted({ guestId }, { dispatch, queryFulfilled }) {
                // Optimistic update for Guests list
                const guestPatch = dispatch(
                    api.util.updateQueryData('getGuests', undefined, (draft) => {
                        const guest = draft.guests?.find((g) => g.id === guestId);
                        if (guest) {
                            guest.isVacated = true;
                        }
                    })
                );

                // Optimistic update for Properties (clear bed)
                const propertyPatch = dispatch(
                    api.util.updateQueryData('getProperties', undefined, (draft) => {
                        draft.buildings?.forEach(pg => {
                            pg.floors?.forEach(floor => {
                                floor.rooms.forEach(room => {
                                    const bed = room.beds.find(b => b.guestId === guestId);
                                    if (bed) {
                                        bed.guestId = null;
                                        pg.totalBeds = (pg.totalBeds || 0); // Keep count as is or adjust
                                    }
                                });
                            });
                        });
                    })
                );

                try {
                    await queryFulfilled;
                } catch {
                    guestPatch.undo();
                    propertyPatch.undo();
                }
            },
            invalidatesTags: ['Guests', 'Tenants', 'Properties'],
        }),

        updateKycStatus: builder.mutation<{ success: boolean; kycStatus: string }, {
            guestId: string;
            status: 'verified' | 'rejected';
            reason?: string;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'kyc-status' } }),
            invalidatesTags: ['Guests'],
        }),

        submitKycDocuments: builder.mutation<{ success: boolean; kycStatus: string }, {
            guestId: string;
            documents: any[];
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'kyc-submit' } }),
            invalidatesTags: ['Guests'],
        }),

        resetKyc: builder.mutation<{ success: boolean; kycStatus: string }, {
            guestId: string;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'kyc-reset' } }),
            invalidatesTags: ['Guests'],
        }),

        addGuestCharge: builder.mutation<{ success: boolean; charge: any }, {
            guestId: string;
            description: string;
            amount: number;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'add-charge' } }),
            invalidatesTags: ['Guests', 'Tenants'],
        }),

        removeGuestCharge: builder.mutation<{ success: boolean; guestId: string; chargeId: string }, {
            guestId: string;
            chargeId: string;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'remove-charge' } }),
            invalidatesTags: ['Guests', 'Tenants'],
        }),

        addSharedRoomCharge: builder.mutation<{ success: boolean; updatedCount: number }, {
            roomId: string;
            description: string;
            amount: number;
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'shared-charge' } }),
            invalidatesTags: ['Guests', 'Tenants'],
        }),

        recordGuestPayment: builder.mutation<{ success: boolean; guest: Guest }, {
            guest: Guest;
            amount: number;
            amountType?: 'numeric' | 'symbolic';
            symbolicValue?: string;
            method: 'cash' | 'upi' | 'in-app';
        }>({
            query: (body) => ({ url: 'api/guests', method: 'PATCH', body: { ...body, action: 'record-payment' } }),
            invalidatesTags: ['Guests', 'Tenants', 'Rent'],
        }),

        // ─── Rent & Payments ─────────────────────────────────────────────
        getRentDetails: builder.query<RentSummaryResponse, void>({
            query: () => `api/rent`,
            providesTags: ['Rent'],
        }),

        getTenantRent: builder.query<{ success: boolean; guest: Guest; ledger: any[] }, { guestId: string }>({
            query: ({ guestId }) => `api/rent?guestId=${guestId}`,
            providesTags: ['Rent'],
        }),

        recordPayment: builder.mutation<PaymentResponse, {
            guestId: string;
            amount: number;
            amountType?: 'numeric' | 'symbolic';
            symbolicValue?: string;
            paymentMode?: string;
            notes?: string;
        }>({
            query: (body) => ({ url: 'api/rent', method: 'POST', body }),
            invalidatesTags: ['Rent', 'Tenants', 'Guests'],
        }),

        // ─── Complaints ──────────────────────────────────────────────────
        getComplaints: builder.query<ComplaintsResponse, { pgId?: string; status?: string } | void>({
            query: (params) => {
                let url = `api/complaints`;
                if (params?.pgId) url += `${url.includes('?') ? '&' : '?'}pgId=${params.pgId}`;
                if (params?.status) url += `${url.includes('?') ? '&' : '?'}status=${params.status}`;
                return url;
            },
            providesTags: ['Complaints'],
        }),

        updateComplaint: builder.mutation<{ success: boolean; complaint: Complaint }, {
            complaintId: string;
            updates: Partial<Complaint>;
        }>({
            query: (body) => ({ url: 'api/complaints', method: 'PATCH', body }),
            invalidatesTags: ['Complaints'],
        }),

        // ─── Expenses ────────────────────────────────────────────────────
        getExpenses: builder.query<ExpensesResponse, { pgId?: string; category?: string } | void>({
            query: (params) => {
                let url = `api/expenses`;
                if (params?.pgId) url += `${url.includes('?') ? '&' : '?'}pgId=${params.pgId}`;
                if (params?.category) url += `${url.includes('?') ? '&' : '?'}category=${params.category}`;
                return url;
            },
            providesTags: ['Expenses'],
        }),

        addExpenseApi: builder.mutation<{ success: boolean; expense: Expense }, {
            expense: Partial<Expense>;
        }>({
            query: (body) => ({ url: 'api/expenses', method: 'POST', body }),
            invalidatesTags: ['Expenses'],
        }),

        deleteExpense: builder.mutation<{ success: boolean; expenseId: string }, {
            expenseId: string;
        }>({
            query: (body) => ({ url: 'api/expenses', method: 'DELETE', body }),
            invalidatesTags: ['Expenses'],
        }),

        // ─── Staff ───────────────────────────────────────────────────────
        getStaff: builder.query<StaffResponse, { pgId?: string; role?: string } | void>({
            query: (params) => {
                let url = `api/staff`;
                if (params?.pgId) url += `${url.includes('?') ? '&' : '?'}pgId=${params.pgId}`;
                if (params?.role) url += `${url.includes('?') ? '&' : '?'}role=${params.role}`;
                return url;
            },
            providesTags: ['Staff'],
        }),

        updateStaffApi: builder.mutation<{ success: boolean; staff: Staff }, {
            staffId: string;
            updates: Partial<Staff>;
        }>({
            query: (body) => ({ url: 'api/staff', method: 'PATCH', body }),
            invalidatesTags: ['Staff'],
        }),

        deleteStaffApi: builder.mutation<{ success: boolean; staffId: string }, {
            staffId: string;
        }>({
            query: (body) => ({ url: 'api/staff', method: 'DELETE', body }),
            invalidatesTags: ['Staff'],
        }),
    }),
});

export const {
    // Properties
    useGetPropertiesQuery,
    useCreatePropertyMutation,
    useUpdatePropertyMutation,
    useDeletePropertyMutation,
    // Tenants (via /api/tenants)
    useGetTenantsQuery,
    useGetRentSummaryQuery,
    useCreateTenantMutation,
    // Guests (via /api/guests)
    useGetGuestsQuery,
    useUpdateGuestMutation,
    useTransferGuestMutation,
    useAddGuestMutation,
    useInitiateGuestExitMutation,
    useVacateGuestMutation,
    useUpdateKycStatusMutation,
    useSubmitKycDocumentsMutation,
    useResetKycMutation,
    useAddGuestChargeMutation,
    useRemoveGuestChargeMutation,
    useAddSharedRoomChargeMutation,
    useRecordGuestPaymentMutation,
    // Rent & Payments
    useGetRentDetailsQuery,
    useGetTenantRentQuery,
    useRecordPaymentMutation,
    // Complaints
    useGetComplaintsQuery,
    useUpdateComplaintMutation,
    // Expenses
    useGetExpensesQuery,
    useAddExpenseApiMutation,
    useDeleteExpenseMutation,
    // Staff
    useGetStaffQuery,
    useUpdateStaffApiMutation,
    useDeleteStaffApiMutation,
} = api;
