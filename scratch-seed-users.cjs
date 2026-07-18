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

const defaultUsers = [
  { email: 'admin@indoprima.com',   password: 'admin123',   role: 'ADMIN',   name: 'Admin Utama' },
  { email: 'visitor@indoprima.com', password: 'visitor123', role: 'VISITOR', name: 'Visitor Dashboard' },
];

async function seedUsers() {
  console.log('=== SEED USER DEFAULT ===\n');

  for (const u of defaultUsers) {
    console.log(`Memproses: ${u.email} (${u.role})`);

    // 1. Cek apakah sudah ada di Auth
    const { data: list } = await supabase.auth.admin.listUsers();
    let existing = list?.users?.find(usr => usr.email === u.email);
    let authId = existing?.id;

    if (existing) {
      console.log(`  Auth sudah ada (id: ${authId}) — skip buat auth`);
    } else {
      // Buat di Auth
      const { data: newAuth, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { role: u.role, name: u.name }
      });
      if (authErr) {
        console.log(`  GAGAL buat auth: ${authErr.message}`);
        continue;
      }
      authId = newAuth.user.id;
      console.log(`  Auth dibuat (id: ${authId})`);
    }

    // 2. Upsert ke public.users
    const { error: dbErr } = await supabase.from('users').upsert({
      id: authId,
      email: u.email,
      nama_lengkap: u.name,
      role: u.role,
      noreg: null
    });

    if (dbErr) {
      console.log(`  GAGAL simpan ke public.users: ${dbErr.message}`);
    } else {
      console.log(`  public.users tersimpan OK`);
    }

    console.log(`  Selesai: ${u.email} → password: ${u.password}\n`);
  }

  console.log('=== SELESAI ===');
  console.log('Silakan restart dev server lalu coba login kembali!');
}

seedUsers().catch(console.error);
