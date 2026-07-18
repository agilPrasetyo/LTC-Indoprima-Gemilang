const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = "https://xzlmrvvtjqnhlisghgyc.supabase.co";
const exactEnvKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA4fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";
const supabase = createClient(supabaseUrl, exactEnvKey);

async function check() {
  // 1. Ambil semua siswa
  const { data: siswa, error } = await supabase
    .from('siswa')
    .select('noreg, nama_lengkap, status, nama_spv, section, distribusi')
    .order('nama_lengkap');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // 2. Cari nama yang duplikat
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

  // 3. Cek kolom nama_spv
  console.log('\n=== CEK DATA SPV ===');
  const withSpv = siswa.filter(s => s.nama_spv && s.nama_spv.trim() !== '');
  const noSpv = siswa.filter(s => !s.nama_spv || s.nama_spv.trim() === '');
  console.log(`Total siswa: ${siswa.length}`);
  console.log(`Siswa DENGAN nama_spv: ${withSpv.length}`);
  console.log(`Siswa TANPA nama_spv: ${noSpv.length}`);

  if (withSpv.length > 0) {
    console.log('\nContoh SPV yang ada:');
    withSpv.slice(0, 10).forEach(s => {
      console.log(`  ${s.noreg} | ${s.nama_lengkap} | SPV: ${s.nama_spv}`);
    });
  } else {
    console.log('\nKolom nama_spv KOSONG untuk semua siswa!');
    // Cek kolom yang ada di tabel
    const { data: sample } = await supabase.from('siswa').select('*').limit(1);
    if (sample && sample.length > 0) {
      console.log('\nKolom yang tersedia di tabel siswa:');
      console.log(Object.keys(sample[0]).join(', '));
    }
  }
}

check();
