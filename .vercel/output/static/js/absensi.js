
    // ============================================
    // ABSENSI (ATTENDANCE) MODULE - MONTHLY CALENDAR GRID
    // ============================================

    let currentEditNoreg = '';
    let currentEditNama = '';
    let currentEditTanggal = '';

    let currentMonthHK = 22;

    function getDefaultWorkingDays(year, month) {
        let count = 0;
        const days = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
            const dObj = new Date(year, month, d);
            if (dObj.getDay() !== 0) { // exclude Sunday
                count++;
            }
        }
        return count;
    }

    function renderAbsensiView() {
        const monthSelect = document.getElementById('abs-filter-month');
        const yearInput = document.getElementById('abs-filter-year');
        if (!monthSelect || !yearInput) return;

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearInput.value);

        // Update version label
        const verLabel = document.getElementById('absensi-version-label');
        if (verLabel) {
            verLabel.innerText = currentVersion ? `(${currentVersion})` : '(v6.3 Local)';
        }

        const hkInput = document.getElementById('abs-filter-hk');
        if (hkInput) hkInput.disabled = true;

        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    if (hkInput) hkInput.disabled = false;
                    if (res && res.success && res.hk !== null) {
                        currentMonthHK = res.hk;
                    } else {
                        currentMonthHK = getDefaultWorkingDays(year, month);
                    }
                    if (hkInput) hkInput.value = currentMonthHK;
                    
                    _mergeAbsensiWithManpower();
                    renderCalendarGrid(year, month);
                    calculateMonthlyStats(year, month);
                })
                .withFailureHandler(err => {
                    if (hkInput) hkInput.disabled = false;
                    currentMonthHK = getDefaultWorkingDays(year, month);
                    if (hkInput) hkInput.value = currentMonthHK;
                    
                    _mergeAbsensiWithManpower();
                    renderCalendarGrid(year, month);
                    calculateMonthlyStats(year, month);
                })
                .getHariKerja(year, month);
        } else {
            currentMonthHK = getDefaultWorkingDays(year, month);
            if (hkInput) {
                hkInput.disabled = false;
                hkInput.value = currentMonthHK;
            }
            _mergeAbsensiWithManpower();
            renderCalendarGrid(year, month);
            calculateMonthlyStats(year, month);
        }
    }

    function saveHariKerja() {
        const monthSelect = document.getElementById('abs-filter-month');
        const yearInput = document.getElementById('abs-filter-year');
        const hkInput = document.getElementById('abs-filter-hk');
        if (!monthSelect || !yearInput || !hkInput) return;

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearInput.value);
        const hk = parseInt(hkInput.value) || 22;

        if (hk < 1 || hk > 31) {
            showToast('Hari Kerja harus bernilai antara 1 dan 31.', 'error');
            return;
        }

        const btn = document.getElementById('abs-save-hk-btn');
        if (btn) btn.disabled = true;

        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    if (btn) btn.disabled = false;
                    if (res && res.success) {
                        showToast('Hari Kerja (HK) berhasil disimpan!');
                        currentMonthHK = hk;
                        renderAbsensiView();
                    } else {
                        showToast('Gagal menyimpan HK. Hubungi Admin untuk membuat tabel "hari_kerja" di Supabase.', 'error');
                        console.error('Error saving HK:', res ? res.message : 'Empty response');
                    }
                })
                .withFailureHandler(err => {
                    if (btn) btn.disabled = false;
                    showToast('Error Server: Gagal menyimpan Hari Kerja.', 'error');
                    console.error('Error saving HK:', err);
                })
                .saveHariKerja(year, month, hk);
        } else {
            if (btn) btn.disabled = false;
            showToast('Mode Preview: Hari Kerja disimpan secara lokal.');
            currentMonthHK = hk;
            renderAbsensiView();
        }
    }

    window.renderAbsensiView = renderAbsensiView;
    window.saveHariKerja = saveHariKerja;

    // Merge manual absensi records with auto-detected manpower data
    function _mergeAbsensiWithManpower() {
        // Build lookup from manual absensi records (from sheet)
        const manualMap = {};
        (absensiData || []).forEach(rec => {
            const key = rec.tanggal + '|' + rec.noreg;
            manualMap[key] = rec;
        });

        // Auto-detect from manpower logs: if a student has a manpower record on a date, they're "Hadir"
        const autoRecords = [];
        (activeData || []).forEach(siswa => {
            (siswa.dailyRecords || []).forEach(rec => {
                if (!rec.dateStr) return;
                
                // Hanya auto-generate Hadir jika ada pengisian data performa nyata (plan > 0, actual > 0, atau centang)
                const planVal = parseFloat(rec.plan) || 0;
                const actualVal = parseFloat(rec.actual) || 0;
                const isHadirVal = String(rec.hadir || "").trim();
                const hasCheckmark = isHadirVal === "✔" || isHadirVal === "Hadir" || isHadirVal.toLowerCase() === "y";
                const hasPerformanceData = planVal > 0 || actualVal > 0 || hasCheckmark;
                
                if (!hasPerformanceData) return; // Siswa tidak mengisi laporan performa

                const key = rec.dateStr + '|' + siswa.id;
                if (!manualMap[key]) {
                    // Auto-generated "Hadir" record
                    autoRecords.push({
                        rowIndex: null, // Not in sheet
                        no: 0,
                        tanggal: rec.dateStr,
                        noreg: siswa.id,
                        nama: siswa.namaLengkap,
                        status: 'Hadir',
                        keterangan: rec.keterangan || 'Otomatis dari daily report',
                        autoGenerated: true
                    });
                }
            });
        });

        // Merge: manual records override auto-generated
        // We filter out duplicates so that we only have one record per (tanggal + noreg)
        const mergedMap = {};
        autoRecords.forEach(rec => {
            mergedMap[rec.tanggal + '|' + rec.noreg] = rec;
        });
        (absensiData || []).forEach(rec => {
            mergedMap[rec.tanggal + '|' + rec.noreg] = {...rec, autoGenerated: false};
        });

        absensiData = Object.values(mergedMap);
    }
    function _getStudentKelas(noreg) {
        const student = (activeData || []).find(s => s.id === noreg);
        return student ? (student.kelas || 'Kelas 1') : '-';
    }

    // Render Calendar Grid
    function renderCalendarGrid(year, month) {
        const theadRow = document.getElementById('abs-calendar-thead-tr');
        const tbody = document.getElementById('abs-calendar-tbody');
        const classVal = document.getElementById('abs-filter-class').value;
        const nameFilterInput = document.getElementById('abs-filter-name');
        const nameQuery = nameFilterInput ? nameFilterInput.value.toLowerCase().trim() : '';

        if (!theadRow || !tbody) return;

        // Calculate days in the selected month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // 1. Render Table Header
        // Reset header to first 9 static/sticky columns
        theadRow.innerHTML = `
            <th class="px-2 py-3 text-center text-slate-700 font-bold border-r border-b border-slate-200 bg-slate-100 z-30 sticky top-0 left-0" style="position: sticky; left: 0px; width: 40px; min-width: 40px; max-width: 40px;">No</th>
            <th class="px-2 py-3 text-center text-slate-700 font-bold border-r border-b border-slate-200 bg-slate-100 z-30 sticky top-0 left-[40px]" style="position: sticky; left: 40px; width: 80px; min-width: 80px; max-width: 80px;">Noreg</th>
            <th class="px-3 py-3 text-left text-slate-700 font-bold border-r border-b border-slate-200 bg-slate-100 z-30 sticky top-0 left-[120px]" style="position: sticky; left: 120px; width: 200px; min-width: 200px; max-width: 200px;">Nama Siswa</th>
            <th class="px-2 py-3 text-center text-slate-700 font-bold border-r border-b border-slate-200 bg-slate-100 z-30 sticky top-0 left-[320px]" style="position: sticky; left: 320px; width: 90px; min-width: 90px; max-width: 90px;">Kelas</th>
            <th class="px-1 py-3 text-center text-emerald-800 font-bold border-r border-b border-slate-200 bg-emerald-100 z-30 sticky top-0 left-[410px]" style="position: sticky; left: 410px; width: 40px; min-width: 40px; max-width: 40px;" title="Total Hadir">H</th>
            <th class="px-1 py-3 text-center text-amber-800 font-bold border-r border-b border-slate-200 bg-amber-100 z-30 sticky top-0 left-[450px]" style="position: sticky; left: 450px; width: 40px; min-width: 40px; max-width: 40px;" title="Total Ijin">I</th>
            <th class="px-1 py-3 text-center text-blue-800 font-bold border-r border-b border-slate-200 bg-blue-100 z-30 sticky top-0 left-[490px]" style="position: sticky; left: 490px; width: 40px; min-width: 40px; max-width: 40px;" title="Total Sakit">S</th>
            <th class="px-1 py-3 text-center text-rose-800 font-bold border-r border-b border-slate-200 bg-rose-100 z-30 sticky top-0 left-[530px]" style="position: sticky; left: 530px; width: 40px; min-width: 40px; max-width: 40px;" title="Total Alpha">A</th>
            <th class="px-1 py-3 text-center text-indigo-800 font-bold border-r border-b border-slate-200 bg-indigo-100 z-30 sticky top-0 left-[570px]" style="position: sticky; left: 570px; width: 50px; min-width: 50px; max-width: 50px;" title="Persentase Kehadiran">%</th>
        `;

        const daysOfWeek = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];

        // Add header column for each day in month (sticky only vertically)
        for (let day = 1; day <= daysInMonth; day++) {
            const dObj = new Date(year, month, day);
            const dayName = daysOfWeek[dObj.getDay()];
            const isSunday = dObj.getDay() === 0;

            const th = document.createElement('th');
            th.className = `px-2 py-1.5 text-center text-[10px] font-bold border-r border-b border-slate-200 min-w-[36px] sticky top-0 z-20 ${isSunday ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`;
            th.innerHTML = `<div>${day}</div><div class="text-[8px] font-semibold">${dayName}</div>`;
            theadRow.appendChild(th);
        }

        // 2. Filter Students
        let students = [...(activeData || [])];
        if (classVal !== 'all') {
            if (classVal === 'Kelas 5') {
                students = students.filter(s => {
                    const num = parseInt((s.kelas || '').replace('Kelas ', ''));
                    return s.kelas === 'Kelas 5' || (!isNaN(num) && num > 5);
                });
            } else {
                students = students.filter(s => s.kelas === classVal);
            }
        }
        
        // Filter by name query if input
        if (nameQuery) {
            students = students.filter(s => s.namaLengkap.toLowerCase().includes(nameQuery));
        }

        // Sort students alphabetically
        students.sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));

        // 3. Render Table Body
        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${8 + daysInMonth}" class="px-3 py-8 text-center text-slate-400 text-xs bg-white">Tidak ada siswa aktif ditemukan. Silakan sesuaikan filter pencarian Anda.</td></tr>`;
            document.getElementById('abs-calendar-count').innerText = '0 siswa';
            return;
        }

        // Build lookup map for performance: key is 'yyyy-mm-dd|noreg' -> record
        const absMap = {};
        absensiData.forEach(r => {
            absMap[r.tanggal + '|' + r.noreg] = r;
        });

        let tbodyHTML = '';
        students.forEach((s, idx) => {
            // Tentukan warna badge kelas
            const kelasNum = parseInt((s.kelas || '').replace(/\D/g, '')) || 1;
            let kelasBadge = '';
            if (kelasNum === 1) kelasBadge = 'bg-red-100 text-red-800 border-red-300';
            else if (kelasNum === 2) kelasBadge = 'bg-amber-100 text-amber-800 border-amber-300';
            else if (kelasNum === 3) kelasBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            else if (kelasNum === 4) kelasBadge = 'bg-sky-100 text-sky-800 border-sky-300';
            else kelasBadge = 'bg-slate-200 text-slate-800 border-slate-300';

            // Hitung akumulasi statistik absensi individual untuk bulan ini
            let countH = 0, countI = 0, countS = 0, countA = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const key = dateStr + '|' + s.id;
                const rec = absMap[key];
                
                const dObj = new Date(year, month, day);
                const isSunday = dObj.getDay() === 0;
                const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
                const isFuture = dObj > todayEnd;

                if (!isFuture && !isSunday && rec) {
                    if (rec.status === 'Hadir') countH++;
                    else if (rec.status === 'Ijin') countI++;
                    else if (rec.status === 'Sakit') countS++;
                    else if (rec.status === 'Alpha') countA++;
                }
            }

            const pct = currentMonthHK > 0 ? Math.min(100, Math.round((countH / currentMonthHK) * 100)) : 0;

            let rowHTML = `
                <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-2 py-2.5 text-slate-400 font-mono text-center text-xs border-r border-b border-slate-100 bg-white z-10 sticky left-0" style="position: sticky; left: 0px; width: 40px; min-width: 40px; max-width: 40px;">${idx + 1}</td>
                    <td class="px-2 py-2.5 text-slate-500 font-mono text-center text-xs border-r border-b border-slate-100 bg-white z-10 sticky" style="position: sticky; left: 40px; width: 80px; min-width: 80px; max-width: 80px;">${s.id}</td>
                    <td class="px-3 py-2.5 font-semibold text-brand-textMain text-xs border-r border-b border-slate-100 bg-white z-10 sticky whitespace-normal break-words" style="position: sticky; left: 120px; width: 200px; min-width: 200px; max-width: 200px;">${s.namaLengkap}</td>
                    <td class="px-2 py-2.5 text-center text-xs border-r border-b border-slate-100 bg-white z-10 sticky" style="position: sticky; left: 320px; width: 90px; min-width: 90px; max-width: 90px;">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${kelasBadge}">${s.kelas || 'Kelas 1'}</span>
                    </td>
                    <td class="px-1 py-2.5 text-center text-xs font-bold border-r border-b border-slate-100 bg-emerald-50 text-emerald-800 z-10 sticky" style="position: sticky; left: 410px; width: 40px; min-width: 40px; max-width: 40px;">${countH}</td>
                    <td class="px-1 py-2.5 text-center text-xs font-bold border-r border-b border-slate-100 bg-amber-50 text-amber-800 z-10 sticky" style="position: sticky; left: 450px; width: 40px; min-width: 40px; max-width: 40px;">${countI}</td>
                    <td class="px-1 py-2.5 text-center text-xs font-bold border-r border-b border-slate-100 bg-blue-50 text-blue-800 z-10 sticky" style="position: sticky; left: 490px; width: 40px; min-width: 40px; max-width: 40px;">${countS}</td>
                    <td class="px-1 py-2.5 text-center text-xs font-bold border-r border-b border-slate-100 bg-rose-50 text-rose-800 z-10 sticky" style="position: sticky; left: 530px; width: 40px; min-width: 40px; max-width: 40px;">${countA}</td>
                    <td class="px-1 py-2.5 text-center text-xs font-bold border-r border-b border-slate-100 bg-indigo-50 text-indigo-800 z-10 sticky" style="position: sticky; left: 570px; width: 50px; min-width: 50px; max-width: 50px;">${pct}%</td>
            `;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const key = dateStr + '|' + s.id;
                const rec = absMap[key];
                
                const dObj = new Date(year, month, day);
                const isSunday = dObj.getDay() === 0;
                const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
                const isFuture = dObj > todayEnd;

                let cellChar = '-';
                let cellClass = 'bg-slate-100 text-slate-300 hover:bg-slate-200/80';

                if (isFuture) {
                    cellChar = '-';
                    cellClass = 'bg-slate-100 text-slate-300';
                } else if (isSunday) {
                    cellChar = 'X';
                    cellClass = 'bg-slate-700 text-white font-bold';
                } else if (rec) {
                    if (rec.status === 'Hadir') {
                        cellChar = 'H';
                        cellClass = 'bg-emerald-500 text-white font-bold hover:bg-emerald-600';
                    } else if (rec.status === 'Ijin') {
                        cellChar = 'I';
                        cellClass = 'bg-amber-400 text-white font-bold hover:bg-amber-500';
                    } else if (rec.status === 'Alpha') {
                        cellChar = 'A';
                        cellClass = 'bg-rose-500 text-white font-bold hover:bg-rose-600';
                    } else if (rec.status === 'Sakit') {
                        cellChar = 'S';
                        cellClass = 'bg-blue-500 text-white font-bold hover:bg-blue-600';
                    }
                }

                const isClickable = !isFuture;
                rowHTML += `
                    <td class="p-0 border-r border-b border-slate-100 text-center ${cellClass}" style="min-width:36px; width:36px; height:36px;">
                        <button ${isClickable ? `onclick="openAbsensiEditModal('${s.id}', '${s.namaLengkap.replace(/'/g, "\\'")}', '${dateStr}')"` : 'disabled'}
                                class="w-full h-full min-h-[36px] text-[11px] font-bold flex items-center justify-center transition-all ${!isClickable ? 'cursor-default' : 'cursor-pointer'}"
                                title="${isFuture ? 'Belum terjadi' : (rec ? (rec.status + (rec.keterangan ? ': ' + rec.keterangan : '')) : (isSunday ? 'Hari Minggu' : 'Belum absen'))}">
                            ${cellChar}
                        </button>
                    </td>
                `;
            }

            rowHTML += `</tr>`;
            tbodyHTML += rowHTML;
        });

        tbody.innerHTML = tbodyHTML;
    }

    // Calculate Monthly Stats
    function calculateMonthlyStats(year, month) {
        const monthStr = String(month + 1).padStart(2, '0');
        const prefix = `${year}-${monthStr}-`;

        const classFilter = document.getElementById('abs-filter-class');
        const classVal = classFilter ? classFilter.value : 'all';

        let targetNoregs = {};
        (activeData || []).forEach(s => {
            if (classVal === 'all') {
                targetNoregs[s.id] = true;
            } else if (classVal === 'Kelas 5') {
                const num = parseInt((s.kelas || '').replace('Kelas ', ''));
                if (s.kelas === 'Kelas 5' || (!isNaN(num) && num > 5)) {
                    targetNoregs[s.id] = true;
                }
            } else if (s.kelas === classVal) {
                targetNoregs[s.id] = true;
            }
        });

        let totalHadir = 0;
        let totalIjin = 0;
        let totalAlpha = 0;
        let totalSakit = 0;

        const todayStr = new Date().toISOString().slice(0, 10); // 'yyyy-mm-dd'

        absensiData.forEach(r => {
            if (r.tanggal.startsWith(prefix) && r.tanggal <= todayStr && targetNoregs[r.noreg]) {
                if (r.status === 'Hadir') totalHadir++;
                else if (r.status === 'Ijin') totalIjin++;
                else if (r.status === 'Alpha') totalAlpha++;
                else if (r.status === 'Sakit') totalSakit++;
            }
        });

        document.getElementById('abs-stat-hadir').innerText = totalHadir;
        document.getElementById('abs-stat-ijin').innerText = totalIjin;
        document.getElementById('abs-stat-alpha').innerText = totalAlpha;
        document.getElementById('abs-stat-sakit').innerText = totalSakit;

        const grandTotal = totalHadir + totalIjin + totalAlpha + totalSakit;
        const pct = grandTotal > 0 ? Math.round((totalHadir / grandTotal) * 100) : 0;
        document.getElementById('abs-calendar-pct').innerText = `Rasio Kehadiran: ${pct}% (${totalHadir}/${grandTotal} kehadiran)`;
    }

    // Modal Edit Functions
    function openAbsensiEditModal(noreg, nama, tanggal) {
        currentEditNoreg = noreg;
        currentEditNama = nama;
        currentEditTanggal = tanggal;

        const dObj = parseDateYYYYMMDD(tanggal);
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const formattedDate = dObj ? `${dayNames[dObj.getDay()]}, ${dObj.getDate()}-${dObj.getMonth() + 1}-${dObj.getFullYear()}` : tanggal;

        document.getElementById('abs-modal-date-display').innerText = formattedDate;
        document.getElementById('abs-modal-nama-display').innerText = nama;
        document.getElementById('abs-modal-noreg-display').innerText = noreg;

        const rec = absensiData.find(r => r.tanggal === tanggal && r.noreg === noreg);
        const select = document.getElementById('abs-modal-status-select');
        const input = document.getElementById('abs-modal-ket-input');
        const autoInfo = document.getElementById('abs-modal-auto-info');

        if (select) select.value = rec ? rec.status : '';
        if (input) input.value = rec ? rec.keterangan : '';

        if (autoInfo) {
            if (rec && rec.autoGenerated) {
                autoInfo.classList.remove('hidden');
            } else {
                autoInfo.classList.add('hidden');
            }
        }

        const modal = document.getElementById('absensi-edit-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function closeAbsensiEditModal() {
        const modal = document.getElementById('absensi-edit-modal');
        if (modal) {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }
    }

    function saveAbsensiModalChanges() {
        const select = document.getElementById('abs-modal-status-select');
        const input = document.getElementById('abs-modal-ket-input');

        const newStatus = select ? select.value : '';
        const newKet = input ? input.value.trim() : '';

        const rec = absensiData.find(r => r.tanggal === currentEditTanggal && r.noreg === currentEditNoreg);

        if (!newStatus) {
            // Delete record
            if (rec && rec.rowIndex) {
                // Delete from sheet
                if (typeof google !== 'undefined') {
                    showToast('Menghapus absensi...', 'info');
                    google.script.run
                        .withSuccessHandler(res => {
                            if (res && res.success) {
                                showToast(res.message, 'success');
                                loadDashboardData();
                            } else {
                                showToast(res.message || 'Gagal menghapus.', 'error');
                            }
                        })
                        .withFailureHandler(err => {
                            showToast('Error: ' + (err.message || err), 'error');
                        })
                        .deleteAbsensi(rec.rowIndex);
                } else {
                    absensiData = absensiData.filter(r => !(r.tanggal === currentEditTanggal && r.noreg === currentEditNoreg));
                    showToast('Mode Preview: Data absensi dihapus.', 'success');
                    renderAbsensiView();
                }
            } else {
                // Was not saved in sheet or auto-generated, just refresh
                absensiData = absensiData.filter(r => !(r.tanggal === currentEditTanggal && r.noreg === currentEditNoreg));
                renderAbsensiView();
            }
            closeAbsensiEditModal();
            return;
        }

        // Save / Update record via Supabase RPC
        const payload = {
            tanggal: currentEditTanggal,
            noreg: currentEditNoreg,
            nama: currentEditNama,
            status: newStatus,
            keterangan: newKet
        };

        showToast('Menyimpan absensi...', 'info');

        fetch('/api/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveAbsensi', args: [payload] })
        })
        .then(r => r.json())
        .then(res => {
            if (res.success !== false) {
                // Update local cache
                const idx = absensiData.findIndex(r => r.tanggal === currentEditTanggal && r.noreg === currentEditNoreg);
                if (idx >= 0) {
                    absensiData[idx].status = newStatus;
                    absensiData[idx].keterangan = newKet;
                    absensiData[idx].autoGenerated = false;
                } else {
                    absensiData.push({
                        rowIndex: Date.now(),
                        no: absensiData.length + 1,
                        tanggal: currentEditTanggal,
                        noreg: currentEditNoreg,
                        nama: currentEditNama,
                        status: newStatus,
                        keterangan: newKet,
                        autoGenerated: false
                    });
                }
                showToast('Status absensi berhasil diperbarui!', 'success');
                renderAbsensiView();
            } else {
                showToast('Gagal menyimpan: ' + (res.message || 'Unknown error'), 'error');
            }
        })
        .catch(err => {
            showToast('Error koneksi: ' + err.message, 'error');
        });

        closeAbsensiEditModal();
    }

    // Export to Excel Function
    function exportAbsensiExcel() {
        const monthSelect = document.getElementById('abs-filter-month');
        const yearInput = document.getElementById('abs-filter-year');
        if (!monthSelect || !yearInput) return;

        const monthName = monthSelect.options[monthSelect.selectedIndex].text;
        const year = yearInput.value;
        const classFilter = document.getElementById('abs-filter-class');
        const classVal = classFilter ? classFilter.value : 'all';

        // Get table elements
        const table = document.getElementById('abs-calendar-table');
        if (!table) return;

        // Build HTML template suitable for Excel
        let excelHTML = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Absensi LTC - ${monthName}</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { border-collapse: collapse; }
                    th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; text-align: center; }
                    td { border: 1px solid #e2e8f0; padding: 6px; }
                    .header-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                    .header-sub { font-size: 11px; color: #64748b; margin-bottom: 20px; }
                    
                    /* Status Colors */
                    .cell-hadir { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
                    .cell-ijin { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
                    .cell-alpha { background-color: #ffe4e6; color: #991b1b; font-weight: bold; text-align: center; }
                    .cell-sakit { background-color: #dbeafe; color: #1e40af; font-weight: bold; text-align: center; }
                    .cell-sunday { background-color: #1e293b; color: #94a3b8; font-weight: bold; text-align: center; }
                    .cell-empty { color: #cbd5e1; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header-title">REKAPITULASI ABSENSI SISWA LTC</div>
                <div class="header-sub">Bulan: ${monthName} ${year} | Filter Kelas: ${classVal}</div>
                <table>
        `;

        // 1. Header
        const thead = table.querySelector('thead');
        let headerRowHTML = '<tr>';
        const headers = thead.querySelectorAll('tr th');
        headers.forEach(th => {
            // Clean up name (remove sub-labels like Sn, Mg, etc. for cleaner Excel headers)
            const cleanedText = th.innerText.split('\n')[0];
            headerRowHTML += `<th>${cleanedText}</th>`;
        });
        headerRowHTML += '</tr>';
        excelHTML += headerRowHTML;

        // 2. Rows
        const tbodyRows = table.querySelectorAll('tbody tr');
        tbodyRows.forEach(tr => {
            if (tr.cells.length === 1) { // Empty state row
                excelHTML += `<tr><td colspan="45">${tr.cells[0].innerText}</td></tr>`;
                return;
            }

            let rowHTML = '<tr>';
            for (let i = 0; i < tr.cells.length; i++) {
                const cell = tr.cells[i];
                if (i < 9) { // Static info & summary columns (No, Noreg, Nama, Kelas, H, I, S, A, %)
                    rowHTML += `<td>${cell.innerText.trim()}</td>`;
                } else { // Calendar day columns
                    const button = cell.querySelector('button');
                    const char = button ? button.innerText.trim() : '-';
                    let cls = 'cell-empty';
                    
                    if (char === 'H') cls = 'cell-hadir';
                    else if (char === 'I') cls = 'cell-ijin';
                    else if (char === 'A') cls = 'cell-alpha';
                    else if (char === 'S') cls = 'cell-sakit';
                    else if (char === 'X') cls = 'cell-sunday';

                    rowHTML += `<td class="${cls}">${char}</td>`;
                }
            }
            rowHTML += '</tr>';
            excelHTML += rowHTML;
        });

        excelHTML += `
                </table>
            </body>
            </html>
        `;

        // Create blob and download
        const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Absensi_LTC_${monthName.replace(/\s+/g, '_')}_${year}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Export excel berhasil diunduh.', 'success');
    }

