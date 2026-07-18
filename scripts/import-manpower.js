import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.match(/(.+?)=(.*)/);
        if (parts) {
            const key = parts[1].trim();
            let val = parts[2].trim();
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

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const result = [];
    if (lines.length === 0 || !lines[0]) return result;

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const currentline = parseCSVLine(lines[i]);
        const obj = {};
        const seenHeaders = {};
        
        headers.forEach((header, index) => {
            const val = currentline[index] !== undefined ? currentline[index].trim() : '';
            let key = header;
            if (seenHeaders[header] !== undefined) {
                seenHeaders[header]++;
                key = `${header}_${seenHeaders[header]}`;
            } else {
                seenHeaders[header] = 0;
            }
            obj[key] = val;
        });
        result.push(obj);
    }
    return result;
}

// Convert DD/MM/YYYY to YYYY-MM-DD
function formatToISODate(dateStr) {
    if (!dateStr) return null;
    
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // If it is DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2];
            // Handle 2-digit years or full years
            const year = y.length === 2 ? '20' + y : y;
            return `${year}-${m}-${d}`;
        }
    }

    // If it is DD-MM-YYYY
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2];
            const year = y.length === 2 ? '20' + y : y;
            return `${year}-${m}-${d}`;
        }
    }

    return null;
}

function cleanInt(val) {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (str === '' || str === '-' || str.toLowerCase() === 'null' || str === '(-)') return null;

    // 1. If it is a comma-separated list of quantities (e.g. "54, 72, 60, 100, 30")
    if (str.includes(',')) {
        const parts = str.split(',');
        let sum = 0;
        let hasNumber = false;
        for (const p of parts) {
            const cleanP = p.replace(/[^0-9]/g, '');
            if (cleanP) {
                sum += parseInt(cleanP, 10);
                hasNumber = true;
            }
        }
        if (hasNumber) {
            return Math.min(2147483647, Math.max(-2147483648, sum));
        }
    }

    // 2. Sanitize and remove list bullets (e.g. "1. ", "2. ")
    let sanitized = str.replace(/(?:\b\d+\.\s+)/g, ' ');

    // 3. Match all numbers in the string and sum them (e.g. "friction 20pcs" -> 20)
    const numbers = sanitized.match(/\d+/g);
    if (numbers) {
        let sum = 0;
        numbers.forEach(n => {
            sum += parseInt(n, 10);
        });
        return Math.min(2147483647, Math.max(-2147483648, sum));
    }

    return null;
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log(`
ℹ️ Cara Penggunaan Importer Log Manpower:
   node scripts/import-manpower.js <path_file_csv>

   Contoh:
   node scripts/import-manpower.js data_manpower.csv
        `);
        process.exit(0);
    }

    const filepath = path.resolve(process.cwd(), args[0]);
    if (!fs.existsSync(filepath)) {
        console.error(`❌ Error: File CSV tidak ditemukan di: ${filepath}`);
        process.exit(1);
    }

    console.log(`⏳ Membaca file CSV: ${filepath}...`);
    const csvContent = fs.readFileSync(filepath, 'utf-8');
    const rawRecords = parseCSV(csvContent);

    console.log(`🧹 Membersihkan dan memetakan ${rawRecords.length} data...`);

    // 1. Buat pemetaan nama ke NoReg terpilih (pilih NoReg terbesar/terbaru)
    const nameToNoregMap = new Map();
    for (const r of rawRecords) {
        const rawNoreg = String(r['nomor registrasi'] || r['noreg'] || '').trim();
        const namaLengkap = String(r['nama lengkap'] || r['nama_lengkap'] || '').trim().toUpperCase();
        if (!rawNoreg || !namaLengkap) continue;

        if (!nameToNoregMap.has(namaLengkap)) {
            nameToNoregMap.set(namaLengkap, rawNoreg);
        } else {
            const existingNoreg = nameToNoregMap.get(namaLengkap);
            // Pilih NoReg yang lebih besar (terbaru)
            if (rawNoreg !== existingNoreg && rawNoreg > existingNoreg) {
                nameToNoregMap.set(namaLengkap, rawNoreg);
            }
        }
    }

    const recordMap = new Map();

    for (const r of rawRecords) {
        // Cari mapping header
        const rawNoreg = r['nomor registrasi'] || r['noreg'];
        const rawDate = r['hari / tanggal'] || r['tanggal'] || r['tanggal_record'];
        
        if (!rawNoreg || !rawDate) {
            continue; // Skip baris tidak valid
        }

        const dateFormatted = formatToISODate(rawDate);
        if (!dateFormatted) {
            console.warn(`⚠️ Warning: Format tanggal tidak valid untuk NoReg ${rawNoreg}: "${rawDate}", dilewati.`);
            continue;
        }

        const namaLengkap = String(r['nama lengkap'] || r['nama_lengkap'] || '').trim().toUpperCase();
        const planVal = r['target'] || r['plan'] || '0';
        const aktualVal = r['hasil'] || r['aktual'] || '0';
        const rejectVal = r['reject'] || '0';
        const keteranganVal = r['keterangan / kendala'] || r['keterangan'] || '';
        const shiftVal = r['shift'] || '';
        const bagianVal = r['bagian'] || r['bagian_1'] || '';
        const nomorMesinVal = r['nomor mesin'] || r['nomor_mesin'] || '';
        const modelVal = r['model'] || '';
        const namaSpvVal = r['nama spv'] || r['nama_spv'] || '';

        // Tentukan status kehadiran (default '✔' / Hadir, kecuali ada kendala absen)
        let hadirVal = '✔';
        const ketLower = keteranganVal.toLowerCase();
        if (ketLower.includes('alpa') || ketLower.includes('alpha') || ketLower.includes('mangkir')) {
            hadirVal = 'A';
        } else if (ketLower.includes('ijin') || ketLower.includes('izin')) {
            hadirVal = 'I';
        } else if (ketLower.includes('sakit')) {
            hadirVal = 'S';
        } else if (ketLower.includes('libur') || ketLower.includes('off')) {
            hadirVal = 'L';
        }

        // Gunakan NoReg yang sudah diseleksi agar tidak terduplikasi
        const cleanNoReg = nameToNoregMap.get(namaLengkap) || String(rawNoreg).trim();
        const key = `${cleanNoReg}_${dateFormatted}`;

        const planInt = cleanInt(planVal);
        const aktualInt = cleanInt(aktualVal);
        let persentaseVal = null;
        if (planInt !== null && planInt > 0 && aktualInt !== null) {
            persentaseVal = (aktualInt / planInt) * 100;
        }

        recordMap.set(key, {
            noreg: cleanNoReg,
            nama_lengkap: namaLengkap,
            tanggal_record: dateFormatted,
            plan: planInt,
            aktual: aktualInt,
            reject: cleanInt(rejectVal),
            persentase: persentaseVal,
            hadir: hadirVal,
            keterangan: keteranganVal.toUpperCase().trim(),
            shift: shiftVal.toUpperCase().trim() || null,
            bagian: bagianVal.toUpperCase().trim() || null,
            nomor_mesin: nomorMesinVal.toUpperCase().trim() || null,
            model: modelVal.toUpperCase().trim() || null,
            nama_spv: namaSpvVal.toUpperCase().trim() || null
        });
    }

    const cleanedRecords = Array.from(recordMap.values());

    // --- AUTO-REGISTER MISSING STUDENTS IN public.siswa ---
    console.log(`🔍 Mengumpulkan data siswa unik dari logs...`);
    const studentMap = new Map();
    for (const r of rawRecords) {
        const rawNoreg = String(r['nomor registrasi'] || r['noreg'] || '').trim();
        const rawDate = r['hari / tanggal'] || r['tanggal'] || r['tanggal_record'];
        const dateFormatted = formatToISODate(rawDate);

        if (!rawNoreg || !dateFormatted) continue;

        const namaLengkap = String(r['nama lengkap'] || r['nama_lengkap'] || '').trim().toUpperCase();
        const bagian = String(r['bagian'] || r['bagian_1'] || '').trim().toUpperCase();
        const namaSpv = String(r['nama spv'] || r['nama_spv'] || '').trim().toUpperCase();

        // Gunakan NoReg terpilih
        const noreg = nameToNoregMap.get(namaLengkap) || rawNoreg;

        // Grinding, Laddle, Painting dll adalah sections. Department adalah PRODUKSI
        let section = bagian || 'LAINNYA';
        let departemen = 'PRODUKSI'; // Default department

        if (!studentMap.has(noreg)) {
            studentMap.set(noreg, {
                noreg: noreg,
                nama_lengkap: namaLengkap || 'SISWA ' + noreg,
                departemen: departemen,
                section: section,
                hk: '6 HARI',
                tanggal_masuk: dateFormatted,
                distribusi: dateFormatted,
                nama_spv: namaSpv || null,
                status: 'AKTIF'
            });
        } else {
            // Simpan tanggal terlama sebagai tanggal_masuk dan distribusi
            const existing = studentMap.get(noreg);
            if (dateFormatted < existing.tanggal_masuk) {
                existing.tanggal_masuk = dateFormatted;
                existing.distribusi = dateFormatted;
            }
            if (!existing.nama_spv && namaSpv) existing.nama_spv = namaSpv;
            if (existing.nama_lengkap.startsWith('SISWA') && namaLengkap) existing.nama_lengkap = namaLengkap;
        }
    }

    const uniqueStudents = Array.from(studentMap.values());
    console.log(`👤 Terdeteksi ${uniqueStudents.length} siswa unik. Melakukan sinkronisasi ke tabel "siswa" terlebih dahulu...`);
    
    // Bulk upsert students in batches of 50
    const studentBatchSize = 50;
    for (let i = 0; i < uniqueStudents.length; i += studentBatchSize) {
        const batch = uniqueStudents.slice(i, i + studentBatchSize);
        const { error } = await supabase
            .from('siswa')
            .upsert(batch, { onConflict: 'noreg' });
        if (error) {
            console.error(`❌ Gagal menyelaraskan data siswa pada batch ke-${Math.floor(i/studentBatchSize) + 1}:`, error.message);
            process.exit(1);
        }
    }
    console.log(`✅ Sukses menyelaraskan ${uniqueStudents.length} profil siswa di database.`);

    console.log(`📦 Memulai bulk upsert log harian ke Supabase (dalam batch 100)...`);

    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < cleanedRecords.length; i += batchSize) {
        const batch = cleanedRecords.slice(i, i + batchSize);
        const { error } = await supabase
            .from('manpower_log')
            .upsert(batch, { onConflict: 'noreg,tanggal_record' });

        if (error) {
            console.error(`❌ Gagal mengunggah batch ke-${Math.floor(i/batchSize) + 1}:`, error.message);
            process.exit(1);
        }
        successCount += batch.length;
        console.log(`   [Batch ${Math.floor(i/batchSize) + 1}] Berhasil mengunggah ${batch.length} baris.`);
    }

    console.log(`✅ Selesai! Berhasil menyelaraskan ${successCount} log manpower harian ke database Supabase.`);
}

run();
