const axios = require('axios');

const BASE_URL = 'https://pay.pesapal.com/v3';

let _token = null;
let _tokenExpiry = 0;

const getToken = async () => {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const res = await axios.post(`${BASE_URL}/api/Auth/RequestToken`, {
    consumer_key: process.env.PESAPAL_CONSUMER_KEY,
    consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
  }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });
  _token = res.data.token;
  _tokenExpiry = Date.now() + (res.data.expiryDate ? new Date(res.data.expiryDate) - Date.now() : 4 * 60 * 60 * 1000);
  return _token;
};

const authHeaders = async () => ({
  Authorization: `Bearer ${await getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

// Register IPN URL (call once during setup)
const registerIPN = async (ipnUrl) => {
  const res = await axios.post(`${BASE_URL}/api/URLSetup/RegisterIPN`,
    { url: ipnUrl, ipn_notification_type: 'POST' },
    { headers: await authHeaders() }
  );
  return res.data; // contains ipn_id
};

// Submit order to Pesapal — returns redirect URL
const submitOrder = async ({ orderId, amount, currency = 'KES', description, email, phone, firstName, lastName, callbackUrl, ipnId }) => {
  try {
    const res = await axios.post(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      id: orderId,
      currency,
      amount: parseFloat(amount),
      description,
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: { email_address: email, phone_number: phone, first_name: firstName, last_name: lastName },
    }, { headers: await authHeaders() });
    console.log('Pesapal submitOrder raw response:', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    console.error('Pesapal submitOrder error:', err.response?.data || err.message);
    throw err;
  }
};

// Get transaction status
const getTransactionStatus = async (orderTrackingId) => {
  const res = await axios.get(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    { headers: await authHeaders() }
  );
  return res.data; // { payment_status_description, status_code, ... }
};

module.exports = { getToken, registerIPN, submitOrder, getTransactionStatus };
