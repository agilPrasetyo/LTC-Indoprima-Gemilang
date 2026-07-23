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
        if (year === today.getFullYear() && monthIdx === today.getMonth()) {
            evalDate = today;
        }

        const counts = {
            'Kelas 1': 0,
            'Kelas 2': 0,
            'Kelas 3': 0,
            'Kelas 4': 0,
            'Kelas 5': 0
        };

        combinedStudents.forEach(s => {
            const startD = parseDateYYYYMMDD(s.masuk);
            if (!startD || startD > evalDate) return;

            const exitStr = s.tanggalKeluar || s.keluar;
            if (exitStr) {
                const exitD = parseDateYYYYMMDD(exitStr);
                if (exitD && exitD < startOfMonth) return;
            }

            let monthsActive = (evalDate.getFullYear() - startD.getFullYear()) * 12;
            monthsActive -= startD.getMonth();
            monthsActive += evalDate.getMonth();
            if (evalDate.getDate() < startD.getDate()) {
                monthsActive--;
            }

            const classNum = monthsActive + 1;
            if (classNum === 1) counts['Kelas 1']++;
            else if (classNum === 2) counts['Kelas 2']++;
            else if (classNum === 3) counts['Kelas 3']++;
            else if (classNum === 4) counts['Kelas 4']++;
            else if (classNum >= 5) counts['Kelas 5']++;
        });

        classData['Kelas 1'].push(counts['Kelas 1']);
        classData['Kelas 2'].push(counts['Kelas 2']);
        classData['Kelas 3'].push(counts['Kelas 3']);
        classData['Kelas 4'].push(counts['Kelas 4']);
        classData['Kelas 5'].push(counts['Kelas 5']);
    });

    const colorPalette = {
        'Kelas 1': '#D3222A',
        'Kelas 2': '#F5C400',
        'Kelas 3': '#00A651',
        'Kelas 4': '#0072C6',
        'Kelas 5': '#A6A6A6'
    };

    const datasets = Object.keys(classData).map(className => {
        return {
            label: className,
            data: classData[className],
            backgroundColor: colorPalette[className],
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
        const ket = String(item.keterangan || '').trim().toLowerCase();
        if (ket === 'resign') {
            resignCount++;
        } else if (ket === 'lulus') {
            lulusCount++;
        } else if (ket === 'indisipliner') {
            indisiplinerCount++;
        }
    });

    const resignValEl = document.getElementById('stat-turnover-resign-val');
    if (resignValEl) resignValEl.innerText = resignCount + ' Siswa';

    const lulusValEl = document.getElementById('stat-turnover-lulus-val');
    if (lulusValEl) lulusValEl.innerText = lulusCount + ' Siswa';

    const indisValEl = document.getElementById('stat-turnover-indisipliner-val');
    if (indisValEl) indisValEl.innerText = indisiplinerCount + ' Siswa';

    // Set total in the central circle overlay
    const totalTurnover = resignCount + lulusCount + indisiplinerCount;
    const totalCenterEl = document.getElementById('dashboard-turnover-total-center');
    if (totalCenterEl) totalCenterEl.innerText = totalTurnover + ' Siswa';

    turnoverPieChartInstance = new Chart(chartCtx, {
        type: 'doughnut',
        data: {
            labels: ['Resign', 'Lulus', 'Indisipliner'],
            datasets: [{
                data: [resignCount, lulusCount, indisiplinerCount],
                backgroundColor: ['#FBBF24', '#10B981', '#F43F5E'],
                borderWidth: 2,
                borderColor: '#FFFFFF',
                spacing: 6, // Elegant gap between slices
                offset: [8, 0, 0], // Subtle explode on Resign
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#0F172A',
                    padding: 10,
                    borderRadius: 8,
                    titleFont: { size: 11, family: 'Inter', weight: 'bold' },
                    bodyFont: { size: 11, family: 'Inter' }
                },
                datalabels: {
                    display: true,
                    color: '#FFFFFF',
                    font: {
                        family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        size: 13,
                        weight: 'bold'
                    },
                    formatter: function(value, context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        if (percentage === 0) return '';
                        return `${percentage}%`;
                    },
                    textAlign: 'center'
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
    
    const labels = sortedData.map(p => {
        if (p.tanggal && p.tanggal.includes('-')) {
            const parts = p.tanggal.split('-');
            return `${parts[2]}/${parts[1]}`;
        }
        return p.tanggal;
    });

    const totalKaryawanData = sortedData.map(p => p.totalKaryawan);
    const totalLtcData = sortedData.map(p => p.totalLtc);
    const ltcPercentageData = sortedData.map(p => {
        return p.totalKaryawan > 0 ? Math.round((p.totalLtc / p.totalKaryawan) * 100) : 0;
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
