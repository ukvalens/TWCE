const axios = require('axios');

const BASE = 'https://pay.pesapal.com/v3';
const KEY = 'p4x12AWirkjPYxrWnJcph6IKFCl82ujh';
const SECRET = 'IN4acsIdvt0DcUW6/Kup9Lbf4a4=';
const IPN_URL = 'http://localhost:5000/api/payments/pesapal/ipn';

async function run() {
  // 1. Get token
  console.log('Getting token...');
  const tokenRes = await axios.post(`${BASE}/api/Auth/RequestToken`,
    { consumer_key: KEY, consumer_secret: SECRET },
    { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }
  );
  const token = tokenRes.data.token;
  console.log('Token:', token);

  // 2. Register IPN
  console.log('\nRegistering IPN...');
  const ipnRes = await axios.post(`${BASE}/api/URLSetup/RegisterIPN`,
    { url: IPN_URL, ipn_notification_type: 'POST' },
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
  );
  console.log('IPN Response:', JSON.stringify(ipnRes.data, null, 2));
  console.log('\n✅ Copy the ipn_id above and add it to your .env as PESAPAL_IPN_ID=...');
}

run().catch(e => console.error('Error:', e.response?.data || e.message));
