async function test() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/webhook/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: 'whatsapp:+1234567890',
        Body: 'There is a huge pothole on MG Road causing massive traffic jams.'
      }).toString()
    });
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err.message);
  }
}
test();
