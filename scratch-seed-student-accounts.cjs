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

async function seedStudentAccounts() {
  console.log('=== REGISTRASI AKUN LOGIN UNTUK SEMUA SISWA AKTIF ===\n');

  // 1. Ambil semua siswa aktif dari database
  const { data: students, error: sErr } = await supabase
    .from('siswa')
    .select('noreg, nama_lengkap')
    .eq('status', 'AKTIF');

  if (sErr) {
    console.error('Gagal mengambil data siswa:', sErr.message);
    return;
  }

  console.log(`Menemukan ${students.length} siswa aktif di database.`);

  // Dapatkan daftar user Auth yang sudah ada untuk cek duplikasi
  const { data: authUsers, error: authListErr } = await supabase.auth.admin.listUsers();
  if (authListErr) {
    console.error('Gagal mengambil daftar user auth:', authListErr.message);
    return;
  }

  const existingAuthEmails = new Set((authUsers?.users || []).map(u => u.email.toLowerCase()));

  let createdCount = 0;
  let skippedCount = 0;

  for (const s of students) {
    const email = `${s.noreg}@indoprima.com`.toLowerCase();
    const password = `${s.noreg}IPG`;
    const nameUpper = s.nama_lengkap.toUpperCase();

    console.log(`Memproses NoReg ${s.noreg}: ${nameUpper}`);

    let authId = null;

    // Cek apakah email sudah terdaftar di Auth
    if (existingAuthEmails.has(email)) {
      console.log(`  Email ${email} sudah terdaftar di Auth.`);
      // Cari ID user yang sudah ada
      const existingUser = authUsers.users.find(u => u.email.toLowerCase() === email);
      authId = existingUser?.id;
    } else {
      // Buat user baru di Supabase Auth
      const { data: newAuth, error: authErr } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'SISWA', name: nameUpper }
      });

      if (authErr) {
        console.error(`  [GAGAL] Gagal membuat auth user: ${authErr.message}`);
        continue;
      }

      authId = newAuth.user.id;
      console.log(`  [SUKSES] User Auth berhasil dibuat (ID: ${authId})`);
      createdCount++;
    }

    // Upsert ke tabel public.users untuk melengkapi profil
    const { error: dbErr } = await supabase
      .from('users')
      .upsert({
        id: authId,
        noreg: s.noreg,
        email: email,
        nama_lengkap: nameUpper,
        role: 'SISWA'
      });

    if (dbErr) {
      console.error(`  [GAGAL] Gagal menyimpan ke public.users: ${dbErr.message}`);
    } else {
      console.log(`  [SUKSES] Profil public.users disinkronkan.`);
    }
  }

  console.log(`\n=== RINGKASAN ===`);
  console.log(`Total akun baru dibuat: ${createdCount}`);
  console.log(`Total akun terlewati (sudah ada): ${skippedCount}`);
  console.log('Semua siswa aktif sekarang memiliki akun login dan muncul di Manajemen Akun.');
}

seedStudentAccounts().catch(console.error);
