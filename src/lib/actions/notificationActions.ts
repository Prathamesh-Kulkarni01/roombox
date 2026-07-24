'use server'

import { getVerifiedOwnerIdFromHeaders } from '../auth-server';
import * as internal from './internalNotificationActions';
import type { Notification, Guest } from '@/lib/types';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead' | 'link'> & { link?: string };
    whatsappConfig?: {
        templateId?: string;
        headerValues?: any[];
        bodyValues?: any[];
        buttonValues?: any[];
        languageCode?: string;
    };
}

export async function createAndSendNotification(params: CreateAndSendNotificationParams) {
    const auth = await getVerifiedOwnerIdFromHeaders();
    if (!auth || auth.error || (auth.ownerId !== params.ownerId && auth.role !== 'admin')) {
        console.error(`[Auth] Unauthorized createAndSendNotification. User ownerId: ${auth?.ownerId}, Target ownerId: ${params.ownerId}`);
        return { whatsAppStatus: 'skipped' as const };
    }
    return internal.createAndSendNotification(params);
}

export async function sendMassPaymentReminders(params: { ownerId: string, guests: { id: string, name: string, phone?: string, userId?: string | null, balance: number, symbolicBalance?: string | null, amountType?: string, roomName: string }[] }) {
    const auth = await getVerifiedOwnerIdFromHeaders();
    if (!auth || auth.error || (auth.ownerId !== params.ownerId && auth.role !== 'admin')) {
        console.error(`[Auth] Unauthorized sendMassPaymentReminders.`);
        return { success: false, error: 'Unauthorized access' };
    }
    return internal.sendMassPaymentReminders(params);
}

export async function sendLateFeeReminder(params: { ownerId: string, guest: Guest, lateFeeAmount: number }) {
    const auth = await getVerifiedOwnerIdFromHeaders();
    if (!auth || auth.error || (auth.ownerId !== params.ownerId && auth.role !== 'admin')) {
        console.error(`[Auth] Unauthorized sendLateFeeReminder.`);
        return { success: false, error: 'Unauthorized access' };
    }
    return internal.sendLateFeeReminder(params);
}
