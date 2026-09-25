// ============================================================================
// MODUL LMS SKILL MAP & MATRIKS KOMPETENSI SISWA (LTC INDOPRIMA GEMILANG)
// Visualisasi Spider Web Radar & Matriks Evaluasi Kejuruan Per Section
// Desain: Corporate & Tabular Professional Sesuai Referensi (Ungu Terong #3B1443 & Electric Magenta #D946EF)
// Tanpa Ikon Hiasan, Dynamic Filtering Section Aktif
// ============================================================================

(function() {
    // 1. Kamus Definisi Resmi 22 Section Manufaktur & Kompetensi Kejuruan (LTC Indoprima)
    const DEFAULT_SECTION_SKILLS_MASTER = {
        // --- 1. DEPARTEMEN PRODUKSI (11 Section) ---
        'GRINDING': [
            'Surface Grinding',
            'Cylindrical Grinding',
            'Wheel Dressing & Balance',
            'Precision Measurement',
            'Toleransi & Finishing Ra',
            'Tool & Machine Setup'
        ],
        'CORE': [
            'Pembuatan Inti Pasir',
            'Resin & Sand Mixing',
            'Core Assembly & Coating',
            'Core Baking & Curing',
            'Inspeksi Cacat Retak/Patah',
            'Finishing & Deburring Core'
        ],
        'FURAN': [
            'Pola & Cetakan Pasir Furan',
            'Hardener & Resin Ratio',
            'Compaction & Stripping',
            'Mould Coating & Drying',
            'Gating & Riser Setup',
            'Mould Assembly & Clamping'
        ],
        'MELTING': [
            'Furnace Induction Operation',
            'Kalkulasi Charge Material',
            'Kontrol Suhu & Pyrometer',
            'Slag Removal & Deoksidasi',
            'Spektrometri Komposisi Logam',
            'Tapping & Ladle Preparation'
        ],
        'POURING': [
            'Handling Ladle & Crane',
            'Kontrol Temperatur Tuang',
            'Laju & Kecepatan Aliran Tuang',
            'Slag Trapping & Skimming',
            'Inokulasi Cairan Logam',
            'Waktu Pendinginan Coran'
        ],
        'FINISHING': [
            'Pemotongan Gate & Riser',
            'Deburring & Dressing Coran',
            'Pembersihan Permukaan Casting',
            'Inspeksi Visual Cacat Cor',
            'Pengukuran Dimensi Kasar',
            'Sortir & Handling Produk'
        ],
        'SHOTBLAST': [
            'Operasi Mesin Shotblast',
            'Pengaturan Media Steel Shot',
            'Pembersihan Sisa Pasir Cor',
            'Siklus & Waktu Blasting',
            'Inspeksi Kebersihan SA 2.5',
            'Perawatan Dust Collector'
        ],
        'MACHINING': [
            'CNC Lathe / Bubut',
            'CNC Milling / Freis',
            'Pemrograman CAD/CAM & Offset',
            'Toleransi Geometris GD&T',
            'Cutting Tool Setup & Insert',
            'Speed & Feed Rate Optimization'
        ],
        'PAINTING': [
            'Persiapan Permukaan & Degreasing',
            'Setting Spray Gun & Atomisasi',
            'Viskositas & Pencampuran Cat',
            'Ketebalan Lapisan (DFT/WFT)',
            'Curing & Oven Temperature',
            'Uji Adhesi & Visual Coating'
        ],
        'ASSEMBLY': [
            'Perakitan Komponen Mekanis',
            'Torsi & Pengencangan Baut',
            'Penyelarasan (Alignment) Part',
            'Uji Fungsi Gerak Komponen',
            'Sub-Assembly & Packaging',
            'Verifikasi Kelengkapan Part'
        ],
        'ADM PRODUKSI': [
            'Rekapitulasi Laporan Manpower',
            'Pencatatan Plan vs Aktual Output',
            'Monitoring Efisiensi Lini (OEE)',
            'Input Data Scrap & Reject',
            'Administrasi Surat Jalan',
            'Pengarsipan Dokumen Kerja'
        ],

        // --- 2. DEPARTEMEN ENGINEERING (5 Section) ---
        'MAINTENANCE': [
            'Preventive Maintenance (PM)',
            'Diagnosa Elektrikal & Wiring',
            'Sistem Hidrolik & Pneumatik',
            'Mechanical Alignment & Bearing',
            'Troubleshooting Sensor & PLC',
            'Prosedur Lockout / Tagout (LOTO)'
        ],
        'PATTERN': [
            'Pembuatan Pola Cetakan Kayu/Resin',
            'Dimensi & Shrinkage Allowance',
            'Perbaikan & Modifikasi Pola',
            'Finishing Permukaan Pattern',
            'Pemeliharaan Master Pattern',
            'Verifikasi Gambar Kerja CAD'
        ],
        'TOOLING': [
            'Pemeliharaan Cutting Tools',
            'Pengasahan Mata Potong & Re-grind',
            'Pembuatan Jig & Fixture',
            'Kalibrasi Tool Holder',
            'Inventori Tool Crib & Sisipan',
            'Presisi Dimensi Perkakas'
        ],
        'UTILITY': [
            'Operasi Kompresor Udara Pabrik',
            'Sistem Pendingin Cooling Tower',
            'Distribusi Kelistrikan & Genset',
            'Pengolahan Air Industri (WTP)',
            'Monitoring Tekanan & Aliran Gas',
            'Safety Tanggap Darurat Utility'
        ],
        'ADM MAINTENANCE': [
            'Inventori Suku Cadang Mesin',
            'Schedule Preventive Maintenance',
            'Administrasi Work Order (WO)',
            'Pencatatan MTBF & MTTR',
            'Purchase Requisition Sparepart',
            'Dokumentasi Riwayat Mesin'
        ],

        // --- 3. DEPARTEMEN PERSONALIA & SHE (4 Section) ---
        'SAFETY': [
            'Identifikasi Bahaya (HIRADC)',
            'Inspeksi Kepatuhan APD Lapangan',
            'Investigasi & Analisis Insiden',
            'Kesiapsiagaan Tanggap Darurat',
            'Safety Induction & Toolbox Meeting',
            'Penerapan Ergonomi Kerja'
        ],
        'ENVIRONMENT': [
            'Pengelolaan Limbah B3 & Non-B3',
            'Monitoring Emisi Cerobong & Udara',
            'Operasional IPAL / Wastewater',
            'Kepatuhan Standar ISO 14001',
            'Pemilahan Sampah Industri',
            'Konservasi Energi & Air'
        ],
        'SECURITY': [
            'Pengawasan Akses Masuk Gerbang',
            'Patroli Keamanan Area Pabrik',
            'Penanganan Pelanggaran Keamanan',
            'Pengoperasian Sistem CCTV',
            'Prosedur Tamu & Kontraktor',
            'Kesiapsiagaan Pos Jaga'
        ],
        'HRD & GENERAL': [
            'Administrasi Kehadiran & Lembur',
            'Distribusi Seragam & Loker Siswa',
            'Pengelolaan Fasilitas Mess Siswa',
            'Pelaksanaan 5R Area Kantor/Publik',
            'Administrasi Perizinan & Disiplin',
            'Fasilitasi Evaluasi Magang'
        ],

        // --- 4. DEPARTEMEN QUALITY CONTROL (2 Section) ---
        'QC POURING': [
            'Pengecekan Suhu Tuang Logam',
            'Thermal Analysis (CELOX / Curva)',
            'Verifikasi Inokulasi Logam',
            'Uji Kecepatan Alir Cetakan',
            'Pemeriksaan Spektrometri Sampel',
            'Dokumentasi Heat Number Cor'
        ],
        'QC FINISHING': [
            'Inspeksi Dimensi CMM / Manual',
            'Analisis Cacat Coran (Porosity/Crack)',
            'Pengujian Hardness (Brinell/Rockwell)',
            'Non-Destructive Testing (UT/MT)',
            'Inspeksi Finishing & Roughness Ra',
            'Final Acceptance & Tagging OK'
        ],

        // --- Section Operasional Tambahan (Sesuai Penempatan Aktual Siswa) ---
        'PPIC': [
            'Master Production Schedule (MPS)',
            'Monitoring Kapasitas Mesin',
            'Kontrol Stok Bahan Baku & Part',
            'Pemantauan Delivery Schedule',
            'Administrasi Work-In-Progress (WIP)',
            'Koordinasi Lintas Divisi Pabrik'
        ],
        'LADLE': [
            'Pemanasan Pre-heat Ladle',
            'Pelapisan Refractory Lining',
            'Perawatan Mekanisme Tilting',
            'Inspeksi Ketahanan Dinding Ladle',
            'Pencegahan Slag Carryover',
            'Safety Transportasi Logam Cair'
        ],
        'QC': [
            'Dimensional Inspection',
            'Visual Defect Analysis',
            'Hardness & Strength Testing',
            'Non-Destructive Testing',
            'Statistical Process Control (SPC)',
            'Kalibrasi Instrumen Alat Ukur'
        ],
        'GENERAL': [
            'Standard Operating Procedure (SOP)',
            'Penggunaan Alat Ukur Presisi',
            'K3 Manufaktur & Penggunaan APD',
            'Analisis Defect & Reject Produk',
            'Perawatan Mesin Mandiri (TPM)',
            '5R (Ringkas, Rapi, Resik, Rawat, Rajin)'
        ]
    };

    const DEFAULT_SECTION_DEPT_MAP = {
        'GRINDING': 'PRODUKSI',
        'CORE': 'PRODUKSI',
        'FURAN': 'PRODUKSI',
        'MELTING': 'PRODUKSI',
        'POURING': 'PRODUKSI',
        'FINISHING': 'PRODUKSI',
        'SHOTBLAST': 'PRODUKSI',
        'MACHINING': 'PRODUKSI',
        'PAINTING': 'PRODUKSI',
        'ASSEMBLY': 'PRODUKSI',
        'ADM PRODUKSI': 'PRODUKSI',
        
        'MAINTENANCE': 'ENGINEERING',
        'PATTERN': 'ENGINEERING',
        'TOOLING': 'ENGINEERING',
        'UTILITY': 'ENGINEERING',
        'ADM MAINTENANCE': 'ENGINEERING',
        
        'SAFETY': 'SHE',
        'ENVIRONMENT': 'SHE',
        'SECURITY': 'SHE',
        'HRD & GENERAL': 'SHE',
        
        'QC POURING': 'QC',
        'QC FINISHING': 'QC',
        'QC': 'QC',
        'PPIC': 'QC',
        'LADLE': 'QC',
        'GENERAL': 'QC'
    };

    // Kamus Kompetensi Dinamis yang Dapat Diedit, Ditambah, & Dihapus oleh Pengguna (Persisten)
    const SM_CUSTOM_SKILLS_KEY = 'ltc_skillmap_custom_dict_v1';
    let SECTION_SKILLS_MASTER = { ...DEFAULT_SECTION_SKILLS_MASTER };
    let SECTION_DEPT_MAP = { ...DEFAULT_SECTION_DEPT_MAP };

    function initSkillDictionaryFromStorage() {
        try {
            const saved = localStorage.getItem(SM_CUSTOM_SKILLS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.skills && typeof parsed.skills === 'object') {
                    SECTION_SKILLS_MASTER = { ...DEFAULT_SECTION_SKILLS_MASTER, ...parsed.skills };
                }
                if (parsed && parsed.depts && typeof parsed.depts === 'object') {
                    SECTION_DEPT_MAP = { ...DEFAULT_SECTION_DEPT_MAP, ...parsed.depts };
                }
            }
        } catch (e) {
            console.warn('[SkillMap] Error loading custom dictionary from storage:', e);
        }
        window.SECTION_SKILLS_DICT = SECTION_SKILLS_MASTER;
    }
    initSkillDictionaryFromStorage();

    function saveSkillDictionaryToStorage() {
        try {
            localStorage.setItem(SM_CUSTOM_SKILLS_KEY, JSON.stringify({
                skills: SECTION_SKILLS_MASTER,
                depts: SECTION_DEPT_MAP
            }));
        } catch (e) {
            console.warn('[SkillMap] Error saving custom dictionary to storage:', e);
        }
        window.SECTION_SKILLS_DICT = SECTION_SKILLS_MASTER;
    }

    // State Internal & Evaluasi Riil
    let smRadarChartInstance = null;
    let smCurrentPage = 1;
    const SM_PAGE_SIZE = 20;
    let smComputedStudentData = [];
    let smActiveSectionSkills = SECTION_SKILLS_MASTER['GRINDING'];
    let smActiveSectionsList = []; // Menyimpan daftar section yang memiliki siswa aktif
    let smEvaluationsMap = {}; // Menyimpan evaluasi riil dari Supabase / storage
    let smIsEvaluationsLoaded = false;
    let currentEvalStudent = null;
    let currentEvalSkills = [];
    let currentEvalRealMetrics = { attendancePct: 95.0, quizScore: 80.0, autoScore: 85.0 };

    // Helper Integrasi Data Riil: Kehadiran Presensi dari absensiData
    function getStudentAttendanceRate(noreg) {
        const rawAbsensi = (typeof absensiData !== 'undefined' && Array.isArray(absensiData))
            ? absensiData
            : ((typeof window !== 'undefined' && (window.absensiData || window.rawAbsensiData)) || []);
        const sNoreg = String(noreg || '').trim().toUpperCase();
        const records = rawAbsensi.filter(a => String(a.noreg || a.id || a.siswa_id || '').trim().toUpperCase() === sNoreg);
        if (records.length === 0) return null;
        let hadir = 0, total = 0;
        records.forEach(a => {
            const st = (a.status || '').toString().trim().toLowerCase();
            if (st === 'x' || st === 'hari minggu') return;
            if (st === 'hadir' || st === 'h' || st === 'masuk') hadir++;
            if (['hadir', 'h', 'masuk', 'ijin', 'izin', 'i', 'sakit', 's', 'alpha', 'alpa', 'a'].includes(st)) total++;
        });
        if (total === 0) return null;
        return Math.round((hadir / total) * 1000) / 10;
    }

    // Helper Integrasi Data Riil: Kuis Kejuruan dari quiz_storage
    function getStudentQuizAverage(noreg) {
        const qStore = (typeof quizGlobalData !== 'undefined' && quizGlobalData) ? quizGlobalData : ((typeof window !== 'undefined' && window.quizGlobalData) || null);
        const submissions = (qStore && Array.isArray(qStore.submissions)) ? qStore.submissions : [];
        const sNoreg = String(noreg || '').trim().toUpperCase();
        const studentSubs = submissions.filter(s => String(s.noreg || '').trim().toUpperCase() === sNoreg);
        if (studentSubs.length === 0) return null;
        const sum = studentSubs.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
        return Math.round((sum / studentSubs.length) * 10) / 10;
    }

    // Helper Integrasi Data Riil: Menghitung Skor Acuan Sistem Gabungan (Presensi + Kuis)
    function getStudentRealMetrics(noreg) {
        const att = getStudentAttendanceRate(noreg);
        const quiz = getStudentQuizAverage(noreg);
        let autoScore = 82.0;

        if (att !== null && quiz !== null) {
            autoScore = Math.round(((att * 0.5) + (quiz * 0.5)) * 10) / 10;
        } else if (att !== null) {
            autoScore = att;
        } else if (quiz !== null) {
            autoScore = quiz;
        }

        return {
            attendancePct: att !== null ? att : 95.0,
            quizScore: quiz !== null ? quiz : 80.0,
            autoScore: Math.min(98, Math.max(60, autoScore))
        };
    }

    // Normalizer Penamaan Section
    function matchSection(raw) {
        const s = String(raw || '').trim().toUpperCase();
        if (!s) return 'GENERAL';
        if (s.includes('QC POURING') || (s.includes('POURING') && s.includes('QC'))) return 'QC POURING';
        if (s.includes('QC FINISHING') || (s.includes('FINISHING') && s.includes('QC'))) return 'QC FINISHING';
        if (s.includes('ADM MAINTENANCE') || (s.includes('ADM') && s.includes('MAINT'))) return 'ADM MAINTENANCE';
        if (s.includes('ADM PRODUKSI') || (s.includes('ADM') && s.includes('PROD'))) return 'ADM PRODUKSI';
        if (s.includes('GRIND')) return 'GRINDING';
        if (s.includes('CORE') || s.includes('INTI')) return 'CORE';
        if (s.includes('FURAN')) return 'FURAN';
        if (s.includes('MELT') || s.includes('PELEBURAN')) return 'MELTING';
        if (s.includes('POURING') || s.includes('TUANG')) return 'POURING';
        if (s.includes('SHOTBLAST') || s.includes('BLAST')) return 'SHOTBLAST';
        if (s.includes('MACHIN') || s.includes('BUBUT') || s.includes('MILLING')) return 'MACHINING';
        if (s.includes('PAINT') || s.includes('CAT')) return 'PAINTING';
        if (s.includes('ASSEMBL')) return 'ASSEMBLY';
        if (s.includes('PATTERN') || s.includes('POLA')) return 'PATTERN';
        if (s.includes('TOOLING') || s.includes('TOOL')) return 'TOOLING';
        if (s.includes('UTILITY') || s.includes('UTIL')) return 'UTILITY';
        if (s.includes('MAINT') || s.includes('PERBAIKAN')) return 'MAINTENANCE';
        if (s.includes('PPIC')) return 'PPIC';
        if (s.includes('LADLE')) return 'LADLE';
        if (s.includes('FINISH')) return 'FINISHING';
        if (s.includes('SAFETY') || s.includes('K3')) return 'SAFETY';
        if (s.includes('ENVIRON') || s.includes('LINGKUNGAN')) return 'ENVIRONMENT';
        if (s.includes('SECUR') || s.includes('SATPAM')) return 'SECURITY';
        if (s.includes('HRD') || s.includes('PERSONALIA')) return 'HRD & GENERAL';
        if (s.startsWith('QC') || s.includes('QUALITY')) return 'QC';
        return s || 'GENERAL';
    }

    // Formatter Tampilan Section (Format Natural & Tidak Bold)
    function formatSectionName(raw) {
        if (!raw) return '';
        const s = String(raw).trim();
        if (s.toUpperCase() === 'PPIC') return 'PPIC';
        if (s.toUpperCase() === 'QC POURING') return 'QC Pouring';
        if (s.toUpperCase() === 'QC FINISHING') return 'QC Finishing';
        if (s.toUpperCase() === 'QC') return 'QC';
        if (s.toUpperCase().startsWith('ADM ')) {
            const words = s.split(' ');
            return 'Adm ' + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    window.formatSectionName = formatSectionName;

    // ------------------------------------------------------------------------
    // POPULATE DINAMIS DROPDOWN & CHIPS FILTER SECTION (TERKELOMPOK PER DEPARTEMEN)
    // ------------------------------------------------------------------------
    let smFilterActiveDept = 'ALL';

    function setFilterDeptTab(deptKey) {
        smFilterActiveDept = deptKey;
        renderFilterGroupedChips();
    }
    window.setFilterDeptTab = setFilterDeptTab;

    function renderFilterGroupedChips() {
        const tabsContainer = document.getElementById('sm-filter-dept-tabs');
        const chipsContainer = document.getElementById('sm-filter-section-chips');
        if (!tabsContainer || !chipsContainer) return;

        const currentVal = (document.getElementById('filter-skillmap-section')?.value) || 'ALL';

        const deptMeta = [
            { key: 'ALL', label: 'Semua Section' },
            { key: 'PRODUKSI', label: 'Produksi' },
            { key: 'ENGINEERING', label: 'Engineering' },
            { key: 'SHE', label: 'SHE & HR' },
            { key: 'QC', label: 'Quality & Lab' }
        ];

        // Tabs Departemen (Segmented Control Pills)
        tabsContainer.innerHTML = deptMeta.map(d => {
            const isActive = smFilterActiveDept === d.key;
            const activeCls = isActive
                ? 'bg-[#3B1443] text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80 font-medium';
            return `
                <button type="button" onclick="setFilterDeptTab('${d.key}')"
                    class="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer shrink-0 ${activeCls}">
                    ${d.label}
                </button>
            `;
        }).join('');

        // Filter daftar section berdasarkan tab departemen yang aktif
        let sectionsToShow = smActiveSectionsList;
        if (smFilterActiveDept !== 'ALL') {
            sectionsToShow = smActiveSectionsList.filter(sec => (SECTION_DEPT_MAP[sec] || 'QC') === smFilterActiveDept);
        }

        if (sectionsToShow.length === 0) {
            chipsContainer.innerHTML = `<span class="text-xs text-slate-400 italic py-1">Tidak ada section aktif pada kategori ini.</span>`;
            return;
        }

        // Section Chips (White Tiles with Border on Slate Container)
        chipsContainer.innerHTML = sectionsToShow.map(sec => {
            const isSelected = currentVal === sec;
            const chipCls = isSelected
                ? 'bg-[#3B1443] text-white font-semibold border-[#3B1443] shadow-xs'
                : 'bg-white hover:bg-purple-50 hover:text-[#3B1443] text-slate-700 border-slate-300 hover:border-purple-400 font-medium shadow-2xs';

            return `
                <button type="button" onclick="selectSectionFilter('${sec}')"
                    class="px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer ${chipCls} active:scale-95">
                    ${formatSectionName(sec)}
                </button>
            `;
        }).join('');
    }
    window.renderFilterGroupedChips = renderFilterGroupedChips;

    function populateSkillMapSectionDropdown() {
        const sectionSelect = document.getElementById('filter-skillmap-section');
        if (!sectionSelect) return;

        const allStudents = (typeof window !== 'undefined' && Array.isArray(window.activeData) && window.activeData.length > 0)
            ? window.activeData
            : (typeof window !== 'undefined' && Array.isArray(window.rawSiswaData) ? window.rawSiswaData : []);

        const activeStudents = allStudents.filter(s => {
            const st = String(s.status || '').toUpperCase();
            return st === 'AKTIF' || st === '';
        });

        // Hitung jumlah siswa aktif per section
        const sectionCounts = {};
        activeStudents.forEach(s => {
            const sec = matchSection(s.section || s.bagian || s.departemen || '');
            sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
        });

        // Urutkan berdasarkan jumlah siswa terbanyak, lalu alfabet
        smActiveSectionsList = Object.keys(sectionCounts).sort((a, b) => {
            if (sectionCounts[b] !== sectionCounts[a]) return sectionCounts[b] - sectionCounts[a];
            return a.localeCompare(b);
        });

        const currentVal = sectionSelect.value || 'ALL';

        let optionsHtml = `<option value="ALL" ${currentVal === 'ALL' ? 'selected' : ''}>Semua Section Aktif (${activeStudents.length} Siswa)</option>`;

        // Group per Departemen
        const deptGroups = [
            { key: 'PRODUKSI', label: 'Departemen Produksi' },
            { key: 'ENGINEERING', label: 'Departemen Engineering' },
            { key: 'SHE', label: 'Departemen SHE & HR' },
            { key: 'QC', label: 'Departemen Quality & Lainnya' }
        ];

        deptGroups.forEach(g => {
            const secInDept = smActiveSectionsList.filter(s => (SECTION_DEPT_MAP[s] || 'QC') === g.key);
            if (secInDept.length > 0) {
                optionsHtml += `<optgroup label="${g.label}">`;
                secInDept.forEach(sec => {
                    const count = sectionCounts[sec];
                    const isSel = (currentVal === sec) ? 'selected' : '';
                    optionsHtml += `<option value="${sec}" ${isSel}>${formatSectionName(sec)} (${count} Siswa)</option>`;
                });
                optionsHtml += `</optgroup>`;
            }
        });

        sectionSelect.innerHTML = optionsHtml;
        renderFilterGroupedChips();
    }

    // ------------------------------------------------------------------------
    // 2. FUNGSI UTAMA: LOAD & RENDER DATA SKILL MAP (HYBRID: PRAKTIK + DATA RIIL)
    // ------------------------------------------------------------------------
    async function loadSkillMapData(isManualRefresh = false) {
        // 1. Muat evaluasi tersimpan dari database Supabase / storage lokal
        if (!smIsEvaluationsLoaded || isManualRefresh) {
            try {
                if (typeof executeRpcCall === 'function') {
                    const res = await executeRpcCall('getSkillEvaluations', []);
                    if (res && res.success && Array.isArray(res.evaluations)) {
                        smEvaluationsMap = {};
                        res.evaluations.forEach(ev => {
                            if (ev && ev.noreg) {
                                smEvaluationsMap[String(ev.noreg).trim()] = ev;
                            }
                        });
                        smIsEvaluationsLoaded = true;
                    }
                }
            } catch (err) {
                console.warn('[loadSkillMapData] Error fetching skill evaluations:', err);
            }
        }

        // Pastikan juga data kuis tersedia jika belum dimuat
        const qStore = (typeof quizGlobalData !== 'undefined' && quizGlobalData) ? quizGlobalData : ((typeof window !== 'undefined' && window.quizGlobalData) || null);
        if (!qStore || !Array.isArray(qStore.submissions)) {
            try {
                if (typeof executeRpcCall === 'function') {
                    const qRes = await executeRpcCall('getQuizData', []);
                    if (qRes && qRes.success && qRes.data) {
                        window.quizGlobalData = qRes.data;
                    }
                }
            } catch (qErr) {
                // silent
            }
        }

        populateSkillMapSectionDropdown();

        const sectionSelect = document.getElementById('filter-skillmap-section');
        const selectedSection = sectionSelect ? sectionSelect.value : 'ALL';
        const kelasSelect = document.getElementById('filter-skillmap-kelas');
        const selectedKelas = kelasSelect ? kelasSelect.value : '';
        const searchInput = document.getElementById('filter-skillmap-query');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

        // Tentukan daftar skill yang aktif
        if (selectedSection === 'ALL' || !SECTION_SKILLS_MASTER[selectedSection]) {
            smActiveSectionSkills = SECTION_SKILLS_MASTER['GENERAL'];
        } else {
            smActiveSectionSkills = SECTION_SKILLS_MASTER[selectedSection];
        }

        // Perbarui badge judul section
        const sectionBadge = document.getElementById('sm-section-name-badge');
        if (sectionBadge) {
            sectionBadge.textContent = `Section: ${selectedSection === 'ALL' ? 'Semua Section Aktif' : formatSectionName(selectedSection)}`;
        }

        // Ambil data siswa dari window.activeData (sinkron Supabase)
        const allStudents = (typeof window !== 'undefined' && Array.isArray(window.activeData) && window.activeData.length > 0)
            ? window.activeData
            : (typeof window !== 'undefined' && Array.isArray(window.rawSiswaData) ? window.rawSiswaData : []);

        let activeStudents = allStudents.filter(s => {
            const st = String(s.status || '').toUpperCase();
            return st === 'AKTIF' || st === '';
        });

        // Filter Section jika bukan 'ALL'
        if (selectedSection !== 'ALL') {
            activeStudents = activeStudents.filter(s => {
                const sSection = matchSection(s.section || s.bagian || s.departemen || '');
                return sSection === selectedSection;
            });
        }

        // Filter Kelas
        if (selectedKelas) {
            activeStudents = activeStudents.filter(s => String(s.kelas || '').trim() === selectedKelas.trim());
        }

        // Filter Pencarian
        if (query) {
            activeStudents = activeStudents.filter(s => {
                const nama = String(s.namaLengkap || s.nama || '').toLowerCase();
                const noreg = String(s.id || s.noreg || '').toLowerCase();
                const spv = String(s.spv || s.nama_spv || '').toLowerCase();
                return nama.includes(query) || noreg.includes(query) || spv.includes(query);
            });
        }

        // Komputasi Skor Kompetensi Siswa (100% Data Riil: Input Supervisor + Integrasi Kuis & Presensi)
        smComputedStudentData = activeStudents.map(s => {
            const noreg = String(s.id || s.noreg || s.NoReg || '').trim();
            const nama = s.namaLengkap || s.nama || `Siswa ${noreg}`;
            const sectionStr = matchSection(s.section || s.bagian || s.departemen || selectedSection);
            const kelasStr = s.kelas || 'Kelas 3';
            const spvStr = s.spv || s.nama_spv || 'Supervisor';

            const realMetrics = getStudentRealMetrics(noreg);
            const savedEval = smEvaluationsMap[noreg] || null;

            const skillsToUse = (selectedSection !== 'ALL' && SECTION_SKILLS_MASTER[sectionStr])
                ? SECTION_SKILLS_MASTER[sectionStr]
                : smActiveSectionSkills;

            let scores = [];
            let avgScore = 0;
            let manualAvg = null;
            let isVerified = false;
            let evaluator = '';
            let notes = '';

            if (savedEval && Array.isArray(savedEval.scores) && savedEval.scores.length === 6) {
                // DATA RIIL: Diinput langsung oleh Supervisor/Instruktur
                scores = savedEval.scores.map(Number);
                manualAvg = savedEval.manualAvg || Math.round(scores.reduce((a, b) => a + b, 0) / 6 * 10) / 10;
                avgScore = savedEval.finalScore || manualAvg;
                isVerified = true;
                evaluator = savedEval.evaluator || '';
                notes = savedEval.notes || '';
            } else {
                // DATA RIIL SISTEM: Berbasis akumulasi data kuis kejuruan & presensi kehadiran
                const base = realMetrics.autoScore;
                scores = [base, base, base, base, base, base];
                avgScore = base;
                manualAvg = null;
                isVerified = false;
                evaluator = '';
                notes = 'Belum ada input evaluasi praktik manual dari supervisor.';
            }

            const isCompetent = avgScore >= 75;
            const isTargetMet = avgScore >= 85;

            return {
                noreg,
                nama,
                section: sectionStr,
                kelas: kelasStr,
                spv: spvStr,
                scores,
                avgScore,
                manualAvg,
                autoScore: realMetrics.autoScore,
                attendancePct: realMetrics.attendancePct,
                quizScore: realMetrics.quizScore,
                isVerified,
                evaluator,
                notes,
                isCompetent,
                isTargetMet
            };
        });

        updateKPISummaries(smComputedStudentData, selectedSection);
        renderRadarChart(smComputedStudentData, selectedSection);
        renderCompetencyProgressBars(smComputedStudentData, selectedSection);
        renderSectionSkillsLegendBar(selectedSection);
        updateTableSkillHeaders(selectedSection);
        renderStudentMatrixTable(true);
    }

    // ------------------------------------------------------------------------
    // 3. UPDATE KPI CARDS (Berwarna Hidup, Corporate Clean)
    // ------------------------------------------------------------------------
    function updateKPISummaries(students, selectedSection) {
        const total = students.length;
        if (total === 0) {
            setElText('sm-kpi-avg', '0.0%');
            setElText('sm-kpi-pass-count', '0 / 0');
            setElText('sm-kpi-pass-pct', '0%');
            setElText('sm-kpi-top-skill', '-');
            setElText('sm-kpi-top-score', '0.0%');
            setElText('sm-kpi-gap-skill', '-');
            setElText('sm-kpi-gap-score', 'Gap: 0.0%');
            return;
        }

        const overallAvg = students.reduce((acc, s) => acc + s.avgScore, 0) / total;
        setElText('sm-kpi-avg', `${overallAvg.toFixed(1)}%`);

        const badge = document.getElementById('sm-kpi-status-badge');
        if (badge) {
            if (overallAvg >= 85) {
                badge.textContent = 'Target Tercapai';
                badge.className = 'text-[10px] mt-2 bg-white/20 inline-block px-2.5 py-0.5 rounded font-bold text-white tracking-wide';
            } else if (overallAvg >= 75) {
                badge.textContent = 'Kompeten';
                badge.className = 'text-[10px] mt-2 bg-white/20 inline-block px-2.5 py-0.5 rounded font-bold text-white tracking-wide';
            } else {
                badge.textContent = 'Perlu Bimbingan';
                badge.className = 'text-[10px] mt-2 bg-white/20 inline-block px-2.5 py-0.5 rounded font-bold text-white tracking-wide';
            }
        }

        const passCount = students.filter(s => s.isTargetMet).length;
        const passPct = Math.round((passCount / total) * 100);
        setElText('sm-kpi-pass-count', `${passCount} / ${total}`);
        setElText('sm-kpi-pass-pct', `${passPct}%`);

        if (selectedSection === 'ALL') {
            // Evaluasi per section aktif
            const secAvgs = smActiveSectionsList.map(sec => {
                const secStudents = students.filter(s => s.section === sec);
                const avg = secStudents.length > 0
                    ? (secStudents.reduce((acc, s) => acc + s.avgScore, 0) / secStudents.length)
                    : 0;
                return { name: sec, avg };
            }).filter(x => x.avg > 0);

            if (secAvgs.length > 0) {
                const sorted = [...secAvgs].sort((a, b) => b.avg - a.avg);
                const top = sorted[0];
                setElText('sm-kpi-top-score', `${top.avg.toFixed(1)}%`);
                setElText('sm-kpi-top-skill', formatSectionName(top.name));

                const lowest = sorted[sorted.length - 1];
                const gapVal = (85 - lowest.avg).toFixed(1);
                setElText('sm-kpi-gap-score', `${gapVal > 0 ? '-' + gapVal : '+' + Math.abs(gapVal)}%`);
                setElText('sm-kpi-gap-skill', formatSectionName(lowest.name));
            }
        } else {
            // Evaluasi 6 parameter spesifik section
            const skillAvgs = smActiveSectionSkills.map((name, idx) => {
                const sum = students.reduce((acc, s) => acc + (s.scores[idx] || 0), 0);
                return {
                    name,
                    code: `SK-0${idx + 1}`,
                    avg: sum / total
                };
            });

            const sortedDesc = [...skillAvgs].sort((a, b) => b.avg - a.avg);
            const top = sortedDesc[0];
            setElText('sm-kpi-top-score', `${top.avg.toFixed(1)}%`);
            setElText('sm-kpi-top-skill', `${top.code}: ${top.name}`);

            const lowest = sortedDesc[sortedDesc.length - 1];
            const gapVal = (85 - lowest.avg).toFixed(1);
            setElText('sm-kpi-gap-score', `${gapVal > 0 ? '-' + gapVal : '+' + Math.abs(gapVal)}%`);
            setElText('sm-kpi-gap-skill', `${lowest.code}: ${lowest.name}`);
        }
    }

    // ------------------------------------------------------------------------
    // 4. RENDER RADAR CHART (Sesuai Referensi Gambar User)
    // Warna: Ungu Terong Pekat (#3B1443) & Electric Magenta (#D946EF)
    // Grid: Lingkaran Konsentris Halus (#E9D5FF), Titik Vertex Putih Bersih (#FFFFFF)
    // ------------------------------------------------------------------------
    function renderRadarChart(students, selectedSection) {
        const canvas = document.getElementById('skillmap-radar-chart-canvas');
        if (!canvas || typeof Chart === 'undefined') return;

        let radarLabels = [];
        let actualValues = [];
        let targetValues = [];
        const isAllMode = (selectedSection === 'ALL');

        if (isAllMode) {
            // Mode Semua Section Aktif: Sumbu radar adalah nama-nama section yang sedang aktif (Format Title Case, Tidak Bold)
            radarLabels = smActiveSectionsList.map(sec => formatSectionName(sec));
            targetValues = radarLabels.map(() => 85);
            actualValues = smActiveSectionsList.map(sec => {
                const secStudents = students.filter(s => s.section === sec);
                if (secStudents.length === 0) return 80;
                const sum = secStudents.reduce((acc, s) => acc + s.avgScore, 0);
                return Math.round((sum / secStudents.length) * 10) / 10;
            });
        } else {
            // Mode Section Spesifik: Sumbu radar adalah 6 parameter kompetensi kejuruan
            radarLabels = ['SK-01', 'SK-02', 'SK-03', 'SK-04', 'SK-05', 'SK-06'];
            targetValues = [85, 85, 85, 85, 85, 85];
            const total = students.length;
            actualValues = smActiveSectionSkills.map((name, idx) => {
                if (total === 0) return 80;
                const sum = students.reduce((acc, s) => acc + (s.scores[idx] || 0), 0);
                return Math.round((sum / total) * 10) / 10;
            });
        }

        const ctx = canvas.getContext('2d');
        if (smRadarChartInstance) {
            smRadarChartInstance.destroy();
            smRadarChartInstance = null;
        }

        smRadarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: radarLabels,
                datasets: [
                    // 1. Poligon Luar: Standar Target (85%) - Warna Ungu Terong Pekat (#3B1443)
                    {
                        label: 'Standar Target (85%)',
                        data: targetValues,
                        backgroundColor: 'rgba(59, 20, 67, 0.40)', // Transparan terong pekat sesuai gambar referensi
                        borderColor: '#3B1443',
                        borderWidth: 2.5,
                        pointRadius: 4.5,
                        pointHoverRadius: 6.5,
                        pointBackgroundColor: '#FFFFFF', // Titik putih bulat bersih
                        pointBorderColor: '#3B1443',
                        pointBorderWidth: 2.2
                    },
                    // 2. Poligon Dalam: Capaian Aktual Siswa - Electric Magenta / Fuchsia Terang (#D946EF)
                    {
                        label: 'Capaian Aktual',
                        data: actualValues,
                        backgroundColor: 'rgba(217, 70, 239, 0.60)', // Fuchsia terang berbobot tebal
                        borderColor: '#D946EF',
                        borderWidth: 3.2,
                        pointRadius: 5.5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#FFFFFF', // Titik putih bulat kontras
                        pointBorderColor: '#D946EF',
                        pointBorderWidth: 2.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 4,
                        bottom: 4,
                        left: 4,
                        right: 4
                    }
                },
                animation: { duration: 350 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1E1B4B',
                        titleColor: '#FDF4FF',
                        bodyColor: '#F3E8FF',
                        titleFont: { family: 'Inter, sans-serif', size: 11, weight: 'bold' },
                        bodyFont: { family: 'Inter, sans-serif', size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function(items) {
                                if (!items.length) return '';
                                const idx = items[0].dataIndex;
                                if (isAllMode) {
                                    return `Section: ${radarLabels[idx]}`;
                                }
                                return `SK-0${idx + 1}: ${smActiveSectionSkills[idx] || ''}`;
                            },
                            label: function(ctx) {
                                return ` ${ctx.dataset.label}: ${ctx.parsed.r}%`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        min: 25,
                        max: 100,
                        ticks: {
                            display: false,
                            stepSize: 15
                        },
                        grid: {
                            // Spider web konsentris halus sesuai referensi
                            color: 'rgba(233, 213, 255, 0.75)',
                            lineWidth: 1.2
                        },
                        angleLines: {
                            color: 'rgba(233, 213, 255, 0.75)',
                            lineWidth: 1.2
                        },
                        pointLabels: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: isAllMode ? 10.5 : 11,
                                weight: 'normal'
                            },
                            color: '#475569',
                            padding: 3
                        }
                    }
                }
            }
        });

        // Render Pill Cards di Bawah Radar Sesuai Referensi Gambar
        const gridContainer = document.getElementById('sm-radar-skills-grid');
        if (gridContainer) {
            if (isAllMode) {
                // Tampilkan pill cards untuk setiap section aktif
                gridContainer.innerHTML = smActiveSectionsList.map((sec, idx) => {
                    const avg = actualValues[idx] || 0;
                    const isMet = avg >= 85;
                    const badgeColor = isMet
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : (avg >= 75 ? 'text-[#3B1443] bg-purple-50 border-purple-200' : 'text-rose-800 bg-rose-50 border-rose-200');

                    const secStudentCount = students.filter(s => s.section === sec).length;

                    return `
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <div class="flex items-center justify-between gap-1 mb-1">
                                <span class="text-[11px] font-normal text-slate-500">${secStudentCount} Siswa</span>
                                <span class="text-[11px] font-semibold px-1.5 py-0.2 rounded border ${badgeColor}">${avg.toFixed(1)}%</span>
                            </div>
                            <div class="text-xs font-normal text-slate-600 truncate" title="${formatSectionName(sec)}">
                                ${formatSectionName(sec)}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                // Tampilkan pill cards untuk 6 parameter spesifik section
                gridContainer.innerHTML = smActiveSectionSkills.map((skillName, idx) => {
                    const code = `SK-0${idx + 1}`;
                    const avg = actualValues[idx] || 0;
                    const isMet = avg >= 85;
                    const badgeColor = isMet
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : (avg >= 75 ? 'text-[#3B1443] bg-purple-50 border-purple-200' : 'text-rose-800 bg-rose-50 border-rose-200');

                    return `
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <div class="flex items-center justify-between gap-1 mb-1">
                                <span class="text-[11px] font-normal text-slate-500">${code}</span>
                                <span class="text-[11px] font-semibold px-1.5 py-0.2 rounded border ${badgeColor}">${avg.toFixed(1)}%</span>
                            </div>
                            <div class="text-xs font-normal text-slate-600 truncate" title="${skillName}">
                                ${skillName}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // ------------------------------------------------------------------------
    // 5. CAPAIAN KOMPETENSI / SECTION & CATATAN EVALUASI
    // ------------------------------------------------------------------------
    function renderCompetencyProgressBars(students, selectedSection) {
        const container = document.getElementById('sm-competency-progress-list');
        if (!container) return;

        const total = students.length;
        const isAllMode = (selectedSection === 'ALL');

        let statsList = [];

        if (isAllMode) {
            // Mode Semua Section: Tampilkan progres per section aktif
            statsList = smActiveSectionsList.map(sec => {
                const secStudents = students.filter(s => s.section === sec);
                const sTotal = secStudents.length;
                const sum = secStudents.reduce((acc, s) => acc + s.avgScore, 0);
                const avg = sTotal > 0 ? (sum / sTotal) : 0;
                const targetMetCount = secStudents.filter(s => s.isTargetMet).length;
                return {
                    name: formatSectionName(sec),
                    code: `${sTotal} Siswa`,
                    avg: Math.round(avg * 10) / 10,
                    competentCount: targetMetCount,
                    totalCount: sTotal,
                    pctCompetent: sTotal > 0 ? Math.round((targetMetCount / sTotal) * 100) : 0
                };
            });
        } else {
            // Mode Section Spesifik: Tampilkan 6 parameter kompetensi kejuruan
            statsList = smActiveSectionSkills.map((name, idx) => {
                const sum = students.reduce((acc, s) => acc + (s.scores[idx] || 0), 0);
                const avg = total > 0 ? (sum / total) : 0;
                const competentCount = students.filter(s => (s.scores[idx] || 0) >= 85).length;
                return {
                    name,
                    code: `SK-0${idx + 1}`,
                    avg: Math.round(avg * 10) / 10,
                    competentCount,
                    totalCount: total,
                    pctCompetent: total > 0 ? Math.round((competentCount / total) * 100) : 0
                };
            });
        }

        container.innerHTML = statsList.map(stat => {
            let barColor = 'bg-[#3B1443]';
            let labelBadge = `<span class="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">Kompeten</span>`;
            if (stat.avg >= 85) {
                barColor = 'bg-emerald-600';
                labelBadge = `<span class="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Target Tercapai</span>`;
            } else if (stat.avg < 75) {
                barColor = 'bg-rose-600';
                labelBadge = `<span class="text-[10px] font-medium text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Perlu Bimbingan</span>`;
            }

            return `
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-[11px] text-slate-400 font-normal">(${stat.code})</span>
                            <span class="font-normal text-slate-700 text-xs truncate" title="${stat.name}">${stat.name}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="font-semibold text-xs text-slate-700">${stat.avg.toFixed(1)}%</span>
                            ${labelBadge}
                        </div>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                        <div class="${barColor} h-full rounded-full transition-all duration-300" style="width: ${Math.min(100, Math.max(5, stat.avg))}%"></div>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-400 font-normal">
                        <span>Lulus target 85%: ${stat.competentCount}/${stat.totalCount} siswa (${stat.pctCompetent}%)</span>
                        <span>Gap: ${stat.avg >= 85 ? '+' + (stat.avg - 85).toFixed(1) : '-' + (85 - stat.avg).toFixed(1)}%</span>
                    </div>
                </div>
            `;
        }).join('');

        // Catatan Evaluasi Instruktur Section
        const lowestStat = [...statsList].sort((a, b) => a.avg - b.avg)[0];
        const recBox = document.getElementById('sm-training-recommendation');
        if (recBox && lowestStat) {
            if (lowestStat.avg < 85) {
                recBox.innerHTML = `Analisis performa mengindikasikan gap terbesar berada pada <span class="font-normal text-slate-800 underline decoration-slate-300">${lowestStat.name}</span> dengan capaian rata-rata <span class="font-normal text-slate-800">${lowestStat.avg.toFixed(1)}%</span> (terdapat deviasi ${(85 - lowestStat.avg).toFixed(1)}% di bawah target standar 85.0%). Disarankan penjadwalan bimbingan terarah dan pendampingan intensif oleh supervisor lini.`;
            } else {
                recBox.innerHTML = `Seluruh parameter kompetensi pada cakupan ini telah memenuhi standar target perusahaan (≥ 85.0%). Siswa magang telah memenuhi kualifikasi kesiapan kerja pada lini manufaktur.`;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 6. DAFTAR PARAMETER SK LEGEND BAR & HEADER TABEL
    // ------------------------------------------------------------------------
    function renderSectionSkillsLegendBar(selectedSection) {
        const bar = document.getElementById('sm-section-skills-legend-bar');
        if (!bar) return;

        const isSpecific = selectedSection && selectedSection !== 'ALL';
        
        if (isSpecific) {
            bar.classList.remove('hidden');
            const skills = SECTION_SKILLS_MASTER[selectedSection] || smActiveSectionSkills;
            const secName = formatSectionName(selectedSection);
            const dept = SECTION_DEPT_MAP[selectedSection] || 'QC';

            bar.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
                        <h5 class="text-xs font-semibold text-slate-800">
                            6 Parameter Standar Kompetensi (SK) &bull; Section ${secName}
                        </h5>
                        <span class="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.2 rounded-full">
                            ${dept}
                        </span>
                        <span class="text-[10.5px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.2 rounded-full font-normal">
                            Target Standar: 85.0%
                        </span>
                    </div>
                    <!-- Action Buttons: Kembali ke Semua Section & Kamus SK -->
                    <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button type="button" onclick="selectSectionFilter('ALL')" 
                            class="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#3B1443] border border-purple-300 hover:border-purple-500 font-medium rounded-lg text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                            title="Kembali menampilkan seluruh siswa dari semua section aktif">
                            <i class="fa-solid fa-arrow-left text-[11px]"></i>
                            <span>Kembali ke Semua Section</span>
                        </button>
                        <button type="button" onclick="openSkillDictionaryModal()" 
                            class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#3B1443] border border-purple-200 font-medium rounded-lg text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                            title="Buka Kamus Parameter SK Lengkap 22 Section">
                            <i class="fa-solid fa-book-open text-[11px] text-purple-700"></i>
                            <span>Kamus SK</span>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                    ${skills.map((sName, idx) => `
                        <div class="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-purple-300 transition-all">
                            <div class="flex items-center justify-between gap-1 mb-1">
                                <span class="text-[10px] font-bold text-[#3B1443] bg-purple-100/80 px-1.5 py-0.2 rounded">SK-0${idx + 1}</span>
                                <span class="text-[10px] text-slate-400 font-normal">Target 85%</span>
                            </div>
                            <div class="text-[11px] font-normal text-slate-700 leading-snug line-clamp-2" title="${sName}">
                                ${sName}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Sembunyikan legend bar ketika Semua Section dipilih agar tabel langsung terlihat rapi
            bar.classList.add('hidden');
            bar.innerHTML = '';
        }
    }

    function selectSectionFilter(sectionName) {
        const select = document.getElementById('filter-skillmap-section');
        if (select) {
            select.value = sectionName;
            if (sectionName !== 'ALL') {
                smFilterActiveDept = SECTION_DEPT_MAP[sectionName] || 'ALL';
            }
            onSkillMapFilterChange();
            renderFilterGroupedChips();
            const legendBar = document.getElementById('sm-section-skills-legend-bar');
            if (legendBar && sectionName !== 'ALL') {
                legendBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
    window.selectSectionFilter = selectSectionFilter;

    function updateTableSkillHeaders(selectedSection) {
        const isSpecific = selectedSection && selectedSection !== 'ALL';
        const skills = (isSpecific && SECTION_SKILLS_MASTER[selectedSection])
            ? SECTION_SKILLS_MASTER[selectedSection]
            : smActiveSectionSkills;

        for (let idx = 0; idx < 6; idx++) {
            const th = document.getElementById(`th-skill-0${idx + 1}`);
            if (!th) continue;
            const skillName = skills[idx] || `Parameter ${idx + 1}`;
            if (isSpecific) {
                th.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-0.5">
                        <span class="text-[9px] font-bold text-purple-200 bg-purple-900/80 px-1.5 py-0.2 rounded tracking-wider">SK-0${idx + 1}</span>
                        <span class="text-[10px] font-normal text-slate-100 leading-tight normal-case max-w-[80px] truncate mt-0.5" title="${skillName}">${skillName}</span>
                    </div>
                `;
                th.title = `Parameter SK-0${idx + 1}: ${skillName} (Standar: 85%)`;
            } else {
                th.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-0.5">
                        <span class="text-[9px] font-bold text-slate-200 bg-slate-700/80 px-1.5 py-0.2 rounded tracking-wider">SK-0${idx + 1}</span>
                        <span class="text-[10px] font-normal text-slate-300 leading-tight normal-case mt-0.5">Param ${idx + 1}</span>
                    </div>
                `;
                th.title = `Parameter Kejuruan ${idx + 1} (Klik section atau buka Kamus SK untuk melihat nama spesifik)`;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 7. RENDER MATRIKS KOMPETENSI SISWA & PAGINASI (Vibrant Corporate Redesign)
    // ------------------------------------------------------------------------
    function renderStudentMatrixTable(resetPage = false) {
        if (resetPage) smCurrentPage = 1;

        const tbody = document.getElementById('skillmap-table-tbody');
        if (!tbody) return;

        const total = smComputedStudentData.length;
        setElText('sm-table-student-count', `${total} Siswa Terdaftar`);

        // Update tag filter section aktif di sebelah hitungan siswa
        const filterTag = document.getElementById('sm-table-filter-tag');
        const filterName = document.getElementById('sm-table-filter-name');
        const currentSec = (document.getElementById('filter-skillmap-section')?.value) || 'ALL';
        if (filterTag && filterName) {
            if (currentSec !== 'ALL') {
                filterName.textContent = formatSectionName(currentSec);
                filterTag.classList.remove('hidden');
                filterTag.classList.add('inline-flex');
            } else {
                filterTag.classList.add('hidden');
                filterTag.classList.remove('inline-flex');
            }
        }

        if (total === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="py-12 text-center text-xs text-slate-400 italic">
                        Tidak ada data siswa yang sesuai dengan filter yang dipilih.
                    </td>
                </tr>
            `;
            renderSMPagination(0);
            return;
        }

        const totalPages = Math.max(1, Math.ceil(total / SM_PAGE_SIZE));
        if (smCurrentPage > totalPages) smCurrentPage = totalPages;
        if (smCurrentPage < 1) smCurrentPage = 1;

        const startIndex = (smCurrentPage - 1) * SM_PAGE_SIZE;
        const endIndex = Math.min(startIndex + SM_PAGE_SIZE, total);
        const pageItems = smComputedStudentData.slice(startIndex, endIndex);

        tbody.innerHTML = pageItems.map((s, idx) => {
            const statusBadge = s.isVerified
                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs cursor-help" title="Sudah dinilai langsung oleh instruktur: ${s.evaluator || 'Supervisor'}. Pembobotan: 70% Praktik + 30% Sistem."><i class="fa-solid fa-circle-check text-[9px] text-emerald-600"></i> Terverifikasi</span>`
                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs cursor-help" title="Nilai acuan otomatis dari data kuis & presensi. Klik 'Input' untuk memasukkan nilai evaluasi praktik."><i class="fa-solid fa-clock-rotate-left text-[9px] text-amber-600"></i> Data Sistem</span>`;

            const studentSectionSkills = SECTION_SKILLS_MASTER[s.section] || smActiveSectionSkills;

            const skillTdCols = s.scores.map((sc, scIdx) => {
                let badgeCls = 'bg-slate-50 text-slate-700 border-slate-200';
                if (sc >= 85) {
                    badgeCls = s.isVerified
                        ? 'bg-emerald-100 text-emerald-800 font-bold border-emerald-400 shadow-2xs'
                        : 'bg-emerald-50/70 text-emerald-700 font-medium border border-dashed border-emerald-300';
                } else if (sc < 75) {
                    badgeCls = s.isVerified
                        ? 'bg-rose-100 text-rose-800 font-bold border-rose-400 shadow-2xs'
                        : 'bg-rose-50/70 text-rose-700 font-medium border border-dashed border-rose-300';
                } else {
                    badgeCls = s.isVerified
                        ? 'bg-amber-100 text-amber-800 font-bold border-amber-400 shadow-2xs'
                        : 'bg-amber-50/70 text-amber-700 font-medium border border-dashed border-amber-300';
                }

                const skillTitle = studentSectionSkills[scIdx] || `Parameter ${scIdx + 1}`;
                const sourceInfo = s.isVerified
                    ? `Evaluasi Langsung Instruktur (${s.evaluator || 'SPV'})`
                    : `Estimasi Sistem (Kuis: ${s.quizScore.toFixed(0)}%, Hadir: ${s.attendancePct.toFixed(0)}%)`;

                return `
                    <td class="py-2 px-1 text-center">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[11px] cursor-help transition-transform hover:scale-105 ${badgeCls}" 
                            title="[SK-0${scIdx + 1}] ${skillTitle}: ${sc}% | Sumber: ${sourceInfo}">
                            ${sc}
                        </span>
                    </td>
                `;
            }).join('');

            const dept = SECTION_DEPT_MAP[s.section] || 'QC';
            let deptBadgeCls = 'bg-blue-50 text-blue-700 border-blue-200';
            if (dept === 'ENGINEERING') deptBadgeCls = 'bg-amber-50 text-amber-700 border-amber-200';
            else if (dept === 'SHE') deptBadgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            else if (dept === 'QC') deptBadgeCls = 'bg-purple-50 text-purple-700 border-purple-200';

            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

            return `
                <tr class="${rowBg} hover:bg-purple-50/60 transition-colors border-b border-slate-200/70">
                    <td class="py-2.5 px-2 text-center text-xs text-slate-400 font-medium">${startIndex + idx + 1}</td>
                    <td class="py-2.5 px-3.5">
                        <div class="min-w-0">
                            <div class="font-semibold text-slate-900 text-xs truncate hover:text-[#3B1443] cursor-pointer flex items-center gap-1 group" 
                                onclick="openStudentReportCard('${s.noreg}')" title="Klik untuk membuka Lembar Rapor Evaluasi">
                                <span>${s.nama}</span>
                                <i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-[#3B1443] transition-colors"></i>
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="text-slate-500 font-mono text-[10px] font-normal bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">${s.noreg}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-2.5 px-3">
                        <span class="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium border ${deptBadgeCls}">
                            ${formatSectionName(s.section)}
                        </span>
                        <div class="text-[10px] text-slate-400 mt-0.5 font-normal">${s.kelas}</div>
                    </td>
                    ${skillTdCols}
                    <td class="py-2.5 px-2 text-center bg-purple-50/20 border-x border-purple-100/50">
                        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold ${s.avgScore >= 85 ? 'bg-purple-100 text-[#3B1443] border border-purple-300' : (s.avgScore >= 75 ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'bg-rose-100 text-rose-800 border border-rose-300')} shadow-2xs">
                            ${s.avgScore.toFixed(1)}%
                        </span>
                    </td>
                    <td class="py-2.5 px-2 text-center">
                        ${statusBadge}
                    </td>
                    <td class="py-2.5 px-2 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="openSkillEvaluationModal('${s.noreg}')"
                                class="px-2 py-1 bg-[#3B1443] hover:bg-purple-950 active:scale-95 text-white font-medium rounded-md text-[10.5px] transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                title="Input / Edit Evaluasi Praktik Kompetensi Siswa Ini">
                                <i class="fa-solid fa-pen-to-square text-[9px]"></i>
                                <span>Input</span>
                            </button>
                            <button type="button" onclick="openStudentReportCard('${s.noreg}')"
                                class="px-2 py-1 bg-white hover:bg-slate-100 active:scale-95 text-[#0B3B82] border border-slate-300 font-medium rounded-md text-[10.5px] transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Buka Lembar Evaluasi Lengkap Siswa Ini">
                                <i class="fa-solid fa-file-lines text-[9px]"></i>
                                <span>Rapor</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        renderSMPagination(total);
    }

    function renderSMPagination(total) {
        const info = document.getElementById('skillmap-pagination-info');
        const controls = document.getElementById('skillmap-pagination-controls');
        if (!info || !controls) return;

        if (total === 0) {
            info.textContent = 'Menampilkan 0 dari 0 siswa';
            controls.innerHTML = '';
            return;
        }

        const totalPages = Math.max(1, Math.ceil(total / SM_PAGE_SIZE));
        const startItem = (smCurrentPage - 1) * SM_PAGE_SIZE + 1;
        const endItem = Math.min(smCurrentPage * SM_PAGE_SIZE, total);

        info.textContent = `Menampilkan ${startItem}-${endItem} dari ${total} siswa (Halaman ${smCurrentPage} dari ${totalPages})`;

        let buttonsHtml = `
            <button onclick="goToSMPage(1)" ${smCurrentPage === 1 ? 'disabled' : ''}
                class="px-2 py-1 rounded border border-slate-200 text-xs font-bold ${smCurrentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}">
                &laquo;
            </button>
            <button onclick="goToSMPage(${smCurrentPage - 1})" ${smCurrentPage === 1 ? 'disabled' : ''}
                class="px-2 py-1 rounded border border-slate-200 text-xs font-bold ${smCurrentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}">
                &lsaquo;
            </button>
        `;

        const pStart = Math.max(1, smCurrentPage - 2);
        const pEnd = Math.min(totalPages, smCurrentPage + 2);
        for (let p = pStart; p <= pEnd; p++) {
            buttonsHtml += `
                <button onclick="goToSMPage(${p})"
                    class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${p === smCurrentPage ? 'bg-[#3B1443] text-white shadow-2xs' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}">
                    ${p}
                </button>
            `;
        }

        buttonsHtml += `
            <button onclick="goToSMPage(${smCurrentPage + 1})" ${smCurrentPage === totalPages ? 'disabled' : ''}
                class="px-2 py-1 rounded border border-slate-200 text-xs font-bold ${smCurrentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}">
                &rsaquo;
            </button>
            <button onclick="goToSMPage(${totalPages})" ${smCurrentPage === totalPages ? 'disabled' : ''}
                class="px-2 py-1 rounded border border-slate-200 text-xs font-bold ${smCurrentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 cursor-pointer'}">
                &raquo;
            </button>
        `;

        controls.innerHTML = buttonsHtml;
    }

    function goToSMPage(page) {
        smCurrentPage = page;
        renderStudentMatrixTable(false);
    }
    window.goToSMPage = goToSMPage;

    function onSkillMapFilterChange() {
        loadSkillMapData(false);
    }
    window.onSkillMapFilterChange = onSkillMapFilterChange;

    // ------------------------------------------------------------------------
    // 8. EXPORT TO EXCEL
    // ------------------------------------------------------------------------
    function exportSkillMapToExcel() {
        if (typeof XLSX === 'undefined') {
            alert('Library Excel belum siap. Silakan refresh halaman.');
            return;
        }

        const sectionSelect = document.getElementById('filter-skillmap-section');
        const activeSection = sectionSelect ? sectionSelect.value : 'ALL';

        const rows = [
            ['MATRIKS SKILL MAP & EVALUASI KOMPETENSI SISWA LTC INDOPRIMA GEMILANG'],
            [`Section: ${activeSection}`, `Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`],
            [],
            [
                'No', 'No. Reg', 'Nama Lengkap', 'Section', 'Kelas / Batch', 'Supervisor',
                `SK-01: ${smActiveSectionSkills[0]}`,
                `SK-02: ${smActiveSectionSkills[1]}`,
                `SK-03: ${smActiveSectionSkills[2]}`,
                `SK-04: ${smActiveSectionSkills[3]}`,
                `SK-05: ${smActiveSectionSkills[4]}`,
                `SK-06: ${smActiveSectionSkills[5]}`,
                'Rata-rata Skor (%)', 'Status Kompetensi'
            ]
        ];

        smComputedStudentData.forEach((s, idx) => {
            rows.push([
                idx + 1,
                s.noreg,
                s.nama,
                s.section,
                s.kelas,
                s.spv,
                s.scores[0],
                s.scores[1],
                s.scores[2],
                s.scores[3],
                s.scores[4],
                s.scores[5],
                s.avgScore,
                s.isTargetMet ? 'Kompeten' : (s.isCompetent ? 'Lulus' : 'Perlu Remidi')
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Skill Map ${activeSection}`);

        const fileName = `Matriks_Skill_Map_${activeSection}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
    window.exportSkillMapToExcel = exportSkillMapToExcel;

    // ------------------------------------------------------------------------
    // 9. MODAL EVALUASI KOMPETENSI SISWA (INPUT PRAKTIK + DATA RIIL SISTEM)
    // ------------------------------------------------------------------------
    function openSkillEvaluationModal(noreg) {
        const s = smComputedStudentData.find(st => String(st.noreg) === String(noreg));
        if (!s) return;

        currentEvalStudent = s;
        const cleanSec = matchSection(s.section);
        currentEvalSkills = SECTION_SKILLS_MASTER[cleanSec] || smActiveSectionSkills;

        // Hitung data riil sistem
        currentEvalRealMetrics = getStudentRealMetrics(s.noreg);

        // Header info
        setElText('sm-modal-section-badge', `Section: ${formatSectionName(s.section)}`);
        setElText('sm-modal-student-info', `${s.nama} • No. Reg: ${s.noreg} • ${s.kelas} • SPV: ${s.spv}`);

        // Kartu data riil
        setElText('sm-modal-attendance-pct', `${currentEvalRealMetrics.attendancePct.toFixed(1)}%`);
        setElText('sm-modal-quiz-score', `${currentEvalRealMetrics.quizScore.toFixed(1)}%`);
        setElText('sm-modal-auto-score', `${currentEvalRealMetrics.autoScore.toFixed(1)}%`);

        // Evaluator & Notes
        const evaluatorInput = document.getElementById('sm-modal-evaluator');
        if (evaluatorInput) {
            evaluatorInput.value = s.evaluator || (s.spv ? s.spv : `Supervisor ${formatSectionName(s.section)}`);
        }

        const notesInput = document.getElementById('sm-modal-notes');
        if (notesInput) {
            notesInput.value = s.isVerified ? (s.notes || '') : '';
        }

        // Render 6 skill inputs
        const container = document.getElementById('sm-modal-skills-container');
        if (container) {
            const initialScores = Array.isArray(s.scores) && s.scores.length === 6 ? s.scores : [85, 85, 85, 85, 85, 85];
            container.innerHTML = currentEvalSkills.map((skillName, idx) => {
                const score = initialScores[idx] || currentEvalRealMetrics.autoScore;
                return `
                    <div class="flex items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[10px] font-semibold text-purple-900 bg-purple-100/80 px-1.5 py-0.2 rounded">SK-0${idx + 1}</span>
                                <span class="text-xs font-normal text-slate-700 truncate" title="${skillName}">${skillName}</span>
                            </div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Benchmark Target: 85.0%</div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <input type="range" min="0" max="100" value="${score}" id="sm-modal-slider-${idx}"
                                oninput="onSkillSliderChange(${idx}, this.value)"
                                class="w-24 sm:w-32 accent-[#3B1443] cursor-pointer">
                            <input type="number" min="0" max="100" value="${score}" id="sm-modal-input-${idx}"
                                oninput="onSkillInputChange(${idx}, this.value)"
                                class="w-14 px-2 py-1 bg-white border border-slate-300 rounded-md text-center text-xs font-semibold text-slate-800 outline-none focus:border-[#3B1443]">
                        </div>
                    </div>
                `;
            }).join('');
        }

        updateModalLivePreview();

        const modal = document.getElementById('modal-skill-eval');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    window.openSkillEvaluationModal = openSkillEvaluationModal;

    function closeSkillEvaluationModal() {
        const modal = document.getElementById('modal-skill-eval');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        currentEvalStudent = null;
    }
    window.closeSkillEvaluationModal = closeSkillEvaluationModal;

    function onSkillSliderChange(idx, val) {
        const inp = document.getElementById(`sm-modal-input-${idx}`);
        if (inp) inp.value = val;
        updateModalLivePreview();
    }
    window.onSkillSliderChange = onSkillSliderChange;

    function onSkillInputChange(idx, val) {
        let num = parseInt(val, 10);
        if (isNaN(num)) num = 0;
        if (num > 100) num = 100;
        if (num < 0) num = 0;
        const slider = document.getElementById(`sm-modal-slider-${idx}`);
        if (slider) slider.value = Math.max(0, num);
        updateModalLivePreview();
    }
    window.onSkillInputChange = onSkillInputChange;

    function applySystemBaselineScores() {
        if (!currentEvalRealMetrics) return;
        const base = currentEvalRealMetrics.autoScore;
        for (let idx = 0; idx < 6; idx++) {
            const inp = document.getElementById(`sm-modal-input-${idx}`);
            const sld = document.getElementById(`sm-modal-slider-${idx}`);
            if (inp) inp.value = base;
            if (sld) sld.value = Math.max(0, base);
        }
        updateModalLivePreview();
        if (typeof showToast === 'function') {
            showToast(`Nilai acuan sistem (${base}%) berhasil diterapkan ke 6 parameter.`, 'info');
        }
    }
    window.applySystemBaselineScores = applySystemBaselineScores;

    function updateModalLivePreview() {
        let sum = 0;
        for (let idx = 0; idx < 6; idx++) {
            const inp = document.getElementById(`sm-modal-input-${idx}`);
            sum += inp ? (parseFloat(inp.value) || 0) : 80;
        }
        const manualAvg = Math.round((sum / 6) * 10) / 10;
        const autoScore = currentEvalRealMetrics ? currentEvalRealMetrics.autoScore : 85.0;
        const finalScore = Math.round(((manualAvg * 0.7) + (autoScore * 0.3)) * 10) / 10;

        setElText('sm-modal-final-preview', `${finalScore.toFixed(1)}%`);

        const badge = document.getElementById('sm-modal-status-badge');
        if (badge) {
            if (finalScore >= 85) {
                badge.className = 'px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
                badge.textContent = 'Target Tercapai';
            } else if (finalScore >= 75) {
                badge.className = 'px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200';
                badge.textContent = 'Lulus Standar';
            } else {
                badge.className = 'px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 text-rose-800 border border-rose-200';
                badge.textContent = 'Perlu Bimbingan';
            }
        }

        const gapEl = document.getElementById('sm-modal-gap-preview');
        if (gapEl) {
            const gap = Math.round((finalScore - 85) * 10) / 10;
            gapEl.textContent = `Gap: ${gap >= 0 ? '+' + gap.toFixed(1) : gap.toFixed(1)}%`;
        }
    }
    window.updateModalLivePreview = updateModalLivePreview;

    async function submitSkillEvaluationModal() {
        if (!currentEvalStudent) return;
        const btn = document.getElementById('btn-save-skill-eval');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Menyimpan...';
        }

        const scores = [];
        for (let idx = 0; idx < 6; idx++) {
            const inp = document.getElementById(`sm-modal-input-${idx}`);
            scores.push(inp ? (parseFloat(inp.value) || 0) : 80);
        }

        const evaluatorInput = document.getElementById('sm-modal-evaluator');
        const notesInput = document.getElementById('sm-modal-notes');

        const payload = {
            noreg: currentEvalStudent.noreg,
            nama: currentEvalStudent.nama,
            section: currentEvalStudent.section,
            kelas: currentEvalStudent.kelas,
            evaluator: evaluatorInput ? evaluatorInput.value.trim() : '',
            scores,
            skillNames: currentEvalSkills,
            autoScore: currentEvalRealMetrics ? currentEvalRealMetrics.autoScore : null,
            notes: notesInput ? notesInput.value.trim() : ''
        };

        try {
            const res = await executeRpcCall('saveSkillEvaluation', [payload]);
            if (res && res.success) {
                if (typeof showToast === 'function') {
                    showToast(`Evaluasi kompetensi ${currentEvalStudent.nama} berhasil disimpan!`, 'success');
                }
                closeSkillEvaluationModal();
                await loadSkillMapData(true);
            } else {
                alert('Gagal menyimpan evaluasi: ' + (res?.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('[submitSkillEvaluationModal] Error:', err);
            alert('Terjadi kesalahan koneksi saat menyimpan evaluasi.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk text-xs"></i> Simpan Evaluasi Kompetensi';
            }
        }
    }
    window.submitSkillEvaluationModal = submitSkillEvaluationModal;

    // ------------------------------------------------------------------------
    // 9. MODAL KAMUS & DAFTAR STANDAR KOMPETENSI (22 Section)
    // ------------------------------------------------------------------------
    let smDictActiveDept = 'ALL';
    let smDictActiveQuery = '';

    function openSkillDictionaryModal() {
        const modal = document.getElementById('modal-skill-dictionary');
        if (!modal) return;
        smDictActiveDept = 'ALL';
        smDictActiveQuery = '';
        const searchInput = document.getElementById('sm-dict-search-input');
        if (searchInput) searchInput.value = '';
        updateDictDeptButtons();
        renderSkillDictionaryCards();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    window.openSkillDictionaryModal = openSkillDictionaryModal;

    function closeSkillDictionaryModal() {
        const modal = document.getElementById('modal-skill-dictionary');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
    window.closeSkillDictionaryModal = closeSkillDictionaryModal;

    function onSkillDictionarySearch(val) {
        smDictActiveQuery = (val || '').toLowerCase().trim();
        renderSkillDictionaryCards();
    }
    window.onSkillDictionarySearch = onSkillDictionarySearch;

    function filterSkillDictionaryDept(dept) {
        smDictActiveDept = dept || 'ALL';
        updateDictDeptButtons();
        renderSkillDictionaryCards();
    }
    window.filterSkillDictionaryDept = filterSkillDictionaryDept;

    function updateDictDeptButtons() {
        const btns = document.querySelectorAll('.sm-dict-dept-btn');
        const allSections = Object.keys(SECTION_SKILLS_MASTER);
        const labelMap = {
            'ALL': 'Semua',
            'PRODUKSI': 'Produksi',
            'ENGINEERING': 'Engineering',
            'SHE': 'SHE & HR',
            'QC': 'QC & Lainnya'
        };
        btns.forEach(btn => {
            const d = btn.getAttribute('data-dept');
            let count = allSections.length;
            if (d !== 'ALL') {
                count = allSections.filter(sec => (SECTION_DEPT_MAP[sec] || 'QC') === d).length;
            }
            btn.textContent = `${labelMap[d] || d} (${count})`;
            if (d === smDictActiveDept) {
                btn.className = 'sm-dict-dept-btn px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#3B1443] text-white transition-all cursor-pointer shadow-2xs';
            } else {
                btn.className = 'sm-dict-dept-btn px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer';
            }
        });
    }

    function renderSkillDictionaryCards() {
        const container = document.getElementById('sm-dictionary-cards-container');
        const countInfo = document.getElementById('sm-dict-count-info');
        if (!container) return;

        const allSections = Object.keys(SECTION_SKILLS_MASTER);
        const filtered = allSections.filter(sec => {
            const dept = SECTION_DEPT_MAP[sec] || 'QC';
            if (smDictActiveDept !== 'ALL' && dept !== smDictActiveDept) {
                return false;
            }
            if (smDictActiveQuery) {
                const secName = formatSectionName(sec).toLowerCase();
                const rawSec = sec.toLowerCase();
                const skills = SECTION_SKILLS_MASTER[sec] || [];
                const matchesSkills = skills.some(s => s.toLowerCase().includes(smDictActiveQuery));
                if (!secName.includes(smDictActiveQuery) && !rawSec.includes(smDictActiveQuery) && !matchesSkills) {
                    return false;
                }
            }
            return true;
        });

        if (countInfo) {
            countInfo.textContent = `Menampilkan ${filtered.length} dari ${allSections.length} section manufaktur`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center text-xs text-slate-400 italic">
                    Tidak ditemukan section atau skill yang cocok dengan kata kunci pencarian.
                </div>
            `;
            return;
        }

        // Student counts per section
        const allStudents = (typeof window !== 'undefined' && Array.isArray(window.activeData) && window.activeData.length > 0)
            ? window.activeData
            : (typeof window !== 'undefined' && Array.isArray(window.rawSiswaData) ? window.rawSiswaData : []);

        container.innerHTML = filtered.map(sec => {
            const skills = SECTION_SKILLS_MASTER[sec] || [];
            const dept = SECTION_DEPT_MAP[sec] || 'QC';
            const secFormatted = formatSectionName(sec);
            const studentCount = allStudents.filter(s => matchSection(s.section || s.bagian || '') === sec).length;

            let deptBadge = 'bg-blue-50 text-blue-800 border-blue-200';
            if (dept === 'ENGINEERING') deptBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            else if (dept === 'SHE') deptBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            else if (dept === 'QC') deptBadge = 'bg-purple-50 text-purple-800 border-purple-200';

            return `
                <div class="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs hover:border-purple-300 transition-all group">
                    <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="text-xs sm:text-sm font-bold text-slate-800 truncate">${secFormatted}</h4>
                                <span class="px-2 py-0.5 rounded text-[10px] font-semibold border ${deptBadge}">${dept}</span>
                            </div>
                            <span class="text-[10.5px] text-slate-400 font-normal mt-0.5 block">${studentCount} Siswa Terdaftar</span>
                        </div>
                        
                        <!-- Action Buttons: Pilih, Edit, Hapus -->
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="selectSectionFromDictionary('${sec}')"
                                class="px-2.5 py-1 bg-slate-100 hover:bg-[#3B1443] hover:text-white text-slate-700 font-medium rounded-lg text-[11px] transition-all cursor-pointer shadow-2xs"
                                title="Terapkan filter ke section ${secFormatted}">
                                Pilih Section
                            </button>
                            <button type="button" onclick="openEditSectionModal('${sec}')"
                                class="w-7 h-7 bg-purple-50 hover:bg-purple-100 text-[#3B1443] border border-purple-200 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Ubah Parameter SK Section ${secFormatted}">
                                <i class="fa-solid fa-pen-to-square text-[11px]"></i>
                            </button>
                            <button type="button" onclick="deleteSectionFromDictionary('${sec}')"
                                class="w-7 h-7 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Hapus Section ${secFormatted} dari Kamus">
                                <i class="fa-solid fa-trash text-[11px]"></i>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        ${skills.map((s, idx) => `
                            <div class="flex items-start gap-1.5 text-[11px] text-slate-700 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 hover:bg-white hover:border-slate-200 transition-colors">
                                <span class="text-[9.5px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded shrink-0">SK-0${idx + 1}</span>
                                <span class="leading-tight truncate font-normal" title="${s}">${s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function selectSectionFromDictionary(sec) {
        closeSkillDictionaryModal();
        selectSectionFilter(sec);
    }
    window.selectSectionFromDictionary = selectSectionFromDictionary;

    // ------------------------------------------------------------------------
    // 10. CRUD STANDAR KOMPETENSI (TAMBAH, UBAH, HAPUS SECTION & PARAMETER SK)
    // ------------------------------------------------------------------------
    function openAddSectionModal() {
        const modal = document.getElementById('modal-edit-section-skill');
        const title = document.getElementById('modal-section-skill-title');
        const origKey = document.getElementById('input-sk-original-key');
        const nameInput = document.getElementById('input-sk-section-name');
        const deptSelect = document.getElementById('input-sk-dept');
        const submitText = document.getElementById('btn-submit-section-skill-text');
        if (!modal) return;

        title.textContent = 'Tambah Section & Standar SK Baru';
        origKey.value = '';
        nameInput.value = '';
        nameInput.disabled = false;
        deptSelect.value = smDictActiveDept !== 'ALL' ? smDictActiveDept : 'PRODUKSI';
        submitText.textContent = 'Tambah Section & SK';

        for (let i = 1; i <= 6; i++) {
            const el = document.getElementById(`input-sk-0${i}`);
            if (el) el.value = '';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    window.openAddSectionModal = openAddSectionModal;

    function openEditSectionModal(secKey) {
        const modal = document.getElementById('modal-edit-section-skill');
        const title = document.getElementById('modal-section-skill-title');
        const origKey = document.getElementById('input-sk-original-key');
        const nameInput = document.getElementById('input-sk-section-name');
        const deptSelect = document.getElementById('input-sk-dept');
        const submitText = document.getElementById('btn-submit-section-skill-text');
        if (!modal) return;

        const skills = SECTION_SKILLS_MASTER[secKey] || [];
        const dept = SECTION_DEPT_MAP[secKey] || 'PRODUKSI';
        const formattedName = formatSectionName(secKey);

        title.textContent = `Edit Standar SK • Section ${formattedName}`;
        origKey.value = secKey;
        nameInput.value = formattedName;
        deptSelect.value = dept;
        submitText.textContent = 'Simpan Perubahan SK';

        for (let i = 1; i <= 6; i++) {
            const el = document.getElementById(`input-sk-0${i}`);
            if (el) el.value = skills[i - 1] || `Parameter ${i}`;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    window.openEditSectionModal = openEditSectionModal;

    function closeEditSectionSkillModal() {
        const modal = document.getElementById('modal-edit-section-skill');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
    window.closeEditSectionSkillModal = closeEditSectionSkillModal;

    function saveSectionSkillModal(event) {
        if (event) event.preventDefault();

        const origKey = (document.getElementById('input-sk-original-key')?.value || '').trim();
        const rawName = (document.getElementById('input-sk-section-name')?.value || '').trim();
        const dept = (document.getElementById('input-sk-dept')?.value || 'PRODUKSI').trim();

        if (!rawName) {
            alert('Silakan masukkan nama section!');
            return;
        }

        const newSkills = [];
        for (let i = 1; i <= 6; i++) {
            const val = (document.getElementById(`input-sk-0${i}`)?.value || '').trim();
            if (!val) {
                alert(`Silakan lengkapi nama parameter SK-0${i}!`);
                return;
            }
            newSkills.push(val);
        }

        const newKey = rawName.toUpperCase();

        // Jika mengubah nama section lama, hapus key yang lama
        if (origKey && origKey !== newKey) {
            delete SECTION_SKILLS_MASTER[origKey];
            delete SECTION_DEPT_MAP[origKey];
        }

        SECTION_SKILLS_MASTER[newKey] = newSkills;
        SECTION_DEPT_MAP[newKey] = dept;
        saveSkillDictionaryToStorage();

        // Update Seluruh UI & Dashboard secara Realtime
        updateDictDeptButtons();
        renderSkillDictionaryCards();
        loadSkillMapData(false);

        closeEditSectionSkillModal();
    }
    window.saveSectionSkillModal = saveSectionSkillModal;

    function deleteSectionFromDictionary(secKey) {
        const secFormatted = formatSectionName(secKey);
        if (!confirm(`Apakah Anda yakin ingin menghapus section "${secFormatted}" beserta 6 parameter Standar Kompetensinya dari Kamus?`)) {
            return;
        }

        delete SECTION_SKILLS_MASTER[secKey];
        delete SECTION_DEPT_MAP[secKey];
        saveSkillDictionaryToStorage();

        updateDictDeptButtons();
        renderSkillDictionaryCards();
        loadSkillMapData(false);

        const currentSec = (document.getElementById('filter-skillmap-section')?.value) || 'ALL';
        if (currentSec === secKey) {
            selectSectionFilter('ALL');
        }
    }
    window.deleteSectionFromDictionary = deleteSectionFromDictionary;

    function resetSkillDictionaryToDefault() {
        if (!confirm('Apakah Anda yakin ingin mengembalikan seluruh Kamus Standar Kompetensi ke standar bawaan pabrik? Semua perubahan dan penambahan section kustom akan direset.')) {
            return;
        }

        try {
            localStorage.removeItem(SM_CUSTOM_SKILLS_KEY);
        } catch (e) {}

        SECTION_SKILLS_MASTER = { ...DEFAULT_SECTION_SKILLS_MASTER };
        SECTION_DEPT_MAP = { ...DEFAULT_SECTION_DEPT_MAP };
        window.SECTION_SKILLS_DICT = SECTION_SKILLS_MASTER;

        updateDictDeptButtons();
        renderSkillDictionaryCards();
        loadSkillMapData(false);
    }
    window.resetSkillDictionaryToDefault = resetSkillDictionaryToDefault;

    function setElText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    window.loadSkillMapData = loadSkillMapData;

})();

