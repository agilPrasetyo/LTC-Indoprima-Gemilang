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
const supabase = createClient(url, key);

async function check() {
  const { data: siswa, error } = await supabase
    .from('siswa')
    .select('noreg, nama_lengkap, status, nama_spv, section, distribusi')
    .order('nama_lengkap');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== CEK DUPLIKAT NAMA ===');
  const namaMap = {};
  siswa.forEach(s => {
    const key = (s.nama_lengkap || '').trim().toLowerCase();
    if (!namaMap[key]) namaMap[key] = [];
    namaMap[key].push(s);
  });

  let dupFound = false;
  Object.entries(namaMap).forEach(([nama, rows]) => {
    if (rows.length > 1) {
      dupFound = true;
      console.log(`\nDUPLIKAT: "${nama.toUpperCase()}" (${rows.length}x)`);
      rows.forEach(r => {
        console.log(`   -> noreg: ${r.noreg} | status: ${r.status} | section: ${r.section} | distribusi: ${r.distribusi}`);
      });
    }
  });
  if (!dupFound) console.log('Tidak ada duplikat nama!');
}

check();
