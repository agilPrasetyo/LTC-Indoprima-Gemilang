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

async function clean() {
  console.log('=== MENGGABUNGKAN DATA LOG & MENGHAPUS DUPLIKAT RIZKY NOVANDA ===\n');

  const oldNoreg = '2604129';
  const newNoreg = '2606104';

  // 1. Ambil log dari noreg lama (2604129)
  const { data: oldLogs, error: errLogs } = await supabase
    .from('manpower_log')
    .select('*')
    .eq('noreg', oldNoreg);

  if (errLogs) {
    console.error('Gagal mengambil log lama:', errLogs.message);
    return;
  }

  console.log(`Menemukan ${oldLogs.length} log dari NoReg lama (${oldNoreg})`);

  // 2. Migrasikan log ke noreg baru (2606104)
  let migratedCount = 0;
  for (const log of oldLogs) {
    const { error: upsertErr } = await supabase
      .from('manpower_log')
      .upsert({
        noreg: newNoreg,
        nama_lengkap: 'RIZKY NOVANDA YULIAWAN',
        tanggal_record: log.tanggal_record,
        plan: log.plan,
        aktual: log.aktual,
        reject: log.reject,
        hadir: log.hadir,
        keterangan: log.keterangan,
        shift: log.shift,
        bagian: log.bagian,
        nomor_mesin: log.nomor_mesin,
        model: log.model,
        nama_spv: log.nama_spv
      }, { onConflict: 'noreg,tanggal_record' });

    if (upsertErr) {
      console.error(`  Gagal migrasi log tanggal ${log.tanggal_record}:`, upsertErr.message);
    } else {
      migratedCount++;
    }
  }
  console.log(`Berhasil migrasi ${migratedCount} log ke NoReg baru (${newNoreg})`);

  // 3. Hapus log di noreg lama agar tidak melanggar foreign key saat menghapus siswa
  const { error: delLogsErr } = await supabase
    .from('manpower_log')
    .delete()
    .eq('noreg', oldNoreg);

  if (delLogsErr) {
    console.error('Gagal menghapus log lama:', delLogsErr.message);
    return;
  }
  console.log('Berhasil membersihkan log lama dari tabel manpower_log.');

  // Hapus juga absensi noreg lama
  await supabase.from('absensi').delete().eq('noreg', oldNoreg);

  // 4. Hapus siswa duplikat (noreg lama)
  const { error: delSiswaErr } = await supabase
    .from('siswa')
    .delete()
    .eq('noreg', oldNoreg);

  if (delSiswaErr) {
    console.error('Gagal menghapus siswa lama dari database:', delSiswaErr.message);
    return;
  }
  console.log(`Berhasil menghapus siswa dengan NoReg lama (${oldNoreg}) dari tabel siswa.`);

  console.log('\n=== SELESAI SINKRONISASI ===');
}

clean();
