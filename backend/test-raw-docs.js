const axios = require('axios');

async function testFetch() {
  const baseUrl = 'http://localhost:3001/api';
  try {
    // Login
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: 'dipakpatil8589@gmail.com', // Active user
      password: 'dipak@123',
    });
    const token = loginRes.data.accessToken;
    console.log('Token retrieved.');

    // Fetch workspaces
    const wsRes = await axios.get(`${baseUrl}/workspaces`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Workspaces:');
    wsRes.data.forEach(w => {
      console.log(`- WS: ${w.name} (ID: ${w.id})`);
    });

    const activeWs = wsRes.data.find(w => w.name.toLowerCase().includes('dipk') || w.name.toLowerCase().includes('workspace') || w.id);
    if (!activeWs) return;

    // Fetch documents list for active workspace
    console.log(`\nFetching documents for workspace: ${activeWs.name} (ID: ${activeWs.id})...`);
    const docsRes = await axios.get(`${baseUrl}/documents?workspaceId=${activeWs.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Docs API raw response length:', docsRes.data.data?.length);
    console.log('Docs data:', JSON.stringify(docsRes.data.data, null, 2));

  } catch (err) {
    console.error('Fetch test error:', err.response?.data || err.message);
  }
}

testFetch();
