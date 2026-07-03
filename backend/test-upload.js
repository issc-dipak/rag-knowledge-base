/**
 * Test: Directly call the upload API to see the exact error
 */
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// First login to get token
async function login() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'dipakpatil8589@gmail.com',
      password: 'dipak@123',
    });
    return res.data.accessToken;
  } catch (err) {
    console.log('Login failed:', err.response?.data || err.message);
    // try admin
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', {
        email: 'admin@example.com',
        password: 'Admin@123456',
      });
      return res.data.accessToken;
    } catch (err2) {
      console.log('Admin login also failed:', err2.response?.data || err2.message);
      return null;
    }
  }
}

async function testUpload(token) {
  // Get workspace first
  const wsRes = await axios.get('http://localhost:3001/api/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const workspaces = wsRes.data;
  console.log('Workspaces:', JSON.stringify(workspaces.map(w => ({ id: w.id, name: w.name })), null, 2));
  
  if (!workspaces.length) {
    console.log('No workspaces found!');
    return;
  }

  const workspaceId = workspaces[0].id;
  console.log('\nUsing workspace:', workspaceId);

  // Try uploading a small test file
  const testContent = Buffer.from('Hello World - Test document for RAG system');
  const formData = new FormData();
  formData.append('file', testContent, { filename: 'test.txt', contentType: 'text/plain' });
  formData.append('workspaceId', workspaceId);

  try {
    const res = await axios.post('http://localhost:3001/api/documents/upload', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      timeout: 15000,
    });
    console.log('\n✅ Upload SUCCESS!', res.data);
  } catch (err) {
    console.log('\n❌ Upload FAILED!');
    console.log('Status:', err.response?.status);
    console.log('Error:', JSON.stringify(err.response?.data, null, 2));
  }
}

async function main() {
  console.log('Testing upload API...\n');
  const token = await login();
  if (!token) { console.log('Cannot proceed without token'); return; }
  console.log('✅ Login successful');
  await testUpload(token);
}

main().catch(console.error);
