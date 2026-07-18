// ============================================
// SISWA PORTAL CLIENT STATE & WIZARD MODULE
// ============================================

var currentSiswaStep = 1;

function resetSiswaPortalForm() {
    currentSiswaStep = 1;
    
    // Reset form fields
    const form = document.getElementById('form-siswa-daily');
    if (form) form.reset();
    
    // Set default date to today for step 2 date input
    const dateInput = document.getElementById('input-siswa-tanggal');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Default presence is 'Hadir'
    const hadirRadio = document.querySelector('input[name="siswa-kehadiran"][value="Hadir"]');
    if (hadirRadio) {
        hadirRadio.checked = true;
        toggleKehadiranSiswa('Hadir');
    }

    // Go to step 1
    goToSiswaStep(1);
}

function toggleKehadiranSiswa(status) {
    const ketAbsenContainer = document.getElementById('siswa-ket-absen-container');
    const inputKetAbsen = document.getElementById('input-siswa-keterangan-absen');
    
    if (status === 'Hadir') {
        if (ketAbsenContainer) ketAbsenContainer.classList.add('hidden');
        if (inputKetAbsen) inputKetAbsen.removeAttribute('required');
    } else {
        if (ketAbsenContainer) ketAbsenContainer.classList.remove('hidden');
        if (inputKetAbsen) inputKetAbsen.setAttribute('required', 'true');
        // Reset hubungi SPV radio to 'Tidak'
        const tidakRadio = document.querySelector('input[name="siswa-hubungi-spv"][value="Tidak"]');
        if (tidakRadio) {
            tidakRadio.checked = true;
            toggleHubungiSpvSiswa('Tidak');
        }
    }

    // Update buttons layout for step 1
    if (currentSiswaStep === 1) {
        const nextBtn = document.getElementById('btn-siswa-next');
        if (nextBtn) {
            if (status === 'Hadir') {
                nextBtn.innerHTML = 'Lanjut <i class="fa-solid fa-arrow-right"></i>';
                nextBtn.className = "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/10";
            } else {
                nextBtn.innerHTML = 'Kirim Konfirmasi Kehadiran <i class="fa-solid fa-paper-plane"></i>';
                nextBtn.className = "px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/10";
            }
        }
    }
}

function toggleHubungiSpvSiswa(status) {
    const spvContainer = document.getElementById('siswa-spv-absen-container');
    if (!spvContainer) return;
    if (status === 'Ya') {
        spvContainer.classList.remove('hidden');
    } else {
        spvContainer.classList.add('hidden');
        const spvSelect = document.getElementById('input-siswa-spv-absen');
        if (spvSelect) spvSelect.value = '';
    }
}

function nextStepSiswa() {
    const presenceStatus = document.querySelector('input[name="siswa-kehadiran"]:checked')?.value || 'Hadir';

    if (currentSiswaStep === 1) {
        if (presenceStatus === 'Hadir') {
            goToSiswaStep(2);
        } else {
            // Submit absence (Ijin / Sakit) directly!
            submitSiswaAbsenceReport(presenceStatus);
        }
    } else if (currentSiswaStep === 2) {
        // Validate Step 2 inputs
        const dateInput = document.getElementById('input-siswa-tanggal');
        const shiftInput = document.getElementById('input-siswa-shift');
        const bagianInput = document.getElementById('input-siswa-bagian');
        
        if (!dateInput || !dateInput.value) {
            showToast('Pilih tanggal operasional terlebih dahulu.', 'error');
            return;
        }
        if (!shiftInput || !shiftInput.value) {
            showToast('Pilih shift kerja Anda.', 'error');
            return;
        }
        if (!bagianInput || !bagianInput.value) {
            showToast('Pilih bagian penempatan kerja Anda.', 'error');
            return;
        }

        goToSiswaStep(3);
    } else if (currentSiswaStep === 3) {
        // Validate Step 3 inputs
        const targetInput = document.getElementById('input-siswa-target');
        const hasilInput = document.getElementById('input-siswa-hasil');
        const rejectInput = document.getElementById('input-siswa-reject');
        const spvInput = document.getElementById('input-siswa-spv');

        if (!targetInput || targetInput.value === "") {
            showToast('Masukkan target rencana produksi.', 'error');
            return;
        }
        if (!hasilInput || hasilInput.value === "") {
            showToast('Masukkan hasil aktual produksi.', 'error');
            return;
        }
        if (!spvInput || !spvInput.value) {
            showToast('Pilih Supervisor penanggung jawab shift Anda.', 'error');
            return;
        }

        // Final submit
        submitSiswaDailyReport();
    }
}

function prevStepSiswa() {
    if (currentSiswaStep > 1) {
        goToSiswaStep(currentSiswaStep - 1);
    }
}

function goToSiswaStep(step) {
    currentSiswaStep = step;
    
    // Toggle containers
    document.querySelectorAll('.step-container').forEach(c => c.classList.add('hidden'));
    const container = document.getElementById('step-container-' + step);
    if (container) container.classList.remove('hidden');
    
    // Update step dot highlights
    document.querySelectorAll('.step-indicator .step-dot').forEach((dot, idx) => {
        const dotStep = idx + 1;
        if (dotStep < step) {
            dot.className = "step-dot w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-emerald-50 transition-all duration-300";
            dot.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i>';
        } else if (dotStep === step) {
            dot.className = "step-dot w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-blue-50 transition-all duration-300";
            dot.innerHTML = dotStep;
        } else {
            dot.className = "step-dot w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-all duration-300";
            dot.innerHTML = dotStep;
        }
    });

    // Update step text labels
    document.querySelectorAll('.step-indicator p').forEach((p, idx) => {
        const pStep = idx + 1;
        if (pStep === step) {
            p.className = "text-xs font-bold text-slate-800 transition-all duration-300";
        } else {
            p.className = "text-xs font-bold text-slate-400 transition-all duration-300";
        }
    });
    
    // Update buttons
    const prevBtn = document.getElementById('btn-siswa-prev');
    const nextBtn = document.getElementById('btn-siswa-next');
    
    if (prevBtn) {
        if (step === 1) {
            prevBtn.classList.add('invisible');
        } else {
            prevBtn.classList.remove('invisible');
        }
    }
    
    if (nextBtn) {
        if (step === 3) {
            nextBtn.innerHTML = 'Kirim Laporan <i class="fa-solid fa-paper-plane ml-0.5"></i>';
            nextBtn.className = "px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/10";
        } else {
            const presenceStatus = document.querySelector('input[name="siswa-kehadiran"]:checked')?.value || 'Hadir';
            if (step === 1 && presenceStatus !== 'Hadir') {
                nextBtn.innerHTML = 'Kirim Konfirmasi Kehadiran <i class="fa-solid fa-paper-plane"></i>';
                nextBtn.className = "px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/10";
            } else {
                nextBtn.innerHTML = 'Lanjut <i class="fa-solid fa-arrow-right"></i>';
                nextBtn.className = "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/10";
            }
        }
    }
}

function submitSiswaAbsenceReport(status) {
    if (!currentUser) return;
    const noreg = currentUser.studentId || currentUser.nomorRegistrasi;
    const ketAbsen = document.getElementById('input-siswa-keterangan-absen').value.trim();
    
    if (!ketAbsen) {
        showToast('Tuliskan alasan ijin / sakit Anda.', 'error');
        return;
    }

    // Validasi: apakah sudah menghubungi SPV?
    const hubungiSpvRadio = document.querySelector('input[name="siswa-hubungi-spv"]:checked');
    const sudahHubungi = hubungiSpvRadio ? hubungiSpvRadio.value : 'Tidak';
    
    if (sudahHubungi !== 'Ya') {
        showToast('Anda harus menghubungi Supervisor (SPV) terlebih dahulu sebelum dapat mengirim konfirmasi absen.', 'error');
        return;
    }
    
    const spvAbsen = document.getElementById('input-siswa-spv-absen').value;
    if (!spvAbsen) {
        showToast('Pilih nama Supervisor yang telah Anda hubungi.', 'error');
        return;
    }

    // Default to today
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateFormatted = `${dd}/${mm}/${yyyy}`;

    const payload = {
        NoReg: noreg,
        TanggalRecord: dateFormatted,
        Hadir: status,
        NamaSPV: spvAbsen,
        Keterangan: `[SPV: ${spvAbsen}] ${ketAbsen}`
    };

    _sendSiswaReport(payload);
}

function submitSiswaDailyReport() {
    if (!currentUser) return;
    const noreg = currentUser.studentId || currentUser.nomorRegistrasi;
    
    const dateVal = document.getElementById('input-siswa-tanggal').value;
    const shiftVal = document.getElementById('input-siswa-shift').value;
    const bagianVal = document.getElementById('input-siswa-bagian').value;
    const mesinVal = document.getElementById('input-siswa-mesin').value.trim();
    const modelVal = document.getElementById('input-siswa-model').value.trim();
    const targetVal = document.getElementById('input-siswa-target').value;
    const hasilVal = document.getElementById('input-siswa-hasil').value;
    const rejectVal = document.getElementById('input-siswa-reject').value || "0";
    const spvVal = document.getElementById('input-siswa-spv').value;
    const keteranganVal = document.getElementById('input-siswa-keterangan').value.trim();

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const parts = dateVal.split('-');
    const dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const payload = {
        NoReg: noreg,
        TanggalRecord: dateFormatted,
        Hadir: '✔',
        Shift: shiftVal,
        Bagian: bagianVal,
        NomorMesin: mesinVal || '-',
        Model: modelVal || '-',
        Plan: parseFloat(targetVal),
        Aktual: parseFloat(hasilVal),
        Reject: parseFloat(rejectVal),
        NamaSPV: spvVal,
        Keterangan: keteranganVal || '-'
    };

    if (payload.Plan < 0 || payload.Aktual < 0 || payload.Reject < 0) {
        showToast('Nilai target, hasil, dan reject tidak boleh negatif.', 'error');
        return;
    }

    _sendSiswaReport(payload);
}

function _sendSiswaReport(payload) {
    _updateSyncIndicator('syncing');
    
    if (typeof google !== 'undefined') {
        google.script.run.withSuccessHandler(res => {
            if (res.success) {
                showToast('Laporan harian berhasil dikirim!', 'success');
                _updateSyncIndicator('done');
                showSuccessSiswaPortal();
            } else {
                showToast('Gagal mengirim laporan: ' + res.message, 'error');
                _updateSyncIndicator('error');
            }
        }).withFailureHandler(err => {
            showToast('Error server: ' + (err.message || err.toString()), 'error');
            _updateSyncIndicator('error');
        }).saveManpowerLog(payload);
    } else {
        // Fallback for preview mode
        showToast('Mode Preview: Laporan disimpan ke database simulasi.', 'info');
        _updateSyncIndicator('done');
        
        // Mock update in local memory
        const noreg = payload.NoReg;
        const studentIdx = fallbackSiswa.findIndex(std => std.id === noreg);
        if (studentIdx !== -1) {
            const recs = fallbackSiswa[studentIdx].dailyRecords || [];
            const dateStr = payload.TanggalRecord.split('/').reverse().join('-');
            const existIdx = recs.findIndex(r => r.dateStr === dateStr);
            
            const newRec = {
                dateStr: dateStr,
                hadir: payload.Hadir,
                plan: payload.Plan || null,
                actual: payload.Aktual || null,
                reject: payload.Reject || null,
                percent: payload.Plan ? Math.round((payload.Aktual / payload.Plan) * 100) : 100,
                keterangan: payload.Keterangan || 'On duty'
            };

            if (existIdx !== -1) {
                recs[existIdx] = newRec;
            } else {
                recs.push(newRec);
            }
            fallbackSiswa[studentIdx].dailyRecords = recs;
        }

        showSuccessSiswaPortal();
    }
}

function showSuccessSiswaPortal() {
    const formView = document.getElementById('siswa-portal-form-view');
    const successView = document.getElementById('siswa-portal-success-view');
    
    if (formView) formView.classList.add('hidden');
    if (successView) successView.classList.remove('hidden');
}

function populateSiswaPortalFields() {
    if (!currentUser || currentUser.role !== 'Siswa') return;
    const noreg = currentUser.studentId || currentUser.nomorRegistrasi;
    const me = (activeData || []).find(s => String(s.id) === String(noreg));
    if (!me) return;
    
    // Set Step 1 identity fields
    const namaInput = document.getElementById('input-siswa-nama');
    const noregInput = document.getElementById('input-siswa-noreg');
    const kelasInput = document.getElementById('input-siswa-kelas');
    const masukInput = document.getElementById('input-siswa-masuk');
    const keluarInput = document.getElementById('input-siswa-keluar');
    
    if (namaInput) namaInput.value = me.namaLengkap || '';
    if (noregInput) noregInput.value = me.id || '';
    if (kelasInput) kelasInput.value = me.kelas || 'Kelas 1';
    
    const masukFormatted = me.masuk ? me.masuk.split('-').reverse().join('/') : '-';
    const keluarFormatted = me.tanggalKeluar ? me.tanggalKeluar.split('-').reverse().join('/') : (me.keluar ? me.keluar.split('-').reverse().join('/') : '-');
    
    if (masukInput) masukInput.value = masukFormatted;
    if (keluarInput) keluarInput.value = keluarFormatted;

    // Set other fields in SiswaPortal view
    const pNama = document.getElementById('siswa-portal-dashboard-nama');
    const pNoreg = document.getElementById('siswa-portal-dashboard-noreg');
    if (pNama) pNama.innerText = me.namaLengkap || '';
    if (pNoreg) pNoreg.innerText = me.id || '';

    // Calculate Average Score for this student
    let totalScore = 0;
    let daysCount = 0;
    (me.dailyRecords || []).forEach(rec => {
        if (rec.plan > 0) {
            const pct = rec.plan > 0 ? (rec.actual / rec.plan) * 100 : 0;
            totalScore += pct;
            daysCount++;
        } else if (rec.hadir === '✔' || rec.hadir === 'Hadir') {
            totalScore += 100;
            daysCount++;
        } else if (rec.hadir === 'Absen') {
            daysCount++;
        }
    });
    const avgScore = daysCount > 0 ? Math.round(totalScore / daysCount) : 0;
    const scoreValEl = document.getElementById('siswa-portal-nilai');
    if (scoreValEl) scoreValEl.innerText = avgScore + '%';
    
    // Render personal logs table
    if (typeof renderStudentPersonalLogs === 'function') {
        renderStudentPersonalLogs(me);
    }
}

function renderStudentPersonalLogs(me) {
    const tbody = document.getElementById('siswa-portal-daily-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const records = me.dailyRecords || [];
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-4 text-center text-xs text-brand-textSub italic">Belum ada rekaman harian.</td></tr>';
        return;
    }
    
    records.slice(-15).reverse().forEach(rec => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-all-300 border-b border-slate-100";
        
        let colData = "";
        const isHadirDay = (rec.plan === null || rec.plan === 0 || isNaN(rec.plan)) && (rec.hadir !== "" && rec.hadir !== undefined && rec.hadir !== null);
        
        if (isHadirDay) {
            const statusBadge = (rec.hadir === "✔" || rec.hadir === "Hadir") 
                ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">✔ Hadir</span>'
                : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">${rec.hadir}</span>`;
            colData = `
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${rec.bagian || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">-</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">-</td>
                <td class="py-3 px-4 text-center"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">100%</span></td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">-</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${rec.keterangan || '-'}</td>
            `;
        } else {
            colData = `
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${rec.bagian || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${rec.nomor_mesin || '-'} / ${rec.model || '-'}</td>
                <td class="py-3 px-4 text-brand-textMain text-xs font-semibold">T: ${rec.plan} | H: ${rec.actual}</td>
                <td class="py-3 px-4 text-center text-xs font-bold ${rec.percent >= 100 ? 'text-emerald-600' : 'text-amber-600'}">${rec.percent}%</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${rec.nama_spv || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${rec.keterangan || '-'}</td>
            `;
        }
        
        tr.innerHTML = `
            <td class="py-3 px-4 text-xs font-semibold text-brand-textMain">${rec.dateStr}</td>
            ${colData}
        `;
        tbody.appendChild(tr);
    });
}
