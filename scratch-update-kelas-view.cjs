const fs = require('fs');
const path = require('path');
const { createClient } = require('./node_modules/@supabase/supabase-js');

// Baca .env manual
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=[\"']?(.+?)[\"']?\s*$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});


const supabase = createClient(
  envVars.PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function updateKelasInTable() {
  console.log('🔄 Memperbarui kolom kelas di tabel siswa dengan rumus DATEDIF...\n');

  const { data: siswas, error: fetchErr } = await supabase
    .from('siswa')
    .select('noreg, nama_lengkap, tanggal_masuk')
    .eq('status', 'AKTIF');

  if (fetchErr) {
    console.error('❌ Gagal mengambil data siswa:', fetchErr.message);
    return;
  }

  let updated = 0, errors = 0;

  for (const s of siswas) {
    if (!s.tanggal_masuk) continue;
    const masuk = new Date(s.tanggal_masuk);
    const now = new Date();
    let bulan = (now.getFullYear() - masuk.getFullYear()) * 12 + (now.getMonth() - masuk.getMonth());
    if (now.getDate() < masuk.getDate()) bulan--;
    if (bulan < 0) bulan = 0;
    const kelas = `Kelas ${bulan + 1}`;

    const { error: updateErr } = await supabase
      .from('siswa')
      .update({ kelas: kelas })
      .eq('noreg', s.noreg);

    if (updateErr) {
      console.error(`  ❌ ${s.noreg} ${s.nama_lengkap}: ${updateErr.message}`);
      errors++;
    } else {
      console.log(`  ✅ ${s.noreg} ${s.nama_lengkap}: → ${kelas}`);
      updated++;
    }
  }

  console.log(`\n✅ Selesai: ${updated} siswa diperbarui, ${errors} error`);
}

updateKelasInTable().catch(console.error);
