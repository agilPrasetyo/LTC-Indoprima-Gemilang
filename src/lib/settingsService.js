import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from './supabase.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || process.env?.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return supabase;
}

const LOCAL_STORAGE_FILE = path.resolve(process.cwd(), 'src/data/settings_storage.json');
const MASTER_PIN_SALT = 'LTC_INDOPRIMA_SALT_SECURE_2026';

function hashPin(pin) {
  if (!pin) return null;
  return crypto.createHash('sha256').update(String(pin).trim() + MASTER_PIN_SALT).digest('hex');
}

// Inisialisasi data bawaan default untuk Plant 5 (Casting)
function getDefaultData() {
  return {
    settings: {
      plant_id: 5,
      batch_aktif: 'Batch 2026-A',
      kkm_teori: 75,
      kkm_praktik: 80,
      kkm_sikap: 80,
      kkm_absensi: 95,
      master_pin_hash: hashPin('123456'), // Default PIN awal: 123456
      backup_auto: true,
      updated_at: new Date().toISOString(),
      graduation_rules: {
        kkm_teori: 75,
        kkm_praktik: 80,
        kkm_sikap: 80,
        min_absensi: 90,
        max_alpa: 2,
        evaluasi_mode: 'AUTOMATIC',
        catatan_kelulusan: 'Siswa dinyatakan LULUS bila seluruh nilai memenuhi KKM dan kehadiran minimal 90%.'
      },
      report_card_config: {
        bobot_teori: 25,
        bobot_praktik: 45,
        bobot_sikap: 15,
        bobot_safety_5s: 15,
        tampilkan_ranking: true,
        tampilkan_radar: true,
        tampilkan_catatan_spv: true,
        grade_a_min: 90,
        grade_b_min: 80,
        grade_c_min: 70
      },
      certificate_config: {
        nomor_format: 'LTC/P5/{YYYY}/{BATCH}/{NO}',
        penandatangan_1_nama: 'Ir. H. Hendra Wijaya',
        penandatangan_1_jabatan: 'Plant Manager - Plant 5 Casting',
        penandatangan_1_npk: 'MGR-5001',
        penandatangan_2_nama: 'Siti Rahmawati, S.Psi.',
        penandatangan_2_jabatan: 'HRD & Training Center Manager',
        penandatangan_2_npk: 'HRD-2015',
        stempel_aktif: true,
        masa_berlaku: '3 Tahun sejak diterbitkan'
      }
    },
    spv: [
      { id: 'spv-1', plant_id: 5, nama: 'Bambang Supriyanto', nik: 'SPV-0112', departemen: 'Produksi', section: 'Casting Line A', status: 'AKTIF' },
      { id: 'spv-2', plant_id: 5, nama: 'Dedi Sutrisno', nik: 'SPV-0118', departemen: 'Produksi', section: 'Melting & Pouring', status: 'AKTIF' },
      { id: 'spv-3', plant_id: 5, nama: 'Agus Waluyo', nik: 'SPV-0125', departemen: 'Quality Control', section: 'Finishing & Inspection', status: 'AKTIF' }
    ],
    products: [
      { id: 'prd-1', plant_id: 5, nama_produk: 'Brake Drum Rear Type-A', kode_produk: 'BD-01-A', section: 'Casting Line A', target_output: 120, cycle_time: 45, standar_kualitas: 'Defect < 0.5%', status: 'AKTIF' },
      { id: 'prd-2', plant_id: 5, nama_produk: 'Caliper Body Casting', kode_produk: 'CB-02-C', section: 'Casting Line B', target_output: 150, cycle_time: 38, standar_kualitas: 'Zero blowhole', status: 'AKTIF' },
      { id: 'prd-3', plant_id: 5, nama_produk: 'Disc Rotor Ventilated', kode_produk: 'DR-03-V', section: 'Finishing & Machining', target_output: 90, cycle_time: 60, standar_kualitas: 'Balance tolerance <= 2g', status: 'AKTIF' }
    ],
    sections: [
      { id: 'sec-1', plant_id: 5, nama_section: 'Core Making', departemen: 'Produksi', keterangan: 'Pembuatan cetakan pasir dan inti' },
      { id: 'sec-2', plant_id: 5, nama_section: 'Melting & Pouring', departemen: 'Produksi', keterangan: 'Peleburan logam & penuangan cetakan' },
      { id: 'sec-3', plant_id: 5, nama_section: 'Casting Line A', departemen: 'Produksi', keterangan: 'Lini cetak cor otomatis' },
      { id: 'sec-4', plant_id: 5, nama_section: 'Finishing & Fettling', departemen: 'Finishing', keterangan: 'Pembersihan burr dan peledakan pasir' },
      { id: 'sec-5', plant_id: 5, nama_section: 'Quality Assurance', departemen: 'Quality Control', keterangan: 'Inspeksi dimensi dan uji kekerasan' }
    ],
    machines: [
      { id: 'mc-1', plant_id: 5, kode_mesin: 'MC-CAST-01', nama_mesin: 'Gravity Die Casting Machine 250T', section: 'Casting Line A', tipe_kapasitas: '250 Ton / 45 sec', status: 'AKTIF' },
      { id: 'mc-2', plant_id: 5, kode_mesin: 'MC-CAST-02', nama_mesin: 'Low Pressure Die Casting LPDC-01', section: 'Casting Line A', tipe_kapasitas: '500 Kg / 60 sec', status: 'AKTIF' },
      { id: 'mc-3', plant_id: 5, kode_mesin: 'MC-MELT-01', nama_mesin: 'Induction Melting Furnace 1.5T', section: 'Melting & Pouring', tipe_kapasitas: '1500 Kg / 750°C', status: 'AKTIF' },
      { id: 'mc-4', plant_id: 5, kode_mesin: 'MC-CORE-01', nama_mesin: 'Cold Box Core Shooter Machine', section: 'Core Making', tipe_kapasitas: '15 L Sand / Cycle', status: 'MAINTENANCE' },
      { id: 'mc-5', plant_id: 5, kode_mesin: 'MC-FETT-01', nama_mesin: 'Shot Blasting & Fettling Cabinet', section: 'Finishing & Fettling', tipe_kapasitas: '500 Pcs / Batch', status: 'STANDBY' }
    ],
    activity_logs: [
      { id: 'log-1', plant_id: 5, admin_username: 'Super Admin', action_type: 'LOGIN', target_module: 'AUTH', description: 'Admin berhasil masuk ke portal sistem LTC Plant 5', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'log-2', plant_id: 5, admin_username: 'Super Admin', action_type: 'UPDATE', target_module: 'SETTING', description: 'Pembaruan parameter KKM Teori menjadi 75 poin', created_at: new Date(Date.now() - 1800000).toISOString() },
      { id: 'log-3', plant_id: 5, admin_username: 'Admin Casting', action_type: 'CREATE', target_module: 'MESIN', description: 'Penambahan master mesin baru: MC-CAST-01 (Gravity Die Casting 250T)', created_at: new Date().toISOString() }
    ],
    recycle_bin: [
      { id: 'bin-1', plant_id: 5, entity_type: 'MESIN', entity_id: 'mc-old-99', item_name: 'Old Core Sand Mixer M-99', payload: { id: 'mc-old-99', kode_mesin: 'M-99', nama_mesin: 'Old Core Sand Mixer M-99', section: 'Core Making' }, deleted_by: 'Super Admin', deleted_at: new Date(Date.now() - 86400000).toISOString() }
    ]
  };
}

function readLocalStorage() {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        const def = getDefaultData();
        return {
          ...def,
          ...parsed,
          settings: { ...def.settings, ...(parsed.settings || {}) }
        };
      }
    }
  } catch (err) {
    console.warn('[settingsService] Local storage read error, creating default:', err.message);
  }
  const defaultData = getDefaultData();
  writeLocalStorage(defaultData);
  return defaultData;
}

function writeLocalStorage(data) {
  try {
    const dir = path.dirname(LOCAL_STORAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[settingsService] Local storage write error:', err.message);
  }
}

// ==============================================================================
// AUDIT LOGGING HELPER
// ==============================================================================
export async function logAdminActivity(plantId = 5, logData = {}) {
  const localData = readLocalStorage();
  if (!Array.isArray(localData.activity_logs)) localData.activity_logs = [];

  const record = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    plant_id: Number(plantId || 5),
    admin_username: logData.admin_username || 'Admin',
    action_type: logData.action_type || 'UPDATE',
    target_module: logData.target_module || 'SETTING',
    description: logData.description || 'Pembaruan sistem',
    created_at: new Date().toISOString()
  };

  localData.activity_logs.unshift(record);
  if (localData.activity_logs.length > 500) localData.activity_logs.pop(); // batasi 500 log terakhir
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('admin_activity_logs').insert(record);
  } catch (err) {}

  return record;
}

export async function getActivityLogs(plantId = 5, limit = 50) {
  const localData = readLocalStorage();
  let list = (localData.activity_logs || []).filter(item => Number(item.plant_id || 5) === Number(plantId));

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('admin_activity_logs')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data;
    }
  } catch (err) {}

  return { success: true, data: list.slice(0, limit) };
}

// ==============================================================================
// 1. SYSTEM SETTINGS & KKM
// ==============================================================================
export async function getSystemSettings(plantId = 5) {
  const localData = readLocalStorage();
  let result = localData.settings || getDefaultData().settings;

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('system_settings')
      .select('*')
      .eq('plant_id', plantId)
      .maybeSingle();

    if (!error && data) {
      result = { ...result, ...data };
    }
  } catch (err) {}

  const { master_pin_hash, ...safeResult } = result;
  return { success: true, data: { ...safeResult, has_pin: Boolean(master_pin_hash) } };
}

export async function saveSystemSettings(payload, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  const currentSettings = localData.settings || {};

  const updatedSettings = {
    ...currentSettings,
    plant_id: Number(plantId || 5),
    batch_aktif: payload.batch_aktif || currentSettings.batch_aktif || 'Batch 2026-A',
    kkm_teori: Number(payload.kkm_teori ?? currentSettings.kkm_teori ?? 75),
    kkm_praktik: Number(payload.kkm_praktik ?? currentSettings.kkm_praktik ?? 80),
    kkm_sikap: Number(payload.kkm_sikap ?? currentSettings.kkm_sikap ?? 80),
    kkm_absensi: Number(payload.kkm_absensi ?? currentSettings.kkm_absensi ?? 95),
    backup_auto: payload.backup_auto !== undefined ? Boolean(payload.backup_auto) : true,
    updated_at: new Date().toISOString()
  };

  localData.settings = updatedSettings;
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('system_settings').upsert({
      plant_id: Number(plantId || 5),
      batch_aktif: updatedSettings.batch_aktif,
      kkm_teori: updatedSettings.kkm_teori,
      kkm_praktik: updatedSettings.kkm_praktik,
      kkm_sikap: updatedSettings.kkm_sikap,
      kkm_absensi: updatedSettings.kkm_absensi,
      backup_auto: updatedSettings.backup_auto,
      updated_at: updatedSettings.updated_at
    }, { onConflict: 'plant_id' });
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'UPDATE',
    target_module: 'SETTING',
    description: `Memperbarui konfigurasi sistem & KKM (Batch: ${updatedSettings.batch_aktif})`
  });

  const { master_pin_hash, ...safeResult } = updatedSettings;
  return { success: true, data: safeResult };
}

// ==============================================================================
// 2. ATURAN KELULUSAN
// ==============================================================================
export async function getGraduationRules(plantId = 5) {
  const localData = readLocalStorage();
  const rules = localData.settings?.graduation_rules || getDefaultData().settings.graduation_rules;
  return { success: true, data: rules };
}

export async function saveGraduationRules(payload, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  if (!localData.settings) localData.settings = getDefaultData().settings;

  const currentRules = localData.settings.graduation_rules || {};
  const updatedRules = {
    ...currentRules,
    kkm_teori: Number(payload.kkm_teori ?? currentRules.kkm_teori ?? 75),
    kkm_praktik: Number(payload.kkm_praktik ?? currentRules.kkm_praktik ?? 80),
    kkm_sikap: Number(payload.kkm_sikap ?? currentRules.kkm_sikap ?? 80),
    min_absensi: Number(payload.min_absensi ?? currentRules.min_absensi ?? 90),
    max_alpa: Number(payload.max_alpa ?? currentRules.max_alpa ?? 2),
    evaluasi_mode: payload.evaluasi_mode || currentRules.evaluasi_mode || 'AUTOMATIC',
    catatan_kelulusan: payload.catatan_kelulusan || currentRules.catatan_kelulusan || '',
    updated_at: new Date().toISOString()
  };

  localData.settings.graduation_rules = updatedRules;
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('system_settings').upsert({
      plant_id: Number(plantId || 5),
      graduation_rules: updatedRules,
      updated_at: new Date().toISOString()
    }, { onConflict: 'plant_id' });
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'UPDATE',
    target_module: 'KELULUSAN',
    description: `Menyimpan aturan kelulusan (Mode: ${updatedRules.evaluasi_mode}, Min Kehadiran: ${updatedRules.min_absensi}%)`
  });

  return { success: true, data: updatedRules };
}

// ==============================================================================
// 3. KOMPONEN REPORT CARD
// ==============================================================================
export async function getReportCardConfig(plantId = 5) {
  const localData = readLocalStorage();
  const config = localData.settings?.report_card_config || getDefaultData().settings.report_card_config;
  return { success: true, data: config };
}

export async function saveReportCardConfig(payload, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  if (!localData.settings) localData.settings = getDefaultData().settings;

  const currentConfig = localData.settings.report_card_config || {};
  const updatedConfig = {
    ...currentConfig,
    bobot_teori: Number(payload.bobot_teori ?? currentConfig.bobot_teori ?? 25),
    bobot_praktik: Number(payload.bobot_praktik ?? currentConfig.bobot_praktik ?? 45),
    bobot_sikap: Number(payload.bobot_sikap ?? currentConfig.bobot_sikap ?? 15),
    bobot_safety_5s: Number(payload.bobot_safety_5s ?? currentConfig.bobot_safety_5s ?? 15),
    tampilkan_ranking: payload.tampilkan_ranking !== undefined ? Boolean(payload.tampilkan_ranking) : true,
    tampilkan_radar: payload.tampilkan_radar !== undefined ? Boolean(payload.tampilkan_radar) : true,
    tampilkan_catatan_spv: payload.tampilkan_catatan_spv !== undefined ? Boolean(payload.tampilkan_catatan_spv) : true,
    grade_a_min: Number(payload.grade_a_min ?? currentConfig.grade_a_min ?? 90),
    grade_b_min: Number(payload.grade_b_min ?? currentConfig.grade_b_min ?? 80),
    grade_c_min: Number(payload.grade_c_min ?? currentConfig.grade_c_min ?? 70),
    updated_at: new Date().toISOString()
  };

  const totalBobot = updatedConfig.bobot_teori + updatedConfig.bobot_praktik + updatedConfig.bobot_sikap + updatedConfig.bobot_safety_5s;
  if (totalBobot !== 100) {
    return { success: false, message: `Total bobot komponen penilaian harus tepat 100% (saat ini: ${totalBobot}%).` };
  }

  localData.settings.report_card_config = updatedConfig;
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('system_settings').upsert({
      plant_id: Number(plantId || 5),
      report_card_config: updatedConfig,
      updated_at: new Date().toISOString()
    }, { onConflict: 'plant_id' });
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'UPDATE',
    target_module: 'REPORT_CARD',
    description: `Memperbarui bobot komponen report card (Teori: ${updatedConfig.bobot_teori}%, Praktik: ${updatedConfig.bobot_praktik}%)`
  });

  return { success: true, data: updatedConfig };
}

// ==============================================================================
// 4. KONFIGURASI TEMPLATE SERTIFIKAT
// ==============================================================================
export async function getCertificateConfig(plantId = 5) {
  const localData = readLocalStorage();
  const config = localData.settings?.certificate_config || getDefaultData().settings.certificate_config;
  return { success: true, data: config };
}

export async function saveCertificateConfig(payload, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  if (!localData.settings) localData.settings = getDefaultData().settings;

  const currentConfig = localData.settings.certificate_config || {};
  const updatedConfig = {
    ...currentConfig,
    nomor_format: payload.nomor_format || currentConfig.nomor_format || 'LTC/P5/{YYYY}/{BATCH}/{NO}',
    penandatangan_1_nama: payload.penandatangan_1_nama || currentConfig.penandatangan_1_nama || '',
    penandatangan_1_jabatan: payload.penandatangan_1_jabatan || currentConfig.penandatangan_1_jabatan || '',
    penandatangan_1_npk: payload.penandatangan_1_npk || currentConfig.penandatangan_1_npk || '',
    penandatangan_2_nama: payload.penandatangan_2_nama || currentConfig.penandatangan_2_nama || '',
    penandatangan_2_jabatan: payload.penandatangan_2_jabatan || currentConfig.penandatangan_2_jabatan || '',
    penandatangan_2_npk: payload.penandatangan_2_npk || currentConfig.penandatangan_2_npk || '',
    stempel_aktif: payload.stempel_aktif !== undefined ? Boolean(payload.stempel_aktif) : true,
    masa_berlaku: payload.masa_berlaku || currentConfig.masa_berlaku || '3 Tahun sejak diterbitkan',
    updated_at: new Date().toISOString()
  };

  localData.settings.certificate_config = updatedConfig;
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('system_settings').upsert({
      plant_id: Number(plantId || 5),
      certificate_template_config: updatedConfig,
      updated_at: new Date().toISOString()
    }, { onConflict: 'plant_id' });
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'UPDATE',
    target_module: 'SERTIFIKAT',
    description: `Memperbarui konfigurasi template sertifikat (Format: ${updatedConfig.nomor_format})`
  });

  return { success: true, data: updatedConfig };
}

// ==============================================================================
// 5. MASTER MESIN PRODUKSI
// ==============================================================================
export async function getMasterMachines(plantId = 5) {
  const localData = readLocalStorage();
  let list = (localData.machines || []).filter(item => Number(item.plant_id || 5) === Number(plantId));

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('master_machines')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data;
      localData.machines = data;
      writeLocalStorage(localData);
    }
  } catch (err) {}

  return { success: true, data: list };
}

export async function saveMasterMachine(payload, plantId = 5, adminUsername = 'Admin') {
  if (!payload || !payload.nama_mesin || !payload.kode_mesin) {
    return { success: false, message: 'Kode mesin dan nama mesin wajib diisi.' };
  }

  const localData = readLocalStorage();
  if (!Array.isArray(localData.machines)) localData.machines = [];

  const id = payload.id || `mc-${Date.now()}`;
  const isNew = !payload.id || !localData.machines.some(m => m.id === id);

  const record = {
    id,
    plant_id: Number(plantId || 5),
    kode_mesin: String(payload.kode_mesin).trim().toUpperCase(),
    nama_mesin: String(payload.nama_mesin).trim(),
    section: payload.section || '',
    tipe_kapasitas: payload.tipe_kapasitas || '',
    status: payload.status || 'AKTIF',
    updated_at: new Date().toISOString()
  };

  const existingIdx = localData.machines.findIndex(m => m.id === id);
  if (existingIdx >= 0) {
    localData.machines[existingIdx] = { ...localData.machines[existingIdx], ...record };
  } else {
    record.created_at = new Date().toISOString();
    localData.machines.unshift(record);
  }
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('master_machines').upsert(record);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: isNew ? 'CREATE' : 'UPDATE',
    target_module: 'MESIN',
    description: `${isNew ? 'Menambahkan' : 'Memperbarui'} master mesin: ${record.kode_mesin} (${record.nama_mesin})`
  });

  return { success: true, data: record };
}

export async function deleteMasterMachine(id, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  let deletedItem = null;
  if (Array.isArray(localData.machines)) {
    const idx = localData.machines.findIndex(m => m.id === id);
    if (idx >= 0) {
      deletedItem = localData.machines[idx];
      localData.machines.splice(idx, 1);
    }
  }

  if (deletedItem) {
    if (!Array.isArray(localData.recycle_bin)) localData.recycle_bin = [];
    localData.recycle_bin.unshift({
      id: `bin-${Date.now()}`,
      plant_id: Number(plantId || 5),
      entity_type: 'MESIN',
      entity_id: deletedItem.id,
      item_name: `${deletedItem.kode_mesin} - ${deletedItem.nama_mesin}`,
      payload: deletedItem,
      deleted_by: adminUsername,
      deleted_at: new Date().toISOString()
    });
    writeLocalStorage(localData);
  }

  try {
    const client = getAdminClient();
    await client.from('master_machines').delete().eq('id', id);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'DELETE',
    target_module: 'MESIN',
    description: `Memindahkan mesin ${deletedItem?.kode_mesin || id} ke Recycle Bin`
  });

  return { success: true, message: 'Data mesin dipindahkan ke Recycle Bin.' };
}

// ==============================================================================
// 6. RECYCLE BIN & DATA RECOVERY
// ==============================================================================
export async function getRecycleBinItems(plantId = 5) {
  const localData = readLocalStorage();
  let list = (localData.recycle_bin || []).filter(item => Number(item.plant_id || 5) === Number(plantId));

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('recycle_bin')
      .select('*')
      .eq('plant_id', plantId)
      .order('deleted_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data;
    }
  } catch (err) {}

  return { success: true, data: list };
}

export async function restoreRecycleBinItem(binId, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  if (!Array.isArray(localData.recycle_bin)) localData.recycle_bin = [];

  const binIndex = localData.recycle_bin.findIndex(b => b.id === binId);
  if (binIndex === -1) {
    return { success: false, message: 'Item di Recycle Bin tidak ditemukan.' };
  }

  const binItem = localData.recycle_bin[binIndex];
  const { entity_type, payload } = binItem;

  // Restore sesuai entity
  if (entity_type === 'MESIN') {
    if (!Array.isArray(localData.machines)) localData.machines = [];
    localData.machines.unshift(payload);
    try {
      const client = getAdminClient();
      await client.from('master_machines').upsert(payload);
    } catch (err) {}
  } else if (entity_type === 'SPV') {
    if (!Array.isArray(localData.spv)) localData.spv = [];
    localData.spv.unshift(payload);
    try {
      const client = getAdminClient();
      await client.from('master_spv').upsert(payload);
    } catch (err) {}
  } else if (entity_type === 'PRODUK') {
    if (!Array.isArray(localData.products)) localData.products = [];
    localData.products.unshift(payload);
    try {
      const client = getAdminClient();
      await client.from('master_products').upsert(payload);
    } catch (err) {}
    syncMasterOutputProdukJson(localData.products);
  } else if (entity_type === 'SECTION') {
    if (!Array.isArray(localData.sections)) localData.sections = [];
    localData.sections.unshift(payload);
    try {
      const client = getAdminClient();
      await client.from('master_sections').upsert(payload);
    } catch (err) {}
  }

  // Hapus dari recycle bin
  localData.recycle_bin.splice(binIndex, 1);
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('recycle_bin').delete().eq('id', binId);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'RESTORE',
    target_module: entity_type,
    description: `Memulihkan data ${entity_type}: ${binItem.item_name || binItem.entity_id}`
  });

  return { success: true, message: `Data ${binItem.item_name || ''} berhasil dipulihkan.` };
}

export async function permanentDeleteRecycleBinItem(binId, pin, plantId = 5, adminUsername = 'Admin') {
  // Validasi PIN Keamanan Super Admin
  const pinCheck = await verifyMasterPin(pin, plantId);
  if (!pinCheck.success) {
    return { success: false, message: 'Master Security PIN salah. Penghapusan permanen ditolak!' };
  }

  const localData = readLocalStorage();
  if (!Array.isArray(localData.recycle_bin)) localData.recycle_bin = [];

  const binIndex = localData.recycle_bin.findIndex(b => b.id === binId);
  if (binIndex === -1) {
    return { success: false, message: 'Item di Recycle Bin tidak ditemukan.' };
  }

  const item = localData.recycle_bin[binIndex];
  localData.recycle_bin.splice(binIndex, 1);
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('recycle_bin').delete().eq('id', binId);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'DELETE',
    target_module: 'RECYCLE_BIN',
    description: `Penghapusan permanen data ${item.entity_type}: ${item.item_name || item.entity_id} dengan Master PIN`
  });

  return { success: true, message: 'Item berhasil dihapus secara permanen dari sistem.' };
}

// ==============================================================================
// 7. MASTER SUPER ADMIN PIN
// ==============================================================================
export async function verifyMasterPin(pin, plantId = 5) {
  if (!pin) return { success: false, message: 'PIN wajib diisi.' };
  const localData = readLocalStorage();
  let expectedHash = localData.settings?.master_pin_hash || hashPin('123456');

  try {
    const client = getAdminClient();
    const { data } = await client
      .from('system_settings')
      .select('master_pin_hash')
      .eq('plant_id', plantId)
      .maybeSingle();
    if (data?.master_pin_hash) expectedHash = data.master_pin_hash;
  } catch (err) {}

  const inputHash = hashPin(pin);
  if (inputHash === expectedHash) {
    return { success: true, message: 'PIN terverifikasi.' };
  }
  return { success: false, message: 'Master Security PIN salah.' };
}

export async function updateMasterPin(currentPin, newPin, plantId = 5, adminUsername = 'Admin') {
  const verify = await verifyMasterPin(currentPin, plantId);
  if (!verify.success) {
    return { success: false, message: 'PIN saat ini salah. Perubahan PIN ditolak.' };
  }
  if (!newPin || String(newPin).length < 6) {
    return { success: false, message: 'PIN baru minimal harus 6 karakter/angka.' };
  }

  const newHash = hashPin(newPin);
  const localData = readLocalStorage();
  if (!localData.settings) localData.settings = {};
  localData.settings.master_pin_hash = newHash;
  localData.settings.updated_at = new Date().toISOString();
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('system_settings').upsert({
      plant_id: Number(plantId || 5),
      master_pin_hash: newHash,
      updated_at: new Date().toISOString()
    }, { onConflict: 'plant_id' });
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'UPDATE',
    target_module: 'SECURITY',
    description: 'Pembaruan Master Security PIN Super Admin'
  });

  return { success: true, message: 'Master PIN berhasil diperbarui.' };
}

// ==============================================================================
// 8. MASTER SPV CRUD
// ==============================================================================
export async function getMasterSpvList(plantId = 5) {
  const localData = readLocalStorage();
  let list = (localData.spv || []).filter(item => Number(item.plant_id || 5) === Number(plantId));

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('master_spv')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data;
      localData.spv = data;
      writeLocalStorage(localData);
    }
  } catch (err) {}

  return { success: true, data: list };
}

export async function saveMasterSpv(payload, plantId = 5, adminUsername = 'Admin') {
  if (!payload || !payload.nama) {
    return { success: false, message: 'Nama SPV wajib diisi.' };
  }

  const localData = readLocalStorage();
  if (!Array.isArray(localData.spv)) localData.spv = [];

  const id = payload.id || `spv-${Date.now()}`;
  const isNew = !payload.id || !localData.spv.some(s => s.id === id);

  const record = {
    id,
    plant_id: Number(plantId || 5),
    nama: String(payload.nama).trim(),
    nik: payload.nik ? String(payload.nik).trim() : '',
    departemen: payload.departemen || 'Produksi',
    section: payload.section || '',
    status: payload.status || 'AKTIF',
    updated_at: new Date().toISOString()
  };

  const existingIdx = localData.spv.findIndex(s => s.id === id);
  if (existingIdx >= 0) {
    localData.spv[existingIdx] = { ...localData.spv[existingIdx], ...record };
  } else {
    record.created_at = new Date().toISOString();
    localData.spv.unshift(record);
  }
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('master_spv').upsert(record);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: isNew ? 'CREATE' : 'UPDATE',
    target_module: 'SPV',
    description: `${isNew ? 'Menambahkan' : 'Memperbarui'} instruktur/SPV: ${record.nama}`
  });

  return { success: true, data: record };
}

export async function deleteMasterSpv(id, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  let deletedItem = null;
  if (Array.isArray(localData.spv)) {
    const idx = localData.spv.findIndex(s => s.id === id);
    if (idx >= 0) {
      deletedItem = localData.spv[idx];
      localData.spv.splice(idx, 1);
    }
  }

  if (deletedItem) {
    if (!Array.isArray(localData.recycle_bin)) localData.recycle_bin = [];
    localData.recycle_bin.unshift({
      id: `bin-${Date.now()}`,
      plant_id: Number(plantId || 5),
      entity_type: 'SPV',
      entity_id: deletedItem.id,
      item_name: `${deletedItem.nama} (${deletedItem.nik || 'No NPK'})`,
      payload: deletedItem,
      deleted_by: adminUsername,
      deleted_at: new Date().toISOString()
    });
    writeLocalStorage(localData);
  }

  try {
    const client = getAdminClient();
    await client.from('master_spv').delete().eq('id', id);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'DELETE',
    target_module: 'SPV',
    description: `Memindahkan SPV ${deletedItem?.nama || id} ke Recycle Bin`
  });

  return { success: true, message: 'Data SPV dipindahkan ke Recycle Bin.' };
}

// ==============================================================================
// 9. MASTER PRODUK & TARGET CRUD
// ==============================================================================
export async function getMasterProducts(plantId = 5) {
  const localData = readLocalStorage();
  let list = (localData.products || []).filter(item => Number(item.plant_id || 5) === Number(plantId));

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('master_products')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data;
      localData.products = data;
      writeLocalStorage(localData);
    }
  } catch (err) {}

  return { success: true, data: list };
}

function syncMasterOutputProdukJson(products) {
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'master_output_produk.json');
    const mapped = (products || []).map((p, idx) => {
      return {
        id: String(p.id || idx + 1).replace('prd-', ''),
        nama: p.nama_produk,
        proses: p.proses || 'FBO',
        targets: {
          MELTING: p.target_melting || 0,
          LADLE: p.target_ladle || 0,
          CORE: p.target_core || 0,
          FURAN: p.target_furan || 0,
          FETTLING: p.target_fettling || 0,
          GRINDING: p.target_grinding || 0,
          SHOTBLAST: p.target_shotblast || 0,
          TURNING: p.target_turning || 0,
          MILLING: p.target_milling || 0,
          WELDING: p.target_welding || 0,
          PAINTING: p.target_painting || 0
        }
      };
    });
    fs.writeFileSync(jsonPath, JSON.stringify(mapped, null, 2), 'utf8');
  } catch (err) {
    console.warn('[settingsService] Failed to sync master_output_produk.json:', err.message);
  }
}

export async function saveMasterProduct(payload, plantId = 5, adminUsername = 'Admin') {
  if (!payload || !payload.nama_produk) {
    return { success: false, message: 'Nama produk wajib diisi.' };
  }

  const localData = readLocalStorage();
  if (!Array.isArray(localData.products)) localData.products = [];

  const id = payload.id || `prd-${Date.now()}`;
  const isNew = !payload.id || !localData.products.some(p => p.id === id);

  const record = {
    id,
    plant_id: Number(plantId || 5),
    nama_produk: String(payload.nama_produk).trim(),
    kode_produk: payload.kode_produk ? String(payload.kode_produk).trim() : '',
    proses: payload.proses || 'FBO',
    berat_kg: Number(payload.berat_kg || 0),
    section: payload.section || '',
    target_output: Number(payload.target_output || payload.target_grinding || payload.target_furan || 0),
    cycle_time: Number(payload.cycle_time || 0),
    target_melting: Number(payload.target_melting || 0),
    target_ladle: Number(payload.target_ladle || 0),
    target_core: Number(payload.target_core || 0),
    target_furan: Number(payload.target_furan || 0),
    target_fettling: Number(payload.target_fettling || 0),
    target_grinding: Number(payload.target_grinding || 0),
    target_shotblast: Number(payload.target_shotblast || 0),
    target_turning: Number(payload.target_turning || 0),
    target_milling: Number(payload.target_milling || 0),
    target_welding: Number(payload.target_welding || 0),
    standar_kualitas: payload.standar_kualitas || '',
    status: payload.status || 'AKTIF',
    updated_at: new Date().toISOString()
  };

  const existingIdx = localData.products.findIndex(p => p.id === id);
  if (existingIdx >= 0) {
    localData.products[existingIdx] = { ...localData.products[existingIdx], ...record };
  } else {
    record.created_at = new Date().toISOString();
    localData.products.unshift(record);
  }
  writeLocalStorage(localData);
  syncMasterOutputProdukJson(localData.products);

  try {
    const client = getAdminClient();
    await client.from('master_products').upsert(record);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: isNew ? 'CREATE' : 'UPDATE',
    target_module: 'PRODUK',
    description: `${isNew ? 'Menambahkan' : 'Memperbarui'} master produk: ${record.nama_produk}`
  });

  return { success: true, data: record };
}

export async function deleteMasterProduct(id, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  let deletedItem = null;
  if (Array.isArray(localData.products)) {
    const idx = localData.products.findIndex(p => p.id === id);
    if (idx >= 0) {
      deletedItem = localData.products[idx];
      localData.products.splice(idx, 1);
    }
  }

  if (deletedItem) {
    if (!Array.isArray(localData.recycle_bin)) localData.recycle_bin = [];
    localData.recycle_bin.unshift({
      id: `bin-${Date.now()}`,
      plant_id: Number(plantId || 5),
      entity_type: 'PRODUK',
      entity_id: deletedItem.id,
      item_name: `${deletedItem.nama_produk} (${deletedItem.kode_produk || 'No Code'})`,
      payload: deletedItem,
      deleted_by: adminUsername,
      deleted_at: new Date().toISOString()
    });
    writeLocalStorage(localData);
    syncMasterOutputProdukJson(localData.products);
  }

  try {
    const client = getAdminClient();
    await client.from('master_products').delete().eq('id', id);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'DELETE',
    target_module: 'PRODUK',
    description: `Memindahkan produk ${deletedItem?.nama_produk || id} ke Recycle Bin`
  });

  return { success: true, message: 'Data produk dipindahkan ke Recycle Bin.' };
}

// ==============================================================================
// 10. MASTER SECTIONS CRUD
// ==============================================================================
export async function getMasterSections(plantId = 5) {
  const localData = readLocalStorage();
  let list = (localData.sections || []).filter(item => Number(item.plant_id || 5) === Number(plantId));

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('master_sections')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data;
      localData.sections = data;
      writeLocalStorage(localData);
    }
  } catch (err) {}

  return { success: true, data: list };
}

export async function saveMasterSection(payload, plantId = 5, adminUsername = 'Admin') {
  if (!payload || !payload.nama_section) {
    return { success: false, message: 'Nama section wajib diisi.' };
  }

  const localData = readLocalStorage();
  if (!Array.isArray(localData.sections)) localData.sections = [];

  const id = payload.id || `sec-${Date.now()}`;
  const isNew = !payload.id || !localData.sections.some(s => s.id === id);

  const record = {
    id,
    plant_id: Number(plantId || 5),
    nama_section: String(payload.nama_section).trim(),
    departemen: payload.departemen || 'Produksi',
    keterangan: payload.keterangan || '',
    status: payload.status || 'AKTIF',
    updated_at: new Date().toISOString()
  };

  const existingIdx = localData.sections.findIndex(s => s.id === id);
  if (existingIdx >= 0) {
    localData.sections[existingIdx] = { ...localData.sections[existingIdx], ...record };
  } else {
    record.created_at = new Date().toISOString();
    localData.sections.unshift(record);
  }
  writeLocalStorage(localData);

  try {
    const client = getAdminClient();
    await client.from('master_sections').upsert(record);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: isNew ? 'CREATE' : 'UPDATE',
    target_module: 'SECTION',
    description: `${isNew ? 'Menambahkan' : 'Memperbarui'} master section: ${record.nama_section}`
  });

  return { success: true, data: record };
}

export async function deleteMasterSection(id, plantId = 5, adminUsername = 'Admin') {
  const localData = readLocalStorage();
  let deletedItem = null;
  if (Array.isArray(localData.sections)) {
    const idx = localData.sections.findIndex(s => s.id === id);
    if (idx >= 0) {
      deletedItem = localData.sections[idx];
      localData.sections.splice(idx, 1);
    }
  }

  if (deletedItem) {
    if (!Array.isArray(localData.recycle_bin)) localData.recycle_bin = [];
    localData.recycle_bin.unshift({
      id: `bin-${Date.now()}`,
      plant_id: Number(plantId || 5),
      entity_type: 'SECTION',
      entity_id: deletedItem.id,
      item_name: `${deletedItem.nama_section} (${deletedItem.departemen || 'Produksi'})`,
      payload: deletedItem,
      deleted_by: adminUsername,
      deleted_at: new Date().toISOString()
    });
    writeLocalStorage(localData);
  }

  try {
    const client = getAdminClient();
    await client.from('master_sections').delete().eq('id', id);
  } catch (err) {}

  await logAdminActivity(plantId, {
    admin_username: adminUsername,
    action_type: 'DELETE',
    target_module: 'SECTION',
    description: `Memindahkan section ${deletedItem?.nama_section || id} ke Recycle Bin`
  });

  return { success: true, message: 'Section dipindahkan ke Recycle Bin.' };
}

// ==============================================================================
// 11. BACKUP & SYSTEM HEALTH DATA
// ==============================================================================
export async function getSystemBackupSummary(plantId = 5) {
  const client = getAdminClient();
  const localData = readLocalStorage();

  let counts = {
    siswa: 0,
    absensi: 0,
    spv: localData.spv?.length || 0,
    products: localData.products?.length || 0,
    sections: localData.sections?.length || 0,
    machines: localData.machines?.length || 0,
    recycle_bin: localData.recycle_bin?.length || 0,
    activity_logs: localData.activity_logs?.length || 0,
    timestamp: new Date().toISOString()
  };

  try {
    const [siswaRes, absensiRes] = await Promise.all([
      client.from('siswa').select('*', { count: 'exact', head: true }),
      client.from('absensi').select('*', { count: 'exact', head: true })
    ]);
    if (siswaRes.count !== null) counts.siswa = siswaRes.count;
    if (absensiRes.count !== null) counts.absensi = absensiRes.count;
  } catch (err) {}

  return { success: true, data: counts };
}
