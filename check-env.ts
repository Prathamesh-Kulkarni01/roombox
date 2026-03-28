
import { getEnv } from './src/lib/env';
console.log('WHATSAPP_PHONE_NUMBER_ID:', getEnv('WHATSAPP_PHONE_NUMBER_ID', 'not set').substring(0, 5) + '...');
console.log('WHATSAPP_ACCESS_TOKEN:', getEnv('WHATSAPP_ACCESS_TOKEN', 'not set').length > 10 ? 'present' : 'not set');
