
    // Registrasi plugin datalabels secara global
    Chart.register(ChartDataLabels);
    Chart.defaults.set('plugins.datalabels', {
        display: false
    });

    // Helper Fungsi Parsing Tanggal & Hitung Kelas Dinamis (DATEDIF "m" + 1)
    function parseDateDDMMYYYY(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
    }

    function parseDateYYYYMMDD(dateStr) {
        if (!dateStr) return null;
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return parseDateDDMMYYYY(dateStr);
    }

    function hitungKelasSiswa(masukDateStr, targetDate) {
        if (!masukDateStr) return "Kelas 1";
        
        let start = parseDateYYYYMMDD(masukDateStr);
        if (!start || isNaN(start.getTime())) {
            start = new Date("2026-04-20");
        }
        
        let end = targetDate ? (targetDate instanceof Date ? targetDate : parseDateYYYYMMDD(targetDate)) : new Date();
        if (!end || isNaN(end.getTime())) {
            end = new Date();
        }
        
        let months = (end.getFullYear() - start.getFullYear()) * 12;
        months -= start.getMonth();
        months += end.getMonth();
        
        if (end.getDate() < start.getDate()) {
            months--;
        }
        
        let kelasNum = Math.max(1, months + 1);
        const isAdmin = currentUser && currentUser.role === 'Admin';
        if (!isAdmin && kelasNum > 5) {
            kelasNum = 5;
        }
        return "Kelas " + kelasNum;
    }

    let currentUser = null;
    let chartInstance = null;
    let mapInstance = null;
    
    // Peta & Grafik Baru Turnover
    let mapTurnoverInstance = null; 
    let geoJsonLayer = null; 
    let turnoverMarkerGroup = null; 
    let turnoverPieChartInstance = null; 
    let activeThematicTheme = 'light'; 
    
    let activeData = [];
    let rawSiswaData = []; 
    let rawTurnoverData = []; 
    let activeTurnoverData = []; 
    let financeData = [];
    let rawUsersData = []; 
    let absensiData = [];
    let rawPopulasiData = [];
    let geoJsonCache = null;  
    let monthYearMetadata = { year: 2026, month: 3 };
    let costRatesConfig = [];
    let _lastSyncTime = null;
    let currentVersion = "";

    // Update realtime sync indicator in header
    function _updateSyncIndicator(status) {
        const dot = document.getElementById('sync-live-dot');
        const connText = document.getElementById('header-conn-status');
        if (!dot || !connText) return;
        if (status === 'syncing') {
            dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
            connText.innerText = 'Menghubungkan...';
        } else if (status === 'done') {
            dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
            const verSuffix = currentVersion ? ` (${currentVersion})` : '';
            if (typeof google !== 'undefined') {
                connText.innerText = 'Terhubung ke server' + verSuffix;
            } else {
                connText.innerText = 'Mode Preview' + verSuffix;
            }
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-rose-500';
            connText.innerText = 'Tidak terhubung ke server';
        }
    } 

    // 2026 Indonesian National Holidays list
    const INDONESIA_HOLIDAYS_2026 = [
        "2026-01-01", "2026-01-19", "2026-02-17", "2026-03-19",
        "2026-03-20", "2026-03-21", "2026-04-03", "2026-05-01",
        "2026-05-14", "2026-05-27", "2026-06-01", "2026-06-17",
        "2026-08-17", "2026-08-26"
    ];

    function calculateCostForPeriod(startDateVal, endDateVal) {
        if (!startDateVal || !endDateVal) return 0;
        const start = parseDateYYYYMMDD(startDateVal);
        const end = parseDateYYYYMMDD(endDateVal);
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

        const ratesMap = {};
        if (window.costRatesConfig && Array.isArray(costRatesConfig)) {
            costRatesConfig.forEach(rate => {
                ratesMap[rate.kelas.toLowerCase().replace(/\s+/g, '')] = { saku: rate.uangSaku, trans: rate.transport };
            });
        }
        const defaultRates = {
            'kelas1': { saku: 3000000, trans: 500000 },
            'kelas2': { saku: 3100000, trans: 500000 },
            'kelas3': { saku: 3250000, trans: 500000 },
            'kelas4': { saku: 3450000, trans: 500000 },
            'kelas5': { saku: 3700000, trans: 500000 }
        };
        const getRates = (kelasStr) => {
            const key = String(kelasStr).toLowerCase().replace(/\s+/g, '');
            return ratesMap[key] || defaultRates[key] || { saku: 0, trans: 0 };
        };

        const getActualWorkingDays = (y, m, workingDaysType) => {
            let count = 0;
            const lastDay = new Date(y, m + 1, 0).getDate();
            const is5Day = workingDaysType === '5 Hari' || workingDaysType === '5 Hari Kerja';
            for (let d = 1; d <= lastDay; d++) {
                const date = new Date(y, m, d);
                const day = date.getDay();
                if (day !== 0 && (!is5Day || day !== 6)) {
                    const ds = `${y}-${String(m+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    if (!INDONESIA_HOLIDAYS_2026.includes(ds)) {
                        count++;
                    }
                }
            }
            return count;
        };

        // Determine all calendar months covered in [start, end]
        const monthsCovered = [];
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= endMonth) {
            monthsCovered.push({ year: cur.getFullYear(), month: cur.getMonth() });
            cur.setMonth(cur.getMonth() + 1);
        }

        let totalCost = 0;

        (activeData || []).forEach(siswa => {
            // Siswa Terminasi sebelum periode mulai — skip
            if (siswa.status === 'Terminasi' && siswa.keluar) {
                const keluarDate = parseDateYYYYMMDD(siswa.keluar);
                if (keluarDate && keluarDate < start) return;
            }

            const workingDaysType = siswa.hariKerja || '6 Hari';

            // Build lookup map for daily records
            const recMap = {};
            (siswa.dailyRecords || []).forEach(rec => {
                if (rec.dateStr) recMap[rec.dateStr] = rec;
            });

            monthsCovered.forEach(item => {
                const year = item.year;
                const month = item.month;

                // Hitung irisan periode custom vs kalender bulanan penuh
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);

                const intersectStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
                const intersectEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));

                if (intersectStart > intersectEnd) return; // No intersection

                const actualWorkingDays = getActualWorkingDays(year, month, workingDaysType);
                if (actualWorkingDays === 0) return;

                let cursor = new Date(intersectStart);
                while (cursor <= intersectEnd) {
                    const ds = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
                    const dayOfWeek = cursor.getDay();
                    const is5Day = workingDaysType === '5 Hari' || workingDaysType === '5 Hari Kerja';

                    const isActiveWorkDay = dayOfWeek !== 0 && (!is5Day || dayOfWeek !== 6);

                    if (isActiveWorkDay && !INDONESIA_HOLIDAYS_2026.includes(ds)) {
                        const rec = recMap[ds];
                        let isHadir = false;
                        if (rec) {
                            const hv = String(rec.hadir || '').trim().toLowerCase();
                            const hasCheck = hv === '✔' || hv === 'hadir' || hv === '1' || hv === 'true' || hv === 'y' || hv === 'ya';
                            const hasProd = (rec.plan > 0 || rec.actual > 0);
                            if (hasCheck || hasProd) {
                                isHadir = true;
                            }
                        }

                        if (isHadir) {
                            let kelasPadaHariIni = hitungKelasSiswa(siswa.masuk, cursor);
                            if (kelasPadaHariIni === "Kelas 6" || parseInt(kelasPadaHariIni.replace('Kelas ', '')) > 5) {
                                kelasPadaHariIni = "Kelas 5";
                            }
                            const rates = getRates(kelasPadaHariIni);
                            totalCost += (rates.saku / actualWorkingDays) + (rates.trans / actualWorkingDays);
                        }
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }
            });
        });
        return totalCost;
    }

    // Hitung biaya LTC bulan berjalan (1 - akhir bulan ini)
    function calculateCurrentMonthLTCCost() {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const firstDay = y + '-' + String(m+1).padStart(2,'0') + '-01';
        const lastDate = new Date(y, m+1, 0).getDate();
        const lastDay = y + '-' + String(m+1).padStart(2,'0') + '-' + String(lastDate).padStart(2,'0');
        return calculateCostForPeriod(firstDay, lastDay);
    }

    // Update kartu Biaya LTC di dashboard dengan biaya bulan berjalan
    function updateDashboardLTCCost() {
        const costEl = document.getElementById('stat-ltc-cost');
        if (!costEl) return;
        const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const now = new Date();
        const cost = calculateCurrentMonthLTCCost();
        costEl.innerText = 'Rp ' + Math.round(cost).toLocaleString('id-ID');
        costEl.className = 'text-2xl sm:text-4xl font-bold font-display text-brand-textMain mt-4';
        // Update label periode
        const periodLabel = document.getElementById('stat-ltc-period-label');
        if (periodLabel) periodLabel.innerText = monthNames[now.getMonth()] + ' ' + now.getFullYear();
    }

    // Titik Koordinat Presisi Pusat Kabupaten/Kota Se-Jawa Timur untuk Peletakan PIN Bulat Perak 3D
    const coordsJawa = {
        'SBY': [-7.2575, 112.7521],
        'SURABAYA': [-7.2575, 112.7521],
        'MLG': [-7.9650, 112.6300],
        'MALANG': [-7.9650, 112.6300],
        'KOTA MALANG': [-7.9797, 112.6304],
        'SMG': [-6.9667, 110.4167],
        'SEMARANG': [-6.9667, 110.4167],
        'MADIUN': [-7.6298, 111.5239],
        'KOTA MADIUN': [-7.6298, 111.5239],
        'KEDIRI': [-7.8170, 112.0114],
        'KOTA KEDIRI': [-7.8170, 112.0114],
        'GRESIK': [-7.1566, 112.6555],
        'LAMONGAN': [-7.1192, 112.4158],
        'MOJOKERTO': [-7.4705, 112.4401],
        'KOTA MOJOKERTO': [-7.4725, 112.4335],
        'JEMBER': [-8.1724, 113.6995],
        'BANYUWANGI': [-8.2174, 114.3691],
        'TUBAN': [-6.8976, 112.0572],
        'BOJONEGORO': [-7.1509, 111.8818],
        'SIDOARJO': [-7.4478, 112.7183],
        'PASURUAN': [-7.6413, 112.9038],
        'KOTA PASURUAN': [-7.6447, 112.9035],
        'PROBOLINGGO': [-7.7569, 113.2115],
        'KOTA PROBOLINGGO': [-7.7543, 113.2159],
        'LUMAJANG': [-8.1331, 113.2241],
        'NGAWI': [-7.4029, 111.4449],
        'MAGETAN': [-7.6542, 111.3281],
        'PONOROGO': [-7.8694, 111.4645],
        'PACITAN': [-8.2043, 111.1154],
        'TRENGGALEK': [-8.0416, 111.7126],
        'TULUNGAGUNG': [-8.0673, 111.9022],
        'BLITAR': [-8.0983, 112.1681],
        'KOTA BLITAR': [-8.0983, 112.1681],
        'NGANJUK': [-7.5944, 111.9022],
        'SAMPANG': [-7.2023, 113.2504],
        'PAMEKASAN': [-7.1614, 113.4812],
        'SUMENEP': [-7.0091, 113.8617],
        'BANGKALAN': [-7.0313, 112.7424],
        'JOMBANG': [-7.5458, 112.2331],
        'BONDOWOSO': [-7.9135, 113.8217],
        'SITUBONDO': [-7.7019, 114.0051],
        'BATU': [-7.8700, 112.5200],
        'KOTA BATU': [-7.8700, 112.5200]
    };

    // Skema Pewarnaan Peta Warnawarni Pastel Orisinal (Default) Persis Seperti Gambar image_34e27a.jpg
    const jabarJatimPastelColors = {
        'TUBAN': '#1D743A',
        'BOJONEGORO': '#27A054',
        'LAMONGAN': '#0B4D25',
        'GRESIK': '#00A78F',
        'BANGKALAN': '#79C347',
        'SAMPANG': '#1EA25A',
        'PAMEKASAN': '#0A7E4F',
        'SUMENEP': '#0D5B3A',
        'SURABAYA': '#E31F26',
        'SIDOARJO': '#E94D87',
        'PASURUAN': '#8CC63F',
        'PROBOLINGGO': '#72C247',
        'SITUBONDO': '#006B3E',
        'BONDOWOSO': '#008652',
        'BANYUWANGI': '#00A651',
        'JEMBER': '#B37D32',
        'LUMAJANG': '#D8B316',
        'MALANG': '#F2911B',
        'BLITAR': '#F58220',
        'TULUNGAGUNG': '#8F148B',
        'TRENGGALEK': '#A03E79',
        'PACITAN': '#D3222A',
        'PONOROGO': '#E6007E',
        'MAGETAN': '#4271B7',
        'NGAWI': '#52AA7E',
        'MADIUN': '#B7D433',
        'NGANJUK': '#584A70',
        'JOMBANG': '#C381B5',
        'MOJOKERTO': '#C87C9E',
        'KEDIRI': '#8A3591',
        'BATU': '#F25A22',
        'KOTA SURABAYA': '#E31F26',
        'KOTA MALANG': '#F2911B',
        'KOTA MADIUN': '#B7D433',
        'KOTA KEDIRI': '#8A3591',
        'KOTA MOJOKERTO': '#C87C9E',
        'KOTA PASURUAN': '#8CC63F',
        'KOTA PROBOLINGGO': '#72C247',
        'KOTA BLITAR': '#F58220',
        'KOTA BATU': '#F25A22'
    };

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-semibold transition-all duration-300 opacity-0 translate-y-2 pointer-events-auto max-w-sm ${
            type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : type === 'error' 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
        }`;
        
        const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
        toast.innerHTML = `
            <i class="fa-solid ${icon} text-lg"></i>
            <div class="flex-1">${message}</div>
            <button class="text-slate-400 hover:text-slate-600 ml-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('opacity-0', 'translate-y-2');
        }, 10);
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    const createDummyDaily = (perfLabel, score) => {
        const arr = [];
        const today = new Date();
        for (let i = 30; i >= 0; i--) {
            const cursor = new Date(today);
            cursor.setDate(today.getDate() - i);
            const yyyy = cursor.getFullYear();
            const mm = String(cursor.getMonth() + 1).padStart(2, '0');
            const dd = String(cursor.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            if (perfLabel === "Hadir") {
                arr.push({ 
                    dateStr: dateStr, 
                    hadir: cursor.getDay() === 0 ? "" : "✔", 
                    keterangan: cursor.getDay() === 0 ? "Off" : "On duty" 
                });
            } else {
                const target = 100;
                // Hari Minggu plan = 0, actual = 0
                const isSunday = cursor.getDay() === 0;
                const planValue = isSunday ? 0 : target;
                const actualValue = isSunday ? 0 : Math.max(0, Math.round(target * (score / 100)) + (i % 3 === 0 ? 5 : -5));
                arr.push({ 
                    dateStr: dateStr, 
                    plan: planValue, 
                    actual: actualValue, 
                    reject: isSunday ? 0 : 2, 
                    percent: planValue > 0 ? Math.max(0, Math.min(100, Math.round((actualValue / planValue) * 100))) : 0 
                });
            }
        }
        return arr;
    };

    const fallbackSiswa = [
        { id: "2601190", namaLengkap: "FARANDI SATRIA NUGRAHA", email: "2601190@indoprima.com", bagian: "PAINTING", kelas: "Kelas 6", masuk: "2026-01-20", wilayah: "SMG", spv: "Pak Bambang (SMG)", daerahAsal: "Demak", nilai: 100, status: "Aktif", perfLabel: "Plan", dailyRecords: createDummyDaily("Plan", 100) },
        { id: "2601176", namaLengkap: "MUHAMMAD ROJI", email: "2601176@indoprima.com", bagian: "ADM PPIC", kelas: "Kelas 6", masuk: "2026-01-20", wilayah: "SBY", spv: "Bu Sri (SBY)", daerahAsal: "Gresik", nilai: 100, status: "Aktif", perfLabel: "Hadir", dailyRecords: createDummyDaily("Hadir", 100) },
        { id: "2601184", namaLengkap: "MOCHAMMAD IQBAL HABIBI", email: "2601184@indoprima.com", bagian: "CORE", kelas: "Kelas 6", masuk: "2026-01-20", wilayah: "BPP", spv: "Pak Anton (BPP)", daerahAsal: "Balikpapan", nilai: 95, status: "Aktif", perfLabel: "Plan", dailyRecords: createDummyDaily("Plan", 95) },
        { id: "2602002", namaLengkap: "ANDHIKA RISKI SAPUTRA", email: "2602002@indoprima.com", bagian: "GRINDING", kelas: "Kelas 5", masuk: "2026-02-20", wilayah: "SBY", spv: "Pak Agus (SBY)", daerahAsal: "Surabaya", nilai: 120, status: "Aktif", perfLabel: "Plan", dailyRecords: createDummyDaily("Plan", 120) },
        { id: "2602006", namaLengkap: "HANDIKA PRADANA PUTRA", email: "2602006@indoprima.com", bagian: "CORE", kelas: "Kelas 5", masuk: "2026-02-20", wilayah: "BPP", spv: "Pak Anton (BPP)", daerahAsal: "Penajam", nilai: 95, status: "Aktif", perfLabel: "Hadir", dailyRecords: createDummyDaily("Hadir", 95) }
    ];

    const fallbackTurnover = [
        { id: "2601111", namaLengkap: "AQSAL RAIHAN M.", bagian: "CORE", kelas: "Kelas 6", masuk: "2025-11-20", tanggalKeluar: "10/05/2026", keterangan: "Lulus", alasan: "Lulus Magang Kerja Unggulan", wilayah: "JEMBER" },
        { id: "2601183", namaLengkap: "TRIO FARIT HENDRAWAN", bagian: "PAINTING", kelas: "Kelas 6", masuk: "2025-11-20", tanggalKeluar: "11/05/2026", keterangan: "Indisipliner", alasan: "Pelanggaran berulang tata tertib mesin", wilayah: "SURABAYA" },
        { id: "2602003", namaLengkap: "AHMAD HANIFAN", bagian: "GRINDING", kelas: "Kelas 5", masuk: "2025-12-20", tanggalKeluar: "12/05/2026", keterangan: "Indisipliner", alasan: "Sering tidak hadir tanpa keterangan", wilayah: "MALANG" },
        { id: "2602010", namaLengkap: "FAIS WAHYUDA", bagian: "LADLE", kelas: "Kelas 4", masuk: "2026-01-20", tanggalKeluar: "15/05/2026", keterangan: "Resign", alasan: "Membantu usaha keluarga", wilayah: "MADIUN" },
        { id: "2602022", namaLengkap: "FAHNI AZIZCAHYO", bagian: "CORE", kelas: "Kelas 3", masuk: "2026-02-20", tanggalKeluar: "17/05/2026", keterangan: "Resign", alasan: "Kondisi kesehatan tidak mendukung", wilayah: "KEDIRI" },
        { id: "2602035", namaLengkap: "AHMAD NASHOIKHUDIN", bagian: "PAINTING", kelas: "Kelas 5", masuk: "2025-12-20", tanggalKeluar: "19/05/2026", keterangan: "Resign", alasan: "Mendapat pekerjaan di kampung halaman", wilayah: "GRESIK" },
        { id: "2602041", namaLengkap: "MUHAMMAD RIZKY", bagian: "GRINDING", kelas: "Kelas 6", masuk: "2025-11-20", tanggalKeluar: "21/05/2026", keterangan: "Lulus", alasan: "Program magang berakhir", wilayah: "LAMONGAN" },
        { id: "2602050", namaLengkap: "JESEN SENDI", bagian: "LADLE", kelas: "Kelas 6", masuk: "2025-11-20", tanggalKeluar: "22/05/2026", keterangan: "Lulus", alasan: "Program magang berakhir dengan baik", wilayah: "MOJOKERTO" }
    ];

    const fallbackUsers = [
        { id: "USER-20260620-0001", namaLengkap: "Admin Utama", email: "admin@indoprima.com", role: "Admin", nomorRegistrasi: "" },
        { id: "USER-20260620-0002", namaLengkap: "Executive Visitor", email: "visitor@indoprima.com", role: "Visitor", nomorRegistrasi: "" },
        { id: "USER-20260620-0003", namaLengkap: "MUHAMMAD ROJI", email: "2601176@indoprima.com", role: "Siswa", nomorRegistrasi: "2601176" }
    ];

    const fallbackStats = {
        cards: { 
            totalSiswa: 5, 
            siswaBaru: 5, 
            lulus: 8,
            turnoverDetails: { resign: 3, lulus: 3, indisipliner: 2 }
        },
        finance: { income: 45000000, expense: 12000000, balance: 33000000 },
        recent: [
            { id: "TRANS-20260620-0001", tipe: "Pemasukan", kat: "Uang SPP LTC", jumlah: 15000000, tanggal: "20/06/2026", ket: "Pembayaran SPP Kolektif Juni" }
        ],
        siswa: fallbackSiswa,
        monthYear: { year: 2026, month: 3 },
        turnover: fallbackTurnover,
        populasi: [
            { tanggal: "2026-06-20", kontrak: 100, ltc: 5, outsourcing: 10, satpamSupir: 5, totalKaryawan: 120, totalLtc: 5 }
        ],
        costRates: [
            { kelas: "Kelas 1", uangSaku: 3000000, transport: 500000 },
            { kelas: "Kelas 2", uangSaku: 3100000, transport: 500000 },
            { kelas: "Kelas 3", uangSaku: 3250000, transport: 500000 },
            { kelas: "Kelas 4", uangSaku: 3450000, transport: 500000 },
            { kelas: "Kelas 5", uangSaku: 3700000, transport: 500000 }
        ]
    };

    function startRealtimeClock() {
        setInterval(() => {
            const clockEl = document.getElementById('realtime-clock');
            const studentClockEl = document.getElementById('siswa-realtime-clock-form');
            
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            
            const now = new Date();
            const dayName = days[now.getDay()];
            const dayNum = now.getDate();
            const monthName = months[now.getMonth()];
            const year = now.getFullYear();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            
            const clockHtml = `
                <i class="fa-regular fa-clock text-brand-blue text-sm"></i>
                <span>${dayName}, ${dayNum} ${monthName} ${year} — ${hh}:${mm}:${ss} WIB</span>
            `;
            
            if (clockEl) {
                clockEl.innerHTML = clockHtml;
            }
            if (studentClockEl) {
                studentClockEl.innerHTML = `
                    <i class="fa-regular fa-clock text-blue-600 text-sm animate-pulse"></i>
                    <span>${dayName}, ${dayNum} ${monthName} ${year} — ${hh}:${mm}:${ss} WIB</span>
                `;
            }
        }, 1000);
    }

    function fillLogin(email, pass, role) {
        document.getElementById('login-email').value = email;
        document.getElementById('login-pass').value = pass;

        const roles = ['admin', 'visitor', 'siswa'];
        roles.forEach(r => {
            const btn = document.getElementById('quick-fill-' + r);
            if (btn) {
                if (r === role) {
                    btn.className = "py-2 rounded-lg bg-brand-blue text-white shadow-sm transition-all duration-300 cursor-pointer";
                } else {
                    btn.className = "py-2 rounded-lg text-brand-textSub hover:bg-white hover:text-brand-textMain transition-all duration-300 shadow-sm cursor-pointer";
                }
            }
        });
    }

    function handleLogin() {
        try {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const errorBox = document.getElementById('login-error');
            errorBox.classList.add('hidden');

            if (typeof google !== 'undefined' && typeof google.script !== 'undefined' && typeof google.script.run !== 'undefined') {
                google.script.run
                    .withSuccessHandler(res => {
                        if (res.success) {
                            if (window.FORCED_ROLE && res.user.role !== window.FORCED_ROLE) {
                                errorBox.classList.remove('hidden');
                                errorBox.innerText = "Hanya akun " + window.FORCED_ROLE + " yang dapat masuk di halaman ini.";
                                return;
                            }
                            loginSuccess(res.user);
                        } else {
                            errorBox.classList.remove('hidden');
                            errorBox.innerText = res.message;
                        }
                    })
                    .withFailureHandler(err => {
                        errorBox.classList.remove('hidden');
                        errorBox.innerText = "Google Apps Script Error: " + (err.message || err.toString());
                        console.error("Login server error:", err);
                    })
                    .login(email, pass);
            } else {
                let targetUser = null;
                if (email === "admin@indoprima.com" && pass === "admin123") {
                    targetUser = { namaLengkap: "Admin Utama", role: "Admin" };
                } else if (email === "visitor@indoprima.com" && pass === "visitor123") {
                    targetUser = { namaLengkap: "Executive Visitor", role: "Visitor" };
                } else if (email === "2601176@indoprima.com" && pass === "siswa123") {
                    targetUser = { namaLengkap: "MUHAMMAD ROJI", role: "Siswa", studentId: "2601176", nomorRegistrasi: "2601176" };
                }

                if (targetUser) {
                    if (window.FORCED_ROLE && targetUser.role !== window.FORCED_ROLE) {
                        errorBox.classList.remove('hidden');
                        errorBox.innerText = "Hanya akun " + window.FORCED_ROLE + " yang dapat masuk di halaman ini.";
                        return;
                    }
                    loginSuccess(targetUser);
                } else {
                    errorBox.classList.remove('hidden');
                    errorBox.innerText = "Email / Nomor Registrasi salah.";
                }
            }
        } catch (e) {
            const errorBox = document.getElementById('login-error');
            if (errorBox) {
                errorBox.classList.remove('hidden');
                errorBox.innerText = "Security/Browser Error: " + e.toString();
            }
            console.error("Login client error:", e);
        }
    }

    // ====================================================
    // OPENING SPLASH VIDEO (Local HTML5 Video - Autoplay)
    // ====================================================
    let _splashTimer = null;
    let _splashRAF = null;

    function showSplashVideo(onDone) {
        const splash = document.getElementById('opening-splash');
        const video = document.getElementById('splash-video');
        const progressBar = document.getElementById('splash-progress-bar');
        if (!splash) { onDone(); return; }

        // Simpan callback untuk tombol skip
        window._splashDoneCallback = onDone;

        // Tampilkan splash dengan fade in
        splash.classList.remove('hidden');
        splash.style.display = 'flex';
        splash.style.opacity = '0';
        requestAnimationFrame(() => {
            splash.style.transition = 'opacity 0.6s ease';
            splash.style.opacity = '1';
        });

        if (!video) { 
            // Fallback jika tidak ada video element
            _splashTimer = setTimeout(() => _dismissSplash(onDone), 3000);
            return;
        }

        // Reset dan play video
        video.currentTime = 0;
        video.muted = true;
        const playPromise = video.play();
        if (playPromise) {
            playPromise.catch(() => {
                // Autoplay blocked - langsung masuk dashboard setelah 3 detik
                _splashTimer = setTimeout(() => _dismissSplash(onDone), 3000);
            });
        }

        // Progress bar sinkron dengan durasi video
        function updateProgress() {
            if (!video || video.paused || video.ended) return;
            if (progressBar && video.duration) {
                const pct = (video.currentTime / video.duration) * 100;
                progressBar.style.width = pct + '%';
            }
            _splashRAF = requestAnimationFrame(updateProgress);
        }
        video.addEventListener('playing', () => {
            cancelAnimationFrame(_splashRAF);
            updateProgress();
        }, { once: false });

        // Auto dismiss saat video selesai
        video.addEventListener('ended', () => {
            cancelAnimationFrame(_splashRAF);
            _dismissSplash(onDone);
        }, { once: true });

        // Fallback: jika video error / gagal load → langsung dashboard
        video.addEventListener('error', () => {
            clearTimeout(_splashTimer);
            _dismissSplash(onDone);
        }, { once: true });

        // Fallback timeout (max 30 detik, jika video terlalu panjang)
        _splashTimer = setTimeout(() => {
            cancelAnimationFrame(_splashRAF);
            _dismissSplash(onDone);
        }, 30000);
    }

    function _dismissSplash(onDone) {
        clearTimeout(_splashTimer);
        cancelAnimationFrame(_splashRAF);
        const splash = document.getElementById('opening-splash');
        const video = document.getElementById('splash-video');
        if (!splash) { if (onDone) onDone(); return; }

        // Pause video
        if (video && !video.paused) {
            video.pause();
        }

        // Fade out smooth
        splash.style.transition = 'opacity 0.8s ease';
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            splash.classList.add('hidden');
            if (onDone) onDone();
        }, 800);
    }

    window.skipSplashVideo = function() {
        _dismissSplash(window._splashDoneCallback);
    };


    function loginSuccess(user, bypassSplash = false) {
        currentUser = user;
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            if (user.role === 'Admin') {
                localStorage.setItem('lastAdminActivity', String(Date.now()));
            }
        } catch (e) {
            console.error("Failed to save session:", e);
        }

        // Redirect to role-specific URL if on root page (no FORCED_ROLE)
        if (!window.FORCED_ROLE) {
            const roleRouteMap = {
                'Admin': '/admin',
                'Visitor': '/visitor',
                'Siswa': '/siswa'
            };
            const targetRoute = roleRouteMap[user.role];
            if (targetRoute) {
                try {
                    sessionStorage.setItem('justLoggedIn', 'true');
                } catch (e) {}
                window.location.href = targetRoute;
                return;
            }
        }
        document.getElementById('login-screen').classList.add('hidden');

        const _proceedToDashboard = () => {
            document.getElementById('app').classList.remove('hidden');

            document.getElementById('user-display-name').innerText = currentUser.namaLengkap;
            document.getElementById('user-display-role').innerText = currentUser.role.toUpperCase();

            const adminNav = document.getElementById('nav-admin');
            if (currentUser.role === 'Admin') {
                adminNav.classList.remove('hidden');
            } else {
                adminNav.classList.add('hidden');
            }

            // Restore navigation & header visibility for all views
            const appSidebar = document.getElementById('app-sidebar');
            if (appSidebar) appSidebar.classList.remove('hidden');

            const mainHeader = document.querySelector('main > header');
            if (mainHeader) mainHeader.classList.remove('hidden');
            
            const bottomNav = document.getElementById('mobile-bottom-nav');
            if (bottomNav) {
                bottomNav.classList.remove('hidden');
                bottomNav.style.removeProperty('display');
            }

            // Always direct user to dashboard after login as requested
            switchView('dashboard');
            startRealtimeClock();
            loadDashboardData();
        };

        // Tampilkan animasi loading (intro.mp4) untuk SEMUA role (Admin, Visitor, Siswa) saat login
        if (bypassSplash) {
            _proceedToDashboard();
        } else {
            showSplashVideo(_proceedToDashboard);
        }
    }


    function loadDashboardData() {
        const spinner = document.getElementById('header-sync-spinner');
        if (spinner) spinner.classList.add('animate-spin');
        _updateSyncIndicator('syncing');

        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(data => {
                    if (spinner) spinner.classList.remove('animate-spin');
                    if (data && data.success !== false) {
                        monthYearMetadata = data.monthYear || { year: 2026, month: 3 };
                        renderData(data);
                        _updateSyncIndicator('done');
                    } else {
                        _updateSyncIndicator('error');
                        showToast('Gagal memuat data dasbor.', 'error');
                    }
                })
                .withFailureHandler(err => {
                    if (spinner) spinner.classList.remove('animate-spin');
                    _updateSyncIndicator('error');
                    showToast('Gagal memuat data dari server.', 'error');
                })
                .getDashboardStats();
        } else {
            setTimeout(() => {
                if (spinner) spinner.classList.remove('animate-spin');
                monthYearMetadata = fallbackStats.monthYear;
                renderData(fallbackStats);
                _updateSyncIndicator('done');
            }, 800);
        }
    }

    function syncDataManual() {
        const spinner = document.getElementById('header-sync-spinner');
        if (spinner) spinner.classList.add('animate-spin');
        _updateSyncIndicator('syncing');

        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(syncResult => {
                    if (syncResult && syncResult.success) {
                        google.script.run
                            .withSuccessHandler(data => {
                                if (spinner) spinner.classList.remove('animate-spin');
                                if (data && data.success !== false) {
                                    monthYearMetadata = data.monthYear || { year: 2026, month: 3 };
                                    renderData(data);
                                    _updateSyncIndicator('done');
                                    showToast('Sinkronisasi data berhasil!', 'success');
                                } else {
                                    _updateSyncIndicator('error');
                                    showToast('Gagal memuat data dasbor.', 'error');
                                }
                            })
                            .withFailureHandler(err => {
                                if (spinner) spinner.classList.remove('animate-spin');
                                _updateSyncIndicator('error');
                            })
                            .getDashboardStats();
                    } else {
                        if (spinner) spinner.classList.remove('animate-spin');
                        _updateSyncIndicator('error');
                        showToast(syncResult ? syncResult.message : 'Sinkronisasi gagal.', 'error');
                    }
                })
                .withFailureHandler(err => {
                    if (spinner) spinner.classList.remove('animate-spin');
                    _updateSyncIndicator('error');
                    showToast('Gagal menghubungi server.', 'error');
                })
                .syncExternalUsersManual();
        } else {
            setTimeout(() => {
                if (spinner) spinner.classList.remove('animate-spin');
                monthYearMetadata = fallbackStats.monthYear;
                renderData(fallbackStats);
                _updateSyncIndicator('done');
            }, 800);
        }
    };

    function initializeDatePickerLimits() {
        if (activeData.length === 0) return;
        
        const allDates = [];
        activeData.forEach(siswa => {
            (siswa.dailyRecords || []).forEach(rec => {
                if (rec.dateStr) allDates.push(rec.dateStr);
            });
        });
        
        const uniqueSortedDates = Array.from(new Set(allDates)).sort();
        
        if (uniqueSortedDates.length === 0) {
            const minStr = "2026-04-20";
            const maxStr = "2026-05-14";
            setDateInputs(minStr, maxStr, [minStr, maxStr]);
            return;
        }
        
        const minStr = uniqueSortedDates[0];
        const maxStr = uniqueSortedDates[uniqueSortedDates.length - 1];
        
        setDateInputs(minStr, maxStr, uniqueSortedDates);
    }

    function setDateInputs(minStr, maxStr, uniqueSortedDates) {
        const startInput = document.getElementById('filter-start-date');
        const endInput = document.getElementById('filter-end-date');
        const chartStartInput = document.getElementById('chart-start-date');
        const chartEndInput = document.getElementById('chart-end-date');

        // Batasan max adalah hari ini
        const today = new Date();
        const yyyyToday = today.getFullYear();
        const mmToday = String(today.getMonth() + 1).padStart(2, '0');
        const ddToday = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyyToday}-${mmToday}-${ddToday}`;

        // Hitung 10 hari kerja terakhir dari hari ini
        const workingDays = [];
        let cursor = new Date(today);
        while (workingDays.length < 10) {
            if (cursor.getDay() !== 0) { // 0 = Minggu
                const yyyy = cursor.getFullYear();
                const mm = String(cursor.getMonth() + 1).padStart(2, '0');
                const dd = String(cursor.getDate()).padStart(2, '0');
                workingDays.unshift(`${yyyy}-${mm}-${dd}`);
            }
            cursor.setDate(cursor.getDate() - 1);
        }

        const defaultStart = workingDays[0];
        const defaultEnd = workingDays[workingDays.length - 1];

        // Terapkan batas dan nilai default ke filter global
        if (startInput) {
            startInput.min = minStr || "2026-04-20";
            startInput.max = todayStr;
            startInput.value = defaultStart;
        }
        if (endInput) {
            endInput.min = minStr || "2026-04-20";
            endInput.max = todayStr;
            endInput.value = defaultEnd;
        }

        // Terapkan batas dan nilai default ke filter grafik
        if (chartStartInput) {
            chartStartInput.min = minStr || "2026-04-20";
            chartStartInput.max = todayStr;
            chartStartInput.value = defaultStart;
        }
        if (chartEndInput) {
            chartEndInput.min = minStr || "2026-04-20";
            chartEndInput.max = todayStr;
            chartEndInput.value = defaultEnd;
        }
    }

    function resetChartLocalDates() {
        initializeDatePickerLimits();
        updateLtcChart();
    }

    function renderData(data) {
        rawSiswaData = data.siswa || [];
        activeData = JSON.parse(JSON.stringify(rawSiswaData)).filter(s => s.status === "Aktif"); 
        
        rawTurnoverData = data.turnover || [];
        activeTurnoverData = JSON.parse(JSON.stringify(rawTurnoverData));

        // Tetap gunakan kelas dari data sumber (spreadsheet) agar tidak salah sinkronisasi.
        // Hanya jika kelas kosong di spreadsheet, kita hitung secara dinamis sebagai cadangan.
        activeData.forEach(s => {
            if (!s.kelas || s.kelas === "-" || s.kelas === "null") {
                if (s.masuk) {
                    const exitStr = s.tanggalKeluar || s.keluar;
                    s.kelas = hitungKelasSiswa(s.masuk, exitStr ? parseDateYYYYMMDD(exitStr) : new Date());
                } else {
                    s.kelas = "Kelas 1";
                }
            } else {
                // Pastikan formatnya seragam "Kelas X" jika hanya berisi angka
                const num = parseInt(s.kelas.replace(/Kelas\s+/i, ''));
                if (!isNaN(num)) {
                    s.kelas = "Kelas " + num;
                }
            }
        });
        activeTurnoverData.forEach(s => {
            if (!s.kelas || s.kelas === "-" || s.kelas === "null") {
                if (s.masuk) {
                    const exitStr = s.tanggalKeluar || s.keluar;
                    s.kelas = hitungKelasSiswa(s.masuk, exitStr ? parseDateYYYYMMDD(exitStr) : new Date());
                } else {
                    s.kelas = "Kelas 1";
                }
            } else {
                const num = parseInt(s.kelas.replace(/Kelas\s+/i, ''));
                if (!isNaN(num)) {
                    s.kelas = "Kelas " + num;
                }
            }
        });

        financeData = data.recent || [];
        costRatesConfig = data.costRates || [];
        rawPopulasiData = data.populasi || [];

        // Store absensi data from server
        absensiData = data.absensi || [];
        currentVersion = data.version || "";

        const cardStats = data.cards || {};
        const turnDetails = cardStats.turnoverDetails || { resign: 0, lulus: 0, indisipliner: 0 };
        
        const statLulus = document.getElementById('stat-siswa-lulus');
        if (statLulus) statLulus.innerText = cardStats.lulus || 0;
        
        const turnResign = document.getElementById('stat-turnover-resign');
        if (turnResign) turnResign.innerText = `Resign: ${turnDetails.resign || 0}`;
        
        const turnLulus = document.getElementById('stat-turnover-lulus');
        if (turnLulus) turnLulus.innerText = `Lulus: ${turnDetails.lulus || 0}`;
        
        const turnIndis = document.getElementById('stat-turnover-indisipliner');
        if (turnIndis) turnIndis.innerText = `Indisipliner: ${turnDetails.indisipliner || 0}`;

        initializeDatePickerLimits();
        calculateDynamicPerformance();
        renderRecentTransactionsTable();
        populateTurnoverCitiesDropdown(); 
        initVisualizations();

        // Auto-set calculator dates to current month & auto-calculate
        _autoSetCalcDatesAndCalculate();

        // Refresh active views on data load
        const activeViews = {
            'view-siswa': () => typeof renderSiswaView === 'function' && renderSiswaView(),
            'view-keuangan': () => {
                if (typeof renderKeuanganView === 'function') {
                    renderKeuanganView();
                    _autoSetCalcDatesAndCalculate();
                    if (typeof calculateLTCCosts === 'function') setTimeout(() => calculateLTCCosts(), 100);
                    if (typeof renderMonthlyHistoryTable === 'function') setTimeout(() => renderMonthlyHistoryTable(), 150);
                }
            },
            'view-turnover': () => typeof renderTurnoverView === 'function' && renderTurnoverView(),
            'view-admin': () => typeof renderAdminView === 'function' && renderAdminView(),
            'view-absensi': () => typeof renderAbsensiView === 'function' && renderAbsensiView()
        };

        Object.keys(activeViews).forEach(viewId => {
            const viewEl = document.getElementById(viewId);
            if (viewEl && !viewEl.classList.contains('hidden')) {
                activeViews[viewId]();
            }
        });
        
        // Populate student portal details if Siswa logged in
        if (currentUser && currentUser.role === 'Siswa') {
            if (typeof populateSiswaPortalFields === 'function') {
                populateSiswaPortalFields();
            }
        }
    }

    function _autoSetCalcDatesAndCalculate() {
        const startInput = document.getElementById('calc-start-date');
        const endInput = document.getElementById('calc-end-date');
        if (!startInput || !endInput) return;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        startInput.value = `${year}-${month}-01`;
        endInput.value = `${year}-${month}-${String(lastDay).padStart(2,'0')}`;
        // Auto-calculate if keuangan view is visible
        const keuView = document.getElementById('view-keuangan');
        if (keuView && !keuView.classList.contains('hidden')) {
            if (typeof calculateLTCCosts === 'function') calculateLTCCosts();
            if (typeof renderMonthlyHistoryTable === 'function') renderMonthlyHistoryTable();
        }
    }

    function calculateDynamicPerformance() {
        let startInput = document.getElementById('filter-start-date');
        let endInput = document.getElementById('filter-end-date');
        
        // Fallback ke input tanggal chart jika input filter global tidak ada di HTML
        if (!startInput) startInput = document.getElementById('chart-start-date');
        if (!endInput) endInput = document.getElementById('chart-end-date');
        
        if (!startInput || !endInput) return;

        const startDateVal = startInput.value;
        const endDateVal = endInput.value;
        
        if (!startDateVal || !endDateVal) return;
        
        let totalOverallScore = 0;
        let activeStudentCount = 0;

        activeData.forEach(siswa => {
            let activeDays = 0; // count of Hadir-days
            let checkmarkCount = 0; // count of Hadir-days present
            let totalPlan = 0;
            let totalActual = 0;
            let planDays = 0; // count of Plan-days
            
            const recordsInRange = (siswa.dailyRecords || []).filter(rec => rec.dateStr >= startDateVal && rec.dateStr <= endDateVal);
            
            recordsInRange.forEach(rec => {
                const parsedDate = parseDateYYYYMMDD(rec.dateStr);
                const isSunday = parsedDate ? (parsedDate.getDay() === 0) : false;
                if (isSunday) return; // Ignore Sundays from all calculations
                
                const isBagianHadir = (siswa.section || '').toUpperCase().includes('ADM') || 
                                      (siswa.section || '').toUpperCase().includes('ADMINISTRASI') || 
                                      (siswa.section || '').toUpperCase().includes('PPIC') ||
                                      (siswa.bagian || '').toUpperCase().includes('ADM') || 
                                      (siswa.bagian || '').toUpperCase().includes('ADMINISTRASI') || 
                                      (siswa.bagian || '').toUpperCase().includes('PPIC');
                
                // Adaptive day-by-day classification: if plan > 0, it is a production day, not a simple attendance checkmark day
                const isHadirDay = (rec.plan === null || rec.plan === 0 || isNaN(rec.plan)) && (rec.hadir !== "" && rec.hadir !== undefined && rec.hadir !== null);
                
                if (isHadirDay) {
                    activeDays++;
                    if (rec.hadir === "✔" || rec.hadir === "Hadir") {
                        checkmarkCount++;
                    }
                } else {
                    planDays++;
                    totalPlan += rec.plan;
                    totalActual += rec.actual;
                }
            });
            
            let dynamicScore = 0;
            const planScore = totalPlan > 0 ? (totalActual / totalPlan) : 0;
            const totalDays = activeDays + planDays;
            
            if (totalDays > 0) {
                const sumOfScores = checkmarkCount + (planDays * planScore);
                dynamicScore = Math.round((sumOfScores / totalDays) * 100);
            }
            
            if (dynamicScore > 100) dynamicScore = 100;
            siswa.nilai = dynamicScore; 
            
            totalOverallScore += dynamicScore;
            activeStudentCount++;
        });
        
        const statSiswaAktif = document.getElementById('stat-siswa-aktif');
        if (statSiswaAktif) statSiswaAktif.innerText = activeStudentCount;
        
        const overallAvg = activeStudentCount > 0 ? Math.round(totalOverallScore / activeStudentCount) : 0;
        const statAvgPerf = document.getElementById('stat-avg-performance');
        if (statAvgPerf) statAvgPerf.innerText = overallAvg + "%";

        // Update Persentase LTC Card from the latest populasi data
        const statPctLtc = document.getElementById('stat-persentase-ltc');
        const statPctLtcDate = document.getElementById('stat-persentase-ltc-date');
        
        if (statPctLtc && rawPopulasiData && rawPopulasiData.length > 0) {
            const sortedPop = [...rawPopulasiData].sort((a, b) => {
                const dateA = a.tanggal || "";
                const dateB = b.tanggal || "";
                return dateB.localeCompare(dateA);
            });
            const latest = sortedPop[0];
            if (latest) {
                const pct = latest.totalKaryawan > 0 ? ((latest.totalLtc / latest.totalKaryawan) * 100).toFixed(2) + '%' : '0.00%';
                statPctLtc.innerText = pct;
                if (statPctLtcDate) {
                    statPctLtcDate.innerText = latest.tanggal;
                }
            }
        } else if (statPctLtc) {
            statPctLtc.innerText = '0.00%';
            if (statPctLtcDate) statPctLtcDate.innerText = 'Terbaru';
        }

        if (currentUser && currentUser.role === 'Siswa') {
            const searchMe = currentUser.studentId || currentUser.nomorRegistrasi;
            const me = activeData.find(s => s.id === searchMe);
            if (me) {
                const portalNilai = document.getElementById('siswa-portal-nilai');
                if (portalNilai) portalNilai.innerText = me.nilai + "%";
                renderStudentPersonalLogs(me);
            }
        }

        // Tampilkan biaya LTC bulan berjalan di kartu dashboard
        updateDashboardLTCCost();
    }

    function applyDateRangeFilter() {
        calculateDynamicPerformance();
        const viewSiswa = document.getElementById('view-siswa');
        if (viewSiswa && !viewSiswa.classList.contains('hidden')) {
            renderSiswaView();
        }
    }

    function resetDateRangeFilter() {
        initializeDatePickerLimits();
        applyDateRangeFilter();
    }

    // Auto-refresh from database every 5 minutes
    setInterval(() => {
        console.log("[LTC Dashboard] Auto-syncing data from Google Sheets...");
        loadDashboardData();
    }, 5 * 60 * 1000);

    // Update live clock in sync indicator every second
    setInterval(() => {
        if (_lastSyncTime) {
            const dot = document.getElementById('sync-live-dot');
            const label = document.getElementById('sync-live-label');
            if (!dot || !label) return;
            const h = String(_lastSyncTime.getHours()).padStart(2,'0');
            const m = String(_lastSyncTime.getMinutes()).padStart(2,'0');
            const s = String(_lastSyncTime.getSeconds()).padStart(2,'0');
            const secsAgo = Math.floor((new Date() - _lastSyncTime) / 1000);
            if (secsAgo < 60) {
                label.textContent = `Live · ${h}:${m}:${s}`;
            } else {
                const minsAgo = Math.floor(secsAgo / 60);
                label.textContent = `Sync ${minsAgo}m lalu · ${h}:${m}:${s}`;
            }
        }
    }, 1000);

    // =============================================
    // SIDEBAR TOGGLE FUNCTIONS (Desktop Only)
    // =============================================

    function toggleSidebarCollapse() {
        const app = document.getElementById('app');
        const icon = document.getElementById('sidebar-toggle-icon');
        if (!app || !icon) return;

        const isCollapsed = app.classList.contains('sidebar-collapsed');

        if (!isCollapsed) {
            // Full → Collapsed (icon-only mini sidebar)
            app.classList.add('sidebar-collapsed');
            icon.className = 'fa-solid fa-chevron-right text-[10px]';
        } else {
            // Collapsed → Full
            app.classList.remove('sidebar-collapsed');
            icon.className = 'fa-solid fa-chevron-left text-[10px]';
        }
    }

    function switchView(viewName) {
        try {
            localStorage.setItem('activeView', viewName);
        } catch (e) {
            console.error("Failed to save view state:", e);
        }

        const views = ['view-dashboard', 'view-siswa', 'view-sisi-siswa', 'view-keuangan', 'view-turnover', 'view-absensi', 'view-admin'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.add('hidden');
        });

        let targetView = 'view-' + viewName;

        const targetEl = document.getElementById(targetView);
        if (targetEl) targetEl.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-white', 'bg-blue-600');
            btn.classList.add('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
        });

        const activeBtn = document.getElementById('nav-' + viewName);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
            activeBtn.classList.add('text-white', 'bg-blue-600');
        }

        // Update mobile bottom nav active state
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeMobileBtn = document.getElementById('mobile-nav-' + viewName);
        if (activeMobileBtn) {
            activeMobileBtn.classList.add('active');
        }

        // Enforce admin nav visibility strictly based on role
        const adminNav = document.getElementById('nav-admin');
        const mobileAdminNav = document.getElementById('mobile-nav-admin');
        if (adminNav) {
            if (currentUser && currentUser.role === 'Admin') {
                adminNav.classList.remove('hidden');
                if (mobileAdminNav) { mobileAdminNav.classList.remove('hidden'); mobileAdminNav.classList.add('flex'); }
            } else {
                adminNav.classList.add('hidden');
                if (mobileAdminNav) { mobileAdminNav.classList.add('hidden'); mobileAdminNav.classList.remove('flex'); }
            }
        }

        // Show/hide absensi nav for Admin only
        const absensiNav = document.getElementById('nav-absensi');
        const mobileAbsensiNav = document.getElementById('mobile-nav-absensi');
        if (absensiNav) {
            if (currentUser && currentUser.role === 'Admin') {
                absensiNav.classList.remove('hidden');
                if (mobileAbsensiNav) { mobileAbsensiNav.classList.remove('hidden'); mobileAbsensiNav.classList.add('flex'); }
            } else {
                absensiNav.classList.add('hidden');
                if (mobileAbsensiNav) { mobileAbsensiNav.classList.add('hidden'); mobileAbsensiNav.classList.remove('flex'); }
            }
        }

        const titleMap = {
            'dashboard': 'Dashboard Monitor',
            'siswa': 'Performa LTC',
            'sisi-siswa': 'Portal Siswa',
            'keuangan': 'Cost / Keuangan',
            'turnover': 'Turnover',
            'absensi': 'Absensi Siswa',
            'admin': 'Admin'
        };
        
        const titleHeader = document.getElementById('header-view-title');
        if (titleHeader) titleHeader.innerText = titleMap[viewName] || 'Dashboard';

        if (viewName === 'siswa') renderSiswaView();
        if (viewName === 'keuangan') {
            renderKeuanganView();
            // Auto-set calc dates to current month and calculate on tab switch
            _autoSetCalcDatesAndCalculate();
            if (typeof calculateLTCCosts === 'function') setTimeout(() => calculateLTCCosts(), 100);
            if (typeof renderMonthlyHistoryTable === 'function') setTimeout(() => renderMonthlyHistoryTable(), 150);
        }
        if (viewName === 'turnover') renderTurnoverView();
        if (viewName === 'admin') renderAdminView();
        if (viewName === 'absensi' && typeof renderAbsensiView === 'function') renderAbsensiView();
        
        if (viewName === 'turnover' && mapTurnoverInstance) {
            setTimeout(() => mapTurnoverInstance.invalidateSize(), 200);
        }
    }

    function searchGlobalTable(query) {
        const cleanQuery = query.toLowerCase();
        const siswaView = document.getElementById('view-siswa');
        const turnoverView = document.getElementById('view-turnover');
        
        if (siswaView && !siswaView.classList.contains('hidden')) {
            const searchSiswaEl = document.getElementById('search-siswa');
            if (searchSiswaEl) {
                searchSiswaEl.value = cleanQuery;
                renderSiswaView();
            }
        }
        if (turnoverView && !turnoverView.classList.contains('hidden')) {
            const searchTurnEl = document.getElementById('search-turnover');
            if (searchTurnEl) {
                searchTurnEl.value = cleanQuery;
                renderTurnoverView();
            }
        }
    }

    function showGlassModal(options) {
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 glass-modal-bg transition-opacity duration-250";
        overlay.id = "dynamic-glass-modal";
        
        const card = document.createElement('div');
        card.className = "glass-modal-card p-6 md:p-8 rounded-[28px] w-full max-w-md shadow-2xl space-y-6 transform scale-95 transition-transform duration-250";
        
        card.innerHTML = `
            <div class="space-y-2">
                <h3 class="font-display font-bold text-lg text-brand-textMain flex items-center gap-2">
                    <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
                    <span>${options.title || 'Konfirmasi'}</span>
                </h3>
                <p class="text-xs text-brand-textSub font-semibold leading-relaxed">${options.message || 'Apakah Anda yakin?'}</p>
            </div>
            <div class="flex gap-3 justify-end">
                <button id="glass-modal-cancel" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-all-300">
                    Batal
                </button>
                <button id="glass-modal-confirm" class="px-4 py-2 ${options.confirmClass || 'bg-brand-blue hover:bg-blue-700'} text-xs font-bold text-white rounded-xl transition-all-300 shadow-md" ${options.confirmStyle ? `style="${options.confirmStyle}"` : ''}>
                    ${options.confirmText || 'Konfirmasi'}
                </button>
            </div>
        `;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Micro-animation trigger
        setTimeout(() => {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }, 10);
        
        const cancelBtn = overlay.querySelector('#glass-modal-cancel');
        const confirmBtn = overlay.querySelector('#glass-modal-confirm');
        
        const close = () => {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 250);
        };
        
        cancelBtn.onclick = close;
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };
        
        confirmBtn.onclick = () => {
            close();
            if (typeof options.onConfirm === 'function') {
                options.onConfirm();
            }
        };
    }

    const ADMIN_INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 Jam (3600000 ms)

    function recordAdminActivity() {
        if (currentUser && currentUser.role === 'Admin') {
            const now = Date.now();
            if (!window._lastActivitySaveTime || (now - window._lastActivitySaveTime > 3000)) {
                window._lastActivitySaveTime = now;
                try {
                    localStorage.setItem('lastAdminActivity', String(now));
                } catch (e) {}
            }
        }
    }

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evtType => {
        window.addEventListener(evtType, recordAdminActivity, { passive: true });
    });

    setInterval(() => {
        if (currentUser && currentUser.role === 'Admin') {
            const lastActiveStr = localStorage.getItem('lastAdminActivity');
            const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
            if (lastActive && (Date.now() - lastActive >= ADMIN_INACTIVITY_LIMIT_MS)) {
                console.warn("[LTC Admin] Inactive for 1 hour. Triggering auto-logout...");
                logout();
                const errorBox = document.getElementById('login-error');
                if (errorBox) {
                    errorBox.classList.remove('hidden');
                    errorBox.innerText = 'Sesi Admin telah berakhir karena tidak ada aktivitas selama 1 jam. Silakan login kembali.';
                }
                showToast('Sesi Admin telah berakhir karena tidak ada aktivitas selama 1 jam.', 'error');
            }
        }
    }, 10000);

    function logout() {
        currentUser = null;
        try {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('activeView');
            localStorage.removeItem('lastAdminActivity');
        } catch (e) {
            console.error("Failed to clear session:", e);
        }

        // Panggil endpoint logout backend untuk menghapus HTTP-Only cookies
        fetch('/api/auth/logout', { method: 'POST' }).catch(err => {
            console.warn("Logout cookie clearance error:", err);
        });

        document.getElementById('app').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        showToast('Sesi Anda telah diakhiri.', 'info');
    }

    // Restore Session on Page Refresh
    document.addEventListener('DOMContentLoaded', () => {
        try {
            // Apply forced role adjustments first
            if (window.FORCED_ROLE) {
                const qfContainer = document.getElementById('quick-fill-container');
                if (qfContainer) qfContainer.classList.add('hidden');
                
                const roleLabel = document.getElementById('login-role-label');
                if (roleLabel) roleLabel.innerText = window.FORCED_ROLE.toUpperCase() + ' PORTAL';

                if (window.FORCED_ROLE === 'Siswa') {
                    fillLogin('2601176@indoprima.com', 'siswa123', 'siswa');
                } else if (window.FORCED_ROLE === 'Admin') {
                    fillLogin('admin@indoprima.com', 'admin123', 'admin');
                } else if (window.FORCED_ROLE === 'Visitor') {
                    fillLogin('visitor@indoprima.com', 'visitor123', 'visitor');
                }
            }

            const savedUserStr = localStorage.getItem('currentUser');
            if (savedUserStr) {
                const savedUser = JSON.parse(savedUserStr);
                if (savedUser) {
                    // Jika di halaman utama tanpa FORCED_ROLE (ltcindoprima.web.id/), 
                    // jangan auto-restore agar pengguna dapat bebas memilih akun/pindah user
                    if (!window.FORCED_ROLE) {
                        return;
                    }

                    // Check if the saved user role matches the forced role of the page
                    if (window.FORCED_ROLE && savedUser.role !== window.FORCED_ROLE) {
                        // Role mismatch! Clear session and require login for this specific page
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('activeView');
                        localStorage.removeItem('lastAdminActivity');
                        return;
                    }

                    // Check for Admin 1-hour inactivity expiration
                    if (savedUser.role === 'Admin') {
                        const lastActiveStr = localStorage.getItem('lastAdminActivity');
                        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
                        if (lastActive && (Date.now() - lastActive >= ADMIN_INACTIVITY_LIMIT_MS)) {
                            localStorage.removeItem('currentUser');
                            localStorage.removeItem('activeView');
                            localStorage.removeItem('lastAdminActivity');
                            const errorBox = document.getElementById('login-error');
                            if (errorBox) {
                                errorBox.classList.remove('hidden');
                                errorBox.innerText = 'Sesi Admin telah berakhir karena tidak ada aktivitas selama 1 jam. Silakan login kembali.';
                            }
                            return;
                        }
                    }

                    // Check if just logged in from root page
                    let justLoggedIn = false;
                    try {
                        justLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true';
                        if (justLoggedIn) sessionStorage.removeItem('justLoggedIn');
                    } catch (e) {}

                    if (justLoggedIn) {
                        loginSuccess(savedUser, false);
                    } else {
                        loginSuccess(savedUser, true);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to restore session on page load:", e);
        }
    });

    // Auto Upper Case for all text inputs & textareas
    document.addEventListener('input', function (e) {
        const target = e.target;
        if (!target) return;
        const tagName = target.tagName;
        const type = (target.type || '').toLowerCase();
        
        if (
            tagName === 'TEXTAREA' || 
            (tagName === 'INPUT' && (type === 'text' || type === 'search' || !type))
        ) {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const upper = target.value.toUpperCase();
            if (target.value !== upper) {
                target.value = upper;
                if (start !== null && end !== null) {
                    try {
                        target.setSelectionRange(start, end);
                    } catch (err) {
                        // Ignore for input types that don't support selectionRange
                    }
                }
            }
        }
    });

