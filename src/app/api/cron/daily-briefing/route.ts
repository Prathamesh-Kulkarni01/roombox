import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

export async function GET(request: NextRequest) {
    try {
        if (!isCronAuthorized(request)) {
            return unauthorizedCronResponse();
        }

        console.log('Running daily owner briefing cron job...');

        const mockOwners = [
            { id: '1', phone: '919999999999', name: 'Admin Boss' }
        ];

        for (const owner of mockOwners) {
            const message = `📊 *Daily Briefing: Sunrise PG*\n\n` +
                `✅ *Rent Collected Yesterday:* ₹15,000\n` +
                `⚠️ *Pending Dues:* 3 Tenants (₹24,000)\n` +
                `🔧 *Active Complaints:* 1 (Room 102)\n\n` +
                `Check full details here: [RentSutra Dashboard Link]`;

            await sendWhatsAppMessage(owner.phone, message, owner.id);
        }

        return NextResponse.json({ success: true, message: 'Briefings sent successfully' });

    } catch (error) {
        console.error('Error generating daily briefings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
