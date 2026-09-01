// Peta SPV berdasarkan wilayah (bisa dikembangkan dari data)
const spvMap = {
    'SBY': 'Pak Agus (SBY)',
    'BPP': 'Pak Roni (BPP)',
    'SMG': 'Pak Dedi (SMG)'
};

function getSpvLabel(s) {
    if (!s) return '-';
    return s.spv || spvMap[s.wilayah] || s.wilayah || '-';
}

function getKelasColor(kelas) {
    const k = kelas || 'Kelas 1';
    const map = {
        'Kelas 1': { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-600' },
        'Kelas 2': { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-600' },
        'Kelas 3': { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600' },
        'Kelas 4': { bg: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-600' },
        'Kelas 5': { bg: 'bg-slate-200', text: 'text-slate-800', dot: 'bg-slate-600' }
    };
    // Jika kelas di atas 5, default ke warna abu-abu (Kelas 5)
    return map[k] || { bg: 'bg-slate-200', text: 'text-slate-800', dot: 'bg-slate-600' };
}

function getPerformaColor(nilai) {
    if (nilai >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', label: 'Excellent' };
    if (nilai >= 75) return { bar: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700', label: 'Baik' };
    if (nilai >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700', label: 'Cukup' };
    return { bar: 'bg-rose-500', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-700', label: 'Perlu Perhatian' };
}

function populateBagianFilter() {
    const select = document.getElementById('filter-bagian-siswa');
    if (!select) return;
    const currentVal = select.value;
    const bagianSet = new Set(activeData.map(s => s.bagian).filter(Boolean));
    while (select.options.length > 1) select.remove(1);
    Array.from(bagianSet).sort().forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.text = b;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

let populasiLtcKelasChartInstance = null;
let performaLtcKelasChartInstance = null;
let performanceProductionTrendChartInstance = null;
let performanceTrendMode = 'bulanan'; // 'bulanan' | 'mingguan'

function switchPerformanceTrendMode(mode) {
    performanceTrendMode = mode;
    const btnBulanan = document.getElementById('btn-perf-mode-bulanan');
    const btnMingguan = document.getElementById('btn-perf-mode-mingguan');
    
    if (btnBulanan && btnMingguan) {
        if (mode === 'bulanan') {
            btnBulanan.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-white text-orange-600 shadow-sm";
            btnMingguan.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 text-slate-500 hover:text-slate-700";
        } else {
            btnMingguan.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-white text-orange-600 shadow-sm";
            btnBulanan.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 text-slate-500 hover:text-slate-700";
        }
    }
    renderPerformanceProductionTrendChart();
}
window.switchPerformanceTrendMode = switchPerformanceTrendMode;

function renderPerformanceProductionTrendChart() {
    const trendCanvas = document.getElementById('chart-performance-production-trend');
    if (!trendCanvas || typeof Chart === 'undefined') return;

    const allStudents = [...(activeData || []), ...(activeTurnoverData || [])];
    
    const monthNamesMap = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Ags',
        '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
    };

    let labels = [];
    let planValues = [];
    let actualValues = [];

    if (performanceTrendMode === 'bulanan') {
        const monthGroup = {};
        allStudents.forEach(s => {
            (s.dailyRecords || []).forEach(r => {
                if (!r.dateStr) return;
                const ym = r.dateStr.substring(0, 7);
                if (!monthGroup[ym]) {
                    monthGroup[ym] = { plan: 0, actual: 0 };
                }
                monthGroup[ym].plan += Number(r.plan) || 0;
                monthGroup[ym].actual += Number(r.actual) || 0;
            });
        });

        const sortedYM = Object.keys(monthGroup).sort();
        const targetKeys = sortedYM.length > 0 ? sortedYM : ['2026-05', '2026-06', '2026-07'];
        
        targetKeys.forEach(ym => {
            const parts = ym.split('-');
            const mName = monthNamesMap[parts[1]] || parts[1];
            labels.push(mName);
            const gData = monthGroup[ym] || { plan: 0, actual: 0 };
            planValues.push(gData.plan);
            actualValues.push(gData.actual);
        });
    } else {
        const weekGroup = {};
        allStudents.forEach(s => {
            (s.dailyRecords || []).forEach(r => {
                if (!r.dateStr) return;
                const ym = r.dateStr.substring(0, 7);
                const day = parseInt(r.dateStr.substring(8, 10), 10);
                if (isNaN(day)) return;

                let wLabel = 'W1';
                if (day >= 1 && day <= 7) wLabel = 'W1';
                else if (day >= 8 && day <= 14) wLabel = 'W2';
                else if (day >= 15 && day <= 21) wLabel = 'W3';
                else wLabel = 'W4';

                const key = `${ym}_${wLabel}`;
                if (!weekGroup[key]) {
                    weekGroup[key] = { plan: 0, actual: 0 };
                }
                weekGroup[key].plan += Number(r.plan) || 0;
                weekGroup[key].actual += Number(r.actual) || 0;
            });
        });

        const sortedKeys = Object.keys(weekGroup).sort();
        const targetKeys = sortedKeys.length > 0 ? sortedKeys : [
            '2026-05_W1', '2026-05_W2', '2026-05_W3', '2026-05_W4',
            '2026-06_W1', '2026-06_W2', '2026-06_W3', '2026-06_W4',
            '2026-07_W1', '2026-07_W2', '2026-07_W3', '2026-07_W4'
        ];

        targetKeys.forEach(k => {
            const parts = k.split('_');
            const ymParts = parts[0].split('-');
            const mName = monthNamesMap[ymParts[1]] || ymParts[1];
            labels.push(`${mName} ${parts[1]}`);
            const gData = weekGroup[k] || { plan: 0, actual: 0 };
            planValues.push(gData.plan);
            actualValues.push(gData.actual);
        });
    }

    const efficiencyValues = planValues.map((p, idx) => {
        const a = actualValues[idx];
        return (p > 0 || a > 0) ? Math.round((a / (p || 1)) * 100) : null;
    });

    if (performanceProductionTrendChartInstance) {
        performanceProductionTrendChartInstance.destroy();
    }

    const isWeekly = performanceTrendMode === 'mingguan';

    performanceProductionTrendChartInstance = new Chart(trendCanvas.getContext('2d'), {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'T.Plan',
                    data: planValues,
                    backgroundColor: '#FB923C',
                    borderRadius: 4,
                    barPercentage: isWeekly ? 0.6 : 0.65,
                    categoryPercentage: isWeekly ? 0.65 : 0.7,
                    yAxisID: 'y',
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#C2410C',
                        font: { size: 9, weight: 'bold' },
                        formatter: (val) => val > 0 ? val.toLocaleString('id-ID') : ''
                    }
                },
                {
                    type: 'bar',
                    label: 'T.Aktual',
                    data: actualValues,
                    backgroundColor: '#4ADE80',
                    borderRadius: 4,
                    barPercentage: isWeekly ? 0.6 : 0.65,
                    categoryPercentage: isWeekly ? 0.65 : 0.7,
                    yAxisID: 'y',
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#15803D',
                        font: { size: 9, weight: 'bold' },
                        formatter: (val) => val > 0 ? val.toLocaleString('id-ID') : ''
                    }
                },
                {
                    type: 'line',
                    label: 'Efisiensi (%)',
                    data: efficiencyValues,
                    borderColor: '#059669',
                    backgroundColor: '#059669',
                    borderWidth: 2.5,
                    pointRadius: 4.5,
                    pointHoverRadius: 6.5,
                    pointBackgroundColor: '#059669',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    tension: 0.25,
                    spanGaps: false,
                    yAxisID: 'y1',
                    datalabels: {
                        color: '#FFFFFF',
                        backgroundColor: '#059669',
                        borderRadius: 4,
                        padding: 3,
                        font: { size: 10, weight: 'bold' },
                        formatter: (val) => val !== null && val !== undefined ? `${val}%` : ''
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: {
                padding: {
                    top: 35,
                    left: 10,
                    right: 15,
                    bottom: 5
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11, weight: 'bold' }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.dataset.type === 'line' || ctx.dataset.yAxisID === 'y1') {
                                return `Efisiensi: ${ctx.parsed.y !== null ? ctx.parsed.y + '%' : '-'}`;
                            }
                            return `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('id-ID')} Pcs`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: 'bold' } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grace: '70%',
                    title: { display: true, text: 'Jumlah Output (Pcs)', font: { size: 10, weight: 'bold' } },
                    grid: { color: 'rgba(226, 232, 240, 0.6)', borderDash: [4, 4] },
                    ticks: { 
                        font: { size: 10 },
                        callback: (val) => val.toLocaleString('id-ID')
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grace: '15%',
                    title: { display: true, text: 'Efisiensi (%)', font: { size: 10, weight: 'bold' } },
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { size: 10, weight: 'bold' },
                        callback: (val) => `${val}%`
                    }
                }
            }
        }
    });
}

function renderPerformaTopCharts() {
    renderPerformanceProductionTrendChart();
    const populasiCanvas = document.getElementById('chart-populasi-ltc-kelas');
    const performaCanvas = document.getElementById('chart-performa-ltc-kelas');
    if (!populasiCanvas || !performaCanvas) return;
    if (typeof Chart === 'undefined') return;

    // ----------------------------------------------------
    // CHART 1: Populasi LTC by Kelas (Stacked Bar Chart)
    // ----------------------------------------------------
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli'];
    const monthEndDates = [
        '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31'
    ];
    const monthStartDates = [
        '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01'
    ];

    const dataKls1 = [0, 0, 0, 0, 0, 0, 0];
    const dataKls2 = [0, 0, 0, 0, 0, 0, 0];
    const dataKls3 = [0, 0, 0, 0, 0, 0, 0];
    const dataKls4 = [0, 0, 0, 0, 0, 0, 0];
    const dataKls5 = [0, 0, 0, 0, 0, 0, 0];

    const currentMonthIdx = 6; // Juli 2026

    // 1. Current Month (Juli): Pure 100% activeData (30 active students in Manajemen Siswa)
    (activeData || []).forEach(s => {
        const kInMonth = typeof hitungKelas === 'function' ? hitungKelas(s) : (s.kelas || 'Kelas 1');
        if (kInMonth.includes('1')) dataKls1[currentMonthIdx]++;
        else if (kInMonth.includes('2')) dataKls2[currentMonthIdx]++;
        else if (kInMonth.includes('3')) dataKls3[currentMonthIdx]++;
        else if (kInMonth.includes('4')) dataKls4[currentMonthIdx]++;
        else dataKls5[currentMonthIdx]++;
    });

    // 2. Historical Months (Januari - Juni): Combined activeData + activeTurnoverData (physical active count in past months)
    const allHistoricalStudents = [...(activeData || []), ...(activeTurnoverData || [])];
    allHistoricalStudents.forEach(s => {
        const tglMasuk = s.masuk || s.tanggalMasuk || s.tanggal_masuk;
        const tglKeluar = s.tanggalKeluar || s.tanggal_keluar || s.keluar;
        if (!tglMasuk) return;

        for (let mIdx = 0; mIdx < currentMonthIdx; mIdx++) {
            const mStart = monthStartDates[mIdx];
            const mEnd = monthEndDates[mIdx];

            if (tglMasuk <= mEnd && (!tglKeluar || tglKeluar >= mStart)) {
                const kInMonth = typeof hitungKelasSiswa === 'function' 
                    ? hitungKelasSiswa(tglMasuk, mEnd) 
                    : (s.kelas || 'Kelas 1');
                
                if (kInMonth.includes('1')) dataKls1[mIdx]++;
                else if (kInMonth.includes('2')) dataKls2[mIdx]++;
                else if (kInMonth.includes('3')) dataKls3[mIdx]++;
                else if (kInMonth.includes('4')) dataKls4[mIdx]++;
                else dataKls5[mIdx]++;
            }
        }
    });

    if (populasiLtcKelasChartInstance) populasiLtcKelasChartInstance.destroy();

    populasiLtcKelasChartInstance = new Chart(populasiCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Kls 1', data: dataKls1, backgroundColor: '#EF4444', borderRadius: 2 },
                { label: 'Kls 2', data: dataKls2, backgroundColor: '#F59E0B', borderRadius: 2 },
                { label: 'Kls 3', data: dataKls3, backgroundColor: '#10B981', borderRadius: 2 },
                { label: 'Kls 4', data: dataKls4, backgroundColor: '#06B6D4', borderRadius: 2 },
                { label: 'Kls 5', data: dataKls5, backgroundColor: '#8B5CF6', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 25,
                    left: 5,
                    right: 10
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 10, font: { size: 10, weight: 'bold' }, usePointStyle: true }
                },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: '600' } }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grace: '15%',
                    grid: { color: 'rgba(226, 232, 240, 0.6)', borderDash: [4, 4] },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });

    // ----------------------------------------------------
    // CHART 2: Performa LTC per Kelas (Combo Bar & Line)
    // Bar 1 = Total Plan (EMERALD)
    // Bar 2 = Total Aktual (ROYAL BLUE)
    // Line = Persentase Capaian (ROSE RED BADGE)
    // ----------------------------------------------------
    const classes = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5'];

    const planPerKelas = [0, 0, 0, 0, 0];
    const actualPerKelas = [0, 0, 0, 0, 0];

    (activeData || []).forEach(s => {
        const kStr = typeof hitungKelas === 'function' ? hitungKelas(s) : (s.kelas || 'Kelas 1');
        let idx = 0;
        if (kStr.includes('1')) idx = 0;
        else if (kStr.includes('2')) idx = 1;
        else if (kStr.includes('3')) idx = 2;
        else if (kStr.includes('4')) idx = 3;
        else idx = 4;

        if (s.dailyRecords && s.dailyRecords.length > 0) {
            s.dailyRecords.forEach(rec => {
                if (rec.plan && rec.plan > 0) {
                    planPerKelas[idx] += Number(rec.plan) || 0;
                    actualPerKelas[idx] += Number(rec.actual) || 0;
                }
            });
        }
    });

    const finalPlan = planPerKelas;
    const finalActual = actualPerKelas;

    const pctPerKelas = finalPlan.map((plan, i) => {
        const act = finalActual[i];
        return plan > 0 ? Math.round((act / plan) * 100) : null;
    });

    if (performaLtcKelasChartInstance) performaLtcKelasChartInstance.destroy();

    performaLtcKelasChartInstance = new Chart(performaCanvas.getContext('2d'), {
        data: {
            labels: classes,
            datasets: [
                {
                    type: 'bar',
                    label: 'Total Plan',
                    data: finalPlan,
                    backgroundColor: '#10B981',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.65,
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Total Aktual',
                    data: finalActual,
                    backgroundColor: '#2563EB',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.65,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Persentase Capaian (%)',
                    data: pctPerKelas,
                    borderColor: '#E11D48',
                    backgroundColor: '#E11D48',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#E11D48',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4.5,
                    pointHoverRadius: 6.5,
                    tension: 0.25,
                    spanGaps: false,
                    yAxisID: 'yPercent',
                    datalabels: {
                        color: '#FFFFFF',
                        backgroundColor: '#E11D48',
                        borderRadius: 4,
                        padding: 3,
                        font: { size: 10, weight: 'bold' }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 35,
                    left: 10,
                    right: 15,
                    bottom: 5
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 10, font: { size: 10, weight: 'bold' }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.yAxisID === 'yPercent') {
                                return context.dataset.label + ': ' + (context.raw !== null ? context.raw + '%' : '-');
                            }
                            return context.dataset.label + ': ' + (context.raw ? context.raw.toLocaleString('id-ID') : 0) + ' Pcs';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10, weight: '600' } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grace: '45%',
                    grid: { color: 'rgba(226, 232, 240, 0.6)', borderDash: [4, 4] },
                    ticks: { 
                        font: { size: 10 },
                        callback: val => val.toLocaleString('id-ID')
                    }
                },
                yPercent: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grace: '20%',
                    suggestedMax: 120,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { size: 10, weight: 'bold' },
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

function renderSiswaView() {
    if (typeof calculateDynamicPerformance === 'function') {
        calculateDynamicPerformance();
    }
    populateBagianFilter();
    renderPerformaTopCharts();

    const tbody = document.getElementById('siswa-tbody');
    const emptyState = document.getElementById('siswa-empty-state');
    const countLabel = document.getElementById('siswa-count-label');
    if (!tbody) return;
    tbody.innerHTML = '';

    const search = (document.getElementById('search-siswa')?.value || '').toLowerCase();
    const filterWil = document.getElementById('filter-wilayah')?.value || '';
    const filterKelas = document.getElementById('filter-kelas-siswa')?.value || '';
    const filterBagian = document.getElementById('filter-bagian-siswa')?.value || '';
    const sortBy = document.getElementById('sort-siswa')?.value || 'nama-asc';

    // Synchronize kelas dynamically for activeData matching Admin Management
    (activeData || []).forEach(s => {
        if (!s.kelas || s.kelas === '-' || s.kelas === 'null') {
            s.kelas = typeof getStudentCurrentKelas === 'function' ? getStudentCurrentKelas(s) : 'Kelas 1';
        }
    });

    let filtered = [...activeData];

    if (search) {
        filtered = filtered.filter(s =>
            s.namaLengkap.toLowerCase().includes(search) ||
            (s.id || '').toLowerCase().includes(search) ||
            (s.bagian || '').toLowerCase().includes(search)
        );
    }
    if (filterWil) filtered = filtered.filter(s => s.wilayah === filterWil);
    if (filterKelas) {
        filtered = filtered.filter(s => {
            if (filterKelas === 'Kelas 5') {
                const num = parseInt((s.kelas || '').replace('Kelas ', ''));
                return s.kelas === 'Kelas 5' || (!isNaN(num) && num > 5);
            }
            return s.kelas === filterKelas;
        });
    }
    if (filterBagian) filtered = filtered.filter(s => s.bagian === filterBagian);

    // Sort
    filtered.sort((a, b) => {
        if (sortBy === 'performa-desc') return (b.nilai || 0) - (a.nilai || 0);
        if (sortBy === 'performa-asc') return (a.nilai || 0) - (b.nilai || 0);
        if (sortBy === 'kelas-asc') return (a.kelas || '').localeCompare(b.kelas || '');
        if (sortBy === 'kelas-desc') return (b.kelas || '').localeCompare(a.kelas || '');
        return (a.namaLengkap || '').localeCompare(b.namaLengkap || '');
    });

    // Update stats
    const perfTotal = document.getElementById('perf-stat-total');
    const perfAvg = document.getElementById('perf-stat-avg');
    const perfBest = document.getElementById('perf-stat-best');
    const perfBestName = document.getElementById('perf-stat-best-name');
    const perfLow = document.getElementById('perf-stat-low');

    if (perfTotal) perfTotal.innerText = filtered.length;
    const avgVal = filtered.length > 0
        ? Math.round(filtered.reduce((s, x) => s + (x.nilai || 0), 0) / filtered.length)
        : 0;
    if (perfAvg) perfAvg.innerText = avgVal + '%';
    const bestSiswa = filtered.length > 0 ? filtered.reduce((a, b) => (a.nilai || 0) > (b.nilai || 0) ? a : b) : null;
    if (perfBest) perfBest.innerText = bestSiswa ? bestSiswa.nilai + '%' : '0%';
    if (perfBestName) perfBestName.innerText = bestSiswa ? bestSiswa.namaLengkap.split(' ').slice(0, 2).join(' ') : '-';
    const lowCount = filtered.filter(s => (s.nilai || 0) < 75).length;
    if (perfLow) perfLow.innerText = lowCount;

    if (countLabel) countLabel.innerText = `(${filtered.length} siswa)`;

    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    filtered.forEach((s, idx) => {
        const kelasColor = getKelasColor(s.kelas);
        const perfColor = getPerformaColor(s.nilai || 0);
        const spvLabel = getSpvLabel(s);
        const masukFormatted = s.masuk ? s.masuk.split('-').reverse().join('/') : '-';
        const barWidth = Math.min(100, s.nilai || 0);

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/60 transition-all duration-150 cursor-pointer group';
        tr.onclick = () => showStudentDetail(s);
        tr.innerHTML = `
            <td class="py-3.5 px-4 text-xs font-semibold text-slate-400">${idx + 1}</td>
            <td class="py-3.5 px-4">
                <span class="text-[11px] font-bold text-slate-500 font-mono">${s.id || '-'}</span>
            </td>
            <td class="py-3.5 px-4">
                <div>
                    <p class="text-xs font-bold text-brand-textMain leading-tight">${s.namaLengkap || '-'}</p>
                    <p class="text-[10px] text-brand-textSub">Masuk: ${masukFormatted}</p>
                </div>
            </td>
            <td class="py-3.5 px-4">
                <span class="text-xs font-semibold text-slate-600">${s.bagian || '-'}</span>
            </td>
            <td class="py-3.5 px-4">
                <span class="text-xs font-semibold text-slate-600">${spvLabel}</span>
            </td>
            <td class="py-3.5 px-4">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${kelasColor.bg} ${kelasColor.text}">
                    <span class="w-1.5 h-1.5 rounded-full ${kelasColor.dot}"></span>
                    ${s.kelas || '-'}
                </span>
            </td>
            <td class="py-3.5 px-4 min-w-[160px]">
                <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${perfColor.bar} transition-all duration-500" style="width: ${barWidth}%"></div>
                    </div>
                    <span class="text-xs font-bold ${perfColor.text} flex-shrink-0 w-10 text-right">${s.nilai || 0}%</span>
                </div>
                <span class="text-[9px] font-semibold ${perfColor.text} mt-0.5 block">${perfColor.label}</span>
            </td>
            <td class="py-3.5 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Aktif
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let sdmChartInstance = null;

// Modal detail siswa
function showStudentDetail(s) {
    const modal = document.getElementById('student-detail-modal');
    if (!modal) return;

    const kelasColor = getKelasColor(s.kelas);
    const perfColor = getPerformaColor(s.nilai || 0);
    const spvLabel = getSpvLabel(s);
    const masukFormatted = s.masuk ? s.masuk.split('-').reverse().join('/') : '-';

    document.getElementById('sdm-nama').innerText = s.namaLengkap || '-';
    document.getElementById('sdm-id').innerText = s.id || '-';
    document.getElementById('sdm-bagian').innerText = s.bagian || '-';
    document.getElementById('sdm-kelas').innerText = s.kelas || '-';
    document.getElementById('sdm-wilayah').innerText = s.wilayah || '-';
    document.getElementById('sdm-daerah-asal').innerText = s.daerahAsal || '-';
    document.getElementById('sdm-spv').innerText = spvLabel;
    document.getElementById('sdm-masuk').innerText = masukFormatted;
    const nilaiEl = document.getElementById('sdm-nilai');
    if (nilaiEl) {
        nilaiEl.innerText = (s.nilai || 0) + '%';
        nilaiEl.className = `text-3xl font-extrabold ${perfColor.text}`;
    }
    const labelEl = document.getElementById('sdm-label');
    if (labelEl) {
        labelEl.innerText = perfColor.label;
        labelEl.className = `text-[10px] font-bold px-2.5 py-0.5 rounded-full ${perfColor.badge}`;
    }

    const chartDaysCount = 14;
    const chartLabels = [];
    const chartDataPoints = [];
    const today = new Date();
    const recMap = {};
    (s.dailyRecords || []).forEach(r => {
        if (r.dateStr) recMap[r.dateStr] = r;
    });

    const isBagianHadirGlobal = (s.section || '').toUpperCase().includes('ADM') ||
        (s.section || '').toUpperCase().includes('ADMINISTRASI') ||
        (s.section || '').toUpperCase().includes('PPIC') ||
        (s.section || '').toUpperCase().includes('IRGA') ||
        (s.section || '').toUpperCase().includes('SHE') ||
        (s.bagian || '').toUpperCase().includes('ADM') ||
        (s.bagian || '').toUpperCase().includes('ADMINISTRASI') ||
        (s.bagian || '').toUpperCase().includes('PPIC') ||
        (s.bagian || '').toUpperCase().includes('IRGA') ||
        (s.bagian || '').toUpperCase().includes('SHE');

    for (let i = chartDaysCount - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const ds = `${yyyy}-${mm}-${dd}`;
        const dayOfWeek = d.getDay();

        if (dayOfWeek === 0) continue;

        chartLabels.push(`${dd}/${mm}`);
        const rec = recMap[ds];
        const todayStr = today.toISOString().split('T')[0];

        if (ds > todayStr) {
            chartDataPoints.push(null);
        } else if (!rec) {
            chartDataPoints.push(null);
        } else {
            const isHadirDay = (rec.plan === null || rec.plan === 0 || isNaN(rec.plan)) && (rec.hadir !== "" && rec.hadir !== undefined && rec.hadir !== null);
            if (isHadirDay) {
                chartDataPoints.push((rec.hadir === '✔' || rec.hadir === 'Hadir') ? 100 : 0);
            } else {
                chartDataPoints.push(rec.plan > 0 ? Math.round((rec.actual / rec.plan) * 100) : 0);
            }
        }
    }

    const chartCanvas = document.getElementById('sdm-chart-canvas');
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        if (sdmChartInstance) {
            sdmChartInstance.destroy();
        }
        const gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

        sdmChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Performa',
                    data: chartDataPoints,
                    borderColor: '#2563EB',
                    borderWidth: 2.5,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#2563EB',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 25,
                        bottom: 10,
                        left: 5,
                        right: 15
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y !== null ? 'Performa: ' + context.parsed.y + '%' : 'Tidak Ada Data / Off';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 9, weight: 'bold' }, color: '#64748B' }
                    },
                    y: {
                        min: 0,
                        suggestedMax: 115,
                        ticks: {
                            stepSize: 25,
                            font: { size: 9, weight: 'bold' },
                            color: '#94A3B8',
                            callback: value => value <= 100 ? value + '%' : ''
                        },
                        grid: { color: '#F1F5F9', borderDash: [3, 3] }
                    }
                }
            }
        });
    }

    const logTbody = document.getElementById('sdm-log-tbody');
    if (logTbody) {
        logTbody.innerHTML = '';
        const todayStr = new Date().toISOString().split('T')[0];
        const validLogs = (s.dailyRecords || []).filter(rec => rec.dateStr && rec.dateStr <= todayStr);
        const logs = validLogs.slice(-10).reverse();
        if (logs.length === 0) {
            logTbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-xs text-slate-400">Tidak ada data harian</td></tr>';
        } else {
            logs.forEach(rec => {
                const isBagianHadir = (s.section || '').toUpperCase().includes('ADM') ||
                    (s.section || '').toUpperCase().includes('ADMINISTRASI') ||
                    (s.section || '').toUpperCase().includes('PPIC') ||
                    (s.section || '').toUpperCase().includes('IRGA') ||
                    (s.section || '').toUpperCase().includes('SHE') ||
                    (s.bagian || '').toUpperCase().includes('ADM') ||
                    (s.bagian || '').toUpperCase().includes('ADMINISTRASI') ||
                    (s.bagian || '').toUpperCase().includes('PPIC') ||
                    (s.bagian || '').toUpperCase().includes('IRGA') ||
                    (s.bagian || '').toUpperCase().includes('SHE');

                const isHadirDay = (rec.plan === null || rec.plan === 0 || isNaN(rec.plan)) && (rec.hadir !== "" && rec.hadir !== undefined && rec.hadir !== null);

                const hadir = isHadirDay ? (rec.hadir === '✔' || rec.hadir === 'Hadir' ? '✔ Hadir' : '— Absen') : '-';
                const planVal = isHadirDay ? '-' : (rec.plan || 0);
                const actualVal = isHadirDay ? (rec.keterangan || 'On duty') : (rec.actual || 0);

                const rowPct = isHadirDay
                    ? ((rec.hadir === '✔' || rec.hadir === 'Hadir') ? 100 : 0)
                    : (rec.plan > 0 ? Math.round((rec.actual / rec.plan) * 100) : 0);

                const pct = rowPct + '%';
                const rowClass = rowPct >= 90 ? 'text-emerald-600' : rowPct >= 75 ? 'text-blue-600' : 'text-rose-500';

                const parsedDate = parseDateYYYYMMDD(rec.dateStr);
                const dow = parsedDate ? (['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][parsedDate.getDay()]) : '';

                let rawShift = rec.shift || rec.Shift || '-';
                if (rawShift && rawShift.toUpperCase().startsWith('SHIFT')) {
                    const sNum = rawShift.replace(/\D/g, '');
                    rawShift = sNum ? `Shift ${sNum}` : rawShift;
                }

                logTbody.innerHTML += `
                    <tr class="border-b border-slate-50">
                        <td class="py-1.5 px-3 text-[10px] text-slate-500 font-mono">${dow} ${rec.dateStr || '-'}</td>
                        <td class="py-1.5 px-3 text-[10px] text-slate-700 font-semibold">${rawShift}</td>
                        <td class="py-1.5 px-3 text-[10px] ${rowClass} font-semibold">${hadir}</td>
                        <td class="py-1.5 px-3 text-[10px] text-slate-600">${planVal}</td>
                        <td class="py-1.5 px-3 text-[10px] text-slate-600">${actualVal}</td>
                        <td class="py-1.5 px-3 text-[10px] font-bold ${rowClass}">${pct}</td>
                    </tr>
                `;
            });
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeStudentDetailModal() {
    const modal = document.getElementById('student-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function triggerSiswaFilter() {
    renderSiswaView();
}

function exportPerformaCSV() {
    let csv = 'No,No Registrasi,Nama Lengkap,Bagian,Wilayah Penempatan,Daerah Asal,SPV,Kelas,Performa\n';
    activeData.forEach((s, i) => {
        csv += `${i + 1},"${s.id || ''}","${s.namaLengkap || ''}","${s.bagian || ''}","${s.wilayah || ''}","${s.daerahAsal || ''}","${getSpvLabel(s)}","${s.kelas || ''}","${s.nilai || 0}%"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performa_siswa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV berhasil!', 'success');
}
