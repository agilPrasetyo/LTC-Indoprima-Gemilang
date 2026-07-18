const fs = require('fs');
const path = require('path');
const { createClient } = require('./node_modules/@supabase/supabase-js');

// Baca .env manual
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars['PUBLIC_SUPABASE_URL'];
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'];


if (!url || !key) {
  console.error('ERROR: PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env!');
  process.exit(1);
}

console.log('URL:', url);
console.log('Key prefix:', key.substring(0, 30) + '...');

const supabase = createClient(url, key);

async function testConnection() {
  console.log('\n--- Test Koneksi Supabase ---');

  // Test 1: cek tabel siswa
  const { data: siswa, error: e1 } = await supabase.from('siswa').select('count').limit(1);
  if (e1) {
    console.log('GAGAL tabel siswa:', e1.message);
  } else {
    console.log('OK tabel siswa terhubung');
  }

  // Test 2: cek tabel turnover
  const { data: turnover, error: e2 } = await supabase.from('turnover').select('count').limit(1);
  if (e2) {
    console.log('GAGAL tabel turnover:', e2.message);
  } else {
    console.log('OK tabel turnover terhubung');
  }

  // Test 3: cek tabel users
  const { data: users, error: e3 } = await supabase.from('users').select('count').limit(1);
  if (e3) {
    console.log('GAGAL tabel users:', e3.message);
  } else {
    console.log('OK tabel users terhubung');
  }

  // Test 4: cek tabel cost
  const { data: cost, error: e4 } = await supabase.from('cost').select('*');
  if (e4) {
    console.log('GAGAL tabel cost:', e4.message);
  } else {
    console.log('OK tabel cost:', cost.length, 'baris data awal');
  }

  console.log('\nKoneksi Supabase berhasil! Database siap digunakan.');
}

testConnection().catch(err => {
  console.error('ERROR tidak terduga:', err.message);
});
