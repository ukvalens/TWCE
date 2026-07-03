const axios = require('axios');

const BASE = 'https://pay.pesapal.com/v3';
const KEY = 'p4x12AWirkjPYxrWnJcph6IKFCl82ujh';
const SECRET = 'IN4acsIdvt0DcUW6/Kup9Lbf4a4=';

async function run() {
  // Get token
  const tokenRes = await axios.post(`${BASE}/api/Auth/RequestToken`,
    { consumer_key: KEY, consumer_secret: SECRET },
    { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }
  );
  const token = tokenRes.data.token;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  // Test with small USD amounts to find limit
  for (const amt of [1, 5, 10, 20, 30, 35]) {
    try {
      const r = await axios.post(`${BASE}/api/Transactions/SubmitOrderRequest`, {
        id: `TEST-${amt}-${Date.now()}`,
        currency: 'USD',
        amount: amt,
        description: 'Test order',
        callback_url: 'http://localhost:3000/payment/callback',
        notification_id: 'ba9e4833-b5e1-4b28-8de7-da30ef831ee8',
        billing_address: { email_address: 'test@test.com', phone_number: '0781234567', first_name: 'Test', last_name: 'User' },
      }, { headers });
      console.log(`$${amt}: OK - tracking_id: ${r.data.order_tracking_id}`);
    } catch (e) { console.error(`$${amt}: FAILED -`, e.response?.data?.error?.message || e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
}

run().catch(console.error);
