function renderKeuanganView() {
    renderMonthlyHistoryTable();
    const tbody = document.getElementById('keuangan-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const isAdmin = currentUser && currentUser.role === 'Admin';
    const formContainer = document.getElementById('finance-form-container');
    const tableContainer = document.getElementById('finance-table-container');
    const thAksi = document.getElementById('keuangan-th-aksi');

    if (isAdmin) {
        if (formContainer) formContainer.classList.remove('hidden');
        if (tableContainer) {
            tableContainer.classList.remove('lg:col-span-3');
            tableContainer.classList.add('lg:col-span-2');
        }
        if (thAksi) thAksi.classList.remove('hidden');

        const dateInput = document.getElementById('trans-tanggal');
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
    } else {
        if (formContainer) formContainer.classList.add('hidden');
        if (tableContainer) {
            tableContainer.classList.remove('lg:col-span-2');
            tableContainer.classList.add('lg:col-span-3');
        }
        if (thAksi) thAksi.classList.add('hidden');
    }

    financeData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-all-300 text-xs font-semibold";
        const badgeStyle = item.tipe === 'Pemasukan' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
        
        let aksiTd = '';
        if (isAdmin) {
            aksiTd = `
                <td class="py-3 px-4 text-right">
                    <button onclick="deleteTransaksiConfirm('${item.id}')" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
            `;
        }

        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-brand-textSub">${item.id}</td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badgeStyle}">${item.tipe}</span></td>
            <td class="py-3 px-4 text-brand-textMain">${item.kat}</td>
            <td class="py-3 px-4 font-bold text-brand-textMain">Rp ${parseFloat(item.jumlah).toLocaleString('id-ID')}</td>
            <td class="py-3 px-4 text-brand-textSub">${item.tanggal}</td>
            <td class="py-3 px-4 text-brand-textSub text-right">${item.ket || '-'}</td>
            ${aksiTd}
        `;
        tbody.appendChild(tr);
    });

    setTimeout(() => renderMonthlyHistoryTable(), 200);
}

function saveTransaksi() {
    const tipe = document.getElementById('trans-tipe').value;
    const kat = document.getElementById('trans-kat').value.trim();
    const jumlah = document.getElementById('trans-jumlah').value;
    const tanggalVal = document.getElementById('trans-tanggal').value;
    const ket = document.getElementById('trans-ket').value.trim();

    if (!kat || !jumlah || !tanggalVal) {
        showToast('Tolong lengkapi kategori, jumlah dana, dan tanggal.', 'error');
        return;
    }

    const amt = parseFloat(jumlah);
    if (isNaN(amt) || amt <= 0) {
        showToast('Jumlah dana harus berupa angka positif.', 'error');
        return;
    }

    const parts = tanggalVal.split('-');
    const dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const payload = { tipe, kat, jumlah: amt, tanggal: dateFormatted, ket };

    if (typeof google !== 'undefined') {
        google.script.run.withSuccessHandler(res => {
            if(res.success) {
                showToast('Transaksi berhasil disimpan & disinkronisasi!');
                clearFormTransaksi();
                loadDashboardData();
            } else {
                showToast('Gagal menyimpan transaksi: ' + res.message, 'error');
            }
        }).saveTransaksiKeuangan(payload);
    } else {
        showToast('Mode Preview: Transaksi dicatat di memori lokal.');
        fallbackStats.recent.unshift({
            id: "TRANS-" + Date.now(),
            ...payload
        });
        clearFormTransaksi();
        loadDashboardData();
    }
}

function clearFormTransaksi() {
    document.getElementById('trans-kat').value = '';
    document.getElementById('trans-jumlah').value = '';
    document.getElementById('trans-ket').value = '';
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('trans-tanggal').value = `${yyyy}-${mm}-${dd}`;
}

function deleteTransaksiConfirm(transId) {
    showGlassModal({
        title: "Hapus Transaksi",
        message: `Apakah Anda benar-benar yakin ingin menghapus transaksi <strong>${transId}</strong> secara permanen?`,
        confirmText: "Ya, Hapus",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
        onConfirm: () => {
            executeTransaksiDeletion(transId);
        }
    });
}

function executeTransaksiDeletion(transId) {
    if (typeof google !== 'undefined') {
        google.script.run.withSuccessHandler(res => {
            if (res.success) {
                showToast('Transaksi berhasil dihapus.');
                loadDashboardData();
            } else {
                showToast('Gagal menghapus transaksi: ' + res.message, 'error');
            }
        }).deleteTransaksiKeuangan(transId);
    } else {
        showToast('Mode Preview: Transaksi dihapus dari memori lokal.', 'info');
        const idx = fallbackStats.recent.findIndex(t => t.id === transId);
        if (idx !== -1) {
            fallbackStats.recent.splice(idx, 1);
        }
        loadDashboardData();
    }
}

function calculateLTCCosts() {
    const startVal = document.getElementById('calc-start-date').value;
    const endVal = document.getElementById('calc-end-date').value;

    if (!startVal || !endVal) {
        showToast('Silakan pilih tanggal mulai dan tanggal selesai.', 'error');
        return;
    }

    const start = parseDateYYYYMMDD(startVal);
    const end = parseDateYYYYMMDD(endVal);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        showToast('Format tanggal tidak valid.', 'error');
        return;
    }

    if (start > end) {
        showToast('Tanggal mulai tidak boleh melebihi tanggal selesai.', 'error');
        return;
    }

    if (!activeData || activeData.length === 0) {
        showToast('Data peserta belum dimuat. Tunggu sebentar lalu coba lagi.', 'error');
        return;
    }

    const monthsCovered = [];
    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
    while (curr <= endLimit) {
        monthsCovered.push({
            year: curr.getFullYear(),
            month: curr.getMonth()
        });
        curr.setMonth(curr.getMonth() + 1);
    }

    const ratesMap = {};
    if (window.costRatesConfig && Array.isArray(costRatesConfig)) {
        costRatesConfig.forEach(rate => {
            ratesMap[rate.kelas.toLowerCase().replace(/\s+/g, '')] = {
                saku: rate.uangSaku,
                trans: rate.transport
            };
        });
    }

    const defaultRates = {
        'kelas1': { saku: 3000000, trans: 500000 },
        'kelas2': { saku: 3100000, trans: 500000 },
        'kelas3': { saku: 3250000, trans: 500000 },
        'kelas4': { saku: 3450000, trans: 500000 },
        'kelas5': { saku: 3700000, trans: 500000 }
    };

    const getRatesForClass = (kelasStr) => {
        const key = String(kelasStr).toLowerCase().replace(/\s+/g, '');
        return ratesMap[key] || defaultRates[key] || { saku: 0, trans: 0 };
    };

    let totalSakuSum = 0;
    let totalTransSum = 0;
    const studentCosts = {};

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

    const getWorkingDaysInRange = (d1, d2, workingDaysType) => {
        let count = 0;
        let cursor = new Date(d1);
        const is5Day = workingDaysType === '5 Hari' || workingDaysType === '5 Hari Kerja';
        while (cursor <= d2) {
            const day = cursor.getDay();
            if (day !== 0 && (!is5Day || day !== 6)) {
                const ds = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
                if (!INDONESIA_HOLIDAYS_2026.includes(ds)) {
                    count++;
                }
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return count;
    };

    monthsCovered.forEach(item => {
        const year = item.year;
        const month = item.month;
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const monthLabel = `${monthNames[month]} ${year}`;

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const intersectStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
        const intersectEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));

        if (intersectStart > intersectEnd) return;

        activeData.forEach(siswa => {
            if (siswa.status === "Terminasi" && siswa.keluar) {
                const keluarDate = parseDateYYYYMMDD(siswa.keluar);
                if (keluarDate && keluarDate < intersectStart) return;
            }

            const workingDaysType = siswa.hariKerja || '6 Hari';
            
            const actualWorkingDays = getActualWorkingDays(year, month, workingDaysType);
            if (actualWorkingDays === 0) return;

            const workingDaysIntersection = getWorkingDaysInRange(intersectStart, intersectEnd, workingDaysType);

            let hadirCount = 0;
            let costSaku = 0;
            let costTrans = 0;

            const recMap = {};
            (siswa.dailyRecords || []).forEach(rec => {
                if (rec.dateStr) recMap[rec.dateStr] = rec;
            });

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
                        const hadirVal = String(rec.hadir || '').trim().toLowerCase();
                        const hasCheck = hadirVal === '✔' || hadirVal === 'hadir' || hadirVal === '1' || hadirVal === 'true' || hadirVal === 'y' || hadirVal === 'ya';
                        const hasProd = (rec.plan > 0 || rec.actual > 0);
                        if (hasCheck || hasProd) {
                            isHadir = true;
                        }
                    }

                    if (isHadir) {
                        hadirCount++;

                        let kelasPadaHariIni = hitungKelasSiswa(siswa.masuk, cursor);

                        if (kelasPadaHariIni === "Kelas 6" || parseInt(kelasPadaHariIni.replace('Kelas ', '')) > 5) {
                            kelasPadaHariIni = "Kelas 5";
                        }

                        const rates = getRatesForClass(kelasPadaHariIni);
                        costSaku += rates.saku / actualWorkingDays;
                        costTrans += rates.trans / actualWorkingDays;
                    }
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            hadirCount = Math.min(hadirCount, workingDaysIntersection);

            const costTotal = costSaku + costTrans;

            let kelasAkhir = hitungKelasSiswa(siswa.masuk, intersectEnd);
            if (kelasAkhir === "Kelas 6" || parseInt(kelasAkhir.replace('Kelas ', '')) > 5) {
                kelasAkhir = "Kelas 5";
            }

            if (!studentCosts[siswa.id]) {
                studentCosts[siswa.id] = {
                    id: siswa.id,
                    name: siswa.namaLengkap,
                    kelas: kelasAkhir,
                    saku: 0,
                    trans: 0,
                    total: 0,
                    detailMonths: []
                };
            }

            studentCosts[siswa.id].saku += costSaku;
            studentCosts[siswa.id].trans += costTrans;
            studentCosts[siswa.id].total += costTotal;
            studentCosts[siswa.id].detailMonths.push({
                month: monthLabel,
                hadir: hadirCount,
                hariKerja: workingDaysIntersection,
                saku: costSaku,
                trans: costTrans
            });

            totalSakuSum += costSaku;
            totalTransSum += costTrans;
        });
    });

    document.getElementById('calc-total-saku').innerText = `Rp ${Math.round(totalSakuSum).toLocaleString('id-ID')}`;
    document.getElementById('calc-total-trans').innerText = `Rp ${Math.round(totalTransSum).toLocaleString('id-ID')}`;
    document.getElementById('calc-total-all').innerText = `Rp ${Math.round(totalSakuSum + totalTransSum).toLocaleString('id-ID')}`;

    const tbody = document.getElementById('calc-tbody');
    tbody.innerHTML = '';

    const keys = Object.keys(studentCosts);
    if (keys.length === 0) {
        document.getElementById('calc-result-container').classList.add('hidden');
        document.getElementById('calc-empty-state').classList.remove('hidden');
        document.getElementById('calc-empty-state').innerHTML = `<span class="text-rose-600 font-bold">Tidak ada data peserta aktif yang ditemukan untuk periode ini.</span>`;
        renderMonthlyHistoryTable();
        return;
    }

    keys.forEach(id => {
        const item = studentCosts[id];
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-all-300 text-xs font-semibold";
        
        const detailStr = item.detailMonths.map(d => `${d.month}: ${d.hadir}/${d.hariKerja} Hadir (Saku: Rp ${Math.round(d.saku).toLocaleString('id-ID')}, Trans: Rp ${Math.round(d.trans).toLocaleString('id-ID')})`).join('<br>');

        tr.innerHTML = `
            <td class="py-3 px-4 text-brand-textSub">${item.id}</td>
            <td class="py-3 px-4 text-brand-textMain font-bold">${item.name}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-brand-blue">${item.kelas}</span></td>
            <td class="py-3 px-4 text-brand-textMain">${item.detailMonths.reduce((acc, curr) => acc + curr.hadir, 0)} hari</td>
            <td class="py-3 px-4 text-brand-textSub">${item.detailMonths.reduce((acc, curr) => acc + curr.hariKerja, 0)} hari</td>
            <td class="py-3 px-4 text-[10px] text-brand-textSub leading-relaxed">${detailStr}</td>
            <td class="py-3 px-4 text-right font-semibold text-brand-textMain">Rp ${Math.round(item.saku).toLocaleString('id-ID')}</td>
            <td class="py-3 px-4 text-right font-semibold text-brand-textMain">Rp ${Math.round(item.trans).toLocaleString('id-ID')}</td>
            <td class="py-3 px-4 text-right font-bold text-brand-blue">Rp ${Math.round(item.total).toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('calc-empty-state').classList.add('hidden');
    document.getElementById('calc-result-container').classList.remove('hidden');
    showToast('Perhitungan biaya saku LTC selesai.');

    renderMonthlyHistoryTable();
}

function renderMonthlyHistoryTable() {
    const container = document.getElementById('monthly-history-container');
    if (!container) return;

    if (!activeData || activeData.length === 0) {
        container.innerHTML = '';
        return;
    }

    let earliestDate = new Date();
    activeData.forEach(s => {
        if (s.masuk) {
            const d = new Date(s.masuk);
            if (!isNaN(d.getTime()) && d < earliestDate) earliestDate = d;
        }
    });

    const now = new Date();
    const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

    const months = [];
    let cur = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const limitMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cur <= limitMonth) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() });
        cur.setMonth(cur.getMonth() + 1);
    }

    const getActualWorkingDays = (y, m) => {
        let count = 0;
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const date = new Date(y, m, d);
            if (date.getDay() !== 0) {
                const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                if (!INDONESIA_HOLIDAYS_2026.includes(ds)) count++;
            }
        }
        return count;
    };

    const getWorkingDaysInRange = (d1, d2) => {
        let count = 0;
        let cursor = new Date(d1);
        while (cursor <= d2) {
            if (cursor.getDay() !== 0) {
                const ds = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
                if (!INDONESIA_HOLIDAYS_2026.includes(ds)) count++;
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return count;
    };

    const ratesMap = {};
    const defaultRates = {
        'kelas1': { saku: 3000000, trans: 500000 },
        'kelas2': { saku: 3100000, trans: 500000 },
        'kelas3': { saku: 3250000, trans: 500000 },
        'kelas4': { saku: 3450000, trans: 500000 },
        'kelas5': { saku: 3700000, trans: 500000 }
    };
    if (window.costRatesConfig && Array.isArray(costRatesConfig)) {
        costRatesConfig.forEach(rate => {
            ratesMap[rate.kelas.toLowerCase().replace(/\s+/g, '')] = { saku: rate.uangSaku, trans: rate.transport };
        });
    }
    const getRatesForClass = (kelasStr) => {
        const key = String(kelasStr).toLowerCase().replace(/\s+/g, '');
        return ratesMap[key] || defaultRates[key] || { saku: 0, trans: 0 };
    };

    const rows = [];
    let grandTotalSaku = 0, grandTotalTrans = 0;

    months.forEach(item => {
        const { year, month } = item;
        const actualWorkingDays = getActualWorkingDays(year, month);
        if (actualWorkingDays === 0) return;

        const cutOffStart = new Date(year, month - 1, 21);
        const cutOffEnd = new Date(year, month, 20);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const intersectStart = new Date(Math.max(monthStart.getTime(), cutOffStart.getTime()));
        const intersectEnd = new Date(Math.min(monthEnd.getTime(), cutOffEnd.getTime()));
        if (intersectStart > intersectEnd) return;

        let monthSaku = 0, monthTrans = 0;

        activeData.forEach(siswa => {
            let kelasPadaBulanIni = hitungKelasSiswa(siswa.masuk, intersectStart);

            if (siswa.status === "Terminasi" && siswa.keluar) {
                const keluarDate = parseDateYYYYMMDD(siswa.keluar);
                if (keluarDate && keluarDate < intersectStart) return;
            }

            if (kelasPadaBulanIni === "Kelas 6" || parseInt(kelasPadaBulanIni.replace('Kelas ', '')) > 5) {
                kelasPadaBulanIni = "Kelas 5";
            }

            const workingDaysIntersection = getWorkingDaysInRange(intersectStart, intersectEnd);
            const rates = getRatesForClass(kelasPadaBulanIni);
            const dailyRateSaku = rates.saku / actualWorkingDays;
            const dailyRateTrans = rates.trans / actualWorkingDays;

            let hadirCount = 0;
            const records = siswa.dailyRecords || [];
            records.forEach(rec => {
                const recDate = parseDateYYYYMMDD(rec.dateStr);
                if (!recDate) return;
                if (recDate >= intersectStart && recDate <= intersectEnd) {
                    if (recDate.getDay() !== 0 && !INDONESIA_HOLIDAYS_2026.includes(rec.dateStr)) {
                        const hadirVal = String(rec.hadir || '').trim().toLowerCase();
                        const isHadir = hadirVal === '✔' || hadirVal === 'hadir' || hadirVal === '1' || hadirVal === 'true' || hadirVal === 'y' || hadirVal === 'ya';
                        const hasProd = (rec.plan > 0 || rec.actual > 0);
                        if (isHadir || hasProd) hadirCount++;
                    }
                }
            });
            hadirCount = Math.min(hadirCount, workingDaysIntersection);
            monthSaku += hadirCount * dailyRateSaku;
            monthTrans += hadirCount * dailyRateTrans;
        });

        grandTotalSaku += monthSaku;
        grandTotalTrans += monthTrans;

        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
        rows.push({ label: `${monthNames[month]} ${year}`, saku: monthSaku, trans: monthTrans, total: monthSaku + monthTrans, isCurrent: isCurrentMonth });
    });

    rows.reverse();

    const grandTotal = Math.round(grandTotalSaku + grandTotalTrans);
    const rowsHtml = rows.map(r => `
        <tr class="hover:bg-slate-50/50 transition-all-300 text-xs font-semibold${r.isCurrent ? ' bg-brand-blue/[0.03]' : ''}">
            <td class="py-3 px-4 font-bold text-brand-textMain">
                ${r.isCurrent ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle"></span>' : ''}
                ${r.label}${r.isCurrent ? ' <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full ml-1">Bulan Ini</span>' : ''}
            </td>
            <td class="py-3 px-4 text-right text-brand-textSub">Rp ${Math.round(r.saku).toLocaleString('id-ID')}</td>
            <td class="py-3 px-4 text-right text-brand-textSub">Rp ${Math.round(r.trans).toLocaleString('id-ID')}</td>
            <td class="py-3 px-4 text-right font-bold text-brand-blue">Rp ${Math.round(r.total).toLocaleString('id-ID')}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="mt-8 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
                <div>
                    <h3 class="font-display font-bold text-lg text-brand-textMain">Histori Biaya Uang Saku Per Bulan</h3>
                    <p class="text-xs text-brand-textSub mt-1">Akumulasi total biaya uang saku + transport LTC per bulan berjalan</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-brand-textSub">Grand Total Akumulasi</span>
                    <p class="text-xl font-extrabold text-brand-blue mt-0.5">Rp ${grandTotal.toLocaleString('id-ID')}</p>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr class="text-brand-textSub text-xs uppercase border-b border-slate-100">
                            <th class="py-3 px-4 font-semibold">Bulan</th>
                            <th class="py-3 px-4 font-semibold text-right">Uang Saku</th>
                            <th class="py-3 px-4 font-semibold text-right">Transport</th>
                            <th class="py-3 px-4 font-semibold text-right">Total Pengeluaran</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">${rowsHtml}</tbody>
                    <tfoot>
                        <tr class="border-t-2 border-slate-200 bg-slate-50/50">
                            <td class="py-3 px-4 font-extrabold text-brand-textMain text-xs uppercase">Total Akumulasi</td>
                            <td class="py-3 px-4 text-right font-bold text-brand-textMain text-xs">Rp ${Math.round(grandTotalSaku).toLocaleString('id-ID')}</td>
                            <td class="py-3 px-4 text-right font-bold text-brand-textMain text-xs">Rp ${Math.round(grandTotalTrans).toLocaleString('id-ID')}</td>
                            <td class="py-3 px-4 text-right font-extrabold text-brand-blue">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
}
