const fetch = require('node:node-fetch')?.default || global.fetch;
(async () => {
  try {
    const payload = {
      full_name: 'Test User',
      email: `testuser+${Date.now()}@example.com`,
      phone: '+15551234567',
      password: 'password123',
      role_id: 3,
    };
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('status', res.status);
    const body = await res.text();
    console.log('body', body);
  } catch (err) {
    console.error(err);
  }
})();