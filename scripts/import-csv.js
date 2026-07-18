import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.match(/(.+?)=(.*)/);
        if (parts) {
            const key = parts[1].trim();
            let val = parts[2].trim();
            // Remove optional quotes
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            process.env[key] = val;
        }
    });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus didefinisikan di file .env!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple CSV Parser that handles quoted values correctly
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const result = [];
    if (lines.length === 0 || !lines[0]) return result;

    // Parse header row
    const headers = parseCSVLine(lines[0]);

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const currentline = parseCSVLine(lines[i]);
        const obj = {};
        headers.forEach((header, index) => {
            let val = currentline[index] !== undefined ? currentline[index].trim() : null;
            // Convert numbers and booleans if applicable
            if (val === '') {
                val = null;
            } else if (!isNaN(val) && val !== null) {
                val = Number(val);
            } else if (val === 'true') {
                val = true;
            } else if (val === 'false') {
                val = false;
            }
            obj[header.trim()] = val;
        });
        result.push(obj);
    }
    return result;
}

function parseCSVLine(line) {
    const arr = [];
    let quote = false;
    let col = '';
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            quote = !quote;
        } else if (c === ',' && !quote) {
            arr.push(col);
            col = '';
        } else {
            col += c;
        }
    }
    arr.push(col);
    return arr;
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(`
ℹ️ Cara Penggunaan Importer CSV ke Supabase:
   node scripts/import-csv.js <nama_tabel> <path_file_csv>

   Contoh:
   node scripts/import-csv.js siswa data_siswa.csv
   node scripts/import-csv.js keuangan data_keuangan.csv
   node scripts/import-csv.js absensi data_absensi.csv
   node scripts/import-csv.js turnover data_turnover.csv
   node scripts/import-csv.js populasi data_populasi.csv
        `);
        process.exit(0);
    }

    const table = args[0];
    const filepath = path.resolve(process.cwd(), args[1]);

    if (!fs.existsSync(filepath)) {
        console.error(`❌ Error: File CSV tidak ditemukan di: ${filepath}`);
        process.exit(1);
    }

    console.log(`⏳ Membaca file: ${filepath}...`);
    const csvContent = fs.readFileSync(filepath, 'utf-8');
    const records = parseCSV(csvContent);

    if (records.length === 0) {
        console.warn('⚠️ File CSV kosong atau tidak memiliki data.');
        process.exit(0);
    }

    console.log(`📦 Terbaca ${records.length} baris data. Memulai bulk upsert ke tabel "${table}" di Supabase...`);

    // Bulk upsert data
    const { data, error } = await supabase
        .from(table)
        .upsert(records, { onConflict: 'id' }); // 'id' as standard primary key

    if (error) {
        console.error(`❌ Gagal mengunggah data ke tabel "${table}":`, error.message);
        process.exit(1);
    }

    console.log(`✅ Sukses! Berhasil memasukkan/memperbarui ${records.length} data ke tabel "${table}".`);
}

run();
