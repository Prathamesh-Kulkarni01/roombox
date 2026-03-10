'use server'

import { WhatsAppLogsService } from '../whatsapp/logs-service';

export async function fetchWhatsAppLogs(ownerId: string) {
    if (!ownerId) return { success: false, error: 'Owner ID is required' };

    try {
        const logs = await WhatsAppLogsService.getOwnerLogs(ownerId);
        return { success: true, logs: JSON.parse(JSON.stringify(logs)) }; // Serialize timestamps
    } catch (error: any) {
        console.error('[fetchWhatsAppLogs] Error:', error.message);
        return { success: false, error: 'Failed to fetch usage history' };
    }
}

export async function updateWhatsAppSettings(ownerId: string, settings: any) {
    if (!ownerId) return { success: false, error: 'Owner ID is required' };

    try {
        const { db } = await import('../firebase');
        const { doc, updateDoc } = await import('firebase/firestore');

        if (!db) throw new Error('Firestore not initialized');

        const userRef = doc(db, 'users', ownerId);
        await updateDoc(userRef, {
            'subscription.whatsappSettings': settings
        });

        return { success: true };
    } catch (error: any) {
        console.error('[updateWhatsAppSettings] Error:', error.message);
        return { success: false, error: 'Failed to update settings' };
    }
}
