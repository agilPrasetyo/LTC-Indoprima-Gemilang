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

async function fillPersentase() {
  console.log('=== UPDATE PERSENTASE DI TABEL MANPOWER_LOG ===\n');

  // Ambil semua log
  const { data: logs, error } = await supabase
    .from('manpower_log')
    .select('id, plan, aktual');

  if (error) {
    console.error('Error fetching logs:', error.message);
    return;
  }

  console.log(`Menemukan ${logs.length} baris log.`);

  let updatedCount = 0;
  for (const log of logs) {
    const plan = parseFloat(log.plan);
    const aktual = parseFloat(log.aktual);
    let pct = null;

    if (!isNaN(plan) && plan > 0 && !isNaN(aktual)) {
      pct = (aktual / plan) * 100;
    }

    // Hanya update jika nilainya berbeda (atau jika sebelumnya null)
    const { error: updateErr } = await supabase
      .from('manpower_log')
      .update({ persentase: pct })
      .eq('id', log.id);

    if (updateErr) {
      console.error(`  Gagal update log id ${log.id}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`\nBerhasil memperbarui ${updatedCount} baris log manpower.`);
  console.log('=== SELESAI ===');
}

fillPersentase();
