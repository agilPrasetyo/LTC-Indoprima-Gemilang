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
    setTimeout(() => {
        updateSafetyCharts();
    }, 60);
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
        if (bagianInput) bagianInput.value = siswa.section || siswa.bagian || siswa.departemen || '-';
    }
}

function getSafetyDataset() {
    if (typeof safetyData !== 'undefined' && Array.isArray(safetyData) && safetyData.length > 0) {
        return safetyData;
    }
    if (typeof window.safetyData !== 'undefined' && Array.isArray(window.safetyData) && window.safetyData.length > 0) {
        return window.safetyData;
    }
    if (typeof fallbackStats !== 'undefined' && Array.isArray(fallbackStats.safety) && fallbackStats.safety.length > 0) {
        return fallbackStats.safety;
    }
    if (typeof window.fallbackStats !== 'undefined' && Array.isArray(window.fallbackStats.safety) && window.fallbackStats.safety.length > 0) {
        return window.fallbackStats.safety;
    }
    return [];
}

function updateSafetyKPIStats() {
    const totalEl = document.getElementById('stat-safety-total');
    const zeroDaysEl = document.getElementById('stat-safety-zero-days');
    const thisMonthEl = document.getElementById('stat-safety-this-month');

    if (!totalEl || !zeroDaysEl || !thisMonthEl) return;

    const data = getSafetyDataset();
    const totalCount = data.length;
    totalEl.textContent = totalCount;

    // Hitung Insiden Bulan Ini
    const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    const thisMonthCount = data.filter(s => s.tanggal && s.tanggal.substring(0, 7) === currentMonthKey).length;
    thisMonthEl.textContent = thisMonthCount;

    // Hitung Zero Accident Days (Hari Bebas Kecelakaan sejak insiden terakhir)
    if (totalCount === 0) {
        zeroDaysEl.textContent = '365+ Hari';
    } else {
        const dates = data.map(s => new Date(s.tanggal)).filter(d => !isNaN(d));
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

function formatSafetyDate(dStr) {
    if (!dStr) return '-';
    try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const mIdx = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return `${day} ${months[mIdx] || parts[1]} ${parts[0]}`;
        }
        return dStr;
    } catch(e) {
        return dStr;
    }
}

function normalizeSafetyCategory(kat) {
    if (!kat) return 'FA';
    const k = String(kat).trim().toUpperCase();
    if (k === 'FA' || k.includes('RINGAN') || k.includes('FIRST')) return 'FA';
    if (k === 'MTI' || k.includes('SEDANG') || k.includes('MEDICAL')) return 'MTI';
    if (k === 'TA' || k.includes('BERAT') || k.includes('LOST') || k.includes('NEAR') || k.includes('HAMPIR') || k.includes('TOTAL')) return 'TA';
    if (k === 'FATALITY' || k.includes('FATAL') || k.includes('MATI')) return 'Fatality';
    return kat;
}

function getSafetyCategoryBadge(rawKat) {
    const kat = normalizeSafetyCategory(rawKat);
    if (kat === 'FA') {
        return {
            label: 'FA',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dotClass: 'bg-emerald-500'
        };
    } else if (kat === 'MTI') {
        return {
            label: 'MTI',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
            dotClass: 'bg-blue-500'
        };
    } else if (kat === 'TA') {
        return {
            label: 'TA',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            dotClass: 'bg-amber-500'
        };
    } else if (kat === 'Fatality') {
        return {
            label: 'Fatality',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            dotClass: 'bg-rose-500'
        };
    }
    return {
        label: kat,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500'
    };
}

function openSafetyDetailModal(id, noreg) {
    const modal = document.getElementById('safety-detail-modal');
    if (!modal) return;

    const data = getSafetyDataset();
    let record = null;
    if (id) {
        record = data.find(s => String(s.id) === String(id));
    }
    if (!record && noreg) {
        record = data.find(s => String(s.noreg) === String(noreg));
    }
    if (!record) return;

    const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
        ? rawSiswaData
        : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

    const matchSiswa = studentList.find(s => String(s.id || s.noreg || s.nomorRegistrasi) === String(record.noreg));
    const syncedSection = (matchSiswa && (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen)) 
        ? (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen) 
        : (record.section || record.bagian || '-');
    const syncedKelas = (matchSiswa && matchSiswa.kelas) 
        ? matchSiswa.kelas 
        : (record.kelas || '-');

    const nama = record.nama || (matchSiswa && (matchSiswa.namaLengkap || matchSiswa.nama)) || '-';
    const noregVal = record.noreg || '-';
    const spv = record.spv || '-';
    const jenis = record.jenisKecelakaan || '-';
    const kat = normalizeSafetyCategory(record.kategori || 'FA');
    const ket = record.keterangan || 'Tidak ada catatan tambahan.';

    // Avatar Initials
    const initials = nama.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'K3';
    const avatarEl = document.getElementById('safety-detail-avatar');
    if (avatarEl) avatarEl.textContent = initials;

    const namaEl = document.getElementById('safety-detail-nama');
    if (namaEl) namaEl.textContent = nama;
    const noregEl = document.getElementById('safety-detail-noreg');
    if (noregEl) noregEl.textContent = `NoReg: ${noregVal}`;
    const kelasEl = document.getElementById('safety-detail-kelas');
    if (kelasEl) kelasEl.textContent = syncedKelas;
    const sectionEl = document.getElementById('safety-detail-section');
    if (sectionEl) sectionEl.textContent = syncedSection;
    const spvEl = document.getElementById('safety-detail-spv');
    if (spvEl) spvEl.textContent = spv;
    const tanggalEl = document.getElementById('safety-detail-tanggal');
    if (tanggalEl) tanggalEl.innerHTML = `<i class="fa-regular fa-calendar text-slate-400"></i> ${formatSafetyDate(record.tanggal)}`;
    const jenisEl = document.getElementById('safety-detail-jenis');
    if (jenisEl) jenisEl.textContent = jenis;
    const ketEl = document.getElementById('safety-detail-keterangan');
    if (ketEl) ketEl.textContent = ket;

    const badgeInfo = getSafetyCategoryBadge(kat);
    const badgeEl = document.getElementById('safety-detail-kategori-badge');
    const textEl = document.getElementById('safety-detail-kategori-text');
    if (badgeEl) {
        badgeEl.className = `px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.badgeClass}`;
        badgeEl.textContent = badgeInfo.label;
    }
    if (textEl) textEl.textContent = badgeInfo.label;

    modal.classList.remove('hidden');
}

function closeSafetyDetailModal() {
    const modal = document.getElementById('safety-detail-modal');
    if (modal) modal.classList.add('hidden');
}

function filterSafetyTable() {
    const tbody = document.getElementById('safety-tbody');
    const badge = document.getElementById('safety-table-info-badge');
    if (!tbody) return;

    const searchVal = (document.getElementById('safety-search-input')?.value || '').toLowerCase().trim();
    const kelasVal = (document.getElementById('safety-filter-kelas')?.value || '').toLowerCase().trim();
    const bagianVal = (document.getElementById('safety-filter-bagian')?.value || '').toLowerCase().trim();
    const kategoriVal = (document.getElementById('safety-filter-kategori')?.value || '').toLowerCase().trim();

    const data = getSafetyDataset();
    let filtered = [...data];

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
        filtered = filtered.filter(item => {
            const itemNorm = normalizeSafetyCategory(item.kategori).toLowerCase();
            return itemNorm === kategoriVal || itemNorm.includes(kategoriVal) || (item.kategori || '').toLowerCase().includes(kategoriVal);
        });
    }

    filtered.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    if (badge) {
        badge.textContent = `Menampilkan ${filtered.length} dari ${data.length} Record`;
    }

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-slate-400 italic">
                    Tidak ada data kecelakaan kerja yang sesuai dengan filter.
                </td>
            </tr>
        `;
        return;
    }

    const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
        ? rawSiswaData
        : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors text-xs";

        const matchSiswa = studentList.find(s => String(s.id || s.noreg || s.nomorRegistrasi) === String(item.noreg));
        const syncedSection = (matchSiswa && (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen)) 
            ? (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen) 
            : (item.section || item.bagian || '-');
        const syncedKelas = (matchSiswa && matchSiswa.kelas) 
            ? matchSiswa.kelas 
            : (item.kelas || '-');

        const badgeInfo = getSafetyCategoryBadge(item.kategori);
        const safeId = item.id || '';
        const safeNoReg = item.noreg || '';

        tr.innerHTML = `
            <td class="py-3 px-3.5 whitespace-nowrap font-bold text-slate-700">
                <span class="flex items-center gap-1.5">
                    <i class="fa-regular fa-calendar text-slate-400 text-[11px]"></i>
                    ${formatSafetyDate(item.tanggal)}
                </span>
            </td>
            <td class="py-3 px-3.5 min-w-[150px]">
                <div class="font-bold text-slate-800 text-xs">${item.nama || '-'}</div>
                <div class="text-[10.5px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span class="text-blue-600 font-bold">${item.noreg || '-'}</span>
                    <span class="text-slate-300">•</span>
                    <span class="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9.5px] font-bold border border-slate-200/60">${syncedKelas}</span>
                </div>
            </td>
            <td class="py-3 px-3.5 min-w-[130px]">
                <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                    <span>${syncedSection}</span>
                </div>
                <div class="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                    <i class="fa-solid fa-user-tie text-[9.5px] text-slate-400"></i>
                    <span>${item.spv || '-'}</span>
                </div>
            </td>
            <td class="py-3 px-3.5 min-w-[240px] max-w-[320px] font-bold text-slate-700 text-xs leading-relaxed">
                ${item.jenisKecelakaan || '-'}
            </td>
            <td class="py-3 px-3 whitespace-nowrap min-w-[110px]">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap inline-flex items-center gap-1.5 ${badgeInfo.badgeClass}">
                    <span class="w-1.5 h-1.5 rounded-full ${badgeInfo.dotClass}"></span>
                    ${badgeInfo.label}
                </span>
            </td>
            <td class="py-3 px-3 text-slate-500 max-w-[160px] lg:max-w-[180px] truncate text-xs font-normal" title="${item.keterangan || '-'}">
                ${item.keterangan || '-'}
            </td>
            <td class="py-3 px-4 text-center whitespace-nowrap min-w-[85px]">
                <button type="button" onclick="openSafetyDetailModal('${safeId}', '${safeNoReg}')"
                    class="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto shadow-xs group cursor-pointer" title="Lihat Kronologi Lengkap">
                    <i class="fa-solid fa-eye text-[11px] group-hover:scale-110 transition-transform"></i>
                    <span>Detail</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let safetyCurrentPage = 1;
const SAFETY_PAGE_SIZE = 25;

function filterAdminSafetyTable(resetPage = false) {
    if (resetPage === true) {
        safetyCurrentPage = 1;
    }
    const tbody = document.getElementById('admin-safety-tbody');
    if (!tbody) return;

    const searchVal = (document.getElementById('admin-safety-search-input')?.value || '').toLowerCase().trim();
    const kelasVal = (document.getElementById('admin-safety-filter-kelas')?.value || '').toLowerCase().trim();
    const bagianVal = (document.getElementById('admin-safety-filter-bagian')?.value || '').toLowerCase().trim();
    const kategoriVal = (document.getElementById('admin-safety-filter-kategori')?.value || '').toLowerCase().trim();

    const data = getSafetyDataset();
    let filtered = [...data];

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
        filtered = filtered.filter(item => {
            const itemNorm = normalizeSafetyCategory(item.kategori).toLowerCase();
            return itemNorm === kategoriVal || itemNorm.includes(kategoriVal) || (item.kategori || '').toLowerCase().includes(kategoriVal);
        });
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
        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'safety-pagination-info',
                controlsId: 'safety-pagination-controls',
                currentPage: 1,
                totalItems: 0,
                pageSize: SAFETY_PAGE_SIZE,
                goToPageFn: 'goToSafetyPage',
                itemLabel: 'insiden',
                themeColor: '#0B3B82'
            });
        }
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / SAFETY_PAGE_SIZE));
    if (safetyCurrentPage > totalPages) safetyCurrentPage = totalPages;
    if (safetyCurrentPage < 1) safetyCurrentPage = 1;

    const startIndex = (safetyCurrentPage - 1) * SAFETY_PAGE_SIZE;
    const endIndex = Math.min(startIndex + SAFETY_PAGE_SIZE, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
        ? rawSiswaData
        : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

    pageItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "group hover:bg-slate-50/50 transition-all-300 border-b border-slate-50 text-xs font-semibold";

        const matchSiswa = studentList.find(s => String(s.id || s.noreg || s.nomorRegistrasi) === String(item.noreg));
        const syncedSection = (matchSiswa && (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen)) 
            ? (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen) 
            : (item.section || item.bagian || '-');
        const syncedKelas = (matchSiswa && matchSiswa.kelas) 
            ? matchSiswa.kelas 
            : (item.kelas || '-');

        const badgeInfo = getSafetyCategoryBadge(item.kategori);

        tr.innerHTML = `
            <td class="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">${item.tanggal || '-'}</td>
            <td class="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">${item.noreg || '-'}</td>
            <td class="py-2.5 px-3.5 font-bold text-brand-textMain whitespace-nowrap">${item.nama || '-'}</td>
            <td class="py-2.5 px-3 whitespace-nowrap min-w-[95px] text-slate-600 font-semibold">${syncedKelas}</td>
            <td class="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">${syncedSection}</td>
            <td class="py-2.5 px-3 text-slate-600 whitespace-nowrap">${item.spv || '-'}</td>
            <td class="py-2.5 px-3 font-bold text-slate-700 min-w-[240px] max-w-[320px] leading-relaxed">${item.jenisKecelakaan || '-'}</td>
            <td class="py-2.5 px-3 whitespace-nowrap min-w-[110px]">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap inline-flex items-center gap-1.5 ${badgeInfo.badgeClass}">
                    <span class="w-1.5 h-1.5 rounded-full ${badgeInfo.dotClass}"></span>
                    ${badgeInfo.label}
                </span>
            </td>
            <td class="py-2.5 px-3 text-brand-textSub max-w-xs truncate font-normal" title="${item.keterangan || '-'}">${item.keterangan || '-'}</td>
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="editSafetyRecord(${item.id})" class="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300 flex items-center gap-1">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deleteSafetyRecord(${item.id})" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300 flex items-center gap-1">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (typeof renderPaginationUI === 'function') {
        renderPaginationUI({
            infoId: 'safety-pagination-info',
            controlsId: 'safety-pagination-controls',
            currentPage: safetyCurrentPage,
            totalItems: totalItems,
            pageSize: SAFETY_PAGE_SIZE,
            goToPageFn: 'goToSafetyPage',
            itemLabel: 'insiden',
            themeColor: '#0B3B82'
        });
    }
}

function goToSafetyPage(page) {
    safetyCurrentPage = page;
    filterAdminSafetyTable(false);
    const scrollContainer = document.querySelector('#admin-tab-kelola-k3 .overflow-x-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
}
window.goToSafetyPage = goToSafetyPage;
window.filterAdminSafetyTable = filterAdminSafetyTable;

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

var currentSafetyDistTab = 'kategori';

function switchSafetyDistTab(tab) {
    currentSafetyDistTab = tab;
    const btnKategori = document.getElementById('tab-dist-kategori');
    const btnBagian = document.getElementById('tab-dist-bagian');
    const subtitle = document.getElementById('safety-dist-subtitle');

    if (tab === 'kategori') {
        if (btnKategori) {
            btnKategori.className = 'px-2.5 py-1 rounded-lg transition-all bg-white text-blue-700 shadow-xs font-bold';
        }
        if (btnBagian) {
            btnBagian.className = 'px-2.5 py-1 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-medium';
        }
        if (subtitle) subtitle.textContent = 'Proporsi per tingkat keparahan';
    } else {
        if (btnBagian) {
            btnBagian.className = 'px-2.5 py-1 rounded-lg transition-all bg-white text-blue-700 shadow-xs font-bold';
        }
        if (btnKategori) {
            btnKategori.className = 'px-2.5 py-1 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-medium';
        }
        if (subtitle) subtitle.textContent = 'Proporsi insiden per bagian kerja';
    }

    updateSafetyCharts();
}

function updateSafetyCharts() {
    const trendCanvas = document.getElementById('safetyTrendChart');
    const distCanvas = document.getElementById('safetyDistributionChart');
    const badgeTotal = document.getElementById('safety-trend-badge-total');
    const centerVal = document.getElementById('safety-donut-center-val');
    const centerLabel = document.getElementById('safety-donut-center-label');
    const breakdownList = document.getElementById('safety-dist-breakdown-list');

    if (!trendCanvas || !distCanvas) return;

    if (safetyTrendChartInstance) safetyTrendChartInstance.destroy();
    if (safetyDistChartInstance) safetyDistChartInstance.destroy();

    const filterType = document.getElementById('safety-chart-filter-type')?.value || 'all';
    const startMonth = document.getElementById('safety-chart-start-month')?.value;
    const endMonth = document.getElementById('safety-chart-end-month')?.value;
    const startDate = document.getElementById('safety-chart-start-date')?.value;
    const endDate = document.getElementById('safety-chart-end-date')?.value;

    let filtered = [...getSafetyDataset()];

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

    if (badgeTotal) {
        badgeTotal.textContent = `${filtered.length} Kasus`;
    }
    const execTotalNum = document.getElementById('safety-executive-total-num');
    const execTotalLabel = document.getElementById('safety-executive-total-label');
    if (execTotalNum) execTotalNum.textContent = filtered.length;
    if (execTotalLabel) execTotalLabel.textContent = filtered.length > 0 ? 'Kasus Insiden' : 'Nihil Insiden';

    // ========================================================
    // 1. TREN INSIDEN PER PERIODE (STACKED SEVERITY + LINE)
    // ========================================================
    const periodMap = {};
    filtered.forEach(item => {
        if (!item.tanggal) return;
        let key = item.tanggal.substring(0, 7);
        if (filterType === 'date-range') key = item.tanggal;
        if (!periodMap[key]) {
            periodMap[key] = { 'FA': 0, 'MTI': 0, 'TA': 0, 'Fatality': 0, total: 0 };
        }
        const kat = normalizeSafetyCategory(item.kategori);
        if (periodMap[key][kat] !== undefined) {
            periodMap[key][kat]++;
        } else {
            periodMap[key]['FA']++;
        }
        periodMap[key].total++;
    });

    let sortedKeys = Object.keys(periodMap).sort();

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
            return `${parseInt(parts[2], 10)} ${monthNamesShort[mIdx] ? monthNamesShort[mIdx].substring(0, 3) : parts[1]}`;
        }
        return key;
    });

    const faData = sortedKeys.map(k => periodMap[k]['FA']);
    const mtiData = sortedKeys.map(k => periodMap[k]['MTI']);
    const taData = sortedKeys.map(k => periodMap[k]['TA']);
    const fatalityData = sortedKeys.map(k => periodMap[k]['Fatality']);
    const totalTrendData = sortedKeys.map(k => periodMap[k].total);

    const trendCtx = trendCanvas.getContext('2d');

    // Helper Gradient Canvas Dinamis (Scriptable Function agar gradasi selalu presisi sesuai tinggi render aktif)
    // Set default Chart.js font to match the application theme (Inter, sans-serif)
    if (window.Chart && Chart.defaults) {
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }

    // Helper Gradient Canvas Dinamis (Scriptable Function agar gradasi selalu presisi sesuai tinggi render aktif)
    function createPillarGradient(ctx, chartArea, colTop, colBottom) {
        if (!chartArea) return colTop;
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, colTop);
        g.addColorStop(1, colBottom);
        return g;
    }

    // Custom Plugin: Satu-Satunya Renderer Angka Mengambang (Bersih, Non-Overlapping, Elegan ala Gambar 1)
    const executiveFloatingLabelsPlugin = {
        id: 'safetyExecutiveFloatingLabels',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const lineDatasetIndex = chart.data.datasets.findIndex(d => d.type === 'line');
            if (lineDatasetIndex === -1) return;
            const lineMeta = chart.getDatasetMeta(lineDatasetIndex);
            if (!lineMeta || lineMeta.hidden) return;

            const lineData = chart.data.datasets[lineDatasetIndex].data || [];
            const maxVal = Math.max(...lineData, 0);

            ctx.save();
            lineMeta.data.forEach((element, index) => {
                const val = lineData[index];
                if (val === undefined || val === null || val === 0) return;
                const pos = element.tooltipPosition();
                if (!pos || isNaN(pos.x) || isNaN(pos.y)) return;

                const text = String(val);
                const isPeak = val === maxVal && val > 0;

                if (isPeak) {
                    // Highlighted Badge untuk Nilai Puncak ala Gambar 1 (contoh: 20.6)
                    ctx.font = "bold 11px 'Inter', -apple-system, sans-serif";
                    const textWidth = ctx.measureText(text).width;
                    const padX = 7;
                    const w = Math.max(textWidth + padX * 2, 22);
                    const h = 19;
                    const rx = pos.x - w / 2;
                    const ry = pos.y - 30;

                    ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
                    ctx.shadowBlur = 6;
                    ctx.fillStyle = '#0F172A';
                    ctx.beginPath();
                    if (typeof ctx.roundRect === 'function') {
                        ctx.roundRect(rx, ry, w, h, 6);
                    } else {
                        ctx.rect(rx, ry, w, h);
                    }
                    ctx.fill();

                    // Teks putih kontras di dalam badge
                    ctx.shadowColor = 'transparent';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(text, pos.x, ry + h / 2 + 0.5);
                } else {
                    // Angka tebal mengambang dengan halo putih lembut di sekelilingnya
                    ctx.font = "800 12.5px 'Inter', -apple-system, sans-serif";
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
                    ctx.shadowBlur = 5;
                    ctx.fillStyle = '#0F172A';
                    ctx.fillText(text, pos.x, pos.y - 12);
                }
            });
            ctx.restore();
        }
    };

    const maxValInTrend = Math.max(...totalTrendData, 0) || 4;

    safetyTrendChartInstance = new Chart(trendCtx, {
        type: 'bar',
        plugins: [executiveFloatingLabelsPlugin],
        data: {
            labels: labels.length > 0 ? labels : ['Belum Ada Data'],
            datasets: [
                {
                    type: 'bar',
                    label: 'FA',
                    data: faData.length > 0 ? faData : [0],
                    backgroundColor: (c) => createPillarGradient(c.chart.ctx, c.chart.chartArea, '#A7F3D0', '#059669'), // Emerald / First Aid
                    hoverBackgroundColor: '#047857',
                    stack: 'severity',
                    barThickness: 34,
                    maxBarThickness: 38,
                    borderRadius: 5,
                    borderSkipped: false,
                    order: 5,
                    datalabels: { display: false }
                },
                {
                    type: 'bar',
                    label: 'MTI',
                    data: mtiData.length > 0 ? mtiData : [0],
                    backgroundColor: (c) => createPillarGradient(c.chart.ctx, c.chart.chartArea, '#93C5FD', '#2563EB'), // Blue / Medical Treatment
                    hoverBackgroundColor: '#1D4ED8',
                    stack: 'severity',
                    barThickness: 34,
                    maxBarThickness: 38,
                    borderRadius: 5,
                    borderSkipped: false,
                    order: 4,
                    datalabels: { display: false }
                },
                {
                    type: 'bar',
                    label: 'TA',
                    data: taData.length > 0 ? taData : [0],
                    backgroundColor: (c) => createPillarGradient(c.chart.ctx, c.chart.chartArea, '#FDE68A', '#D97706'), // Amber / Time Loss or Traffic Accident
                    hoverBackgroundColor: '#B45309',
                    stack: 'severity',
                    barThickness: 34,
                    maxBarThickness: 38,
                    borderRadius: 5,
                    borderSkipped: false,
                    order: 3,
                    datalabels: { display: false }
                },
                {
                    type: 'bar',
                    label: 'Fatality',
                    data: fatalityData.length > 0 ? fatalityData : [0],
                    backgroundColor: (c) => createPillarGradient(c.chart.ctx, c.chart.chartArea, '#FCA5A5', '#DC2626'), // Rose / Fatal
                    hoverBackgroundColor: '#991B1B',
                    stack: 'severity',
                    barThickness: 34,
                    maxBarThickness: 38,
                    borderRadius: 6,
                    borderSkipped: false,
                    order: 2,
                    datalabels: { display: false }
                },
                {
                    type: 'line',
                    label: 'Total Tren',
                    data: totalTrendData.length > 0 ? totalTrendData : [0],
                    borderColor: '#0F172A',
                    borderWidth: 2.8,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#0F172A',
                    pointBorderWidth: 2.5,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#38BDF8',
                    pointHoverBorderColor: '#0F172A',
                    tension: 0.45,
                    fill: true,
                    backgroundColor: (c) => {
                        const { ctx, chartArea } = c.chart;
                        if (!chartArea) return 'transparent';
                        const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        grad.addColorStop(0, 'rgba(59, 130, 246, 0.28)'); // soft tech blue glow
                        grad.addColorStop(0.55, 'rgba(234, 88, 12, 0.08)'); // warm amber ambient
                        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)'); // clear at bottom
                        return grad;
                    },
                    order: 1,
                    datalabels: { display: false }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleFont: { size: 12, family: "'Inter', -apple-system, sans-serif", weight: 'bold' },
                    bodyFont: { size: 11, family: "'Inter', -apple-system, sans-serif" },
                    padding: 12,
                    cornerRadius: 12,
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const val = context.raw || 0;
                            if (val === 0) return null; // lewati kategori yang bernilai 0
                            return ` ${context.dataset.label}: ${val} kasus`;
                        },
                        footer: (items) => {
                            let sum = 0;
                            items.forEach(i => {
                                if (i.dataset.type === 'bar') sum += i.raw;
                            });
                            return 'Total: ' + sum + ' Kasus Insiden';
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        font: { size: 11.5, family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", weight: '600' },
                        color: '#475569',
                        padding: 8
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    suggestedMax: maxValInTrend + 0.85,
                    border: { display: false, dash: [5, 5] },
                    ticks: {
                        precision: 0,
                        padding: 10,
                        font: { size: 10.5, family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", weight: '500' },
                        color: '#94A3B8'
                    },
                    grid: {
                        color: 'rgba(226, 232, 240, 0.6)',
                        drawTicks: false
                    }
                }
            }
        }
    });

    // ========================================================
    // 2. DISTRIBUSI INSIDEN (KATEGORI vs BAGIAN) + CENTER KPI
    // ========================================================
    const totalCount = filtered.length;
    const distCtx = distCanvas.getContext('2d');

    if (currentSafetyDistTab === 'kategori') {
        // --- TAB 1: KATEGORI KEPARAHAN ---
        const distGroup = { 'FA': 0, 'MTI': 0, 'TA': 0, 'Fatality': 0 };
        filtered.forEach(item => {
            const kat = normalizeSafetyCategory(item.kategori);
            if (distGroup[kat] !== undefined) distGroup[kat]++;
            else distGroup['FA']++;
        });

        if (centerVal) centerVal.textContent = totalCount;
        if (centerLabel) centerLabel.textContent = totalCount > 0 ? 'Total Insiden' : 'Nihil Kasus';

        const catLabels = ['FA', 'MTI', 'TA', 'Fatality'];
        const catValues = [distGroup['FA'], distGroup['MTI'], distGroup['TA'], distGroup['Fatality']];
        const catColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
        const catHoverColors = ['#059669', '#2563EB', '#D97706', '#DC2626'];

        const chartData = totalCount > 0 ? catValues : [1];
        const chartColors = totalCount > 0 ? catColors : ['#E2E8F0'];

        safetyDistChartInstance = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: totalCount > 0 ? catLabels : ['Nihil'],
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    hoverBackgroundColor: totalCount > 0 ? catHoverColors : ['#CBD5E1'],
                    borderWidth: 2.5,
                    borderColor: '#FFFFFF',
                    borderRadius: totalCount > 0 ? 4 : 0,
                    spacing: totalCount > 0 ? 3 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '74%',
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: {
                        enabled: totalCount > 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        padding: 8,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw || 0;
                                const pct = totalCount > 0 ? Math.round((val / totalCount) * 100) : 0;
                                return ` ${ctx.label}: ${val} Kasus (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Render Breakdown List
        if (breakdownList) {
            if (totalCount === 0) {
                breakdownList.innerHTML = `
                    <div class="py-3 text-center text-xs text-slate-400 italic">
                        <i class="fa-solid fa-circle-check text-emerald-500 text-sm mb-1 block"></i>
                        Tidak ada insiden tercatat pada periode ini.
                    </div>
                `;
            } else {
                let html = '';
                catLabels.forEach((name, i) => {
                    const count = catValues[i];
                    const pct = Math.round((count / totalCount) * 100);
                    const color = catColors[i];
                    html += `
                        <div class="flex items-center justify-between text-xs py-0.5">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${color}"></span>
                                <span class="font-bold text-slate-700 truncate">${name}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div class="h-1.5 rounded-full" style="width: ${pct}%; background-color: ${color}"></div>
                                </div>
                                <span class="font-extrabold text-slate-800 text-[11px] min-w-[55px] text-right">${count} <span class="text-[10px] text-slate-400 font-semibold">(${pct}%)</span></span>
                            </div>
                        </div>
                    `;
                });
                breakdownList.innerHTML = html;
            }
        }

    } else {
        // --- TAB 2: BAGIAN / SECTION TERDAMPAK ---
        const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
            ? rawSiswaData
            : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

        const bagianGroup = {};
        filtered.forEach(item => {
            const matchSiswa = studentList.find(s => String(s.id || s.noreg) === String(item.noreg));
            const sec = (matchSiswa && (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen)) 
                ? (matchSiswa.section || matchSiswa.bagian || matchSiswa.departemen) 
                : (item.section || item.bagian || 'Lainnya');
            
            const normalizedSec = (sec || 'Lainnya').toUpperCase().trim();
            bagianGroup[normalizedSec] = (bagianGroup[normalizedSec] || 0) + 1;
        });

        const sortedBagian = Object.keys(bagianGroup).sort((a, b) => bagianGroup[b] - bagianGroup[a]);
        const uniqueBagianCount = sortedBagian.length;

        if (centerVal) centerVal.textContent = uniqueBagianCount;
        if (centerLabel) centerLabel.textContent = uniqueBagianCount > 0 ? 'Bagian Terdampak' : 'Nihil Kasus';

        const palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B', '#F97316'];
        const sectionLabels = sortedBagian;
        const sectionValues = sortedBagian.map(b => bagianGroup[b]);
        const sectionColors = sortedBagian.map((_, idx) => palette[idx % palette.length]);

        const chartData = totalCount > 0 ? sectionValues : [1];
        const chartColors = totalCount > 0 ? sectionColors : ['#E2E8F0'];

        safetyDistChartInstance = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: totalCount > 0 ? sectionLabels : ['Nihil'],
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 2.5,
                    borderColor: '#FFFFFF',
                    borderRadius: totalCount > 0 ? 4 : 0,
                    spacing: totalCount > 0 ? 3 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '74%',
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: {
                        enabled: totalCount > 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        padding: 8,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw || 0;
                                const pct = totalCount > 0 ? Math.round((val / totalCount) * 100) : 0;
                                return ` ${ctx.label}: ${val} Kasus (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Render Section Breakdown List
        if (breakdownList) {
            if (totalCount === 0 || sortedBagian.length === 0) {
                breakdownList.innerHTML = `
                    <div class="py-3 text-center text-xs text-slate-400 italic">
                        <i class="fa-solid fa-circle-check text-emerald-500 text-sm mb-1 block"></i>
                        Tidak ada insiden per bagian tercatat.
                    </div>
                `;
            } else {
                let html = '';
                sortedBagian.forEach((name, i) => {
                    const count = bagianGroup[name];
                    const pct = Math.round((count / totalCount) * 100);
                    const color = palette[i % palette.length];
                    html += `
                        <div class="flex items-center justify-between text-xs py-0.5">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0" style="background-color: ${color}20; color: ${color}">${i + 1}</span>
                                <span class="font-bold text-slate-700 truncate">${name}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <div class="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div class="h-1.5 rounded-full" style="width: ${pct}%; background-color: ${color}"></div>
                                </div>
                                <span class="font-extrabold text-slate-800 text-[11px] min-w-[55px] text-right">${count} <span class="text-[10px] text-slate-400 font-semibold">(${pct}%)</span></span>
                            </div>
                        </div>
                    `;
                });
                breakdownList.innerHTML = html;
            }
        }
    }
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
        const record = getSafetyDataset().find(s => s.id === idToEdit);
        if (record) {
            title.textContent = 'Edit Data Kecelakaan Kerja';
            formId.value = record.id;
            if (siswaSelect) siswaSelect.value = record.noreg;
            if (tanggalInput) tanggalInput.value = record.tanggal;
            if (kelasInput) kelasInput.value = record.kelas || '';
            if (bagianInput) bagianInput.value = record.bagian || '';
            if (spvInput) spvInput.value = record.spv || '';
            if (jenisInput) jenisInput.value = record.jenisKecelakaan || '';
            if (kategoriSelect) kategoriSelect.value = normalizeSafetyCategory(record.kategori) || 'FA';
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
        if (kategoriSelect) kategoriSelect.value = 'FA';
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

    const studentList = (typeof rawSiswaData !== 'undefined' && Array.isArray(rawSiswaData) && rawSiswaData.length > 0)
        ? rawSiswaData
        : (typeof activeData !== 'undefined' && Array.isArray(activeData) ? activeData : []);

    const siswaObj = studentList.find(s => (s.id || s.noreg) === noreg);
    const namaSiswa = siswaObj ? (siswaObj.namaLengkap || siswaObj.nama) : noreg;

    const payload = {
        id: formId ? parseInt(formId) : null,
        noreg,
        nama: namaSiswa,
        kelas: kelas || (siswaObj ? siswaObj.kelas : ''),
        bagian: bagian || (siswaObj ? (siswaObj.departemen || siswaObj.bagian || siswaObj.section) : ''),
        spv: spv || '',
        jenisKecelakaan: jenis,
        kategori: normalizeSafetyCategory(kategori) || 'FA',
        tanggal,
        keterangan: ket || ''
    };

    const submitBtn = document.getElementById('safety-modal-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...';
    }

    const rpcRunner = (typeof executeRpcCall === 'function' ? executeRpcCall : (typeof window !== 'undefined' && window.executeRpcCall ? window.executeRpcCall : (typeof executeGASCall === 'function' ? executeGASCall : (typeof window !== 'undefined' && window.executeGASCall ? window.executeGASCall : null))));
    if (rpcRunner) {
        rpcRunner('saveSafetyRecord', [payload])
            .then(res => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Simpan Data Safety';
                }

                if (res && res.success) {
                    showToast('Data Kecelakaan Kerja berhasil disimpan!');
                    closeSafetyModal();
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                } else {
                    showToast('Gagal menyimpan data safety: ' + (res ? res.message : 'Unknown error'), 'error');
                }
            })
            .catch(err => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Simpan Data Safety';
                }
                console.error('Error saving safety data:', err);
                showToast('Gagal menyimpan data safety: ' + (err ? err.message : 'Gangguan koneksi'), 'error');
            });
    }
}

function deleteSafetyRecord(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan kecelakaan kerja ini?')) return;

    const rpcRunner = (typeof executeRpcCall === 'function' ? executeRpcCall : (typeof window !== 'undefined' && window.executeRpcCall ? window.executeRpcCall : (typeof executeGASCall === 'function' ? executeGASCall : (typeof window !== 'undefined' && window.executeGASCall ? window.executeGASCall : null))));
    if (rpcRunner) {
        rpcRunner('deleteSafetyRecord', [id])
            .then(res => {
                if (res && res.success) {
                    showToast('Data Safety berhasil dihapus!');
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                } else {
                    showToast('Gagal menghapus data safety: ' + (res ? res.message : 'Unknown error'), 'error');
                }
            })
            .catch(err => {
                console.error('Error deleting safety record:', err);
                showToast('Gagal menghapus data safety: ' + (err ? err.message : 'Gangguan koneksi'), 'error');
            });
    }
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
