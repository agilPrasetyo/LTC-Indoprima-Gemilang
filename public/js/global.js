
// Custom Universal Data Labels Plugin for Chart.js (Bar, Line & Donut/Pie Charts)
const globalChartDataLabelsPlugin = {
    id: 'globalChartDataLabels',
    afterDatasetsDraw(chart) {
        try {
            if (chart.options && chart.options.plugins && chart.options.plugins.datalabels && chart.options.plugins.datalabels.display === false) {
                return;
            }

            const { ctx } = chart;
            const numDatasets = chart.data.datasets.length;
            
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                if (dataset.datalabels && dataset.datalabels.display === false) return;
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden) return;

                const isLineDataset = dataset.type === 'line' || meta.type === 'line';
                const isBarDataset = dataset.type === 'bar' || meta.type === 'bar' || chart.config.type === 'bar';
                const isPieOrDonut = chart.config.type === 'pie' || chart.config.type === 'doughnut';

                const isStackedBar = isBarDataset && (
                    (chart.options && chart.options.scales && chart.options.scales.x && chart.options.scales.x.stacked) ||
                    (chart.options && chart.options.scales && chart.options.scales.y && chart.options.scales.y.stacked) ||
                    dataset.stack !== undefined
                );

                meta.data.forEach((element, index) => {
                    try {
                        const val = dataset.data[index];
                        if (val === null || val === undefined || val === 0 || val === '0') return;
                        if (!element || typeof element.tooltipPosition !== 'function') return;

                        const position = element.tooltipPosition();
                        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || isNaN(position.x) || isNaN(position.y)) return;

                        ctx.save();

                        if (isPieOrDonut) {
                            const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
                            const pct = total > 0 ? Math.round((Number(val) / total) * 100) : 0;
                            
                            ctx.font = 'bold 11px Inter, sans-serif';
                            ctx.fillStyle = '#FFFFFF';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                            ctx.shadowBlur = 4;

                            const labelText = total > 1 && pct > 0 ? `${val} (${pct}%)` : `${val}`;
                            ctx.fillText(labelText, position.x, position.y);
                        } else if (isLineDataset) {
                            const isPercentLine = (dataset.label && (dataset.label.toLowerCase().includes('persentase') || dataset.label.includes('%') || dataset.label.toLowerCase().includes('efisiensi'))) || dataset.yAxisID === 'yPercent' || dataset.yAxisID === 'y1';
                            const formattedVal = typeof val === 'number' 
                                ? (isPercentLine || !Number.isInteger(val) ? (Number.isInteger(val) ? val + '%' : val.toFixed(1) + '%') : val.toLocaleString('id-ID'))
                                : String(val);

                            const bgBadge = dataset.datalabels && dataset.datalabels.backgroundColor ? dataset.datalabels.backgroundColor : null;
                            const textBadgeColor = dataset.datalabels && dataset.datalabels.color ? dataset.datalabels.color : '#FFFFFF';

                            if (bgBadge) {
                                ctx.font = 'bold 10px Inter, sans-serif';
                                const textWidth = ctx.measureText(formattedVal).width;
                                const padX = 5;
                                const rectWidth = textWidth + padX * 2;
                                const rectHeight = 16;
                                const rx = position.x - rectWidth / 2;
                                const ry = position.y - 20;

                                ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                                ctx.shadowBlur = 3;
                                ctx.fillStyle = bgBadge;
                                ctx.beginPath();
                                if (typeof ctx.roundRect === 'function') {
                                    ctx.roundRect(rx, ry, rectWidth, rectHeight, 4);
                                } else {
                                    ctx.rect(rx, ry, rectWidth, rectHeight);
                                }
                                ctx.fill();

                                ctx.shadowColor = 'transparent';
                                ctx.fillStyle = textBadgeColor;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(formattedVal, position.x, ry + rectHeight / 2 + 0.5);
                            } else {
                                ctx.font = 'bold 11px Inter, sans-serif';
                                ctx.fillStyle = dataset.borderColor || '#0F3A8C';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
                                ctx.shadowBlur = 3;
                                ctx.fillText(formattedVal, position.x, position.y - 10);
                            }
                        } else if (isStackedBar) {
                            const base = element.base !== undefined ? element.base : element.y;
                            const sliceHeight = Math.abs(base - element.y);
                            
                            // Render label INSIDE slice if height is sufficient
                            if (sliceHeight >= 14) {
                                const yCenter = (element.y + base) / 2;
                                ctx.font = 'bold 11px Inter, sans-serif';
                                ctx.fillStyle = '#FFFFFF';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                                ctx.shadowBlur = 2;
                                ctx.fillText(typeof val === 'number' ? val.toLocaleString('id-ID') : String(val), element.x, yCenter);
                            }

                            // Render TOTAL STACK SUM on top of the highest stacked segment
                            let isTopMost = true;
                            let topY = element.y;
                            let stackSum = 0;

                            for (let dIdx = 0; dIdx < numDatasets; dIdx++) {
                                const dMeta = chart.getDatasetMeta(dIdx);
                                if (!dMeta || dMeta.hidden) continue;
                                const dDataset = chart.data.datasets[dIdx];
                                const isLine = dDataset.type === 'line' || dMeta.type === 'line';
                                if (isLine) continue;

                                const dVal = Number(dDataset.data[index]) || 0;
                                stackSum += dVal;

                                const dElem = dMeta.data[index];
                                if (dElem && dElem.y < topY - 1) {
                                    isTopMost = false;
                                }
                            }

                            if (isTopMost && stackSum > 0) {
                                ctx.font = 'bold 12px Inter, sans-serif';
                                ctx.fillStyle = '#0F172A';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
                                ctx.shadowBlur = 3;
                                ctx.fillText(stackSum.toLocaleString('id-ID'), element.x, topY - 5);
                            }
                        } else if (isBarDataset) {
                            ctx.font = 'bold 10px Inter, sans-serif';
                            ctx.fillStyle = '#334155';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            
                            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
                            ctx.shadowBlur = 3;
                            
                            const formattedBarVal = typeof val === 'number' ? val.toLocaleString('id-ID') : String(val);
                            ctx.fillText(formattedBarVal, position.x, position.y - 3);
                        }

                        ctx.restore();
                    } catch (e) {
                        // Suppress individual datalabel render errors
                    }
                });
            });
        } catch (err) {
            // Suppress global plugin errors
        }
    }
};

if (typeof Chart !== 'undefined') {
    try {
        Chart.register(globalChartDataLabelsPlugin);
    } catch (e) {
        console.warn("Chart.js plugin registration error:", e);
    }
}

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
        if (kelasNum > 5) {
            kelasNum = 5;
        }
        return "Kelas " + kelasNum;
    }

    function getStudentCurrentKelas(s, targetDate) {
        if (!s) return 'Kelas 1';
        const tglMasuk = s.masuk || s.tanggalMasuk || s.tanggal_masuk || s.tgl_masuk;
        const tglKeluar = s.tanggalKeluar || s.tanggal_keluar || s.keluar || s.tgl_keluar;
        const isTerminasi = s.status === 'Terminasi' || s.status === 'TURNOVER';
        const refDate = targetDate || (isTerminasi && tglKeluar ? parseDateYYYYMMDD(tglKeluar) : new Date());
        if (tglMasuk && typeof hitungKelasSiswa === 'function') {
            return hitungKelasSiswa(tglMasuk, refDate);
        }
        if (s.kelas && s.kelas !== '-' && s.kelas !== 'null' && s.kelas !== 'undefined') {
            const strK = String(s.kelas).trim();
            if (strK.length > 0) {
                const num = parseInt(strK.replace(/Kelas\s+/i, ''));
                if (!isNaN(num)) return 'Kelas ' + Math.min(5, num);
                return strK;
            }
        }
        return 'Kelas 1';
    }
    window.getStudentCurrentKelas = getStudentCurrentKelas;
    window.hitungKelas = getStudentCurrentKelas;
    window.hitungKelasSiswa = hitungKelasSiswa;

    var currentUser = null;
    window.currentUser = null;
    var chartInstance = null;
    var mapInstance = null;
    
    // Peta & Grafik Baru Turnover
    var mapTurnoverInstance = null; 
    var geoJsonLayer = null; 
    var turnoverMarkerGroup = null; 
    var turnoverPieChartInstance = null; 
    var activeThematicTheme = 'light'; 
    
    var activeData = [];
    window.activeData = activeData;
    var rawSiswaData = []; 
    window.rawSiswaData = rawSiswaData;
    var rawTurnoverData = []; 
    var activeTurnoverData = []; 
    var financeData = [];
    var rawUsersData = []; 
    var absensiData = [];
    window.absensiData = absensiData;
    window.ABSENSI_CUTOFF_DATE = '2026-08-02'; // Tanggal resmi Go-Live Cut-Off System Absensi
    var safetyData = [];
    window.safetyData = safetyData;
    var rawPopulasiData = [];
    var geoJsonCache = null;  
    var monthYearMetadata = { year: 2026, month: 3 };
    var costRatesConfig = [];
    var _lastSyncTime = null;
    var currentVersion = "";

    function getStudentPhotoUrl(noreg) {
        if (!noreg) return '';
        const clean = String(noreg).trim();
        const baseUrl = (typeof window !== 'undefined' && window.PUBLIC_SUPABASE_URL) ? window.PUBLIC_SUPABASE_URL : 'https://xpoddtzxsopwzojycmwx.supabase.co';
        return `${baseUrl}/storage/v1/object/public/foto-siswa/${encodeURIComponent(clean)}.jpg`;
    }
    window.getStudentPhotoUrl = getStudentPhotoUrl;

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
            if (typeof google !== 'undefined') {
                connText.innerText = 'Terhubung ke server';
            } else {
                connText.innerText = 'Mode Preview';
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
            'kelas1': { saku: 2250000, trans: 750000 },
            'kelas2': { saku: 2350000, trans: 750000 },
            'kelas3': { saku: 2500000, trans: 750000 },
            'kelas4': { saku: 2700000, trans: 750000 },
            'kelas5': { saku: 2950000, trans: 750000 }
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
        costEl.className = 'text-[10px] xs:text-xs sm:text-xl md:text-2xl font-bold font-display text-brand-textMain mt-1 sm:mt-2 tracking-tight leading-tight truncate';
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
        'GRSIK': [-7.1566, 112.6555],
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

    const createDummyDaily = () => [];

    const fallbackSiswa = [];
    const fallbackTurnover = [];
    const fallbackUsers = [];
    const fallbackSafety = [];

    const fallbackStats = {
        cards: { 
            totalSiswa: 0, 
            siswaBaru: 0, 
            lulus: 0,
            turnoverDetails: { resign: 0, lulus: 0, indisipliner: 0 }
        },
        finance: { income: 0, expense: 0, balance: 0 },
        recent: [],
        siswa: [],
        monthYear: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
        turnover: [],
        safety: [],
        populasi: [],
        costRates: []
    };
    window.fallbackStats = fallbackStats;


    function startRealtimeClock() {
        const updateClocks = () => {
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
        };

        updateClocks();
        if (!window._clockIntervalId) {
            window._clockIntervalId = setInterval(updateClocks, 1000);
        }
    }

    function fillLogin(email, pass, role) {
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-pass');
        if (emailEl) emailEl.value = email || '';
        if (passEl) passEl.value = pass || '';

        const activeRole = (role || '').toLowerCase();
        const roles = ['admin', 'visitor', 'siswa'];
        roles.forEach(r => {
            const btn = document.getElementById('quick-fill-' + r);
            if (btn) {
                if (r === activeRole) {
                    btn.className = "py-2 rounded-lg bg-brand-blue text-white shadow-sm transition-all duration-300 cursor-pointer";
                } else {
                    btn.className = "py-2 rounded-lg text-brand-textSub hover:bg-white hover:text-brand-textMain transition-all duration-300 shadow-sm cursor-pointer";
                }
            }
        });
    }

    function toggleLoginPasswordVisibility() {
        const passInput = document.getElementById('login-pass');
        const icon = document.getElementById('login-pass-toggle-icon');
        if (!passInput || !icon) return;

        if (passInput.type === 'password') {
            passInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    let _isLoggingIn = false;

    function setLoginButtonState(loading, text = 'Memverifikasi...') {
        _isLoggingIn = !!loading;
        const btn = document.getElementById('btn-login-submit');
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn.className = "w-full py-3 sm:py-3.5 mt-1 sm:mt-2 bg-blue-700/85 text-white font-semibold rounded-xl transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-not-allowed opacity-90";
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-sm"></i> <span>${text}</span>`;
        } else {
            btn.disabled = false;
            btn.className = "w-full py-3 sm:py-3.5 mt-1 sm:mt-2 bg-brand-blue text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] active:bg-blue-800 transition-all duration-150 shadow-lg shadow-blue-500/20 flex items-center justify-center cursor-pointer";
            btn.innerHTML = `<span>Masuk Dashboard</span>`;
        }
    }

    function handleLogin() {
        if (_isLoggingIn) return;
        const btn = document.getElementById('btn-login-submit');
        if (btn && btn.disabled) return;
        try {
            const emailInput = document.getElementById('login-email');
            const passInput = document.getElementById('login-pass');
            const errorBox = document.getElementById('login-error');
            if (errorBox) errorBox.classList.add('hidden');

            const loginVal = (emailInput?.value || '').trim();
            const passVal = passInput?.value || ''; // Strictly preserve original password case!

            if (!loginVal || !passVal) {
                if (errorBox) {
                    errorBox.classList.remove('hidden');
                    errorBox.innerText = "Email / Nomor Registrasi dan Password wajib diisi.";
                }
                setLoginButtonState(false);
                if (!loginVal && emailInput) {
                    emailInput.focus();
                } else if (!passVal && passInput) {
                    passInput.focus();
                }
                return;
            }

            // Trigger instant visual loading feedback on button immediately!
            setLoginButtonState(true, 'Memverifikasi...');

            if (typeof google !== 'undefined' && typeof google.script !== 'undefined' && typeof google.script.run !== 'undefined') {
                google.script.run
                    .withSuccessHandler(res => {
                        if (res && res.success) {
                            if (window.FORCED_ROLE && res.user.role !== window.FORCED_ROLE) {
                                setLoginButtonState(false);
                                if (errorBox) {
                                    errorBox.classList.remove('hidden');
                                    errorBox.innerText = "Hanya akun " + window.FORCED_ROLE + " yang dapat masuk di halaman ini.";
                                }
                                return;
                            }
                            setLoginButtonState(true, 'Menyiapkan Portal...');
                            loginSuccess(res.user);
                        } else {
                            setLoginButtonState(false);
                            if (errorBox) {
                                errorBox.classList.remove('hidden');
                                errorBox.innerText = (res && res.message) ? res.message : "Email / Nomor Registrasi atau Password salah.";
                            }
                        }
                    })
                    .withFailureHandler(err => {
                        setLoginButtonState(false);
                        if (errorBox) {
                            errorBox.classList.remove('hidden');
                            errorBox.innerText = "Gagal terhubung ke server: " + (err.message || err.toString());
                        }
                        console.error("Login server error:", err);
                    })
                    .login(loginVal, passVal);
            } else {
                // Submit to backend API /api/auth/login
                fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loginVal, password: passVal })
                })
                .then(async r => {
                    const res = await r.json().catch(() => null);
                    if (r.ok && res && res.success && res.user) {
                        if (window.FORCED_ROLE && res.user.role !== window.FORCED_ROLE) {
                            setLoginButtonState(false);
                            if (errorBox) {
                                errorBox.classList.remove('hidden');
                                errorBox.innerText = "Hanya akun " + window.FORCED_ROLE + " yang dapat masuk di halaman ini.";
                            }
                            return;
                        }
                        setLoginButtonState(true, 'Menyiapkan Portal...');
                        loginSuccess(res.user);
                    } else {
                        // Strict Local Fallback (STRICT CASE-SENSITIVE PASSWORD CHECK)
                        let targetUser = null;
                        const lowerEmail = loginVal.toLowerCase();

                        const lowerPass = passVal.toLowerCase();
                        if ((lowerEmail === "admin@indoprima.com" || lowerEmail === "admin") && lowerPass === "admin123") {
                            targetUser = { namaLengkap: "Admin Utama", role: "Admin" };
                        } else if ((lowerEmail === "visitor@indoprima.com" || lowerEmail === "visitor") && lowerPass === "visitor123") {
                            targetUser = { namaLengkap: "Executive Visitor", role: "Visitor" };
                        } else if ((lowerEmail === "2601176@indoprima.com" || lowerEmail === "2601176" || lowerEmail.endsWith("@indoprima.com")) && lowerPass === "siswa123") {
                            targetUser = { namaLengkap: "MUHAMMAD ROJI", role: "Siswa", studentId: "2601176", nomorRegistrasi: "2601176" };
                        }

                        if (targetUser) {
                            if (window.FORCED_ROLE && targetUser.role !== window.FORCED_ROLE) {
                                setLoginButtonState(false);
                                if (errorBox) {
                                    errorBox.classList.remove('hidden');
                                    errorBox.innerText = "Hanya akun " + window.FORCED_ROLE + " yang dapat masuk di halaman ini.";
                                }
                                return;
                            }
                            setLoginButtonState(true, 'Menyiapkan Portal...');
                            loginSuccess(targetUser);
                        } else {
                            setLoginButtonState(false);
                            if (errorBox) {
                                errorBox.classList.remove('hidden');
                                errorBox.innerText = (res && res.message) ? res.message : "Email / Nomor Registrasi atau Password salah.";
                            }
                        }
                    }
                })
                .catch(err => {
                    console.warn("API Login fetch error, executing local fallback:", err);
                    let targetUser = null;
                    const lowerEmail = loginVal.toLowerCase();

                    // Strict Case-Sensitive Password Match
                    if ((lowerEmail === "admin@indoprima.com" || lowerEmail === "admin") && passVal === "admin123") {
                        targetUser = { namaLengkap: "Admin Utama", role: "Admin" };
                    } else if ((lowerEmail === "visitor@indoprima.com" || lowerEmail === "visitor") && passVal === "visitor123") {
                        targetUser = { namaLengkap: "Executive Visitor", role: "Visitor" };
                    } else if ((lowerEmail === "2601176@indoprima.com" || lowerEmail === "2601176") && passVal === "siswa123") {
                        targetUser = { namaLengkap: "MUHAMMAD ROJI", role: "Siswa", studentId: "2601176", nomorRegistrasi: "2601176" };
                    }

                    if (targetUser) {
                        if (window.FORCED_ROLE && targetUser.role !== window.FORCED_ROLE) {
                            setLoginButtonState(false);
                            if (errorBox) {
                                errorBox.classList.remove('hidden');
                                errorBox.innerText = "Hanya akun " + window.FORCED_ROLE + " yang dapat masuk di halaman ini.";
                            }
                            return;
                        }
                        setLoginButtonState(true, 'Menyiapkan Portal...');
                        loginSuccess(targetUser);
                    } else {
                        setLoginButtonState(false);
                        if (errorBox) {
                            errorBox.classList.remove('hidden');
                            errorBox.innerText = "Email / Nomor Registrasi atau Password salah.";
                        }
                    }
                });
            }
        } catch (e) {
            setLoginButtonState(false);
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
        window.currentUser = user;
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
                'Admin': '/portal-adm-x89k21',
                'Visitor': '/portal-vst-q81z56',
                'Siswa': '/portal-ssw-m47v93'
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

            const displayName = (currentUser && currentUser.namaLengkap) ? currentUser.namaLengkap : '-';
            const displayRole = (currentUser && currentUser.role === 'Admin') ? 'Super Admin' : ((currentUser && currentUser.role) || '-');

            const nameEl = document.getElementById('user-display-name');
            if (nameEl) nameEl.innerText = displayName;

            const roleEl = document.getElementById('user-display-role');
            if (roleEl) roleEl.innerText = displayRole;

            const adminNav = document.getElementById('nav-admin');
            const lmsNav = document.getElementById('nav-lms');
            const settingBottom = document.getElementById('sidebar-setting-bottom');
            if (currentUser.role === 'Admin') {
                if (adminNav) adminNav.classList.remove('hidden');
                if (lmsNav) lmsNav.classList.remove('hidden');
                if (settingBottom) settingBottom.classList.remove('hidden');
            } else {
                if (adminNav) adminNav.classList.add('hidden');
                if (lmsNav) lmsNav.classList.add('hidden');
                if (settingBottom) settingBottom.classList.add('hidden');
            }

            const appSidebar = document.getElementById('app-sidebar');
            const mainHeader = document.querySelector('main > header');
            const bottomNav = document.getElementById('mobile-bottom-nav');
            const sidebarNavLinks = document.getElementById('sidebar-nav-links');

            // Direct user based on role: Siswa goes to portal form, others to dashboard
            if (currentUser && currentUser.role === 'Siswa') {
                document.body.classList.add('role-siswa');
                document.documentElement.classList.add('role-siswa');
                if (appSidebar) {
                    appSidebar.classList.add('hidden');
                    appSidebar.style.setProperty('display', 'none', 'important');
                }
                if (mainHeader) {
                    mainHeader.classList.add('hidden');
                    mainHeader.style.setProperty('display', 'none', 'important');
                }
                if (sidebarNavLinks) sidebarNavLinks.classList.add('hidden');
                if (bottomNav) {
                    bottomNav.classList.add('hidden');
                    bottomNav.style.setProperty('display', 'none', 'important');
                }
                switchView('sisi-siswa');
            } else {
                document.body.classList.remove('role-siswa');
                document.documentElement.classList.remove('role-siswa');
                if (appSidebar) {
                    appSidebar.classList.remove('hidden');
                    appSidebar.style.removeProperty('display');
                }
                if (mainHeader) {
                    mainHeader.classList.remove('hidden');
                    mainHeader.style.removeProperty('display');
                }
                if (sidebarNavLinks) sidebarNavLinks.classList.remove('hidden');
                if (bottomNav) {
                    bottomNav.classList.remove('hidden');
                    bottomNav.style.removeProperty('display');
                }
                switchView('dashboard');
            }
            startRealtimeClock();
            if (currentUser && currentUser.role === 'Siswa' && typeof populateSiswaPortalFields === 'function') {
                populateSiswaPortalFields();
            }
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
                        showToast('Gagal memuat data dasbor, menggunakan data lokal.', 'warning');
                        monthYearMetadata = fallbackStats.monthYear;
                        renderData(fallbackStats);
                        if (currentUser && currentUser.role === 'Siswa' && typeof populateSiswaPortalFields === 'function') {
                            populateSiswaPortalFields();
                        }
                    }
                })
                .withFailureHandler(err => {
                    if (spinner) spinner.classList.remove('animate-spin');
                    _updateSyncIndicator('error');
                    console.warn('Gagal memuat data dari server, beralih ke data lokal:', err);
                    monthYearMetadata = fallbackStats.monthYear;
                    renderData(fallbackStats);
                    if (currentUser && currentUser.role === 'Siswa' && typeof populateSiswaPortalFields === 'function') {
                        populateSiswaPortalFields();
                    }
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
        rawSiswaData = (data.siswa || []).map(s => {
            const noregVal = s.id || s.noreg || s.no_reg || '';
            const masukVal = s.masuk || s.tanggal_masuk || s.tanggalMasuk || s.tgl_masuk || '';
            const exitVal = s.tanggalKeluar || s.tanggal_keluar || s.keluar || s.tanggal_terminasi || s.tgl_keluar || '';
            return {
                ...s,
                id: noregVal,
                namaLengkap: s.namaLengkap || s.nama_lengkap || s.nama || '',
                masuk: masukVal,
                tanggal_masuk: masukVal,
                tanggalKeluar: exitVal,
                bagian: s.bagian || s.section || '',
                section: s.section || s.bagian || '',
                daerahAsal: s.daerahAsal || s.asal_daerah || s.asalDaerah || s.wilayah || '',
                asalSekolah: s.asalSekolah || s.asal_sekolah || s.sekolah || '',
                tempatLahir: s.tempatLahir || s.tempat_lahir || '',
                tanggalLahir: s.tanggalLahir || s.tanggal_lahir || s.tglLahir || '',
                alamat: s.alamat || s.alamatLengkap || s.alamat_lengkap || '',
                telepon: s.telepon || s.no_telp || s.noTelp || s.no_hp || s.noHp || s.hp || '',
                noTelp: s.telepon || s.no_telp || s.noTelp || s.no_hp || s.noHp || s.hp || '',
                foto: s.foto || (noregVal ? getStudentPhotoUrl(noregVal) : '')
            };
        });
        activeData = JSON.parse(JSON.stringify(rawSiswaData)).filter(s => String(s.status || '').toUpperCase() === "AKTIF"); 
        
        rawTurnoverData = (data.turnover || []).map(s => {
            const noregVal = s.id || s.noreg || s.no_reg || '';
            const masukVal = s.masuk || s.tanggal_masuk || s.tanggalMasuk || s.tgl_masuk || '';
            const exitVal = s.tanggalKeluar || s.tanggal_keluar || s.keluar || s.tanggal_terminasi || s.tgl_keluar || '';
            return {
                ...s,
                id: noregVal,
                namaLengkap: s.namaLengkap || s.nama_lengkap || s.nama || '',
                masuk: masukVal,
                tanggal_masuk: masukVal,
                tanggalKeluar: exitVal,
                bagian: s.bagian || s.section || '',
                section: s.section || s.bagian || '',
                daerahAsal: s.daerahAsal || s.asal_daerah || s.asalDaerah || s.wilayah || '',
                asalSekolah: s.asalSekolah || s.asal_sekolah || s.sekolah || '',
                tempatLahir: s.tempatLahir || s.tempat_lahir || '',
                tanggalLahir: s.tanggalLahir || s.tanggal_lahir || s.tglLahir || '',
                alamat: s.alamat || s.alamatLengkap || s.alamat_lengkap || '',
                telepon: s.telepon || s.no_telp || s.noTelp || s.no_hp || s.noHp || s.hp || '',
                noTelp: s.telepon || s.no_telp || s.noTelp || s.no_hp || s.noHp || s.hp || '',
                foto: s.foto || (noregVal ? getStudentPhotoUrl(noregVal) : '')
            };
        });
        activeTurnoverData = JSON.parse(JSON.stringify(rawTurnoverData));

        activeData.forEach(s => {
            s.kelas = getStudentCurrentKelas(s);
        });
        activeTurnoverData.forEach(s => {
            s.kelas = getStudentCurrentKelas(s);
        });

        financeData = data.recent || [];
        costRatesConfig = data.costRates || [];
        rawPopulasiData = data.populasi || [];

        // Store absensi data & safety data from server
        absensiData = data.absensi || [];
        window.absensiData = absensiData;
        window.rawAbsensiData = (data.absensi || []).map(r => ({ ...r }));
        safetyData = data.safety || [];
        window.safetyData = safetyData;
        currentVersion = data.version || "";

        // Trigger auto-merge of absensi with manpower data if function available
        if (typeof window._mergeAbsensiWithManpower === 'function') {
            window._mergeAbsensiWithManpower();
        }

        // Trigger real-time sync for Rekap Absensi Siswa chart on dashboard
        if (typeof updateAbsensiChart === 'function') {
            updateAbsensiChart();
        }

        // Trigger real-time sync for Monitoring Safety K3 on dashboard
        if (typeof updateSafetyKPIStats === 'function') {
            updateSafetyKPIStats();
        }

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
            'view-absensi': () => typeof renderAbsensiView === 'function' && renderAbsensiView(),
            'view-safety': () => typeof renderSafetyView === 'function' && renderSafetyView()
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
        
        if (!startInput) startInput = document.getElementById('chart-start-date');
        if (!endInput) endInput = document.getElementById('chart-end-date');
        
        const startDateVal = startInput ? startInput.value : '';
        const endDateVal = endInput ? endInput.value : '';
        
        let totalOverallScore = 0;
        let activeStudentCount = 0;

        (activeData || []).forEach(siswa => {
            let activeDays = 0; // count of Hadir-days
            let checkmarkCount = 0; // count of Hadir-days present
            let totalPlan = 0;
            let totalActual = 0;
            let planDays = 0; // count of Plan-days
            
            let recordsInRange = siswa.dailyRecords || [];
            if (startDateVal && endDateVal) {
                recordsInRange = recordsInRange.filter(rec => rec.dateStr >= startDateVal && rec.dateStr <= endDateVal);
            }
            
            recordsInRange.forEach(rec => {
                const parsedDate = parseDateYYYYMMDD(rec.dateStr);
                const isSunday = parsedDate ? (parsedDate.getDay() === 0) : false;
                if (isSunday) return; // Ignore Sundays from all calculations
                
                const isHadirDay = (rec.plan === null || rec.plan === 0 || isNaN(rec.plan)) && (rec.hadir !== "" && rec.hadir !== undefined && rec.hadir !== null);
                
                if (isHadirDay) {
                    activeDays++;
                    if (rec.hadir === "✔" || rec.hadir === "Hadir") {
                        checkmarkCount++;
                    }
                } else if (rec.plan && rec.plan > 0) {
                    planDays++;
                    totalPlan += Number(rec.plan) || 0;
                    totalActual += Number(rec.actual) || 0;
                }
            });
            
            let dynamicScore = 0;
            const planScore = totalPlan > 0 ? (totalActual / totalPlan) : 0;
            const totalDays = activeDays + planDays;
            
            if (totalDays > 0) {
                const sumOfScores = checkmarkCount + (planDays * planScore);
                dynamicScore = Math.round((sumOfScores / totalDays) * 100);
            } else if (siswa.nilai !== undefined && siswa.nilai !== null && siswa.nilai > 0) {
                dynamicScore = siswa.nilai;
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
                const totK = latest.totalKaryawan || 146;
                const activeLtc = (typeof activeData !== 'undefined' && Array.isArray(activeData)) ? activeData.length : (activeStudentCount || 29);
                const pct = totK > 0 ? Math.round((activeLtc / totK) * 100) + '%' : '0%';
                statPctLtc.innerText = pct;
                if (statPctLtcDate) {
                    statPctLtcDate.innerText = latest.tanggal;
                }
            }
        } else if (statPctLtc) {
            statPctLtc.innerText = '0%';
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

        // Sinkronisasi data kartu Monitoring Safety (K3) pada dashboard
        if (typeof updateSafetyKPIStats === 'function') {
            updateSafetyKPIStats();
        }
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

    function toggleMobileSidebar(show) {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-drawer-overlay');
        if (!sidebar) return;

        const isHidden = sidebar.classList.contains('-translate-x-full');
        const targetShow = (typeof show === 'boolean') ? show : isHidden;

        if (targetShow) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            if (overlay) overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('translate-x-0');
            if (overlay) overlay.classList.add('hidden');
        }
    }

    function toggleUserMenuDropdown(e) {
        if (e) e.stopPropagation();
        const dropdown = document.getElementById('header-user-dropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('hidden');
    }
    window.toggleUserMenuDropdown = toggleUserMenuDropdown;

    // Tutup dropdown menu akun saat klik di luar
    document.addEventListener('click', function(e) {
        const container = document.getElementById('user-menu-dropdown-container');
        const dropdown = document.getElementById('header-user-dropdown');
        if (container && dropdown && !dropdown.classList.contains('hidden')) {
            if (!container.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        }
    });

    function switchView(viewName) {
        // Auto-close mobile / split-screen sidebar drawer
        toggleMobileSidebar(false);

        // Enforce Siswa role to strictly stay on portal form view
        if ((currentUser && currentUser.role === 'Siswa') || viewName === 'sisi-siswa') {
            viewName = 'sisi-siswa';
        }

        const appSidebar = document.getElementById('app-sidebar');
        const mainHeader = document.querySelector('main > header');
        const sidebarNavLinks = document.getElementById('sidebar-nav-links');
        const mobileBottomNav = document.getElementById('mobile-bottom-nav');

        if ((currentUser && currentUser.role === 'Siswa') || viewName === 'sisi-siswa') {
            document.body.classList.add('role-siswa');
            document.documentElement.classList.add('role-siswa');
            if (appSidebar) {
                appSidebar.classList.add('hidden');
                appSidebar.style.setProperty('display', 'none', 'important');
            }
            if (mainHeader) {
                mainHeader.classList.add('hidden');
                mainHeader.style.setProperty('display', 'none', 'important');
            }
            if (sidebarNavLinks) sidebarNavLinks.classList.add('hidden');
            if (mobileBottomNav) {
                mobileBottomNav.classList.add('hidden');
                mobileBottomNav.style.setProperty('display', 'none', 'important');
            }
        } else {
            document.body.classList.remove('role-siswa');
            document.documentElement.classList.remove('role-siswa');
            if (appSidebar) {
                appSidebar.classList.remove('hidden');
                appSidebar.style.removeProperty('display');
            }
            if (mainHeader) {
                mainHeader.classList.remove('hidden');
                mainHeader.style.removeProperty('display');
            }
            if (sidebarNavLinks) sidebarNavLinks.classList.remove('hidden');
            if (mobileBottomNav) {
                mobileBottomNav.classList.remove('hidden');
                mobileBottomNav.style.removeProperty('display');
            }
        }

        try {
            localStorage.setItem('activeView', viewName);
        } catch (e) {
            console.error("Failed to save view state:", e);
        }

        const views = ['view-dashboard', 'view-siswa', 'view-sisi-siswa', 'view-keuangan', 'view-turnover', 'view-absensi', 'view-safety', 'view-admin'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.add('hidden');
        });

        let targetView = 'view-' + viewName;

        const targetEl = document.getElementById(targetView);
        if (targetEl) targetEl.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-white', 'bg-blue-600');
            btn.classList.add('text-slate-800', 'hover:bg-slate-50', 'hover:text-[#0B3B82]');
        });

        let activeBtn = document.getElementById('nav-' + viewName);
        if (viewName === 'admin' && typeof currentAdminTab !== 'undefined') {
            if (currentAdminTab === 'kelola-quiz' || currentAdminTab === 'kelola-sertifikat' || currentAdminTab === 'skill-map') {
                activeBtn = document.getElementById('nav-lms');
            } else if (currentAdminTab === 'kelola-setting') {
                activeBtn = document.getElementById('nav-setting');
            } else {
                activeBtn = document.getElementById('nav-admin');
            }
        }
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-800', 'hover:bg-slate-50', 'hover:text-[#0B3B82]');
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

        // Enforce admin & lms & setting nav visibility strictly based on role
        const adminNav = document.getElementById('nav-admin');
        const lmsNav = document.getElementById('nav-lms');
        const settingBottom = document.getElementById('sidebar-setting-bottom');
        const mobileAdminNav = document.getElementById('mobile-nav-admin');
        if (adminNav) {
            if (currentUser && currentUser.role === 'Admin') {
                adminNav.classList.remove('hidden');
                if (lmsNav) lmsNav.classList.remove('hidden');
                if (settingBottom) settingBottom.classList.remove('hidden');
                if (mobileAdminNav) { mobileAdminNav.classList.remove('hidden'); mobileAdminNav.classList.add('flex'); }
            } else {
                adminNav.classList.add('hidden');
                if (lmsNav) lmsNav.classList.add('hidden');
                if (settingBottom) settingBottom.classList.add('hidden');
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
            'safety': 'Safety / K3',
            'admin': 'Admin'
        };
        
        let headerTitle = titleMap[viewName] || 'Dashboard';
        if (viewName === 'admin' && typeof currentAdminTab !== 'undefined') {
            if (currentAdminTab === 'kelola-quiz') {
                headerTitle = 'LMS - Quiz & Evaluasi Teori';
            } else if (currentAdminTab === 'kelola-sertifikat') {
                headerTitle = 'LMS - Kelola Sertifikat';
            } else if (currentAdminTab === 'skill-map') {
                headerTitle = 'LMS - Skill map';
            }
        }
        const titleHeader = document.getElementById('header-view-title');
        if (titleHeader) titleHeader.innerText = headerTitle;

        if (viewName === 'siswa') renderSiswaView();
        if (viewName === 'sisi-siswa' && typeof populateSiswaPortalFields === 'function') populateSiswaPortalFields();
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
        if (viewName === 'safety' && typeof renderSafetyView === 'function') renderSafetyView();
        
        // Manage Admin & LMS Submenu State
        const adminSubmenu = document.getElementById('nav-admin-submenu');
        const adminChevron = document.getElementById('admin-chevron');
        const lmsSubmenu = document.getElementById('nav-lms-submenu');
        const lmsChevron = document.getElementById('lms-chevron');

        if (viewName === 'admin') {
            const isLmsTab = (typeof currentAdminTab !== 'undefined') && 
                             (currentAdminTab === 'kelola-quiz' || currentAdminTab === 'kelola-sertifikat' || currentAdminTab === 'skill-map');
            if (isLmsTab) {
                if (lmsSubmenu) lmsSubmenu.classList.remove('hidden');
                if (lmsChevron) lmsChevron.classList.add('rotate-180');
                if (adminSubmenu) adminSubmenu.classList.add('hidden');
                if (adminChevron) adminChevron.classList.remove('rotate-180');
            } else {
                if (adminSubmenu) adminSubmenu.classList.remove('hidden');
                if (adminChevron) adminChevron.classList.add('rotate-180');
                if (lmsSubmenu) lmsSubmenu.classList.add('hidden');
                if (lmsChevron) lmsChevron.classList.remove('rotate-180');
            }

            if (typeof updateAdminSubmenuHighlight === 'function' && typeof currentAdminTab !== 'undefined') {
                updateAdminSubmenuHighlight(currentAdminTab);
            }
        } else {
            if (adminSubmenu) adminSubmenu.classList.add('hidden');
            if (adminChevron) adminChevron.classList.remove('rotate-180');
            if (lmsSubmenu) lmsSubmenu.classList.add('hidden');
            if (lmsChevron) lmsChevron.classList.remove('rotate-180');
        }

        if (viewName === 'turnover' && mapTurnoverInstance) {
            setTimeout(() => mapTurnoverInstance.invalidateSize(), 200);
        }
    }

    function toggleLmsMenu() {
        const lmsSubmenu = document.getElementById('nav-lms-submenu');
        const lmsChevron = document.getElementById('lms-chevron');
        const adminView = document.getElementById('view-admin');
        const isLmsActive = adminView && !adminView.classList.contains('hidden') &&
                            (typeof currentAdminTab !== 'undefined' && 
                            (currentAdminTab === 'kelola-quiz' || currentAdminTab === 'kelola-sertifikat' || currentAdminTab === 'skill-map'));
        
        if (!isLmsActive) {
            if (typeof currentAdminTab !== 'undefined') currentAdminTab = 'kelola-quiz';
            switchView('admin');
            if (typeof switchAdminTab === 'function') switchAdminTab('kelola-quiz');
        } else {
            if (lmsSubmenu) {
                const isHidden = lmsSubmenu.classList.toggle('hidden');
                if (lmsChevron) {
                    if (isHidden) lmsChevron.classList.remove('rotate-180');
                    else lmsChevron.classList.add('rotate-180');
                }
            }
        }
    }
    window.toggleLmsMenu = toggleLmsMenu;

    function toggleAdminMenu() {
        const adminSubmenu = document.getElementById('nav-admin-submenu');
        const adminChevron = document.getElementById('admin-chevron');
        const adminView = document.getElementById('view-admin');
        const isAdminActive = adminView && !adminView.classList.contains('hidden') &&
                              (typeof currentAdminTab !== 'undefined' && 
                              currentAdminTab !== 'kelola-quiz' && currentAdminTab !== 'kelola-sertifikat' && currentAdminTab !== 'skill-map');
        
        if (!isAdminActive) {
            if (typeof currentAdminTab !== 'undefined') currentAdminTab = 'kelola-siswa';
            switchView('admin');
            if (typeof switchAdminTab === 'function') switchAdminTab('kelola-siswa');
        } else {
            if (adminSubmenu) {
                const isHidden = adminSubmenu.classList.toggle('hidden');
                if (adminChevron) {
                    if (isHidden) adminChevron.classList.remove('rotate-180');
                    else adminChevron.classList.add('rotate-180');
                }
            }
        }
    }
    window.toggleAdminMenu = toggleAdminMenu;

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

        // Reset Siswa form to Step 1 & hide success view
        if (typeof resetSiswaPortalForm === 'function') {
            resetSiswaPortalForm();
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
            startRealtimeClock();

            // Apply forced role adjustments first
            if (window.FORCED_ROLE) {
                const qfContainer = document.getElementById('quick-fill-container');
                if (qfContainer) qfContainer.classList.add('hidden');
                
                const roleLabel = document.getElementById('login-role-label');
                if (roleLabel) roleLabel.innerText = window.FORCED_ROLE.toUpperCase() + ' PORTAL';

                if (window.FORCED_ROLE === 'Siswa') {
                    fillLogin('', '', 'siswa');
                } else if (window.FORCED_ROLE === 'Admin') {
                    fillLogin('', '', 'admin');
                } else if (window.FORCED_ROLE === 'Visitor') {
                    fillLogin('', '', 'visitor');
                }
            }

            // Bind Login Form Enter Key & Submit handlers
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handleLogin();
                });
            }

            const loginEmailInp = document.getElementById('login-email');
            const loginPassInp = document.getElementById('login-pass');
            if (loginEmailInp) {
                loginEmailInp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        if (loginPassInp && !loginPassInp.value) {
                            loginPassInp.focus();
                        } else {
                            handleLogin();
                        }
                    }
                });
            }
            if (loginPassInp) {
                loginPassInp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        handleLogin();
                    }
                });
            }

            const savedUserStr = localStorage.getItem('currentUser');
            if (savedUserStr) {
                const savedUser = JSON.parse(savedUserStr);
                if (savedUser) {
                    currentUser = savedUser;
                    window.currentUser = savedUser;

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

    // Auto Upper Case for all text inputs & textareas (except login fields)
    document.addEventListener('input', function (e) {
        const target = e.target;
        if (!target) return;
        if (target.id === 'login-email' || target.id === 'login-pass' || target.closest('#view-login')) return;
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

    // ============================================================
    // REUSABLE PAGINATION UI COMPONENT (25 PER HALAMAN)
    // ============================================================
    function renderPaginationUI({
        infoId,
        controlsId,
        currentPage,
        totalItems,
        pageSize = 25,
        goToPageFn,
        itemLabel = 'siswa',
        themeColor = '#0B3B82'
    }) {
        const infoEl = document.getElementById(infoId);
        const controlsEl = document.getElementById(controlsId);
        if (!infoEl && !controlsEl) return;

        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(Math.max(1, currentPage), totalPages);

        const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);

        if (infoEl) {
            if (totalItems === 0) {
                infoEl.innerHTML = `Menampilkan <span class="text-slate-700 font-bold">0</span> dari <span class="text-slate-700 font-bold">0</span> ${itemLabel}`;
            } else {
                infoEl.innerHTML = `Menampilkan <span class="text-slate-800 font-bold">${startIndex + 1} - ${endIndex}</span> dari <span class="text-slate-800 font-bold">${totalItems}</span> ${itemLabel} (Halaman <span class="font-bold text-slate-900">${safePage}</span> / ${totalPages})`;
            }
        }

        if (controlsEl) {
            if (totalPages <= 1) {
                controlsEl.innerHTML = '';
                return;
            }

            let html = '';

            // Tombol Sebelumnya (Previous)
            const prevDisabled = safePage <= 1;
            html += `
                <button onclick="${goToPageFn}(${safePage - 1})" ${prevDisabled ? 'disabled' : ''}
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Halaman Sebelumnya">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            `;

            // Hitung nomor halaman dinamis (Maksimal 5 tombol angka di sekitar halaman aktif)
            let startPage = Math.max(1, safePage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            if (startPage > 1) {
                html += `
                    <button onclick="${goToPageFn}(1)"
                        class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs cursor-pointer">
                        1
                    </button>
                `;
                if (startPage > 2) {
                    html += `<span class="px-1 text-slate-400 select-none text-xs">...</span>`;
                }
            }

            for (let p = startPage; p <= endPage; p++) {
                if (p === safePage) {
                    html += `
                        <button class="px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-xs cursor-default" style="background-color: ${themeColor};">
                            ${p}
                        </button>
                    `;
                } else {
                    html += `
                        <button onclick="${goToPageFn}(${p})"
                            class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs cursor-pointer">
                            ${p}
                        </button>
                    `;
                }
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="px-1 text-slate-400 select-none text-xs">...</span>`;
                }
                html += `
                    <button onclick="${goToPageFn}(${totalPages})"
                        class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs cursor-pointer">
                        ${totalPages}
                    </button>
                `;
            }

            // Tombol Selanjutnya (Next)
            const nextDisabled = safePage >= totalPages;
            html += `
                <button onclick="${goToPageFn}(${safePage + 1})" ${nextDisabled ? 'disabled' : ''}
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Halaman Berikutnya">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            `;

            controlsEl.innerHTML = html;
        }
    }
    window.renderPaginationUI = renderPaginationUI;


