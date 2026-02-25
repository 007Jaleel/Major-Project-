/**
 * test-attendance-endpoint.mjs
 * Test script to verify the admin attendance endpoint returns 200 or proper error.
 */

import http from 'http';

// Test the attendance endpoint without auth (should get 401, not 500)
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log(`\n🔍 Testing: GET http://localhost:3000${path}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers: ${JSON.stringify(res.headers)}`);
        try {
          const json = JSON.parse(data);
          console.log(`   Response: ${JSON.stringify(json, null, 2).substring(0, 500)}`);
        } catch {
          console.log(`   Response (text): ${data.substring(0, 500)}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Error: ${e.message}`);
      resolve({ error: e.message });
    });

    req.setTimeout(5000, () => {
      console.log('   ⏱️ Request timed out');
      req.destroy();
      resolve({ error: 'timeout' });
    });

    req.end();
  });
}

async function main() {
  console.log('🧪 Testing Admin Attendance Endpoints...\n');
  console.log('Note: These tests are without auth token - expecting 401, NOT 500.\n');

  // Test 1: Original path (what frontend currently uses)
  await makeRequest('/api/admin/attendance');

  // Test 2: What the route should be according to comments
  await makeRequest('/api/v1/admin/attendance');

  // Test 3: Health check to confirm server is running
  await makeRequest('/health');

  console.log('\n✅ Tests complete!');
}

main();