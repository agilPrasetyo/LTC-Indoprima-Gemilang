var classPopulationChartInstance = null;

function renderRecentTransactionsTable() {
    const tbody = document.querySelector('#table-recent tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    financeData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-all-300";
        const isInc = item.tipe === 'Pemasukan';
        const badgeStyle = isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-slate-500 text-xs">${item.id}</td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badgeStyle}">${item.tipe}</span></td>
            <td class="py-3 px-4 font-semibold text-brand-textMain text-xs">${item.kat}</td>
            <td class="py-3 px-4 font-bold text-brand-textMain text-xs">Rp ${parseFloat(item.jumlah).toLocaleString('id-ID')}</td>
            <td class="py-3 px-4 text-brand-textSub text-xs">${item.tanggal}</td>
            <td class="py-3 px-4 text-brand-textSub text-xs text-right">${item.ket || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function initVisualizations() {
    // Defer chart rendering to after UI paint so the page doesn't freeze
    requestAnimationFrame(() => {
        updateLtcChart();
        requestAnimationFrame(() => {
            updateClassPopulationChart();
            updateTurnoverPieChart();
            updateLtcRatioChart();
            updateAbsensiChart();
        });
    });
}

function updateLtcChart() {
    const chartCanvas = document.getElementById('ltcPerformanceChart');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');

    const filterClass = document.getElementById('class-chart-filter');
    const selectedClassType = filterClass ? filterClass.value : "all";

    const chartStartInput = document.getElementById('chart-start-date');
    const chartStartVal = chartStartInput ? chartStartInput.value : "";

    const chartEndInput = document.getElementById('chart-end-date');
    const chartEndVal = chartEndInput ? chartEndInput.value : "";

    if (chartInstance) chartInstance.destroy();

    if (!chartStartVal || !chartEndVal) return;

    const allDates = [];
    activeData.forEach(siswa => {
        (siswa.dailyRecords || []).forEach(rec => {
            if (rec.dateStr && rec.dateStr >= chartStartVal && rec.dateStr <= chartEndVal) {
                allDates.push(rec.dateStr);
            }
        });
    });
    // Hapus hari Minggu (day=0) dari rentang yang ditampilkan di grafik
    const uniqueDatesInRange = Array.from(new Set(allDates))
        .filter(d => {
            const parsed = parseDateYYYYMMDD(d);
            return parsed && parsed.getDay() !== 0; // 0 = Minggu
        })
        .sort();

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const labels = uniqueDatesInRange.map(dStr => {
        const parsed = parseDateYYYYMMDD(dStr);
        return dayNames[parsed.getDay()] + ' ' + parseInt(dStr.split('-')[2]);
    });

    let datasets = [];
    const colorPalette = [
        '#2563EB', '#EF4444', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981'
    ];

    let targetStudents = activeData;
    let lineLabel = "Rata-rata LTC Keseluruhan";
    let lineColor = "#2563EB";
    let bgColor = "rgba(37, 99, 235, 0.25)";

    if (selectedClassType !== "all") {
        targetStudents = activeData.filter(s => {
            if (selectedClassType === "Kelas 5") {
                const num = parseInt((s.kelas || '').replace("Kelas ", ""));
                return s.kelas === "Kelas 5" || (!isNaN(num) && num > 5);
            }
            return s.kelas === selectedClassType;
        });
        lineLabel = `Rata-rata ${selectedClassType}`;
        lineColor = "#0D9488"; // Teal color for class-specific averages
        bgColor = "rgba(13, 148, 136, 0.25)";
    }

    const avgData = [];
    uniqueDatesInRange.forEach(dStr => {
        let totalDailyPercent = 0;
        let count = 0;

        targetStudents.forEach(siswa => {
            const rec = (siswa.dailyRecords || []).find(r => r.dateStr === dStr);
            if (rec) {
                if (siswa.perfLabel === "Hadir") {
                    totalDailyPercent += (rec.hadir === "✔" || rec.hadir === "Hadir") ? 100 : 0;
                } else {
                    let pctVal = rec.percent || 0;
                    if (pctVal > 0 && pctVal <= 1) {
                        pctVal = Math.round(pctVal * 100);
                    }
                    totalDailyPercent += pctVal;
                }
                count++;
            }
        });
        avgData.push(count > 0 ? Math.round(totalDailyPercent / count) : 0);
    });

    const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    datasets.push({
        label: lineLabel,
        data: avgData,
        borderColor: lineColor,
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: lineColor
    });

    chartInstance = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 10,
                        font: { size: 9, weight: '600' },
                        color: '#64748B'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0F172A',
                    titleFont: { size: 11, weight: '700' },
                    bodyFont: { size: 10 },
                    padding: 12,
                    borderRadius: 12,
                    callbacks: {
                        label: (item) => `${item.dataset.label}: ${item.formattedValue}%`
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: '#F1F5F9' },
                    ticks: { color: '#94A3B8', font: { size: 10 } },
                    min: 0,
                    max: 120
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94A3B8', font: { size: 10 } }
                }
            }
        }
    });
}

function updateClassPopulationChart() {
    const chartCanvas = document.getElementById('classPopulationChart');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');

    if (classPopulationChartInstance) classPopulationChartInstance.destroy();

    const allDates = [];
    activeData.forEach(siswa => {
        (siswa.dailyRecords || []).forEach(rec => {
            if (rec.dateStr) allDates.push(rec.dateStr);
        });
    });

    const uniqueDates = Array.from(new Set(allDates)).sort();
    if (uniqueDates.length === 0) {
        uniqueDates.push("2026-04-20", "2026-05-14");
    }

    const todayObj = new Date();
    const thisMonthStr = todayObj.getFullYear() + "-" + String(todayObj.getMonth() + 1).padStart(2, '0');
    const uniqueMonths = Array.from(new Set(uniqueDates.map(d => d.slice(0, 7))))
        .filter(m => m <= thisMonthStr)
        .sort();

    const monthNamesMap = {
        '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    const labels = uniqueMonths.map(mStr => {
        const parts = mStr.split('-');
        return monthNamesMap[parts[1]] + ' ' + parts[0];
    });

    const classData = {
        'Kelas 1': [],
        'Kelas 2': [],
        'Kelas 3': [],
        'Kelas 4': [],
        'Kelas 5': []
    };

    const combinedStudents = [...activeData, ...activeTurnoverData];

    uniqueMonths.forEach(mStr => {
        const parts = mStr.split('-');
        const year = parseInt(parts[0]);
        const monthIdx = parseInt(parts[1]) - 1;

        const startOfMonth = new Date(year, monthIdx, 1);
        const endOfMonth = new Date(year, monthIdx + 1, 0);

        let evalDate = endOfMonth;
        const today = new Date();
        const isCurrentMonth = (year === today.getFullYear() && monthIdx === today.getMonth());
        if (isCurrentMonth) {
            evalDate = today;
        }

        const counts = {
            'Kelas 1': 0,
            'Kelas 2': 0,
            'Kelas 3': 0,
            'Kelas 4': 0,
            'Kelas 5': 0
        };

        if (isCurrentMonth) {
            // Strictly synchronize with current active students (activeData)
            activeData.forEach(s => {
                let k = s.kelas;
                if (!k || k === '-' || k === 'null') {
                    const entryD = parseDateYYYYMMDD(s.masuk || s.tanggal_masuk || s.tanggalMasuk);
                    if (entryD) {
                        let monthsActive = (today.getFullYear() - entryD.getFullYear()) * 12;
                        monthsActive -= entryD.getMonth();
                        monthsActive += today.getMonth();
                        if (today.getDate() < entryD.getDate()) monthsActive--;
                        const cNum = Math.max(1, monthsActive + 1);
                        k = 'Kelas ' + (cNum >= 5 ? 5 : cNum);
                    } else {
                        k = 'Kelas 1';
                    }
                }
                const num = parseInt(String(k).replace(/Kelas\s+/i, ''));
                if (num >= 5) counts['Kelas 5']++;
                else if (num >= 1 && num <= 4) counts['Kelas ' + num]++;
                else counts['Kelas 1']++;
            });
        } else {
            // For historical months, calculate based on entry date & exit date
            activeData.forEach(s => {
                const startD = parseDateYYYYMMDD(s.masuk || s.tanggalMasuk || s.tanggal_masuk);
                if (!startD || startD > evalDate) return;

                let monthsActive = (evalDate.getFullYear() - startD.getFullYear()) * 12;
                monthsActive -= startD.getMonth();
                monthsActive += evalDate.getMonth();
                if (evalDate.getDate() < startD.getDate()) {
                    monthsActive--;
                }

                const classNum = Math.max(1, monthsActive + 1);
                if (classNum === 1) counts['Kelas 1']++;
                else if (classNum === 2) counts['Kelas 2']++;
                else if (classNum === 3) counts['Kelas 3']++;
                else if (classNum === 4) counts['Kelas 4']++;
                else counts['Kelas 5']++;
            });

            activeTurnoverData.forEach(s => {
                const startD = parseDateYYYYMMDD(s.masuk || s.tanggalMasuk || s.tanggal_masuk);
                if (!startD || startD > evalDate) return;

                const exitStr = s.tanggalKeluar || s.tanggal_keluar || s.keluar || s.tanggal_terminasi || s.tanggal;
                const exitD = exitStr ? parseDateYYYYMMDD(exitStr) : null;

                if (exitD && exitD < startOfMonth) return;

                let monthsActive = (evalDate.getFullYear() - startD.getFullYear()) * 12;
                monthsActive -= startD.getMonth();
                monthsActive += evalDate.getMonth();
                if (evalDate.getDate() < startD.getDate()) {
                    monthsActive--;
                }

                const classNum = Math.max(1, monthsActive + 1);
                if (classNum === 1) counts['Kelas 1']++;
                else if (classNum === 2) counts['Kelas 2']++;
                else if (classNum === 3) counts['Kelas 3']++;
                else if (classNum === 4) counts['Kelas 4']++;
                else counts['Kelas 5']++;
            });
        }

        classData['Kelas 1'].push(counts['Kelas 1']);
        classData['Kelas 2'].push(counts['Kelas 2']);
        classData['Kelas 3'].push(counts['Kelas 3']);
        classData['Kelas 4'].push(counts['Kelas 4']);
        classData['Kelas 5'].push(counts['Kelas 5']);
    });

    const colorPalette = {
        'Kelas 1': '#D3222A', // Merah (Bottom)
        'Kelas 2': '#F5C400', // Kuning
        'Kelas 3': '#00A651', // Hijau
        'Kelas 4': '#0072C6', // Biru
        'Kelas 5': '#A6A6A6'  // Abu-abu (Top)
    };

    const classKeys = Object.keys(classData);
    const datasets = classKeys.map((className, index) => {
        let radius = 0;
        if (index === 0) {
            // Bottom layer (Kelas 1): round bottom corners only
            radius = { bottomLeft: 14, bottomRight: 14, topLeft: 0, topRight: 0 };
        } else if (index === classKeys.length - 1) {
            // Top layer (Kelas 5): round top corners only
            radius = { topLeft: 14, topRight: 14, bottomLeft: 0, bottomRight: 0 };
        } else {
            // Middle layers: seamless flat corners
            radius = 0;
        }

        return {
            label: className,
            data: classData[className],
            backgroundColor: colorPalette[className],
            borderWidth: 0,
            borderRadius: radius,
            borderSkipped: false,
            barPercentage: 0.45,
            categoryPercentage: 0.6,
            stack: 'Stack 0'
        };
    });

    classPopulationChartInstance = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 10, family: 'Inter', weight: '600' },
                        color: '#64748B'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0F172A',
                    titleFont: { size: 11, weight: '700' },
                    bodyFont: { size: 10 },
                    padding: 12,
                    borderRadius: 12
                },
                datalabels: {
                    display: true,
                    color: '#FFFFFF',
                    font: {
                        weight: 'bold',
                        size: 11,
                        family: 'Inter'
                    },
                    formatter: function (value, context) {
                        return value > 0 ? value : '';
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#94A3B8', font: { size: 10 } }
                },
                y: {
                    stacked: true,
                    grid: { color: '#F1F5F9' },
                    ticks: { color: '#94A3B8', font: { size: 10 } }
                }
            }
        }
    });

    const tableBody = document.getElementById('class-population-tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        uniqueMonths.forEach((mStr, idx) => {
            const monthName = labels[idx];
            let total = 0;
            Object.keys(classData).forEach(className => {
                total += classData[className][idx] || 0;
            });

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 transition-all';
            tr.innerHTML = `
                <td class="py-2 px-3.5">${monthName}</td>
                <td class="py-2 px-3.5 text-center font-bold text-brand-blue">${total} Siswa</td>
            `;
            tableBody.appendChild(tr);
        });
    }
}

function updateTurnoverPieChart() {
    const chartCanvas = document.getElementById('dashboardTurnoverPieChart');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');

    if (turnoverPieChartInstance) turnoverPieChartInstance.destroy();

    let resignCount = 0;
    let lulusCount = 0;
    let indisiplinerCount = 0;

    const records = activeTurnoverData || [];
    records.forEach(item => {
        const statusStr = String(item.alasan || item.alasanDetail || item.alasan_detail || item.keterangan || '').trim().toLowerCase();
        if (statusStr.includes('resign')) {
            resignCount++;
        } else if (statusStr.includes('lulus')) {
            lulusCount++;
        } else if (statusStr.includes('indisipliner') || statusStr.includes('indisiplin')) {
            indisiplinerCount++;
        }
    });

    const totalTurnover = resignCount + lulusCount + indisiplinerCount;
    const lulusPct = totalTurnover > 0 ? Math.round((lulusCount / totalTurnover) * 100) : 0;
    const resignPct = totalTurnover > 0 ? Math.round((resignCount / totalTurnover) * 100) : 0;
    const indisPct = totalTurnover > 0 ? Math.round((indisiplinerCount / totalTurnover) * 100) : 0;

    const totalBadgeEl = document.getElementById('stat-turnover-total-badge');
    if (totalBadgeEl) totalBadgeEl.innerText = totalTurnover + ' Siswa';

    const resignValEl = document.getElementById('stat-turnover-resign-val');
    if (resignValEl) resignValEl.innerText = resignCount + ' Siswa';
    const resignPctEl = document.getElementById('stat-turnover-resign-pct');
    if (resignPctEl) resignPctEl.innerText = resignPct + '%';

    const lulusValEl = document.getElementById('stat-turnover-lulus-val');
    if (lulusValEl) lulusValEl.innerText = lulusCount + ' Siswa';
    const lulusPctEl = document.getElementById('stat-turnover-lulus-pct');
    if (lulusPctEl) lulusPctEl.innerText = lulusPct + '%';

    const indisValEl = document.getElementById('stat-turnover-indisipliner-val');
    if (indisValEl) indisValEl.innerText = indisiplinerCount + ' Siswa';
    const indisPctEl = document.getElementById('stat-turnover-indis-pct');
    if (indisPctEl) indisPctEl.innerText = indisPct + '%';

    // Set total in the central circle overlay
    const totalCenterEl = document.getElementById('dashboard-turnover-total-center');
    if (totalCenterEl) totalCenterEl.innerText = totalTurnover;

    // Calculate 3 Mini Metrics for Turnover Card
    const lulusRate = totalTurnover > 0 ? Math.round((lulusCount / totalTurnover) * 100) + '%' : '0%';
    const evalRate = totalTurnover > 0 ? Math.round(((resignCount + indisiplinerCount) / totalTurnover) * 100) + '%' : '0%';

    const now = new Date();
    const curYearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthNamesIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const curMonthLabel = monthNamesIndo[now.getMonth()] + ' ' + now.getFullYear();

    let curMonthCount = 0;
    records.forEach(item => {
        const tgl = String(item.tgl_keluar || item.tanggal || item.tanggalKeluar || item.created_at || '').substring(0, 7);
        if (tgl === curYearMonth) {
            curMonthCount++;
        }
    });

    const lulusRateEl = document.getElementById('stat-turnover-lulus-rate');
    if (lulusRateEl) lulusRateEl.innerText = lulusRate;

    const evalRateEl = document.getElementById('stat-turnover-eval-rate');
    if (evalRateEl) evalRateEl.innerText = evalRate;

    const curMonthCountEl = document.getElementById('stat-turnover-month-count');
    if (curMonthCountEl) curMonthCountEl.innerText = curMonthCount + ' Siswa';

    const curMonthLabelEl = document.getElementById('stat-turnover-month-label');
    if (curMonthLabelEl) curMonthLabelEl.innerText = curMonthLabel;

    turnoverPieChartInstance = new Chart(chartCtx, {
        type: 'doughnut',
        data: {
            labels: ['Lulus Magang', 'Resign Mandiri', 'Indisipliner'],
            datasets: [{
                data: [lulusCount, resignCount, indisiplinerCount],
                backgroundColor: ['#10B981', '#F59E0B', '#F43F5E'],
                hoverBackgroundColor: ['#059669', '#D97706', '#E11D48'],
                borderWidth: 0,
                spacing: 5,
                borderRadius: 6,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    padding: 12,
                    cornerRadius: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    titleFont: { size: 12, family: 'Inter', weight: 'bold' },
                    bodyFont: { size: 12, family: 'Inter', weight: '600' },
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                            return ` ${val} Siswa (${pct}%)`;
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            }
        }
    });
}

var ltcRatioChartInstance = null;

function togglePopulasiFilterInputs() {
    const filterType = document.getElementById('populasi-chart-filter-type')?.value || 'all';
    const monthContainer = document.getElementById('populasi-month-range-container');
    const dateContainer = document.getElementById('populasi-date-range-container');

    if (monthContainer) {
        if (filterType === 'month-range') monthContainer.classList.remove('hidden');
        else monthContainer.classList.add('hidden');
    }

    if (dateContainer) {
        if (filterType === 'date-range') dateContainer.classList.remove('hidden');
        else dateContainer.classList.add('hidden');
    }

    updateLtcRatioChart();
}

function resetPopulasiChartFilter() {
    const typeSelect = document.getElementById('populasi-chart-filter-type');
    const startMonth = document.getElementById('populasi-filter-start-month');
    const endMonth = document.getElementById('populasi-filter-end-month');
    const startDate = document.getElementById('populasi-filter-start-date');
    const endDate = document.getElementById('populasi-filter-end-date');

    if (typeSelect) typeSelect.value = 'all';
    if (startMonth) startMonth.value = '';
    if (endMonth) endMonth.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';

    togglePopulasiFilterInputs();
}

function renderPopulasiOrderSummaryTable(filteredData) {
    const theadTr = document.getElementById('populasi-order-thead-tr');
    const tbody = document.getElementById('populasi-order-tbody');
    const indicator = document.getElementById('populasi-order-filter-indicator');
    if (!theadTr || !tbody) return;

    // Reset header (keep first cell 'bulan')
    theadTr.innerHTML = '<th class="py-3 px-4 uppercase text-[11px] font-extrabold w-36 bg-slate-200/70 text-slate-700 border-r border-slate-200">bulan</th>';
    tbody.innerHTML = '';

    if (!filteredData || filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td class="py-3 px-4 font-bold uppercase text-[11px] text-slate-700 bg-slate-50 border-r border-slate-200">total order</td>
                <td class="py-4 px-4 text-center text-xs text-brand-textSub italic font-medium">
                    Tidak ada data order pada periode ini.
                </td>
            </tr>
        `;
        if (indicator) indicator.textContent = '0 Data Ditampilkan';
        return;
    }

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const groupedByMonth = {};

    filteredData.forEach(item => {
        if (!item.tanggal) return;
        const monthKey = item.tanggal.substring(0, 7); // 'YYYY-MM'
        if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = {
                monthKey: monthKey,
                totalOrderSum: 0
            };
        }
        const orderVal = item.order || item.no_order || item.order_val || 0;
        groupedByMonth[monthKey].totalOrderSum += parseFloat(orderVal) || 0;
    });

    const sortedMonths = Object.keys(groupedByMonth).sort();

    if (indicator) {
        indicator.textContent = `Menampilkan ${sortedMonths.length} Bulan`;
    }

    const orderTr = document.createElement('tr');
    orderTr.className = "bg-white hover:bg-slate-50/50 transition-colors";
    
    let orderRowHtml = '<td class="py-3 px-4 font-bold uppercase text-[11px] text-slate-700 bg-slate-50 border-r border-slate-200">total order</td>';

    sortedMonths.forEach(mKey => {
        const grp = groupedByMonth[mKey];
        const parts = mKey.split('-');
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const monthNameStr = monthNames[monthIdx] ? `${monthNames[monthIdx]}` : mKey;

        // Append Month Header
        const th = document.createElement('th');
        th.className = "py-3 px-4 font-extrabold text-center text-brand-blue border-r border-slate-200 min-w-[100px]";
        th.textContent = monthNameStr;
        theadTr.appendChild(th);

        // Append Order Value Cell
        const orderFormatted = grp.totalOrderSum > 0 ? grp.totalOrderSum.toLocaleString('id-ID') : '0';
        orderRowHtml += `<td class="py-3 px-4 font-extrabold text-center text-indigo-600 text-sm border-r border-slate-100">${orderFormatted}</td>`;
    });

    orderTr.innerHTML = orderRowHtml;
    tbody.appendChild(orderTr);
}

function updateLtcRatioChart() {
    const chartCanvas = document.getElementById('ltcRatioChart');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');

    if (ltcRatioChartInstance) ltcRatioChartInstance.destroy();

    const filterType = document.getElementById('populasi-chart-filter-type')?.value || 'all';
    let filteredData = [...rawPopulasiData];

    if (filterType === 'month-range') {
        const startMonth = document.getElementById('populasi-filter-start-month')?.value;
        const endMonth = document.getElementById('populasi-filter-end-month')?.value;

        if (startMonth || endMonth) {
            filteredData = filteredData.filter(p => {
                if (!p.tanggal) return false;
                const m = p.tanggal.substring(0, 7); // YYYY-MM
                if (startMonth && m < startMonth) return false;
                if (endMonth && m > endMonth) return false;
                return true;
            });
        }
    } else if (filterType === 'date-range') {
        const startDate = document.getElementById('populasi-filter-start-date')?.value;
        const endDate = document.getElementById('populasi-filter-end-date')?.value;

        if (startDate || endDate) {
            filteredData = filteredData.filter(p => {
                if (!p.tanggal) return false;
                if (startDate && p.tanggal < startDate) return false;
                if (endDate && p.tanggal > endDate) return false;
                return true;
            });
        }
    }

    const sortedData = [...filteredData].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // Render Tabel Order per Bulan di bawah grafik
    renderPopulasiOrderSummaryTable(sortedData);
    
    const monthNamesShort = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const labels = sortedData.map(p => {
        if (p.tanggal && p.tanggal.includes('-')) {
            const parts = p.tanggal.split('-');
            const monthIdx = parseInt(parts[1], 10) - 1;
            const mName = monthNamesShort[monthIdx] || parts[1];
            if (filterType === 'date-range') {
                return `${parseInt(parts[2], 10)} ${mName}`;
            }
            return mName;
        }
        return p.tanggal;
    });

    // Dynamic real-time LTC active student count from Manajemen Siswa
    const realActiveLtcCount = (typeof activeData !== 'undefined' && Array.isArray(activeData)) ? activeData.length : 29;

    // Find latest month string in sortedData
    let latestMonthStr = '';
    sortedData.forEach(p => {
        if (p.tanggal) {
            const m = p.tanggal.substring(0, 7);
            if (m > latestMonthStr) latestMonthStr = m;
        }
    });

    // Total Karyawan synchronized with Kelola Populasi di Admin
    const totalKaryawanData = sortedData.map(p => {
        if (typeof p.totalKaryawan === 'number' && p.totalKaryawan > 0) {
            return p.totalKaryawan;
        }
        const k = (p.kontrak || 0) + (p.ltc || realActiveLtcCount) + (p.outsourcing || 0) + (p.satpamSupir || 0);
        return k > 0 ? k : 146;
    });

    // Dynamically calculate totalLtc synchronized with Manajemen Siswa active students
    const totalLtcData = sortedData.map(p => {
        const m = p.tanggal ? p.tanggal.substring(0, 7) : '';
        // For current/latest month, strictly use real-time active student count from Manajemen Siswa
        if (m === latestMonthStr || m === '2026-07') {
            return realActiveLtcCount;
        }
        return (typeof p.totalLtc === 'number' && p.totalLtc > 0) ? p.totalLtc : realActiveLtcCount;
    });

    // Persentase LTC line dynamically calculated
    const ltcPercentageData = sortedData.map((p, idx) => {
        const totalK = totalKaryawanData[idx];
        const ltc = totalLtcData[idx];
        return totalK > 0 ? Math.round((ltc / totalK) * 100) : 0;
    });

    // Create a beautiful linear gradient for the line chart fill (Red/Pink gradient)
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.35)'); // semi-transparent red
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.00)'); // transparent

    ltcRatioChartInstance = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Total Karyawan',
                    data: totalKaryawanData,
                    backgroundColor: '#0F3A8C', // dark blue (biru tua)
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 2, // drawn first (behind)
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#1E293B',
                        font: {
                            family: 'Inter',
                            size: 11,
                            weight: 'bold'
                        }
                    }
                },
                {
                    type: 'bar',
                    label: 'Jumlah LTC',
                    data: totalLtcData,
                    backgroundColor: '#F5C400', // yellow (kuning)
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 2, // drawn first (behind)
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#1E293B',
                        font: {
                            family: 'Inter',
                            size: 11,
                            weight: 'bold'
                        }
                    }
                },
                {
                    type: 'line',
                    label: 'Persentase LTC',
                    data: ltcPercentageData,
                    borderColor: '#EF4444', // red line
                    borderWidth: 3,
                    tension: 0.4, // smooth curve
                    fill: true,
                    backgroundColor: gradient,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#EF4444',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'yPercent',
                    order: 1, // drawn last (in front)
                    datalabels: {
                        anchor: 'center',
                        align: 'right', // shift label to the right of the point
                        offset: 8, // add spacing from the point
                        color: '#1E293B',
                        font: {
                            family: 'Inter',
                            size: 13, // slightly enlarged font size
                            weight: 'bold' // bold
                        },
                        formatter: function(value) {
                            return value + '%';
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 10, family: 'Inter', weight: '600' },
                        color: '#64748B'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0F172A',
                    titleFont: { size: 11, weight: '700' },
                    bodyFont: { size: 10 },
                    padding: 12,
                    borderRadius: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.type === 'line') {
                                label += context.parsed.y + '%';
                            } else {
                                label += context.parsed.y + ' Orang';
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: true // globally enable datalabels for this chart, using dataset specific properties
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94A3B8', font: { size: 10 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#F1F5F9' },
                    ticks: { color: '#94A3B8', font: { size: 10 } },
                    grace: '10%', // adds padding at the top of the axis to make room for labels
                    title: {
                        display: true,
                        text: 'Jumlah Karyawan / LTC',
                        color: '#64748B',
                        font: { size: 10, weight: 'bold' }
                    }
                },
                yPercent: {
                    type: 'linear',
                    display: false, // hide the entire axis including ticks and labels
                    min: 0,
                    max: 40 // centers the 13% - 18% line vertically in the middle of the chart
                }
            }
        }
    });
}

var absensiChartInstance = null;

function toggleAbsensiFilterInputs() {
    const filterType = document.getElementById('absensi-chart-filter-type')?.value || 'all';
    const monthContainer = document.getElementById('absensi-month-range-container');
    const dateContainer = document.getElementById('absensi-date-range-container');

    if (monthContainer) {
        if (filterType === 'month-range') monthContainer.classList.remove('hidden');
        else monthContainer.classList.add('hidden');
    }

    if (dateContainer) {
        if (filterType === 'date-range') dateContainer.classList.remove('hidden');
        else dateContainer.classList.add('hidden');
    }

    updateAbsensiChart();
}

function resetAbsensiChartFilter() {
    const typeSelect = document.getElementById('absensi-chart-filter-type');
    const startMonth = document.getElementById('absensi-chart-start-month');
    const endMonth = document.getElementById('absensi-chart-end-month');
    const startDate = document.getElementById('absensi-chart-start-date');
    const endDate = document.getElementById('absensi-chart-end-date');

    if (typeSelect) typeSelect.value = 'all';
    if (startMonth) startMonth.value = '';
    if (endMonth) endMonth.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';

    toggleAbsensiFilterInputs();
}

function updateAbsensiChart() {
    const chartCanvas = document.getElementById('absensiChart');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');

    if (absensiChartInstance) absensiChartInstance.destroy();

    const filterType = document.getElementById('absensi-chart-filter-type')?.value || 'all';
    const startMonth = document.getElementById('absensi-chart-start-month')?.value;
    const endMonth = document.getElementById('absensi-chart-end-month')?.value;
    const startDate = document.getElementById('absensi-chart-start-date')?.value;
    const endDate = document.getElementById('absensi-chart-end-date')?.value;

    const grouped = {};
    const classBreakdown = {
        'Kelas 1': { hadir: 0, tidakHadir: 0 },
        'Kelas 2': { hadir: 0, tidakHadir: 0 },
        'Kelas 3': { hadir: 0, tidakHadir: 0 },
        'Kelas 4': { hadir: 0, tidakHadir: 0 },
        'Kelas 5': { hadir: 0, tidakHadir: 0 }
    };

    // 1. Buat peta kelas dan rentang tanggal aktif siswa dari activeData & activeTurnoverData
    const studentMap = {};
    const allStudents = [...(typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []), ...(typeof activeTurnoverData !== 'undefined' && Array.isArray(activeTurnoverData) ? activeTurnoverData : [])];
    allStudents.forEach(s => {
        const idKey = s.id || s.noreg || s.no_reg;
        if (idKey) {
            studentMap[idKey] = {
                kelas: s.kelas || 'Kelas 1',
                masuk: s.masuk || s.tglMasuk || s.tanggalMasuk || '',
                keluar: s.keluar || s.tanggalKeluar || s.tglKeluar || s.distribusi || ''
            };
        }
    });

    // 2. Agregasi 100% murni dan eksklusif dari data resmi absensi (absensiData) sesuai periode aktif siswa
    const records = (typeof absensiData !== 'undefined' && Array.isArray(absensiData)) ? absensiData : (window.absensiData || []);

    records.forEach(a => {
        if (!a.tanggal) return;

        const st = (a.status || '').toString().trim();
        const stLower = st.toLowerCase();
        
        // Abaikan entri Minggu
        if (st === 'X' || stLower === 'hari minggu' || stLower === 'x') return;

        // Periksa apakah siswa aktif pada tanggal rekaman ini
        const studentInfo = studentMap[a.noreg || a.id || a.siswa_id];
        if (studentInfo) {
            if (studentInfo.masuk && a.tanggal < studentInfo.masuk) return;
            if (studentInfo.keluar && a.tanggal > studentInfo.keluar) return;
        }

        let key = a.tanggal.substring(0, 7); // YYYY-MM
        if (filterType === 'date-range') {
            key = a.tanggal; // YYYY-MM-DD
        }

        if (!grouped[key]) {
            grouped[key] = { hadir: 0, tidakHadir: 0 };
        }

        // Tentukan kelas siswa
        const rawK = a.kelas || (studentInfo ? studentInfo.kelas : 'Kelas 1');
        const num = parseInt(String(rawK).replace(/\D/g, '')) || 1;
        const kKey = (num >= 1 && num <= 5) ? `Kelas ${num}` : (num >= 5 ? 'Kelas 5' : 'Kelas 1');

        if (st === 'Hadir' || stLower === 'hadir' || st === 'H' || stLower === 'h') {
            grouped[key].hadir += 1;
            classBreakdown[kKey].hadir += 1;
        } else if (st === 'Ijin' || stLower === 'ijin' || stLower === 'izin' || st === 'I' ||
                   st === 'Sakit' || stLower === 'sakit' || st === 'S' ||
                   st === 'Alpha' || stLower === 'alpha' || stLower === 'alpa' || st === 'A') {
            grouped[key].tidakHadir += 1;
            classBreakdown[kKey].tidakHadir += 1;
        }
    });

    let sortedKeys = Object.keys(grouped).sort();

    // Filter berdasarkan mode
    if (filterType === 'month-range') {
        if (startMonth || endMonth) {
            sortedKeys = sortedKeys.filter(k => {
                if (startMonth && k < startMonth) return false;
                if (endMonth && k > endMonth) return false;
                return true;
            });
        }
    } else if (filterType === 'date-range') {
        if (startDate || endDate) {
            sortedKeys = sortedKeys.filter(k => {
                if (startDate && k < startDate) return false;
                if (endDate && k > endDate) return false;
                return true;
            });
        }
    }

    // Hindari bulan tanpa data nyata jika ada
    sortedKeys = sortedKeys.filter(k => (grouped[k].hadir + grouped[k].tidakHadir) > 0);

    const monthNamesShort = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const labels = sortedKeys.map(key => {
        if (key.length === 7) {
            const parts = key.split('-');
            const mIdx = parseInt(parts[1], 10) - 1;
            return monthNamesShort[mIdx] || key;
        } else if (key.length === 10) {
            const parts = key.split('-');
            const mIdx = parseInt(parts[1], 10) - 1;
            return `${parseInt(parts[2], 10)} ${monthNamesShort[mIdx] || parts[1]}`;
        }
        return key;
    });

    const totalHadirData = sortedKeys.map(k => grouped[k].hadir);
    const totalTidakHadirData = sortedKeys.map(k => grouped[k].tidakHadir);
    const percentageData = sortedKeys.map(k => {
        const h = grouped[k].hadir;
        const th = grouped[k].tidakHadir;
        const total = h + th;
        return total > 0 ? Math.round((th / total) * 100) : 0;
    });

    const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(234, 179, 8, 0.35)');
    gradient.addColorStop(1, 'rgba(234, 179, 8, 0.00)');

    absensiChartInstance = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Total Kehadiran',
                    data: totalHadirData,
                    backgroundColor: '#6366F1', // Option B: Electric Violet / Indigo
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 2,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#1E293B',
                        font: { family: 'Inter', size: 11, weight: 'bold' }
                    }
                },
                {
                    type: 'bar',
                    label: 'Total Ketidakhadiran (Sakit/Izin/Alpha)',
                    data: totalTidakHadirData,
                    backgroundColor: '#EC4899', // Option B: Bright Pink / Magenta
                    borderRadius: 6,
                    yAxisID: 'y',
                    order: 2,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#1E293B',
                        font: { family: 'Inter', size: 11, weight: 'bold' }
                    }
                },
                {
                    type: 'line',
                    label: 'Persentase Ketidakhadiran',
                    data: percentageData,
                    borderColor: '#EAB308', // Vibrant Amber Yellow line
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#EAB308',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'yPercent',
                    order: 1,
                    datalabels: {
                        anchor: 'center',
                        align: 'right',
                        offset: 8,
                        color: '#1E293B',
                        font: { family: 'Inter', size: 13, weight: 'bold' },
                        formatter: function(value) { return value + '%'; }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 10, family: 'Inter', weight: '600' },
                        color: '#64748B'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0F172A',
                    titleFont: { size: 11, weight: '700' },
                    bodyFont: { size: 10 },
                    padding: 12,
                    borderRadius: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.dataset.type === 'line') {
                                label += context.parsed.y + '%';
                            } else {
                                label += context.parsed.y + ' Siswa';
                            }
                            return label;
                        }
                    }
                },
                datalabels: { display: true }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94A3B8', font: { size: 10 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#F1F5F9' },
                    ticks: { color: '#94A3B8', font: { size: 10 } },
                    grace: '10%',
                    title: {
                        display: true,
                        text: 'Jumlah Siswa',
                        color: '#64748B',
                        font: { size: 10, weight: 'bold' }
                    }
                },
                yPercent: {
                    type: 'linear',
                    display: false,
                    min: 0,
                    max: 50
                }
            }
        }
    });

    // Populate Breakdown Kehadiran per Kelas (Synchronized 100% with absensiData)
    const bdContainer = document.getElementById('absensi-class-breakdown-container');
    if (bdContainer) {
        bdContainer.innerHTML = '';
        ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5'].forEach(clsName => {
            const h = classBreakdown[clsName].hadir;
            const th = classBreakdown[clsName].tidakHadir;
            const total = h + th;
            const rate = total > 0 ? Math.round((h / total) * 100) : 100;

            const badgeBg = rate >= 98 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            rate >= 95 ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                            'bg-amber-50 text-amber-600 border-amber-200';
            
            const barBg = rate >= 98 ? 'bg-emerald-500' : rate >= 95 ? 'bg-indigo-500' : 'bg-amber-500';

            const card = document.createElement('div');
            card.className = 'bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col justify-between space-y-1.5';
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-700">${clsName}</span>
                    <span class="px-1 py-0.5 rounded text-[9px] font-extrabold border ${badgeBg}">${rate}%</span>
                </div>
                <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div class="${barBg} h-full rounded-full transition-all duration-500" style="width: ${rate}%;"></div>
                </div>
                <div class="flex items-center justify-between text-[8px] text-slate-400 font-semibold pt-0.5">
                    <span>Hadir: ${h}</span>
                    <span class="${th > 0 ? 'text-rose-600 font-bold' : ''}">Absen: ${th}</span>
                </div>
            `;
            bdContainer.appendChild(card);
        });
    }
}
