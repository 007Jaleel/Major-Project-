/**
 * test-attendance-auth.mjs
 * Reproduce the exact AdminAttendance page initial fetch with auth token.
 * Steps:
 * 1. Login as admin to get token
 * 2. Call GET /api/v1/admin/attendance (what frontend uses)
 * 3. Call GET /api/admin/attendance (legacy path)
 * 4. Compare responses and identify exact failure
 */

import http from 'http';

// Helper to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json: null
        });
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json: null
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.setTimeout(10000, () => {
      console.log('Request timed out');
      req.destroy();
      resolve({ error: 'timeout' });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Testing AdminAttendance Page Initial Fetch');
  console.log('='.repeat(60));

  // Step 1: Login as admin
  console.log('\n1️⃣ Logging in as admin...');
  const loginRes = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: '123456' })
  });

  if (loginRes.error) {
    console.log('   ❌ Connection error:', loginRes.error);
    return;
  }

  console.log('   Status:', loginRes.status);

  // Parse response if needed
  const loginData = loginRes.json || JSON.parse(loginRes.body);
  if (!loginData || !loginData.token) {
    console.log('   ❌ Login failed:', loginRes.body);
    return;
  }

  const token = loginData.token;
  console.log('   ✅ Got token:', token.substring(0, 20) + '...');

  // Step 2: Test /api/v1/admin/attendance (what frontend uses)
  console.log('\n2️⃣ Testing /api/v1/admin/attendance (frontend path)...');
  const v1Res = await makeRequest('/api/v1/admin/attendance?page=1&limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('   Status:', v1Res.status);
  if (v1Res.json) {
    console.log('   Response:', JSON.stringify(v1Res.json, null, 2).substring(0, 500));
  } else {
    console.log('   Response (text):', v1Res.body?.substring(0, 500));
  }

  // Step 3: Test /api/admin/attendance (legacy path)
  console.log('\n3️⃣ Testing /api/admin/attendance (legacy path)...');
  const legacyRes = await makeRequest('/api/admin/attendance?page=1&limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('   Status:', legacyRes.status);
  if (legacyRes.json) {
    console.log('   Response:', JSON.stringify(legacyRes.json, null, 2).substring(0, 500));
  } else {
    console.log('   Response (text):', legacyRes.body?.substring(0, 500));
  }

  // Step 4: Test helper endpoints
  console.log('\n4️⃣ Testing helper endpoints...');
  
  // Departments
  const deptsRes = await makeRequest('/api/v1/admin/attendance/departments', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   /departments status:', deptsRes.status);

  // All courses
  const coursesRes = await makeRequest('/api/v1/admin/attendance/all-courses', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   /all-courses status:', coursesRes.status);

  // Step 5: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (v1Res.status === 200) {
    console.log('✅ /api/v1/admin/attendance works!');
    console.log('   Records returned:', v1Res.json?.data?.length || 0);
  } else {
    console.log('❌ /api/v1/admin/attendance FAILED with status', v1Res.status);
    console.log('   Error:', v1Res.json?.message || v1Res.json?.error || v1Res.body);
  }

  if (legacyRes.status === 200) {
    console.log('✅ /api/admin/attendance works!');
  } else {
    console.log('❌ /api/admin/attendance FAILED with status', legacyRes.status);
  }

  console.log('\n');
}

main();