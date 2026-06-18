async function testSubmit() {
  try {
    // 1. Create a user directly via API
    const regRes = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test_citizen_01@cmdashboard.local', password: 'password123', phone: '9998887776' })
    });
    const regData = await regRes.json();
    let token = regData.token;

    if (!token && regData.message?.includes('duplicate')) {
       const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: 'test_citizen_01@cmdashboard.local', password: 'password123' })
       });
       const loginData = await loginRes.json();
       token = loginData.token;
    }

    if (!token) {
       console.error("Could not get token", regData);
       return;
    }

    const submitRes = await fetch('http://127.0.0.1:5000/api/complaints', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        title: 'Water pipe broken',
        description: 'The water pipe has been broken for 3 days and water is leaking everywhere in the street.',
        address: '123 Test St, Ward 5',
        category: 'water_supply',
        location: { lat: 28.6139, lng: 77.2090 }
      })
    });
    
    const submitData = await submitRes.json();
    console.log('Submit Response:', submitData);
  } catch (err) {
    console.error('Request Error:', err.message);
  }
}

testSubmit();
