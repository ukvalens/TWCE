const url = 'http://localhost:5000/api/products/d97f08ab-060c-47ca-8266-85081828b576';
(async () => {
  try {
    const res = await fetch(url);
    console.log('status', res.status);
    const body = await res.text();
    console.log('body', body);
  } catch (err) {
    console.error(err);
  }
})();