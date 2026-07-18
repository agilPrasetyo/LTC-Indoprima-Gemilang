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

async function updatePopulasi() {
  console.log('=== UPDATE KOLOM LTC PADA TABEL POPULASI ===\n');

  // 1. Dapatkan jumlah siswa aktif saat ini
  const { count, error: countErr } = await supabase
    .from('siswa')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'AKTIF');

  if (countErr) {
    console.error('Gagal menghitung siswa aktif:', countErr.message);
    return;
  }

  const activeCount = count || 0;
  console.log(`Jumlah siswa aktif saat ini: ${activeCount}`);

  // 2. Ambil semua baris di tabel populasi
  const { data: populasiList, error: popErr } = await supabase
    .from('populasi')
    .select('tanggal');

  if (popErr) {
    console.error('Gagal mengambil data populasi:', popErr.message);
    return;
  }

  console.log(`Menemukan ${populasiList.length} rekap populasi.`);

  // 3. Update ltc dan total_ltc pada setiap baris
  let updatedCount = 0;
  for (const p of populasiList) {
    const { error: updateErr } = await supabase
      .from('populasi')
      .update({
        ltc: activeCount,
        total_ltc: activeCount
      })
      .eq('tanggal', p.tanggal);

    if (updateErr) {
      console.error(`  Gagal update tanggal ${p.tanggal}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`\nBerhasil memperbarui ${updatedCount} baris data populasi.`);
  console.log('=== SELESAI ===');
}

updatePopulasi();
