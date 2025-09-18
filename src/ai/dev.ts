
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-seo-content.ts';
import '@/ai/flows/ask-pg-chatbot.ts';
import '@/ai/flows/verify-kyc-flow.ts';
import '@/ai/flows/suggest-complaint-solution.ts';
import '@/ai/flows/send-notification-flow.ts';
import '@/ai/flows/send-rent-reminders-flow.ts';
import '@/ai/flows/reconcile-rent-cycles-flow.ts';
