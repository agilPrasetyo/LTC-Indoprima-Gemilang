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

function renderSiswaView() {
    populateBagianFilter();

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
                <div>
                    <p class="text-[11px] font-semibold text-slate-600">${spvLabel}</p>
                    <p class="text-[10px] text-slate-400">Penempatan: ${s.wilayah || '-'} | Asal: ${s.daerahAsal || '-'}</p>
                </div>
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
    document.getElementById('sdm-nilai').innerText = (s.nilai || 0) + '%';
    document.getElementById('sdm-nilai').className = `text-4xl font-extrabold ${perfColor.text}`;
    document.getElementById('sdm-label').innerText = perfColor.label;
    document.getElementById('sdm-label').className = `text-[10px] font-bold px-2.5 py-0.5 rounded-full ${perfColor.badge}`;

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
                                (s.bagian || '').toUpperCase().includes('ADM') || 
                                (s.bagian || '').toUpperCase().includes('ADMINISTRASI') || 
                                (s.bagian || '').toUpperCase().includes('PPIC');

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
            chartDataPoints.push(0);
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
        const gradient = ctx.createLinearGradient(0, 0, 0, 110);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

        sdmChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Performa',
                    data: chartDataPoints,
                    borderColor: '#2563EB',
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2563EB',
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                  return context.parsed.y !== null ? context.parsed.y + '%' : '-';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 8, weight: 'bold' }, color: '#94A3B8' }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 50, font: { size: 8, weight: 'bold' }, color: '#94A3B8', callback: value => value + '%' },
                        grid: { color: '#F1F5F9', borderDash: [2, 2] }
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
                                      (s.bagian || '').toUpperCase().includes('ADM') || 
                                      (s.bagian || '').toUpperCase().includes('ADMINISTRASI') || 
                                      (s.bagian || '').toUpperCase().includes('PPIC');
                
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
                const dow = parsedDate ? (['Min','Sen','Sel','Rab','Kam','Jum','Sab'][parsedDate.getDay()]) : '';
                
                logTbody.innerHTML += `
                    <tr class="border-b border-slate-50">
                        <td class="py-1.5 px-3 text-[10px] text-slate-500 font-mono">${dow} ${rec.dateStr || '-'}</td>
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
        csv += `${i+1},"${s.id || ''}","${s.namaLengkap || ''}","${s.bagian || ''}","${s.wilayah || ''}","${s.daerahAsal || ''}","${getSpvLabel(s)}","${s.kelas || ''}","${s.nilai || 0}%"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performa_siswa_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV berhasil!', 'success');
}
