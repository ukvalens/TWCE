const Paypack = require('paypack-js');

const client = new Paypack({
  client_id:     process.env.PAYPACK_CLIENT_ID,
  client_secret: process.env.PAYPACK_CLIENT_SECRET,
});

const cashIn = async ({ amount, number, environment }) => {
  const res = await client.cashin({
    amount: Number(amount),
    number: String(number),
    environment: environment || process.env.PAYPACK_ENVIRONMENT || 'sandbox',
  });
  return res.data;
};

const getTransaction = async (ref) => {
  const res = await client.transaction(ref);
  return res.data;
};

module.exports = { cashIn, getTransaction };
