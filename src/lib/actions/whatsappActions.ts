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
        const { getAdminDb } = await import('../firebaseAdmin');
        const adminDb = await getAdminDb();

        const userRef = adminDb.collection('users').doc(ownerId);
        await userRef.update({
            'subscription.whatsappSettings': settings,
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error: any) {
        console.error('[updateWhatsAppSettings] Error:', error.message);
        return { success: false, error: 'Failed to update settings' };
    }
}
