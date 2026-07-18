const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = "https://xzlmrvvtjqnhlisghgyc.supabase.co";
const exactEnvKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA4fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";
const supabase = createClient(supabaseUrl, exactEnvKey);

// ATURAN: Pertahankan data terbaru (distribusi paling akhir / noreg yang lebih besar-ish)
// Hapus entri yang lebih lama / salah
const toDelete = [
  // Dede Ganip: 2152141 (AKTIF, distribusi 23/04) vs 2512141 (TURNOVER, distribusi 20/04)
  // Yang TURNOVER tetap di tabel turnover, yang AKTIF dengan noreg 2152141 ini duplikat entri aktif
  // Perlu cek: apakah 2512141 adalah data turnover yang valid? Hapus saja 2152141 dari tabel siswa
  { noreg: '2152141', nama: 'DEDE GANIP MULYONO', alasan: 'noreg lama/salah, yang benar adalah 2512141 yang sudah TURNOVER' },
  
  // Farandi Satria: 2501190 (AKTIF) vs 2601190 (TURNOVER)
  // 2601190 sudah benar jadi TURNOVER. Hapus 2501190 yang masih AKTIF dan salah noreg
  { noreg: '2501190', nama: 'FARANDI SATRIA NUGRAHA', alasan: 'noreg salah, yang benar 2601190 sudah TURNOVER' },

  // Fais Wahyuda: 2062007 (distribusi 27/04 = lebih lama) vs 2602007 (distribusi 28/04 = terbaru)
  // Pertahankan 2602007, hapus 2062007
  { noreg: '2062007', nama: 'FAIS WAHYUDA TERTO LUWIHANTORO', alasan: 'distribusi lebih lama dari 2602007' },

  // Mivtha Mauludia: 2606144 (distribusi 04/05 = lebih lama) vs 2604144 (distribusi 18/05 = terbaru)
  // Pertahankan 2604144, hapus 2606144
  { noreg: '2606144', nama: 'MIVTHA MAULUDIA', alasan: 'distribusi lebih lama dari 2604144' },

  // Rizky Novanda: 2604129 (distribusi 02/06 = lebih lama) vs 2606104 (distribusi 23/06 = terbaru)
  // Pertahankan 2606104, hapus 2604129
  { noreg: '2604129', nama: 'RIZKY NOVANDA YULIAWAN', alasan: 'distribusi lebih lama dari 2606104' },

  // Yoga Dwi Nur: 2512091 (distribusi 20/04 = lebih lama) vs 2512092 (distribusi 27/04 = terbaru)
  // Pertahankan 2512092, hapus 2512091
  { noreg: '2512091', nama: 'YOGA DWI NUR CAHYANA', alasan: 'distribusi lebih lama dari 2512092' },
];

async function cleanup() {
  console.log('=== CLEANUP DUPLIKAT SISWA ===\n');
  console.log('Akan menghapus entri berikut dari tabel siswa:');
  toDelete.forEach(d => {
    console.log(`  - [${d.noreg}] ${d.nama} | Alasan: ${d.alasan}`);
  });
  console.log('');

  for (const item of toDelete) {
    // Hapus juga log manpower terkait noreg ini sebelum hapus siswa
    const { error: logErr } = await supabase
      .from('manpower_log')
      .delete()
      .eq('noreg', item.noreg);

    if (logErr) {
      console.log(`  WARN manpower_log [${item.noreg}]: ${logErr.message}`);
    }

    // Hapus dari tabel siswa
    const { error } = await supabase
      .from('siswa')
      .delete()
      .eq('noreg', item.noreg);

    if (error) {
      console.log(`  ERROR hapus [${item.noreg}] ${item.nama}: ${error.message}`);
    } else {
      console.log(`  OK hapus [${item.noreg}] ${item.nama}`);
    }
  }

  // Verifikasi hasil akhir
  console.log('\n=== VERIFIKASI SETELAH CLEANUP ===');
  const { data: siswa } = await supabase
    .from('siswa')
    .select('noreg, nama_lengkap, status, nama_spv')
    .order('nama_lengkap');

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
      console.log(`MASIH DUPLIKAT: "${nama.toUpperCase()}" (${rows.length}x)`);
    }
  });
  if (!dupFound) console.log('Tidak ada duplikat nama. Cleanup berhasil!');

  console.log(`Total siswa aktif: ${siswa.filter(s => s.status === 'AKTIF' || s.status === 'Aktif').length}`);

  // Cek siswa tanpa SPV
  const noSpv = siswa.filter(s => !s.nama_spv || s.nama_spv.trim() === '');
  if (noSpv.length > 0) {
    console.log(`\nSiswa TANPA SPV (${noSpv.length}):`);
    noSpv.forEach(s => console.log(`  [${s.noreg}] ${s.nama_lengkap} | status: ${s.status}`));
  }
}

cleanup();
