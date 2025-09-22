// import fetch from 'node-fetch';

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL =' http://localhost:9002'
const ENDPOINT = '/api/send-rent-reminders';

async function sendRentReminders() {
  try {
    const res = await fetch(`${BASE_URL}${ENDPOINT}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await res.json();
    console.log('✅ Rent reminders API response:', data);
  } catch (err) {
    console.error('❌ Error calling rent reminders API:', err);
    process.exit(1); // Fail the script if API fails
  }
}

sendRentReminders();
