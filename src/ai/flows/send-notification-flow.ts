
'use server';

/**
 * @fileOverview A Genkit flow for sending FCM push notifications.
 *
 * - sendNotification - Sends a push notification to a user.
 * - SendNotificationInput - Input type for sendNotification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb, getAdminMessaging } from '@/lib/firebaseAdmin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

const SendNotificationInputSchema = z.object({
  userId: z.string().describe('The ID of the user to send the notification to.'),
  title: z.string().describe('The title of the notification.'),
  body: z.string().describe('The body content of the notification.'),
  link: z.string().describe('The relative URL to open when the notification is clicked (e.g., /dashboard/complaints).'),
});

export type SendNotificationInput = z.infer<typeof SendNotificationInputSchema>;

export async function sendNotification(input: SendNotificationInput): Promise<void> {
  return sendNotificationFlow(input);
}

const sendNotificationFlow = ai.defineFlow(
  {
    name: 'sendNotificationFlow',
    inputSchema: SendNotificationInputSchema,
    outputSchema: z.void(),
  },
  async ({ userId, title, body, link }) => {
    try {
      const adminDb = await getAdminDb();
      const adminMessaging = await getAdminMessaging();

      const userDocRef = adminDb.collection('users').doc(userId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.error(`User with ID ${userId} not found.`);
        return;
      }

      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.error(`FCM token not found for user ${userId}.`);
        return;
      }

      const fullLink = `${APP_URL}${link}`;
      const message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        webpush: {
          notification: {
            icon: `${APP_URL}/apple-touch-icon.png`,
            badge: `${APP_URL}/favicon.ico`,
          },
          fcm_options: {
            link: fullLink,
          },
        },
        apns: {
          payload: {
            aps: {
              'mutable-content': 1,
            },
          },
          fcm_options: {
            image: `${APP_URL}/apple-touch-icon.png`,
          },
        },
        android: {
          notification: {
            icon: `${APP_URL}/apple-touch-icon.png`,
          },
        },
      };

      console.log('Sending notification:', message);
      await adminMessaging.send(message);
      console.log(`Successfully sent message to user: ${userId}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      // Do not throw to avoid breaking main user flow
    }
  }
);
