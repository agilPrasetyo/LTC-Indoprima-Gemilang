// ============================================
// SAFETY & K3 MODULE (KECELAKAAN KERJA)
// ============================================

var safetyTrendChartInstance = null;
var safetyDistChartInstance = null;

function renderSafetyView() {
    populateSafetySiswaDropdown();
    filterSafetyTable();
    updateSafetyKPIStats();
    updateSafetyCharts();
}

function populateSafetySiswaDropdown() {
    const select = document.getElementById('safety-form-siswa');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Pilih Siswa --</option>';

    const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
        ? rawSiswaData
        : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

    if (studentList.length > 0) {
        const sortedSiswa = [...studentList].sort((a, b) => (a.namaLengkap || a.nama || '').localeCompare(b.namaLengkap || b.nama || ''));
        sortedSiswa.forEach(s => {
            const noreg = s.id || s.noreg;
            const nama = s.namaLengkap || s.nama;
            const kelas = s.kelas || '-';
            const opt = document.createElement('option');
            opt.value = noreg;
            opt.textContent = `${noreg} - ${nama} (${kelas})`;
            select.appendChild(opt);
        });
    }

    if (currentVal) select.value = currentVal;
}

function autoFillSafetySiswaInfo() {
    const select = document.getElementById('safety-form-siswa');
    const kelasInput = document.getElementById('safety-form-kelas');
    const bagianInput = document.getElementById('safety-form-bagian');
    if (!select) return;

    const noreg = select.value;
    const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
        ? rawSiswaData
        : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

    if (!noreg || studentList.length === 0) {
        if (kelasInput) kelasInput.value = '';
        if (bagianInput) bagianInput.value = '';
        return;
    }

    const siswa = studentList.find(s => (s.id || s.noreg) === noreg);
    if (siswa) {
        if (kelasInput) kelasInput.value = siswa.kelas || '-';
        if (bagianInput) bagianInput.value = siswa.departemen || siswa.bagian || siswa.section || '-';
    }
}

function updateSafetyKPIStats() {
    const totalEl = document.getElementById('stat-safety-total');
    const zeroDaysEl = document.getElementById('stat-safety-zero-days');
    const thisMonthEl = document.getElementById('stat-safety-this-month');

    if (!totalEl || !zeroDaysEl || !thisMonthEl) return;

    const totalCount = safetyData.length;
    totalEl.textContent = totalCount;

    // Hitung Insiden Bulan Ini
    const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    const thisMonthCount = safetyData.filter(s => s.tanggal && s.tanggal.substring(0, 7) === currentMonthKey).length;
    thisMonthEl.textContent = thisMonthCount;

    // Hitung Zero Accident Days (Hari Bebas Kecelakaan sejak insiden terakhir)
    if (totalCount === 0) {
        zeroDaysEl.textContent = '365+ Hari';
    } else {
        const dates = safetyData.map(s => new Date(s.tanggal)).filter(d => !isNaN(d));
        if (dates.length === 0) {
            zeroDaysEl.textContent = '365+ Hari';
        } else {
            const latestDate = new Date(Math.max(...dates));
            const today = new Date();
            const diffTime = Math.abs(today - latestDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            zeroDaysEl.textContent = `${diffDays} Hari`;
        }
    }
}

function filterSafetyTable() {
    const tbody = document.getElementById('safety-tbody');
    const badge = document.getElementById('safety-table-info-badge');
    if (!tbody) return;

    const searchVal = (document.getElementById('safety-search-input')?.value || '').toLowerCase().trim();
    const kelasVal = (document.getElementById('safety-filter-kelas')?.value || '').toLowerCase().trim();
    const bagianVal = (document.getElementById('safety-filter-bagian')?.value || '').toLowerCase().trim();
    const kategoriVal = (document.getElementById('safety-filter-kategori')?.value || '').toLowerCase().trim();

    let filtered = [...safetyData];

    if (searchVal) {
        filtered = filtered.filter(item => {
            const noreg = (item.noreg || '').toLowerCase();
            const nama = (item.nama || '').toLowerCase();
            const spv = (item.spv || '').toLowerCase();
            const jenis = (item.jenisKecelakaan || '').toLowerCase();
            const ket = (item.keterangan || '').toLowerCase();
            return noreg.includes(searchVal) || nama.includes(searchVal) || spv.includes(searchVal) || jenis.includes(searchVal) || ket.includes(searchVal);
        });
    }

    if (kelasVal) {
        filtered = filtered.filter(item => (item.kelas || '').toLowerCase() === kelasVal);
    }

    if (bagianVal) {
        filtered = filtered.filter(item => (item.bagian || '').toLowerCase().includes(bagianVal));
    }

    if (kategoriVal) {
        filtered = filtered.filter(item => (item.kategori || '').toLowerCase().includes(kategoriVal));
    }

    // Urutkan berdasarkan tanggal terbaru
    filtered.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    if (badge) {
        badge.textContent = `Menampilkan ${filtered.length} dari ${safetyData.length} Record`;
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="py-8 text-center text-slate-400 italic">
                    Tidak ada data kecelakaan kerja yang sesuai dengan filter.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/70 transition-colors text-xs";

        let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
        const kat = (item.kategori || '').toLowerCase();
        if (kat.includes('near') || kat.includes('hampir')) {
            badgeClass = "bg-amber-50 text-amber-600 border-amber-200";
        } else if (kat.includes('ringan') || kat.includes('first')) {
            badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
        } else if (kat.includes('sedang')) {
            badgeClass = "bg-orange-50 text-orange-600 border-orange-200";
        } else if (kat.includes('berat') || kat.includes('lost')) {
            badgeClass = "bg-rose-50 text-rose-600 border-rose-200";
        }

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-600">${item.tanggal || '-'}</td>
            <td class="py-3 px-4 font-bold text-brand-blue">${item.noreg || '-'}</td>
            <td class="py-3 px-4 font-extrabold text-brand-textMain">${item.nama || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-600">${item.kelas || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-600">${item.bagian || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-600">${item.spv || '-'}</td>
            <td class="py-3 px-4 font-extrabold text-slate-800">${item.jenisKecelakaan || '-'}</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeClass}">
                    ${item.kategori || 'Ringan'}
                </span>
            </td>
            <td class="py-3 px-4 text-brand-textSub max-w-xs truncate" title="${item.keterangan || '-'}">${item.keterangan || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAdminSafetyTable() {
    const tbody = document.getElementById('admin-safety-tbody');
    if (!tbody) return;

    const searchVal = (document.getElementById('admin-safety-search-input')?.value || '').toLowerCase().trim();
    const kelasVal = (document.getElementById('admin-safety-filter-kelas')?.value || '').toLowerCase().trim();
    const bagianVal = (document.getElementById('admin-safety-filter-bagian')?.value || '').toLowerCase().trim();
    const kategoriVal = (document.getElementById('admin-safety-filter-kategori')?.value || '').toLowerCase().trim();

    let filtered = [...safetyData];

    if (searchVal) {
        filtered = filtered.filter(item => {
            const noreg = (item.noreg || '').toLowerCase();
            const nama = (item.nama || '').toLowerCase();
            const spv = (item.spv || '').toLowerCase();
            const jenis = (item.jenisKecelakaan || '').toLowerCase();
            const ket = (item.keterangan || '').toLowerCase();
            return noreg.includes(searchVal) || nama.includes(searchVal) || spv.includes(searchVal) || jenis.includes(searchVal) || ket.includes(searchVal);
        });
    }

    if (kelasVal) {
        filtered = filtered.filter(item => (item.kelas || '').toLowerCase() === kelasVal);
    }

    if (bagianVal) {
        filtered = filtered.filter(item => (item.bagian || '').toLowerCase().includes(bagianVal));
    }

    if (kategoriVal) {
        filtered = filtered.filter(item => (item.kategori || '').toLowerCase().includes(kategoriVal));
    }

    filtered.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-8 text-center text-slate-400 italic">
                    Tidak ada data kecelakaan kerja yang sesuai dengan filter.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/70 transition-colors text-xs";

        let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
        const kat = (item.kategori || '').toLowerCase();
        if (kat.includes('near') || kat.includes('hampir')) {
            badgeClass = "bg-amber-50 text-amber-600 border-amber-200";
        } else if (kat.includes('ringan') || kat.includes('first')) {
            badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
        } else if (kat.includes('sedang')) {
            badgeClass = "bg-orange-50 text-orange-600 border-orange-200";
        } else if (kat.includes('berat') || kat.includes('lost')) {
            badgeClass = "bg-rose-50 text-rose-600 border-rose-200";
        }

        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-slate-600">${item.tanggal || '-'}</td>
            <td class="py-3 px-4 font-bold text-brand-blue">${item.noreg || '-'}</td>
            <td class="py-3 px-4 font-extrabold text-brand-textMain">${item.nama || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-600">${item.kelas || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-600">${item.bagian || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-600">${item.spv || '-'}</td>
            <td class="py-3 px-4 font-extrabold text-slate-800">${item.jenisKecelakaan || '-'}</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeClass}">
                    ${item.kategori || 'Ringan'}
                </span>
            </td>
            <td class="py-3 px-4 text-brand-textSub max-w-xs truncate" title="${item.keterangan || '-'}">${item.keterangan || '-'}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="editSafetyRecord(${item.id})" class="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deleteSafetyRecord(${item.id})" class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleSafetyFilterInputs() {
    const filterType = document.getElementById('safety-chart-filter-type')?.value || 'all';
    const monthContainer = document.getElementById('safety-month-range-container');
    const dateContainer = document.getElementById('safety-date-range-container');

    if (monthContainer) {
        if (filterType === 'month-range') monthContainer.classList.remove('hidden');
        else monthContainer.classList.add('hidden');
    }

    if (dateContainer) {
        if (filterType === 'date-range') dateContainer.classList.remove('hidden');
        else dateContainer.classList.add('hidden');
    }

    updateSafetyCharts();
}

function resetSafetyChartFilter() {
    const typeSelect = document.getElementById('safety-chart-filter-type');
    const startMonth = document.getElementById('safety-chart-start-month');
    const endMonth = document.getElementById('safety-chart-end-month');
    const startDate = document.getElementById('safety-chart-start-date');
    const endDate = document.getElementById('safety-chart-end-date');

    if (typeSelect) typeSelect.value = 'all';
    if (startMonth) startMonth.value = '';
    if (endMonth) endMonth.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';

    toggleSafetyFilterInputs();
}

function updateSafetyCharts() {
    const trendCanvas = document.getElementById('safetyTrendChart');
    const distCanvas = document.getElementById('safetyDistributionChart');
    if (!trendCanvas || !distCanvas) return;

    if (safetyTrendChartInstance) safetyTrendChartInstance.destroy();
    if (safetyDistChartInstance) safetyDistChartInstance.destroy();

    const filterType = document.getElementById('safety-chart-filter-type')?.value || 'all';
    const startMonth = document.getElementById('safety-chart-start-month')?.value;
    const endMonth = document.getElementById('safety-chart-end-month')?.value;
    const startDate = document.getElementById('safety-chart-start-date')?.value;
    const endDate = document.getElementById('safety-chart-end-date')?.value;

    let filtered = [...safetyData];

    if (filterType === 'month-range') {
        if (startMonth || endMonth) {
            filtered = filtered.filter(item => {
                if (!item.tanggal) return false;
                const m = item.tanggal.substring(0, 7);
                if (startMonth && m < startMonth) return false;
                if (endMonth && m > endMonth) return false;
                return true;
            });
        }
    } else if (filterType === 'date-range') {
        if (startDate || endDate) {
            filtered = filtered.filter(item => {
                if (!item.tanggal) return false;
                if (startDate && item.tanggal < startDate) return false;
                if (endDate && item.tanggal > endDate) return false;
                return true;
            });
        }
    }

    // 1. Group Data for Trend Chart
    const trendGroup = {};
    filtered.forEach(item => {
        if (!item.tanggal) return;
        let key = item.tanggal.substring(0, 7);
        if (filterType === 'date-range') key = item.tanggal;
        trendGroup[key] = (trendGroup[key] || 0) + 1;
    });

    let sortedKeys = Object.keys(trendGroup).sort();

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

    const trendValues = sortedKeys.map(k => trendGroup[k]);

    // Render Trend Chart
    const trendCtx = trendCanvas.getContext('2d');
    safetyTrendChartInstance = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Belum Ada Data'],
            datasets: [
                {
                    type: 'bar',
                    label: 'Jumlah Insiden',
                    data: trendValues.length > 0 ? trendValues : [0],
                    backgroundColor: '#EF4444',
                    borderRadius: 6,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Tren Akselerasi Insiden',
                    data: trendValues.length > 0 ? trendValues : [0],
                    borderColor: '#0F3A8C',
                    borderWidth: 2.5,
                    tension: 0.3,
                    fill: false,
                    pointBackgroundColor: '#0F3A8C',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 10, family: 'Inter', weight: '600' } } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }
            }
        }
    });

    // 2. Group Data for Category Distribution Donut Chart
    const distGroup = { 'Near Miss': 0, 'Ringan': 0, 'Sedang': 0, 'Berat': 0 };
    filtered.forEach(item => {
        const kat = item.kategori || 'Ringan';
        if (kat.includes('Near') || kat.includes('Hampir')) distGroup['Near Miss']++;
        else if (kat.includes('Ringan') || kat.includes('First')) distGroup['Ringan']++;
        else if (kat.includes('Sedang')) distGroup['Sedang']++;
        else if (kat.includes('Berat')) distGroup['Berat']++;
        else distGroup['Ringan']++;
    });

    const distCtx = distCanvas.getContext('2d');
    safetyDistChartInstance = new Chart(distCtx, {
        type: 'doughnut',
        data: {
            labels: ['Near Miss', 'Ringan', 'Sedang', 'Berat'],
            datasets: [{
                data: [distGroup['Near Miss'], distGroup['Ringan'], distGroup['Sedang'], distGroup['Berat']],
                backgroundColor: ['#F59E0B', '#3B82F6', '#F97316', '#EF4444'],
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10, family: 'Inter', weight: '600' } } }
            }
        }
    });
}

function openSafetyModal(idToEdit = null) {
    const modal = document.getElementById('safety-modal');
    const title = document.getElementById('safety-modal-title');
    const formId = document.getElementById('safety-form-id');
    const siswaSelect = document.getElementById('safety-form-siswa');
    const tanggalInput = document.getElementById('safety-form-tanggal');
    const kelasInput = document.getElementById('safety-form-kelas');
    const bagianInput = document.getElementById('safety-form-bagian');
    const spvInput = document.getElementById('safety-form-spv');
    const jenisInput = document.getElementById('safety-form-jenis');
    const kategoriSelect = document.getElementById('safety-form-kategori');
    const ketTextarea = document.getElementById('safety-form-keterangan');

    if (!modal) return;

    populateSafetySiswaDropdown();

    if (idToEdit) {
        const record = safetyData.find(s => s.id === idToEdit);
        if (record) {
            title.textContent = 'Edit Data Kecelakaan Kerja';
            formId.value = record.id;
            if (siswaSelect) siswaSelect.value = record.noreg;
            if (tanggalInput) tanggalInput.value = record.tanggal;
            if (kelasInput) kelasInput.value = record.kelas || '';
            if (bagianInput) bagianInput.value = record.bagian || '';
            if (spvInput) spvInput.value = record.spv || '';
            if (jenisInput) jenisInput.value = record.jenisKecelakaan || '';
            if (kategoriSelect) kategoriSelect.value = record.kategori || 'Ringan';
            if (ketTextarea) ketTextarea.value = record.keterangan || '';
        }
    } else {
        title.textContent = 'Tambah Insiden Safety';
        formId.value = '';
        if (siswaSelect) siswaSelect.value = '';
        if (tanggalInput) tanggalInput.value = new Date().toISOString().substring(0, 10);
        if (kelasInput) kelasInput.value = '';
        if (bagianInput) bagianInput.value = '';
        if (spvInput) spvInput.value = '';
        if (jenisInput) jenisInput.value = '';
        if (kategoriSelect) kategoriSelect.value = 'Ringan';
        if (ketTextarea) ketTextarea.value = '';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeSafetyModal() {
    const modal = document.getElementById('safety-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function editSafetyRecord(id) {
    openSafetyModal(id);
}

function saveSafetyData() {
    const formId = document.getElementById('safety-form-id')?.value;
    const noreg = document.getElementById('safety-form-siswa')?.value;
    const tanggal = document.getElementById('safety-form-tanggal')?.value;
    const kelas = document.getElementById('safety-form-kelas')?.value;
    const bagian = document.getElementById('safety-form-bagian')?.value;
    const spv = document.getElementById('safety-form-spv')?.value;
    const jenis = document.getElementById('safety-form-jenis')?.value;
    const kategori = document.getElementById('safety-form-kategori')?.value;
    const ket = document.getElementById('safety-form-keterangan')?.value;

    if (!noreg) {
        showToast('Pilih Siswa / Peserta LTC terlebih dahulu.', 'error');
        return;
    }
    if (!tanggal) {
        showToast('Tanggal kejadian wajib diisi.', 'error');
        return;
    }
    if (!jenis) {
        showToast('Jenis kecelakaan kerja wajib diisi.', 'error');
        return;
    }

    const siswaObj = rawSiswaData ? rawSiswaData.find(s => (s.id || s.noreg) === noreg) : null;
    const namaSiswa = siswaObj ? (siswaObj.namaLengkap || siswaObj.nama) : noreg;

    const payload = {
        id: formId ? parseInt(formId) : null,
        noreg,
        nama: namaSiswa,
        kelas,
        bagian,
        spv,
        jenisKecelakaan: jenis,
        kategori,
        tanggal,
        keterangan: ket
    };

    const submitBtn = document.getElementById('safety-modal-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    executeGASCall('saveSafetyRecord', [payload], function(res) {
        if (submitBtn) submitBtn.disabled = false;

        if (res && res.success) {
            showToast('Data Kecelakaan Kerja berhasil disimpan!');
            closeSafetyModal();
            loadDashboardData();
        } else {
            showToast('Gagal menyimpan data safety: ' + (res ? res.message : 'Unknown error'), 'error');
        }
    });
}

function deleteSafetyRecord(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan kecelakaan kerja ini?')) return;

    executeGASCall('deleteSafetyRecord', [id], function(res) {
        if (res && res.success) {
            showToast('Data Safety berhasil dihapus!');
            loadDashboardData();
        } else {
            showToast('Gagal menghapus data safety: ' + (res ? res.message : 'Unknown error'), 'error');
        }
    });
}

// Attach globals for inline HTML event handlers
window.renderSafetyView = renderSafetyView;
window.filterSafetyTable = filterSafetyTable;
window.filterAdminSafetyTable = filterAdminSafetyTable;
window.toggleSafetyFilterInputs = toggleSafetyFilterInputs;
window.resetSafetyChartFilter = resetSafetyChartFilter;
window.updateSafetyCharts = updateSafetyCharts;
window.openSafetyModal = openSafetyModal;
window.closeSafetyModal = closeSafetyModal;
window.autoFillSafetySiswaInfo = autoFillSafetySiswaInfo;
window.editSafetyRecord = editSafetyRecord;
window.saveSafetyData = saveSafetyData;
window.deleteSafetyRecord = deleteSafetyRecord;
