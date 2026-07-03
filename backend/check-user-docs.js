/**
 * Direct check: query the documents API using the token for dipakpatil181023@gmail.com
 */
require('dotenv').config();
const axios = require('axios');

async function testFetch() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'dipakpatil181023@gmail.com',
      password: 'dipak@123', // Testing default password
    });
    const token = loginRes.data.accessToken;
    console.log('✅ Login success.');

    // 2. Get Workspaces
    const wsRes = await axios.get('http://localhost:3001/api/workspaces', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const workspaceId = wsRes.data[0]?.id;
    console.log('Workspaces for user:', wsRes.data.map(w => ({ id: w.id, name: w.name })));

    if (!workspaceId) {
      console.log('❌ No workspace found for user.');
      return;
    }

    // 3. Fetch Documents
    const docsRes = await axios.get(`http://localhost:3001/api/documents?workspaceId=${workspaceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`\n✅ Documents fetched successfully! Total count: ${docsRes.data.data.length}`);
    console.log('Documents list:', docsRes.data.data.map(d => ({ id: d.id, name: d.name, status: d.status })));
  } catch (err) {
    console.log('❌ Error fetching documents:', err.response?.data || err.message);
  }
}

testFetch().catch(console.error);
