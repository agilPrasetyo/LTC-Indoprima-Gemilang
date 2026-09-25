-- ==============================================================================
-- SKEMA DATABASE MASTER SETTING & MULTI-PLANT SUPPORT
-- LTC INDOPRIMA GEMILANG
-- ==============================================================================
-- Catatan:
-- 1. Skema ini dirancang default untuk Plant 5 (Casting) dan siap untuk Plant 1, 2, 6.
-- 2. Jalankan skrip ini di SQL Editor Dashboard Supabase Anda.
-- ==============================================================================

-- 1. TABEL MASTER SPV
CREATE TABLE IF NOT EXISTS public.master_spv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    nama TEXT NOT NULL,
    nik TEXT,
    departemen TEXT,
    section TEXT,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- 'AKTIF' / 'NONAKTIF'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_spv_plant ON public.master_spv(plant_id);

-- 2. TABEL MASTER PRODUK & TARGET MANUFAKTUR
CREATE TABLE IF NOT EXISTS public.master_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    nama_produk TEXT NOT NULL,
    kode_produk TEXT,
    section TEXT,
    target_output INT DEFAULT 0, -- target pcs per shift / jam
    cycle_time NUMERIC(10,2) DEFAULT 0, -- target waktu dalam detik
    standar_kualitas TEXT, -- toleransi defect atau catatan QC
    status TEXT NOT NULL DEFAULT 'AKTIF', -- 'AKTIF' / 'NONAKTIF'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_products_plant ON public.master_products(plant_id);

-- 3. TABEL MASTER SECTION / DEPARTEMEN
CREATE TABLE IF NOT EXISTS public.master_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    nama_section TEXT NOT NULL,
    departemen TEXT,
    keterangan TEXT,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- 'AKTIF' / 'NONAKTIF'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_sections_plant ON public.master_sections(plant_id);

-- 4. TABEL MASTER MESIN PRODUKSI
CREATE TABLE IF NOT EXISTS public.master_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    kode_mesin TEXT NOT NULL,
    nama_mesin TEXT NOT NULL,
    section TEXT,
    tipe_kapasitas TEXT,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- 'AKTIF', 'MAINTENANCE', 'STANDBY'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_machines_plant ON public.master_machines(plant_id);

-- 5. TABEL LOG AKTIVITAS ADMIN (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    admin_username TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'EXPORT'
    target_module TEXT NOT NULL, -- 'MESIN', 'SPV', 'PRODUK', 'SECTION', 'KELULUSAN', 'SERTIFIKAT', 'REPORT_CARD', 'SISWA', 'SETTING'
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_plant ON public.admin_activity_logs(plant_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_time ON public.admin_activity_logs(created_at DESC);

-- 6. TABEL RECYCLE BIN (SOFT DELETE & RESTORE)
CREATE TABLE IF NOT EXISTS public.recycle_bin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    entity_type TEXT NOT NULL, -- 'MESIN', 'SPV', 'PRODUK', 'SECTION', 'SISWA'
    entity_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    deleted_by TEXT NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recycle_bin_plant ON public.recycle_bin(plant_id);

-- 7. TABEL SYSTEM SETTINGS (BATCH, KKM, ATURAN KELULUSAN, TEMPLATE SERTIFIKAT, REPORT CARD, DAN PIN)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id INT NOT NULL DEFAULT 5,
    batch_aktif TEXT DEFAULT 'Batch 2026-A',
    kkm_teori NUMERIC(5,2) DEFAULT 75.00,
    kkm_praktik NUMERIC(5,2) DEFAULT 80.00,
    kkm_sikap NUMERIC(5,2) DEFAULT 80.00,
    kkm_absensi NUMERIC(5,2) DEFAULT 95.00,
    master_pin_hash TEXT, -- Hash PIN Super Admin
    backup_auto BOOLEAN DEFAULT TRUE,
    graduation_rules JSONB DEFAULT '{
        "kkm_teori": 75,
        "kkm_praktik": 80,
        "kkm_sikap": 80,
        "min_absensi": 90,
        "max_alpa": 2,
        "evaluasi_mode": "AUTOMATIC",
        "catatan_kelulusan": "Siswa dinyatakan LULUS bila seluruh nilai memenuhi KKM dan kehadiran minimal 90%."
    }'::jsonb,
    report_card_config JSONB DEFAULT '{
        "bobot_teori": 25,
        "bobot_praktik": 45,
        "bobot_sikap": 15,
        "bobot_safety_5s": 15,
        "tampilkan_ranking": true,
        "tampilkan_radar": true,
        "tampilkan_catatan_spv": true,
        "grade_a_min": 90,
        "grade_b_min": 80,
        "grade_c_min": 70
    }'::jsonb,
    certificate_template_config JSONB DEFAULT '{
        "nomor_format": "LTC/P5/{YYYY}/{BATCH}/{NO}",
        "penandatangan_1_nama": "Ir. H. Hendra Wijaya",
        "penandatangan_1_jabatan": "Plant Manager - Plant 5 Casting",
        "penandatangan_1_npk": "MGR-5001",
        "penandatangan_2_nama": "Siti Rahmawati, S.Psi.",
        "penandatangan_2_jabatan": "HRD & Training Center Manager",
        "penandatangan_2_npk": "HRD-2015",
        "stempel_aktif": true,
        "masa_berlaku": "3 Tahun sejak diterbitkan"
    }'::jsonb,
    extra_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_system_settings_plant UNIQUE(plant_id)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_plant ON public.system_settings(plant_id);

-- Data Awal Default untuk Plant 5 Casting jika belum ada
INSERT INTO public.system_settings (plant_id, batch_aktif, kkm_teori, kkm_praktik, kkm_sikap, kkm_absensi)
VALUES (5, 'Batch 2026-A', 75.00, 80.00, 80.00, 95.00)
ON CONFLICT (plant_id) DO NOTHING;
