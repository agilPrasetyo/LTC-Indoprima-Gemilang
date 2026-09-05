// ============================================
// SISWA PORTAL CLIENT STATE & WIZARD MODULE
// ============================================

var currentSiswaStep = 1;

function getSiswaCurrentUser() {
    if (typeof window !== 'undefined' && window.currentUser) {
        return window.currentUser;
    }
    if (typeof currentUser !== 'undefined' && currentUser) {
        return currentUser;
    }
    if (typeof localStorage !== 'undefined') {
        try {
            const saved = localStorage.getItem('currentUser');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
    }
    if (typeof window !== 'undefined' && window.FORCED_ROLE === 'Siswa') {
        return {
            namaLengkap: 'SISWA TESTING (SIMULASI)',
            nomorRegistrasi: 'TEST-001',
            noreg: 'TEST-001',
            role: 'Siswa',
            kelas: 'Kelas 1',
            masuk: '2026-08-01',
            section: 'GRINDING',
            departemen: 'PRODUKSI',
            spv: "MOHAMMAT YASIR MA'ARIF"
        };
    }
    return null;
}

function openSiswaTutorialModal() {
    const modal = document.getElementById('modal-siswa-tutorial');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeSiswaTutorialModal() {
    const modal = document.getElementById('modal-siswa-tutorial');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function openAdminWhatsAppHelp() {
    const inputNama = document.getElementById('input-siswa-nama')?.value || '';
    const user = getSiswaCurrentUser();
    const userNama = user && user.namaLengkap ? user.namaLengkap : '';
    const namaSiswa = (userNama || inputNama || 'Siswa LTC').trim();
    
    const messageText = `Halo, nama saya ${namaSiswa}, saya butuh bantuan pengisian formulir laporan harian.`;
    const waUrl = `https://wa.me/6285171236206?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
}

function resetSiswaPortalForm() {
    currentSiswaStep = 1;
    
    // Explicitly show form view & hide success view
    const formView = document.getElementById('siswa-portal-form-view');
    const successView = document.getElementById('siswa-portal-success-view');
    if (formView) formView.classList.remove('hidden');
    if (successView) successView.classList.add('hidden');

    // Reset form fields
    const form = document.getElementById('form-siswa-daily');
    if (form) form.reset();

    // Reset dynamic state
    produkRowCounter = 0;
    selectedMaintenanceMachines = [];
    const list = document.getElementById('produksi-products-list');
    if (list) list.innerHTML = '';
    
    // Set default date to today for step 2 date input & step 1 absence date input
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${yyyy}-${mm}-${dd}`;

    const dateInput = document.getElementById('input-siswa-tanggal');
    if (dateInput) dateInput.value = todayFormatted;

    const dateInputAbsen = document.getElementById('input-siswa-tanggal-absen');
    if (dateInputAbsen) dateInputAbsen.value = todayFormatted;

    // Default presence is 'Hadir'
    const hadirRadio = document.querySelector('input[name="siswa-kehadiran"][value="Hadir"]');
    if (hadirRadio) {
        hadirRadio.checked = true;
        toggleKehadiranSiswa('Hadir');
    }

    // Go to step 1
    goToSiswaStep(1);
}

function nextStepSiswa() {
    const presenceStatus = document.querySelector('input[name="siswa-kehadiran"]:checked')?.value || 'Hadir';

    if (currentSiswaStep === 1) {
        if (presenceStatus === 'Hadir') {
            goToSiswaStep(2);
        } else {
            // Submit absence (Ijin / Sakit) directly
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

        onSiswaBagianChanged();
        goToSiswaStep(3);
    } else if (currentSiswaStep === 3) {
        // Submit Daily Report
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
    
    // Update Horizontal Progress Bar & Step Pills UI
    const stepTitles = {
        1: 'Langkah 1 dari 3: Identitas Siswa',
        2: 'Langkah 2 dari 3: Detail Operasional',
        3: 'Langkah 3 dari 3: Hasil & Validasi'
    };
    const stepPercents = { 1: '33.33%', 2: '66.66%', 3: '100%' };

    const titleEl = document.getElementById('step-progress-title');
    if (titleEl) titleEl.innerText = stepTitles[step] || 'Langkah ' + step;

    const percentEl = document.getElementById('step-progress-percent');
    if (percentEl) percentEl.innerText = step === 1 ? '33%' : (step === 2 ? '66%' : '100%');

    const progressBarEl = document.getElementById('step-progress-bar');
    if (progressBarEl) progressBarEl.style.width = stepPercents[step] || (step * 33.33) + '%';

    // Update 3 Step Pills
    [1, 2, 3].forEach(i => {
        const pill = document.getElementById('step-pill-' + i);
        if (!pill) return;
        const numDot = pill.querySelector('.pill-num');
        if (i < step) {
            pill.className = "flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 transition-all duration-300";
            if (numDot) {
                numDot.className = "pill-num w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]";
                numDot.innerHTML = '<i class="fa-solid fa-check text-[7px]"></i>';
            }
        } else if (i === step) {
            pill.className = "flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-all duration-300";
            if (numDot) {
                numDot.className = "pill-num w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center text-[9px]";
                numDot.innerText = i;
            }
        } else {
            pill.className = "flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold bg-white text-slate-400 border border-slate-200/80 transition-all duration-300";
            if (numDot) {
                numDot.className = "pill-num w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px]";
                numDot.innerText = i;
            }
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
                const sudahHubungi = document.querySelector('input[name="siswa-hubungi-spv"]:checked')?.value || 'Tidak';
                const btnLabel = presenceStatus === 'Off' ? 'Kirim Konfirmasi Off / Libur' : 
                                 (presenceStatus === 'Ijin' ? 'Kirim Konfirmasi Ijin' : 
                                 (presenceStatus === 'Sakit' ? 'Kirim Konfirmasi Sakit' : 'Kirim Konfirmasi Kehadiran'));
                if (sudahHubungi === 'Ya') {
                    nextBtn.innerHTML = `${btnLabel} <i class="fa-solid fa-paper-plane"></i>`;
                    nextBtn.className = "px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer";
                    nextBtn.title = '';
                } else {
                    nextBtn.innerHTML = `<i class="fa-solid fa-lock text-[10px]"></i> ${btnLabel}`;
                    nextBtn.className = "px-6 py-2.5 bg-slate-300 text-slate-500 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-not-allowed shadow-none";
                    nextBtn.title = 'Konfirmasi ke Supervisor (SPV) terlebih dahulu';
                }
            } else {
                nextBtn.innerHTML = 'Lanjut <i class="fa-solid fa-arrow-right"></i>';
                nextBtn.className = "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/10";
                nextBtn.title = '';
            }
        }
    }
}

function submitSiswaAbsenceReport(status) {
    const user = getSiswaCurrentUser();
    const noreg = user ? (user.studentId || user.nomorRegistrasi || user.noreg || user.id) : 'TEST-001';
    const labelStatus = status === 'Off' ? 'Off / Libur' : status;

    // 1. Validasi konfirmasi ke SPV (wajib 'Ya', jika belum maka tidak bisa submit)
    const hubungiSpvRadio = document.querySelector('input[name="siswa-hubungi-spv"]:checked');
    const sudahHubungi = hubungiSpvRadio ? hubungiSpvRadio.value : 'Tidak';
    
    if (sudahHubungi !== 'Ya') {
        showToast(`Anda belum konfirmasi ke Supervisor (SPV). Harap konfirmasi ke SPV terlebih dahulu sebelum mengirim laporan ${labelStatus}!`, 'error');
        const spvRadio = document.querySelector('input[name="siswa-hubungi-spv"]');
        if (spvRadio) spvRadio.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    
    // 2. Validasi Supervisor yang dipilih
    const spvAbsen = document.getElementById('input-siswa-spv-absen')?.value || '';
    if (!spvAbsen) {
        showToast('Pilih nama Supervisor (SPV) yang telah Anda hubungi / konfirmasi.', 'error');
        const spvSelect = document.getElementById('input-siswa-spv-absen');
        if (spvSelect) spvSelect.focus();
        return;
    }

    // 3. Validasi Tanggal
    const dateInputAbsen = document.getElementById('input-siswa-tanggal-absen');
    const dateInput = document.getElementById('input-siswa-tanggal');
    const targetDateInput = (dateInputAbsen && dateInputAbsen.value) ? dateInputAbsen : dateInput;
    
    if (!targetDateInput || !targetDateInput.value) {
        showToast('Tentukan tanggal laporan ketidakhadiran terlebih dahulu.', 'error');
        if (dateInputAbsen) dateInputAbsen.focus();
        return;
    }

    // 4. Validasi Alasan
    const ketAbsen = document.getElementById('input-siswa-keterangan-absen')?.value.trim() || '';
    if (!ketAbsen) {
        showToast(`Tuliskan alasan ${labelStatus} Anda secara jelas.`, 'error');
        const ketInput = document.getElementById('input-siswa-keterangan-absen');
        if (ketInput) ketInput.focus();
        return;
    }

    let dateFormatted = '';
    if (targetDateInput && targetDateInput.value) {
        const parts = targetDateInput.value.split('-');
        if (parts.length === 3) {
            dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    
    if (!dateFormatted) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        dateFormatted = `${dd}/${mm}/${yyyy}`;
    }

    // Susun keterangan: sertakan prefix OFF secara eksplisit jika status Off
    const finalKeterangan = status === 'Off' 
        ? `OFF - [SPV: ${spvAbsen}] ${ketAbsen}` 
        : `[SPV: ${spvAbsen}] ${ketAbsen}`;

    const payload = {
        NoReg: noreg,
        TanggalRecord: dateFormatted,
        Hadir: status,
        NamaSPV: spvAbsen,
        Plan: 0,
        Aktual: 0,
        Reject: 0,
        Keterangan: finalKeterangan
    };

    _sendSiswaReport(payload);
}

function submitSiswaDailyReport() {
    const user = getSiswaCurrentUser();
    const noreg = user ? (user.studentId || user.nomorRegistrasi || user.noreg || user.id) : 'TEST-001';
    
    const dateVal = document.getElementById('input-siswa-tanggal')?.value || '';
    const shiftVal = document.getElementById('input-siswa-shift')?.value || '';
    const bagianVal = document.getElementById('input-siswa-bagian')?.value || '';
    const spvVal = document.getElementById('input-siswa-spv')?.value || '';
    const keteranganVal = document.getElementById('input-siswa-keterangan')?.value.trim() || '';

    if (!spvVal) {
        showToast('Pilih Supervisor penanggung jawab shift Anda.', 'error');
        return;
    }

    const mode = getSectionCategory(bagianVal);
    let plan = 0;
    let aktual = 0;
    let reject = 0;
    let model = '-';
    let mesin = '-';

    if (mode === 'PRODUKSI') {
        mesin = document.getElementById('input-siswa-mesin')?.value.trim() || '-';
        const rows = document.querySelectorAll('.produk-row-item');
        if (rows.length === 0) {
            showToast('Minimal harus ada 1 model produk diinput.', 'error');
            return;
        }

        const modelList = [];
        let hasValidRow = false;
        rows.forEach(row => {
            const mName = row.querySelector('.input-row-model')?.value.trim();
            const isManual = row.dataset.targetManual === 'true';
            const targetSpan = row.querySelector('.row-target-val');
            const manualInput = row.querySelector('.input-row-manual-target');
            const actInput = row.querySelector('.input-row-actual');
            const rejInput = row.querySelector('.input-row-reject');

            let p = 0;
            if (isManual) {
                p = Math.max(0, parseInt(manualInput?.value || '0', 10) || 0);
            } else {
                p = parseInt(targetSpan?.innerText || '0', 10) || 0;
            }

            const a = Math.max(0, parseInt(actInput?.value || '0', 10) || 0);
            const r = Math.max(0, parseInt(rejInput?.value || '0', 10) || 0);

            if (mName) {
                hasValidRow = true;
                modelList.push(`${mName} (T:${p}, H:${a}, R:${r})`);
            }
            plan += p;
            aktual += a;
            reject += r;
        });

        if (!hasValidRow) {
            showToast('Ketik nama model produk yang Anda kerjakan.', 'error');
            return;
        }
        model = modelList.join('; ');
    } else if (mode === 'MELTING') {
        mesin = document.getElementById('input-melting-tungku')?.value.trim() || 'TUNGKU INDUKSI';
        const mat = document.getElementById('input-melting-material')?.value || 'LOGAM CAIR';
        const suhu = document.getElementById('input-melting-suhu')?.value || '';
        const pHeat = Math.max(0, parseInt(document.getElementById('input-melting-target')?.value || '0', 10) || 0);
        const aHeat = Math.max(0, parseInt(document.getElementById('input-melting-aktual')?.value || '0', 10) || 0);

        const checkboxes = document.querySelectorAll('.melting-task-checkbox');
        let totalSop = checkboxes.length;
        let doneSop = 0;
        checkboxes.forEach(cb => {
            if (cb.checked) doneSop++;
        });

        const hasHeat = (pHeat > 0 || aHeat > 0);
        const hasSop = (doneSop > 0);

        if (!hasHeat && !hasSop) {
            showToast('Isi hasil peleburan (Heat) atau centang checklist SOP tungku.', 'error');
            return;
        }

        let heatEff = 100;
        if (pHeat > 0) heatEff = Math.round((aHeat / pHeat) * 100);
        else if (aHeat > 0) heatEff = 100;

        let sopEff = totalSop > 0 ? Math.round((doneSop / totalSop) * 100) : 0;

        if (hasHeat && hasSop) {
            // Skema 50% : 50% Kombinasi
            const finalEff = Math.round((heatEff + sopEff) / 2);
            plan = 100;
            aktual = finalEff;
            reject = 0;
            model = `PELEBURAN: ${mat} (${aHeat}/${pHeat} Heat${suhu ? `, ${suhu}°C` : ''}) + SOP TUNGKU (${doneSop}/${totalSop})`;
        } else if (hasHeat) {
            plan = pHeat > 0 ? pHeat : aHeat;
            aktual = aHeat;
            reject = 0;
            model = `PELEBURAN: ${mat}${suhu ? ` (${suhu}°C)` : ''}`;
        } else {
            plan = 100;
            aktual = sopEff;
            reject = 0;
            model = `SOP OPERASIONAL & PERAWATAN TUNGKU (${doneSop}/${totalSop})`;
        }
    } else if (mode === 'QC') {
        model = document.getElementById('input-qc-model')?.value.trim() || 'QC INSPECTION';
        mesin = document.getElementById('input-qc-mesin')?.value.trim() || '-';
        plan = Math.max(0, parseInt(document.getElementById('input-qc-target')?.value || '0', 10) || 0);
        aktual = Math.max(0, parseInt(document.getElementById('input-qc-hasil')?.value || '0', 10) || 0);
        reject = Math.max(0, parseInt(document.getElementById('input-qc-reject')?.value || '0', 10) || 0);

        if (!model) {
            showToast('Masukkan model atau aktivitas pengujian QC.', 'error');
            return;
        }
    } else {
        // Mode SUPPORT / ADMIN / PPIC / MAINTENANCE
        const checkboxes = document.querySelectorAll('.task-checkbox-item');
        const chkExtra = document.getElementById('chk-tugas-tambahan');
        const extraDesc = document.getElementById('input-tugas-tambahan-desc')?.value.trim() || '';

        let totalItems = checkboxes.length;
        let checkedCount = 0;
        const doneTasks = [];

        checkboxes.forEach((cb, idx) => {
            if (cb.checked) {
                checkedCount++;
                const taskLabel = cb.closest('label')?.innerText.trim() || `Tugas ${idx + 1}`;
                doneTasks.push(taskLabel);
            }
        });

        if (chkExtra && chkExtra.checked) {
            totalItems += 1;
            checkedCount += 1;
            if (extraDesc) doneTasks.push(`[Extra] ${extraDesc}`);
        }

        const percent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 100;
        plan = 100;
        aktual = percent;
        reject = 0;
        model = 'CHECKLIST TUGAS HARIAN';

        if (bagianVal.toUpperCase().trim() === 'MAINTENANCE') {
            const customMach = document.getElementById('input-maintenance-mesin-custom')?.value.trim() || '';
            const allMach = [...selectedMaintenanceMachines];
            if (customMach) allMach.push(customMach);
            mesin = allMach.length > 0 ? allMach.join(', ') : 'WORKSHOP / UTILITY';
        } else {
            mesin = '-';
        }
    }

    // Convert YYYY-MM-DD to DD/MM/YYYY
    let dateFormatted = '';
    if (dateVal) {
        const parts = dateVal.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!dateFormatted) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        dateFormatted = `${dd}/${mm}/${yyyy}`;
    }

    const payload = {
        NoReg: noreg,
        TanggalRecord: dateFormatted,
        Hadir: '✔',
        Shift: shiftVal,
        Bagian: bagianVal,
        NomorMesin: mesin,
        Model: model,
        Plan: plan,
        Aktual: aktual,
        Reject: reject,
        NamaSPV: spvVal,
        Keterangan: keteranganVal || '-'
    };

    _sendSiswaReport(payload);
}

function _sendSiswaReport(payload) {
    if (typeof _updateSyncIndicator === 'function') {
        _updateSyncIndicator('syncing');
    }
    
    const runner = (typeof executeRpcCall === 'function' ? executeRpcCall : (typeof window !== 'undefined' && window.executeRpcCall ? window.executeRpcCall : executeGASCall));
    runner('saveManpowerLog', [payload])
        .then(res => {
            if (res && res.success !== false) {
                showToast('Laporan harian berhasil dikirim!', 'success');
                if (typeof _updateSyncIndicator === 'function') _updateSyncIndicator('done');
                showSuccessSiswaPortal();
            } else {
                showToast('Gagal mengirim laporan: ' + ((res && res.message) || 'Unknown error'), 'error');
                if (typeof _updateSyncIndicator === 'function') _updateSyncIndicator('error');
            }
        })
        .catch(err => {
            showToast('Error server: ' + (err.message || err.toString()), 'error');
            if (typeof _updateSyncIndicator === 'function') _updateSyncIndicator('error');
        });
}

function showSuccessSiswaPortal() {
    const formView = document.getElementById('siswa-portal-form-view');
    const successView = document.getElementById('siswa-portal-success-view');
    const dashboardView = document.getElementById('siswa-portal-dashboard-view');
    
    if (formView) formView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (successView) successView.classList.remove('hidden');
}

function backToSiswaForm() {
    const formView = document.getElementById('siswa-portal-form-view');
    const successView = document.getElementById('siswa-portal-success-view');
    const dashboardView = document.getElementById('siswa-portal-dashboard-view');
    
    if (dashboardView) dashboardView.classList.add('hidden');
    if (successView) successView.classList.add('hidden');
    if (formView) formView.classList.remove('hidden');
    
    resetSiswaPortalForm();
}

function switchSiswaTab(tab) {
    const btnKinerja = document.getElementById('siswa-tab-btn-kinerja');
    const btnAbsensi = document.getElementById('siswa-tab-btn-absensi');
    const contentKinerja = document.getElementById('siswa-tab-content-kinerja');
    const contentAbsensi = document.getElementById('siswa-tab-content-absensi');

    if (tab === 'kinerja') {
        if (btnKinerja) {
            btnKinerja.className = "siswa-tab-btn pb-3 text-xs font-bold border-b-2 border-blue-600 text-blue-600 transition-all duration-200";
        }
        if (btnAbsensi) {
            btnAbsensi.className = "siswa-tab-btn pb-3 text-xs font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all duration-200";
        }
        if (contentKinerja) contentKinerja.classList.remove('hidden');
        if (contentAbsensi) contentAbsensi.classList.add('hidden');
    } else {
        if (btnAbsensi) {
            btnAbsensi.className = "siswa-tab-btn pb-3 text-xs font-bold border-b-2 border-blue-600 text-blue-600 transition-all duration-200";
        }
        if (btnKinerja) {
            btnKinerja.className = "siswa-tab-btn pb-3 text-xs font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all duration-200";
        }
        if (contentAbsensi) contentAbsensi.classList.remove('hidden');
        if (contentKinerja) contentKinerja.classList.add('hidden');
    }
}

function toggleKehadiranSiswa(status) {
    const ketAbsenContainer = document.getElementById('siswa-ket-absen-container');
    const inputKetAbsen = document.getElementById('input-siswa-keterangan-absen');
    const dateInputAbsen = document.getElementById('input-siswa-tanggal-absen');
    const textTanggalAbsen = document.getElementById('text-siswa-tanggal-absen');
    const textAlasanAbsen = document.getElementById('text-siswa-alasan-absen');
    
    if (status === 'Hadir') {
        if (ketAbsenContainer) ketAbsenContainer.classList.add('hidden');
        if (inputKetAbsen) inputKetAbsen.removeAttribute('required');
    } else {
        if (ketAbsenContainer) ketAbsenContainer.classList.remove('hidden');
        if (inputKetAbsen) inputKetAbsen.setAttribute('required', 'true');
        if (dateInputAbsen && !dateInputAbsen.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInputAbsen.value = `${yyyy}-${mm}-${dd}`;
        }

        // Dynamic labels & placeholders
        if (textTanggalAbsen) {
            if (status === 'Off') textTanggalAbsen.innerText = 'Tanggal Off / Libur';
            else if (status === 'Ijin') textTanggalAbsen.innerText = 'Tanggal Ijin';
            else if (status === 'Sakit') textTanggalAbsen.innerText = 'Tanggal Sakit';
            else textTanggalAbsen.innerText = 'Tanggal Absen';
        }
        if (textAlasanAbsen) {
            if (status === 'Off') textAlasanAbsen.innerText = 'Alasan Off / Libur';
            else if (status === 'Ijin') textAlasanAbsen.innerText = 'Alasan Ijin';
            else if (status === 'Sakit') textAlasanAbsen.innerText = 'Alasan Sakit / Diagnosa Singkat';
            else textAlasanAbsen.innerText = 'Keterangan / Alasan Absen';
        }
        if (inputKetAbsen) {
            if (status === 'Off') {
                inputKetAbsen.placeholder = 'Tuliskan alasan Off / Libur secara jelas (contoh: Libur Shift berkala, Ganti Jam kerja, Over Jam lembur, dsb)...';
            } else if (status === 'Ijin') {
                inputKetAbsen.placeholder = 'Tuliskan keperluan ijin Anda secara jelas...';
            } else if (status === 'Sakit') {
                inputKetAbsen.placeholder = 'Tuliskan gejala sakit atau surat istirahat dokter...';
            } else {
                inputKetAbsen.placeholder = 'Tuliskan alasan secara jelas...';
            }
        }

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
                nextBtn.className = "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer";
                nextBtn.title = '';
            } else {
                toggleHubungiSpvSiswa('Tidak');
            }
        }
    }
}

function toggleHubungiSpvSiswa(status) {
    const spvContainer = document.getElementById('siswa-spv-absen-container');
    const warningBelum = document.getElementById('siswa-spv-warning-belum');
    const spvSelect = document.getElementById('input-siswa-spv-absen');
    const presenceStatus = document.querySelector('input[name="siswa-kehadiran"]:checked')?.value || 'Hadir';

    if (status === 'Ya') {
        if (spvContainer) spvContainer.classList.remove('hidden');
        if (warningBelum) warningBelum.classList.add('hidden');
        if (spvSelect) spvSelect.setAttribute('required', 'true');
    } else {
        if (spvContainer) spvContainer.classList.add('hidden');
        if (warningBelum) warningBelum.classList.remove('hidden');
        if (spvSelect) {
            spvSelect.removeAttribute('required');
            spvSelect.value = '';
        }
    }

    // Update submit button visual state on step 1
    if (currentSiswaStep === 1 && presenceStatus !== 'Hadir') {
        const nextBtn = document.getElementById('btn-siswa-next');
        if (nextBtn) {
            const btnLabel = presenceStatus === 'Off' ? 'Kirim Konfirmasi Off / Libur' : 
                             (presenceStatus === 'Ijin' ? 'Kirim Konfirmasi Ijin' : 
                             (presenceStatus === 'Sakit' ? 'Kirim Konfirmasi Sakit' : 'Kirim Konfirmasi Kehadiran'));
            if (status === 'Ya') {
                nextBtn.innerHTML = `${btnLabel} <i class="fa-solid fa-paper-plane"></i>`;
                nextBtn.className = "px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer";
                nextBtn.title = '';
            } else {
                nextBtn.innerHTML = `<i class="fa-solid fa-lock text-[10px]"></i> ${btnLabel}`;
                nextBtn.className = "px-6 py-2.5 bg-slate-300 text-slate-500 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-not-allowed shadow-none";
                nextBtn.title = 'Konfirmasi ke Supervisor (SPV) terlebih dahulu';
            }
        }
    }
}

// ============================================
// MASTER DATA CATALOG & SECTION DEFINITIONS
// ============================================

var masterProdukCatalog = [];
var selectedMaintenanceMachines = [];
var produkRowCounter = 0;

// Load master product catalog from JSON
function loadMasterProdukCatalog() {
    if (masterProdukCatalog.length > 0) return Promise.resolve(masterProdukCatalog);
    return fetch('/data/master_output_produk.json')
        .then(res => res.json())
        .then(data => {
            masterProdukCatalog = data || [];
            updateProductDatalist();
            return masterProdukCatalog;
        })
        .catch(err => {
            console.warn('[Siswa Portal] Gagal memuat master_output_produk.json:', err);
            return [];
        });
}

// Ensure catalog is loaded on page startup & immediately populate student fields
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        loadMasterProdukCatalog();
        setTimeout(() => {
            if (typeof populateSiswaPortalFields === 'function') {
                populateSiswaPortalFields();
            }
        }, 50);
    });
}

// Master Task Checklist Definitions for Support / Admin Sections
const SECTION_TASKS_MAP = {
    'PPIC': [
        'Bongkar muat / penurunan material dari truck (pasir RCS, resin, blanket, kabel, dll)',
        'Penurunan, penataan, men-strapping, dan me-wrapping peti scrap',
        'Pemindahan scrap ke area scrap / menuang ke bak merah besar',
        'Cek fisik & penghitungan stok material di gudang (Stock Opname)',
        'Distribusi / pemindahan material incoming ke area lini produksi',
        'Update kartu stok (bincard) gudang material',
        'Update papan kontrol material & papan line material',
        'Penempelan barcode material & pengelolaan barang return/limbah'
    ],
    'ADM PRODUKSI': [
        'Penyebaran RPH (Rencana Produksi Harian) ke setiap line produksi sesuai jadwal',
        'Cetak / sediakan form produksi yang habis di area lini',
        'Pengambilan seluruh checksheet produksi dari masing-masing line',
        'Input data laporan produksi harian secara berkala',
        'Input hasil produksi ke sistem ERP (Dynamics AX)',
        'Pembuatan / rekap jadwal produksi mingguan'
    ],
    'ADMIN PRODUKSI': [
        'Penyebaran RPH (Rencana Produksi Harian) ke setiap line produksi sesuai jadwal',
        'Cetak / sediakan form produksi yang habis di area lini',
        'Pengambilan seluruh checksheet produksi dari masing-masing line',
        'Input data laporan produksi harian secara berkala',
        'Input hasil produksi ke sistem ERP (Dynamics AX)',
        'Pembuatan / rekap jadwal produksi mingguan'
    ],
    'ADM MAINTENANCE': [
        'Melayani & mencatat bon permintaan barang / sparepart teknisi',
        'Serah terima & pengecekan barang masuk dari supplier',
        'Input data log / kartu stok pengambilan barang gudang maintenance',
        'Penataan, penataan ulang, & sortir stok barang gudang maintenance',
        'Pembuangan sampah jerigen, kardus, & limbah material ke belakang pabrik',
        'Pengecekan akhir shift (kebersihan meja, mematikan perangkat elektronik, dan penguncian pintu gudang)'
    ],
    'ADMIN MAINTENANCE': [
        'Melayani & mencatat bon permintaan barang / sparepart teknisi',
        'Serah terima & pengecekan barang masuk dari supplier',
        'Input data log / kartu stok pengambilan barang gudang maintenance',
        'Penataan, penataan ulang, & sortir stok barang gudang maintenance',
        'Pembuangan sampah jerigen, kardus, & limbah material ke belakang pabrik',
        'Pengecekan akhir shift (kebersihan meja, mematikan perangkat elektronik, dan penguncian pintu gudang)'
    ],
    'ADM PPIC': [
        'Pembuatan Surat Jalan (SJ) pengiriman',
        'Pembuatan & rekap Back Order (BO)',
        'Pencatatan & rekap administrasi penerimaan/pengeluaran barang',
        'Filing & pengarsipan dokumen pengiriman harian'
    ],
    'ADMIN PPIC': [
        'Pembuatan Surat Jalan (SJ) pengiriman',
        'Pembuatan & rekap Back Order (BO)',
        'Pencatatan & rekap administrasi penerimaan/pengeluaran barang',
        'Filing & pengarsipan dokumen pengiriman harian'
    ],
    'ADMIN': [
        'Penyebaran RPH (Rencana Produksi Harian) ke setiap line produksi sesuai jadwal',
        'Cetak / sediakan form produksi yang habis di area lini',
        'Pengambilan seluruh checksheet produksi dari masing-masing line',
        'Input data laporan produksi harian secara berkala',
        'Input hasil produksi ke sistem ERP (Dynamics AX)',
        'Pembuatan / rekap jadwal produksi mingguan'
    ],
    'SHE': [
        'Inspeksi rutin kelayakan APAR & Kotak P3K di seluruh area',
        'Pengecekan & patroli kepatuhan APD kerja (helm, kacamata, masker, dll)',
        'Pembuatan & pemasangan media K3 (pamflet warning, rambu, materi Canva)',
        'Pendampingan / pelayanan program kesehatan kerja (cek gula darah, tensi)',
        'Rekap & dokumentasi laporan kegiatan safety harian'
    ],
    'SHE (SAFETY K3)': [
        'Inspeksi rutin kelayakan APAR & Kotak P3K di seluruh area',
        'Pengecekan & patroli kepatuhan APD kerja (helm, kacamata, masker, dll)',
        'Pembuatan & pemasangan media K3 (pamflet warning, rambu, materi Canva)',
        'Pendampingan / pelayanan program kesehatan kerja (cek gula darah, tensi)',
        'Rekap & dokumentasi laporan kegiatan safety harian'
    ],
    'MAINTENANCE': [
        'Preventive Maintenance (PM) & inspeksi rutin mesin produksi',
        'Penanganan & perbaikan trouble / breakdown mesin darurat',
        'Pekerjaan fabrikasi / pengelasan / perbaikan komponen pendukung',
        'Setting & kalibrasi parameter mesin (FBO, Joult Squeeze, Mixer, Crane)',
        'Perawatan tools & 5S area workshop maintenance'
    ],
    'ENGINEERING DRAFTER': [
        'Pembuatan gambar kerja 2D / 3D CAD part atau cetakan',
        'Revisi & modifikasi gambar teknik sesuai instruksi SPV',
        'Pengukuran & verifikasi dimensi fisik benda kerja di lapangan',
        'Pengarsipan & penomoran dokumen gambar teknik'
    ],
    'DRAFTER': [
        'Pembuatan gambar kerja 2D / 3D CAD part atau cetakan',
        'Revisi & modifikasi gambar teknik sesuai instruksi SPV',
        'Pengukuran & verifikasi dimensi fisik benda kerja di lapangan',
        'Pengarsipan & penomoran dokumen gambar teknik'
    ],
    'IRGA': [
        'Administrasi & rekap absensi / kehadiran karyawan harian',
        'Pelayanan kebutuhan logistik & operasional umum kantor',
        'Pengelolaan dokumen personil & arsip kepersonaliaan',
        '5S dan pengawasan kerapian area kantor / fasilitas umum'
    ],
    'PATTERN': [
        'Pemeriksaan dimensi & kondisi visual master pattern / corebox',
        'Perbaikan / modifikasi pola kayu, resin, atau aluminium',
        'Pembuatan tooling & jig pendukung cetakan',
        'Pencatatan riwayat pattern & penyimpanan di rak master pattern'
    ],
    'MELTING': [
        'Pengecekan kondisi lining tungku induksi & sistem pendingin',
        'Penimbangan material charging (pig iron, scrap, ferro alloy)',
        'Monitoring proses peleburan, temperatur, dan slagging',
        'Pencatatan parameter suhu & waktu lebur per heat/tuntung'
    ],
    'LADLE': [
        'Pemanasan (preheating) ladle sebelum proses tuang',
        'Pengecekan & perbaikan lapisan refraktori ladle',
        'Penimbangan & inokulasi cairan logam pada ladle',
        'Pembersihan kerak / terak pada ladle setelah pouring'
    ],
    'LADDLE': [
        'Pemanasan (preheating) ladle sebelum proses tuang',
        'Pengecekan & perbaikan lapisan refraktori ladle',
        'Penimbangan & inokulasi cairan logam pada ladle',
        'Pembersihan kerak / terak pada ladle setelah pouring'
    ],
    'GALAH IBK': [
        'Persiapan & perakitan cetakan galah IBK',
        'Pengecekan saluran tuang (sprue, runner, riser)',
        'Pengawasan proses tuang dan pembongkaran hasil cetak',
        'Pembersihan rangka cetakan dan 5S area kerja'
    ]
};

const MAINTENANCE_MACHINES_LIST = [
    'MESIN FBO / MOULDING LINE',
    'MESIN JOULT SQUEEZE',
    'MIXER FURAN & SCREW',
    'CRANE / HOIST / MAGNET',
    'KOMPRESOR & POMPA',
    'GENSET & PANEL LISTRIK',
    'MESIN SHOTBLAST',
    'MESIN COREMAKING',
    'GERINDA & BUBUT',
    'FASILITAS UMUM / UTILITY'
];

function getDepartmentBySection(bagian) {
    const s = (bagian || '').toUpperCase().trim();
    if (['GRINDING', 'PAINTING', 'CORE', 'SHOTBLAST', 'FURAN', 'FETTLING', 'FETLING', 'CNC / MACHINING', 'MELTING', 'GALAH IBK', 'PPIC', 'ADM PPIC', 'ADM PRODUKSI'].includes(s)) {
        return 'PRODUKSI';
    }
    if (['PATTERN', 'LADLE', 'LADDLE', 'MAINTENANCE', 'ADM MAINTENANCE', 'ENGINEERING DRAFTER', 'DRAFTER'].includes(s)) {
        return 'ENGINEERING';
    }
    if (['IRGA', 'SHE (SAFETY K3)', 'SHE'].includes(s)) {
        return 'PERSONALIA & SHE';
    }
    if (['QC POURING', 'QC LAB PASIR', 'QC LAB LOGAM', 'QC'].includes(s)) {
        return 'QUALITY CONTROL';
    }
    return 'PRODUKSI';
}

function getSectionCategory(bagian) {
    const bg = (bagian || '').toUpperCase().trim();
    if (bg === 'MELTING') {
        return 'MELTING';
    }
    if (['GRINDING', 'PAINTING', 'CORE', 'SHOTBLAST', 'FURAN', 'FETTLING', 'FETLING', 'CNC / MACHINING', 'GALAH IBK'].includes(bg)) {
        return 'PRODUKSI';
    }
    if (['QC POURING', 'QC LAB PASIR', 'QC LAB LOGAM'].includes(bg)) {
        return 'QC';
    }
    return 'SUPPORT';
}

function updateProductDatalist() {
    // Refresh any open model dropdowns when bagian changes
    const openProduksiDropdowns = document.querySelectorAll('.model-dropdown-list:not(.hidden)');
    openProduksiDropdowns.forEach(list => {
        const row = list.closest('.produk-row-item');
        if (row) renderModelDropdown(row.id, false);
    });
    const qcList = document.getElementById('qc-model-dropdown-list');
    if (qcList && !qcList.classList.contains('hidden')) {
        renderModelDropdown('qc', true);
    }
}

function getSortedMasterProducts(query = '', bagian = '') {
    const bg = bagian || document.getElementById('input-siswa-bagian')?.value || '';
    const sectionTargetKey = getSectionTargetColumn(bg);
    const q = (query || '').trim().toUpperCase();

    let filtered = masterProdukCatalog || [];
    if (q) {
        filtered = filtered.filter(p => (p.nama || '').toUpperCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
        const targetA = (a.targets && a.targets[sectionTargetKey]) || 0;
        const targetB = (b.targets && b.targets[sectionTargetKey]) || 0;
        if (targetA > 0 && targetB === 0) return -1;
        if (targetB > 0 && targetA === 0) return 1;
        return (a.nama || '').localeCompare(b.nama || '');
    });
}

function renderModelDropdown(rowId, isQC = false) {
    let inputEl = null;
    let listEl = null;

    if (isQC) {
        inputEl = document.getElementById('input-qc-model');
        listEl = document.getElementById('qc-model-dropdown-list');
    } else {
        const row = document.getElementById(rowId);
        if (!row) return;
        inputEl = row.querySelector('.input-row-model');
        listEl = row.querySelector('.model-dropdown-list');
    }

    if (!listEl || !inputEl) return;

    const query = (inputEl.value || '').trim();
    const bagian = document.getElementById('input-siswa-bagian')?.value || '';
    const sectionTargetKey = getSectionTargetColumn(bagian);
    const items = getSortedMasterProducts(query, bagian);

    if (items.length === 0) {
        listEl.innerHTML = `
            <div class="p-4 text-center text-xs text-slate-400 italic">
                <i class="fa-solid fa-box-open text-slate-300 text-base mb-1 block"></i>
                Model "${query}" tidak ditemukan di katalog.<br>
                <span class="text-[10px] text-amber-600 font-semibold mt-1 inline-block">Anda dapat menggunakan nama ini (Target SPV).</span>
            </div>
        `;
        return;
    }

    let html = '';
    const maxItems = 60;
    const displayItems = items.slice(0, maxItems);

    displayItems.forEach(p => {
        const tgt = (p.targets && p.targets[sectionTargetKey]) || 0;
        const isMatchExact = (p.nama || '').toUpperCase() === query.toUpperCase();
        const safeName = (p.nama || '').replace(/'/g, "\\'");

        html += `
            <div class="model-dropdown-item px-4 py-2.5 hover:bg-emerald-50/70 ${isMatchExact ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 font-medium'} transition-colors cursor-pointer flex items-center justify-between group"
                 onmousedown="event.preventDefault(); selectModelOption('${rowId}', '${safeName}', ${isQC});">
                <span class="text-xs group-hover:text-emerald-800 truncate">${p.nama}</span>
                <i class="fa-solid fa-check text-xs text-emerald-600 ${isMatchExact ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'} transition-opacity"></i>
            </div>
        `;
    });

    if (items.length > maxItems) {
        html += `
            <div class="p-2 text-center text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100 font-medium">
                Menampilkan ${maxItems} dari ${items.length} model. Ketik lebih spesifik untuk menyaring.
            </div>
        `;
    }

    listEl.innerHTML = html;
}

function openModelDropdown(rowId, isQC = false) {
    closeAllModelDropdowns();

    let listEl = null;
    let chevronEl = null;
    if (isQC) {
        listEl = document.getElementById('qc-model-dropdown-list');
        chevronEl = document.getElementById('qc-model-chevron');
    } else {
        const row = document.getElementById(rowId);
        if (row) {
            listEl = row.querySelector('.model-dropdown-list');
            chevronEl = row.querySelector('.chevron-icon');
        }
    }

    if (listEl) {
        renderModelDropdown(rowId, isQC);
        listEl.classList.remove('hidden');
        if (chevronEl) chevronEl.classList.add('rotate-180');
    }
}

function closeModelDropdown(rowId, isQC = false) {
    let listEl = null;
    let chevronEl = null;
    if (isQC) {
        listEl = document.getElementById('qc-model-dropdown-list');
        chevronEl = document.getElementById('qc-model-chevron');
    } else {
        const row = document.getElementById(rowId);
        if (row) {
            listEl = row.querySelector('.model-dropdown-list');
            chevronEl = row.querySelector('.chevron-icon');
        }
    }

    if (listEl) {
        listEl.classList.add('hidden');
        if (chevronEl) chevronEl.classList.remove('rotate-180');
    }
}

function toggleModelDropdown(rowId, event, isQC = false) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    let listEl = null;
    if (isQC) {
        listEl = document.getElementById('qc-model-dropdown-list');
    } else {
        const row = document.getElementById(rowId);
        if (row) listEl = row.querySelector('.model-dropdown-list');
    }

    if (listEl && !listEl.classList.contains('hidden')) {
        closeModelDropdown(rowId, isQC);
    } else {
        openModelDropdown(rowId, isQC);
        if (isQC) {
            document.getElementById('input-qc-model')?.focus();
        } else {
            const row = document.getElementById(rowId);
            row?.querySelector('.input-row-model')?.focus();
        }
    }
}

function selectModelOption(rowId, modelName, isQC = false) {
    if (isQC) {
        const input = document.getElementById('input-qc-model');
        if (input) input.value = modelName;
        closeModelDropdown(rowId, true);
    } else {
        const row = document.getElementById(rowId);
        if (row) {
            const input = row.querySelector('.input-row-model');
            if (input) input.value = modelName;
            onProdukModelChanged(rowId);
            closeModelDropdown(rowId, false);
        }
    }
}

function closeAllModelDropdowns() {
    document.querySelectorAll('.model-dropdown-list').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.chevron-icon').forEach(el => el.classList.remove('rotate-180'));
    const qcList = document.getElementById('qc-model-dropdown-list');
    if (qcList) qcList.classList.add('hidden');
    const qcChevron = document.getElementById('qc-model-chevron');
    if (qcChevron) qcChevron.classList.remove('rotate-180');
}

function onModelInputTyping(rowId, event, isQC = false) {
    openModelDropdown(rowId, isQC);
    if (!isQC) {
        onProdukModelChanged(rowId);
    }
}

function onModelInputKeydown(rowId, event, isQC = false) {
    if (event.key === 'Escape') {
        closeModelDropdown(rowId, isQC);
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        closeModelDropdown(rowId, isQC);
        return;
    }
}

// Global click listener to close dropdowns when clicking outside
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.model-dropdown-container') && !e.target.closest('#qc-model-dropdown-container')) {
            closeAllModelDropdowns();
        }
    });
}

function getSectionTargetColumn(bagian) {
    const bg = (bagian || '').toUpperCase().trim();
    if (bg === 'GRINDING') return 'GRINDING';
    if (bg === 'PAINTING') return 'PAINTING';
    if (bg === 'CORE') return 'CORE';
    if (bg === 'SHOTBLAST') return 'SHOTBLAST';
    if (bg === 'FURAN') return 'FURAN';
    if (bg === 'FETTLING' || bg === 'FETLING') return 'FETTLING';
    if (bg === 'CNC / MACHINING') return 'TURNING'; // Default CNC
    return 'GRINDING';
}

function onSiswaBagianChanged() {
    const bagian = document.getElementById('input-siswa-bagian')?.value || '';
    const mode = getSectionCategory(bagian);

    const containerProduksi = document.getElementById('container-mode-produksi');
    const containerQc = document.getElementById('container-mode-qc');
    const containerSupport = document.getElementById('container-mode-support');
    const containerMelting = document.getElementById('container-mode-melting');

    const badgeEl = document.getElementById('step3-section-badge');
    const titleEl = document.getElementById('step3-section-title');
    const labelKet = document.getElementById('label-siswa-keterangan');

    updateProductDatalist();

    if (mode === 'PRODUKSI') {
        if (containerProduksi) containerProduksi.classList.remove('hidden');
        if (containerQc) containerQc.classList.add('hidden');
        if (containerSupport) containerSupport.classList.add('hidden');
        if (containerMelting) containerMelting.classList.add('hidden');

        if (badgeEl) {
            badgeEl.innerText = 'Lini Produksi';
            badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200';
        }
        if (titleEl) titleEl.innerText = `Hasil Produksi (${bagian})`;
        if (labelKet) labelKet.innerText = 'Keterangan / Kendala Lapangan (Jika ada)';

        // Ensure at least 1 row in Produksi list
        const list = document.getElementById('produksi-products-list');
        if (list && list.children.length === 0) {
            addProdukRow(bagian === 'GALAH IBK' ? 'GALAH IBK' : '');
        } else {
            // Re-calculate targets for existing rows with new section
            document.querySelectorAll('.produk-row-item').forEach(row => {
                const modelInput = row.querySelector('.input-row-model');
                if (modelInput) onProdukModelChanged(row.id);
            });
        }
    } else if (mode === 'MELTING') {
        if (containerProduksi) containerProduksi.classList.add('hidden');
        if (containerQc) containerQc.classList.add('hidden');
        if (containerSupport) containerSupport.classList.add('hidden');
        if (containerMelting) containerMelting.classList.remove('hidden');

        if (badgeEl) {
            badgeEl.innerText = 'Peleburan Logam';
            badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200';
        }
        if (titleEl) titleEl.innerText = 'Laporan Peleburan (Melting)';
        if (labelKet) labelKet.innerText = 'Catatan Parameter Peleburan & Kendala Tungku';

        renderMeltingChecklist();
        calculateMeltingSmartScore();
    } else if (mode === 'QC') {
        if (containerProduksi) containerProduksi.classList.add('hidden');
        if (containerQc) containerQc.classList.add('hidden');
        if (containerSupport) containerSupport.classList.add('hidden');
        if (containerMelting) containerMelting.classList.add('hidden');

        if (badgeEl) {
            badgeEl.innerText = 'Quality Control';
            badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200';
        }
        if (titleEl) titleEl.innerText = `Laporan Pengujian (${bagian})`;
        if (labelKet) labelKet.innerText = 'Catatan Parameter & Kendala Pengujian';

        calculateQcScore();
    } else {
        // SUPPORT / ADMIN / MAINTENANCE / PPIC
        if (containerProduksi) containerProduksi.classList.add('hidden');
        if (containerQc) containerQc.classList.add('hidden');
        if (containerSupport) containerSupport.classList.remove('hidden');
        if (containerMelting) containerMelting.classList.add('hidden');

        if (badgeEl) {
            badgeEl.innerText = 'Tugas & Operasional';
            badgeEl.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200';
        }
        if (titleEl) titleEl.innerText = `Checklist Tugas (${bagian})`;
        if (labelKet) labelKet.innerText = 'Rincian Tambahan / Catatan Aktivitas';

        renderSectionChecklist(bagian);
    }
}

// ----------------------------------------------------
// MODE MELTING: SMART ALL-IN-ONE CONTROLLER (50:50 / PURE)
// ----------------------------------------------------

const MELTING_CHECKLIST_TASKS = [
    'Pengecekan sistem pendingin (water cooling) & kondisi refraktori lining tungku induksi',
    'Penimbangan material charging (pig iron, return scrap, nodulizer, ferro silicon/manganese)',
    'Monitoring proses peleburan, pengawasan temperatur lebur, dan slag skimming (pembuangan terak)',
    'Pengambilan sampel cairan untuk uji spektrometri & inokulasi ladle sebelum pouring',
    'Pencatatan parameter suhu tuang (°C) & waktu lebur per heat/tuntung di logbook',
    'Perawatan, pembersihan terak di bibir tungku, dan 5S area charging melting'
];

function calculateMeltingSmartScore() {
    const targetInput = document.getElementById('input-melting-target');
    const aktualInput = document.getElementById('input-melting-aktual');
    const checkboxes = document.querySelectorAll('.melting-task-checkbox');

    const plan = Math.max(0, parseInt(targetInput?.value || '0', 10) || 0);
    const act = Math.max(0, parseInt(aktualInput?.value || '0', 10) || 0);

    let totalSop = checkboxes.length;
    let doneSop = 0;
    checkboxes.forEach(cb => {
        if (cb.checked) doneSop++;
    });

    const hasHeat = (plan > 0 || act > 0);
    const hasSop = (doneSop > 0);

    let heatEff = 100;
    if (plan > 0) {
        heatEff = Math.round((act / plan) * 100);
    } else if (act > 0) {
        heatEff = 100;
    }

    let sopEff = totalSop > 0 ? Math.round((doneSop / totalSop) * 100) : 0;

    let finalScore = 0;
    let modeLabel = 'Nilai Performa Melting';
    let breakdownText = 'Isi output heat dan/atau centang SOP tungku';

    if (hasHeat && hasSop) {
        // Skema 50% : 50% Kombinasi
        finalScore = Math.round((heatEff + sopEff) / 2);
        modeLabel = 'Kombinasi 50:50 (Peleburan + SOP)';
        breakdownText = `Output Heat: ${heatEff}% (Bobot 50%) + SOP Tungku: ${sopEff}% (Bobot 50%)`;
    } else if (hasHeat) {
        // 100% Murni Output Heat
        finalScore = heatEff;
        modeLabel = 'Output Peleburan Logam (100%)';
        breakdownText = `Target: ${plan} Heat, Hasil: ${act} Heat (${finalScore}% Capaian)`;
    } else if (hasSop) {
        // 100% Murni SOP Tungku
        finalScore = sopEff;
        modeLabel = 'Perawatan & SOP Tungku (100%)';
        breakdownText = `${doneSop} dari ${totalSop} tugas SOP selesai (${finalScore}% Capaian)`;
    } else {
        finalScore = 0;
        modeLabel = 'Nilai Performa Melting';
        breakdownText = 'Silakan isi output heat atau centang checklist SOP';
    }

    const lblMode = document.getElementById('melting-calc-mode-label');
    const lblDesc = document.getElementById('melting-score-breakdown-desc');
    const scorePercent = document.getElementById('melting-smart-score-percent');
    const scoreBadge = document.getElementById('melting-smart-score-badge');
    const progressText = document.getElementById('melting-checklist-progress-text');

    if (progressText) progressText.innerText = `${doneSop}/${totalSop} Tugas Selesai`;
    if (lblMode) lblMode.innerText = modeLabel;
    if (lblDesc) lblDesc.innerText = breakdownText;
    if (scorePercent) scorePercent.innerText = `${finalScore}%`;

    if (scoreBadge) {
        if (!hasHeat && !hasSop) {
            scoreBadge.innerText = 'Menunggu Input';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600';
        } else if (finalScore >= 90) {
            scoreBadge.innerText = 'Sangat Baik (Tuntas)';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
        } else if (finalScore >= 75) {
            scoreBadge.innerText = 'Baik / Sesuai Standar';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800';
        } else if (finalScore >= 50) {
            scoreBadge.innerText = 'Cukup / Ada Kendala';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
        } else {
            scoreBadge.innerText = 'Kurang / Perlu Evaluasi';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
        }
    }
}

function renderMeltingChecklist() {
    const container = document.getElementById('melting-checklist-container');
    if (!container) return;
    if (container.children.length > 0) return;

    container.innerHTML = '';
    MELTING_CHECKLIST_TASKS.forEach((task, idx) => {
        const itemDiv = document.createElement('label');
        itemDiv.className = 'flex items-start gap-2.5 p-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl cursor-pointer transition-all duration-150 select-none';
        itemDiv.innerHTML = `
            <input type="checkbox" class="melting-task-checkbox mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                onchange="calculateMeltingSmartScore()" data-task-index="${idx + 1}">
            <span class="text-xs font-medium text-slate-700 leading-relaxed">${task}</span>
        `;
        container.appendChild(itemDiv);
    });

    calculateMeltingSmartScore();
}

// ----------------------------------------------------
// MODE PRODUKSI: MULTI-PRODUCT ROW BUILDER
// ----------------------------------------------------

function addProdukRow(initialModel = '', initialActual = '', initialReject = '0', initialPlan = '') {
    const list = document.getElementById('produksi-products-list');
    if (!list) return;

    produkRowCounter++;
    const rowId = `produk-row-${produkRowCounter}`;
    const rowNum = list.children.length + 1;

    const rowDiv = document.createElement('div');
    rowDiv.id = rowId;
    rowDiv.className = 'produk-row-item p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 transition-all duration-200';
    rowDiv.dataset.targetManual = 'false';

    rowDiv.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-black row-number-badge">${rowNum}</span>
                Model Produk
            </span>
            <button type="button" onclick="removeProdukRow('${rowId}')" class="btn-remove-row text-slate-400 hover:text-rose-600 text-xs font-bold transition-all px-2 py-0.5 rounded-lg hover:bg-rose-50 flex items-center gap-1">
                <i class="fa-solid fa-trash-can text-[10px]"></i> Hapus
            </button>
        </div>

        <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cari / Ketik Nama Model Produk</label>
            <div class="relative model-dropdown-container">
                <div class="relative flex items-center">
                    <input type="text" class="input-row-model w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-text"
                        placeholder="Pilih atau cari model produk..." value="${initialModel}"
                        oninput="onModelInputTyping('${rowId}', event, false)"
                        onfocus="openModelDropdown('${rowId}', false)"
                        onkeydown="onModelInputKeydown('${rowId}', event, false)"
                        autocomplete="off">
                    <button type="button" onclick="toggleModelDropdown('${rowId}', event, false)" class="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center">
                        <i class="fa-solid fa-chevron-down text-xs transition-transform duration-200 chevron-icon"></i>
                    </button>
                </div>

                <!-- Custom Dropdown Menu Dropping Downwards with Pure White Card Background -->
                <div class="model-dropdown-list hidden absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-300/40 z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-fadeIn" style="scrollbar-width: thin;">
                </div>
            </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5 pt-1">
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Target (Plan)</span>
                    <span class="target-type-badge text-[8px] font-bold text-slate-400">Pcs</span>
                </label>
                <div class="target-container-slot relative">
                    <!-- Locked Box (Default when found in master catalog) -->
                    <div class="target-locked-box flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-xl text-xs font-black text-blue-800" title="Target resmi standar master katalog">
                        <span class="row-target-val">0</span>
                        <span class="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1"><i class="fa-solid fa-lock text-[8px]"></i> Master</span>
                    </div>
                    <!-- Manual Input Box (Active when target = 0 in master / custom) -->
                    <div class="target-manual-box hidden relative">
                        <input type="number" class="input-row-manual-target w-full px-3 py-2 bg-amber-50/70 border border-amber-300 focus:border-amber-500 focus:bg-white rounded-xl text-xs font-bold text-amber-900 outline-none transition-all text-center"
                            placeholder="Target SPV" min="1" step="1" value="${initialPlan}" oninput="calculateProduksiSummary()"
                            onkeydown="if(event.key==='.'||event.key===','||event.key==='-'||event.key==='+'||event.key==='e'||event.key==='E'){event.preventDefault();}">
                        <span class="absolute -top-2 right-1 px-1.5 py-0.2 bg-amber-200 text-amber-900 border border-amber-300/80 rounded text-[7.5px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs"><i class="fa-solid fa-pen-to-square text-[6.5px]"></i> SPV</span>
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hasil (Aktual)</label>
                <input type="number" class="input-row-actual w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:border-blue-500 focus:bg-white transition-all text-center"
                    placeholder="0" min="0" step="1" value="${initialActual}" oninput="calculateProduksiSummary()"
                    onkeydown="if(event.key==='.'||event.key===','||event.key==='-'||event.key==='+'||event.key==='e'||event.key==='E'){event.preventDefault();}">
            </div>
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Reject (NG)</label>
                <input type="number" class="input-row-reject w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600 outline-none focus:border-blue-500 focus:bg-white transition-all text-center"
                    placeholder="0" min="0" step="1" value="${initialReject}" oninput="calculateProduksiSummary()"
                    onkeydown="if(event.key==='.'||event.key===','||event.key==='-'||event.key==='+'||event.key==='e'||event.key==='E'){event.preventDefault();}">
            </div>
        </div>
    `;

    list.appendChild(rowDiv);
    updateRowNumberBadges();
    if (initialModel) onProdukModelChanged(rowId);
    calculateProduksiSummary();
}

function removeProdukRow(rowId) {
    const list = document.getElementById('produksi-products-list');
    if (!list) return;
    if (list.children.length <= 1) {
        showToast('Minimal harus ada 1 model produk.', 'info');
        return;
    }
    const targetRow = document.getElementById(rowId);
    if (targetRow) {
        targetRow.remove();
        updateRowNumberBadges();
        calculateProduksiSummary();
    }
}

function updateRowNumberBadges() {
    const list = document.getElementById('produksi-products-list');
    if (!list) return;
    const items = list.querySelectorAll('.produk-row-item');
    items.forEach((item, idx) => {
        const badge = item.querySelector('.row-number-badge');
        if (badge) badge.innerText = idx + 1;
        const removeBtn = item.querySelector('.btn-remove-row');
        if (removeBtn) {
            if (items.length === 1) {
                removeBtn.classList.add('invisible');
            } else {
                removeBtn.classList.remove('invisible');
            }
        }
    });
}

function onProdukModelChanged(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const modelInput = row.querySelector('.input-row-model');
    const lockedBox = row.querySelector('.target-locked-box');
    const manualBox = row.querySelector('.target-manual-box');
    const targetSpan = row.querySelector('.row-target-val');
    if (!modelInput) return;

    const modelName = modelInput.value.trim();
    const bagian = document.getElementById('input-siswa-bagian')?.value || '';
    const sectionTargetKey = getSectionTargetColumn(bagian);

    // Find in masterProdukCatalog
    const matched = masterProdukCatalog.find(p => p.nama.toUpperCase() === modelName.toUpperCase());
    const targetVal = (matched && matched.targets) ? (matched.targets[sectionTargetKey] || 0) : 0;

    if (targetVal > 0) {
        // Mode Locked (Master Catalog Target)
        row.dataset.targetManual = 'false';
        if (targetSpan) targetSpan.innerText = targetVal;
        if (lockedBox) lockedBox.classList.remove('hidden');
        if (manualBox) manualBox.classList.add('hidden');
    } else {
        // Mode Manual (Non-Target / SPV Directed)
        row.dataset.targetManual = 'true';
        if (targetSpan) targetSpan.innerText = '0';
        if (lockedBox) lockedBox.classList.add('hidden');
        if (manualBox) manualBox.classList.remove('hidden');
    }

    calculateProduksiSummary();
}

function calculateProduksiSummary() {
    let totalPlan = 0;
    let totalAktual = 0;
    let totalReject = 0;

    const rows = document.querySelectorAll('.produk-row-item');
    rows.forEach(row => {
        const isManual = row.dataset.targetManual === 'true';
        const targetSpan = row.querySelector('.row-target-val');
        const manualInput = row.querySelector('.input-row-manual-target');
        const actInput = row.querySelector('.input-row-actual');
        const rejInput = row.querySelector('.input-row-reject');

        let plan = 0;
        if (isManual) {
            plan = Math.max(0, parseInt(manualInput?.value || '0', 10) || 0);
        } else {
            plan = parseInt(targetSpan?.innerText || '0', 10) || 0;
        }

        const act = Math.max(0, parseInt(actInput?.value || '0', 10) || 0);
        const rej = Math.max(0, parseInt(rejInput?.value || '0', 10) || 0);

        totalPlan += plan;
        totalAktual += act;
        totalReject += rej;
    });

    const elPlan = document.getElementById('summary-total-plan');
    const elAktual = document.getElementById('summary-total-aktual');
    const elReject = document.getElementById('summary-total-reject');
    const elEfisiensi = document.getElementById('summary-total-efisiensi');

    if (elPlan) elPlan.innerText = totalPlan;
    if (elAktual) elAktual.innerText = totalAktual;
    if (elReject) elReject.innerText = totalReject;

    let eff = 0;
    if (totalPlan > 0) {
        eff = Math.round((totalAktual / totalPlan) * 100);
    } else if (totalAktual > 0) {
        eff = 100;
    }

    if (elEfisiensi) {
        elEfisiensi.innerText = `${eff}%`;
        if (eff >= 90) elEfisiensi.className = 'text-sm sm:text-base font-extrabold text-emerald-600';
        else if (eff >= 75) elEfisiensi.className = 'text-sm sm:text-base font-extrabold text-blue-600';
        else if (eff >= 60) elEfisiensi.className = 'text-sm sm:text-base font-extrabold text-amber-600';
        else elEfisiensi.className = 'text-sm sm:text-base font-extrabold text-rose-600';
    }
}

// ----------------------------------------------------
// MODE QC: CONTROLLER
// ----------------------------------------------------

function calculateQcScore() {
    const targetInput = document.getElementById('input-qc-target');
    const hasilInput = document.getElementById('input-qc-hasil');
    const badge = document.getElementById('qc-score-badge');

    const plan = parseInt(targetInput?.value || '0', 10) || 0;
    const act = parseInt(hasilInput?.value || '0', 10) || 0;

    let eff = 100;
    if (plan > 0) {
        eff = Math.round((act / plan) * 100);
    }

    if (badge) {
        badge.innerText = `${eff}% Capaian`;
        if (eff >= 90) badge.className = 'font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm';
        else if (eff >= 70) badge.className = 'font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm';
        else badge.className = 'font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm';
    }
}

// ----------------------------------------------------
// MODE SUPPORT / ADMIN: CHECKLIST CONTROLLER
// ----------------------------------------------------

function renderSectionChecklist(bagian) {
    const container = document.getElementById('checklist-items-container');
    const machineWrapper = document.getElementById('maintenance-machine-wrapper');
    if (!container) return;

    const bgUpper = (bagian || '').toUpperCase().trim();
    const tasks = SECTION_TASKS_MAP[bgUpper] || SECTION_TASKS_MAP['PPIC'];

    // Handle Maintenance Machine Selector
    if (bgUpper === 'MAINTENANCE') {
        if (machineWrapper) machineWrapper.classList.remove('hidden');
        renderMaintenanceMachinePills();
    } else {
        if (machineWrapper) machineWrapper.classList.add('hidden');
    }

    // Render Checklist items
    container.innerHTML = '';
    tasks.forEach((task, idx) => {
        const itemDiv = document.createElement('label');
        itemDiv.className = 'flex items-start gap-2.5 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-all duration-150 select-none';
        itemDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox-item mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                onchange="onTaskCheckboxChanged()" data-task-index="${idx + 1}">
            <span class="text-xs font-medium text-slate-700 leading-relaxed">${task}</span>
        `;
        container.appendChild(itemDiv);
    });

    // Reset extra task
    const chkExtra = document.getElementById('chk-tugas-tambahan');
    const inputExtra = document.getElementById('input-tugas-tambahan-desc');
    if (chkExtra) chkExtra.checked = false;
    if (inputExtra) inputExtra.value = '';

    onTaskCheckboxChanged();
}

function renderMaintenanceMachinePills() {
    const pillsContainer = document.getElementById('maintenance-machines-pills');
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';

    MAINTENANCE_MACHINES_LIST.forEach(mach => {
        const isSelected = selectedMaintenanceMachines.includes(mach);
        const pillBtn = document.createElement('button');
        pillBtn.type = 'button';
        pillBtn.className = isSelected
            ? 'px-2 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white shadow-sm border border-blue-600 transition-all text-left truncate'
            : 'px-2 py-1.5 rounded-lg text-[10px] font-medium bg-white text-slate-600 border border-slate-200 hover:border-slate-300 transition-all text-left truncate';
        pillBtn.innerText = mach;
        pillBtn.onclick = () => {
            if (selectedMaintenanceMachines.includes(mach)) {
                selectedMaintenanceMachines = selectedMaintenanceMachines.filter(m => m !== mach);
            } else {
                selectedMaintenanceMachines.push(mach);
            }
            renderMaintenanceMachinePills();
        };
        pillsContainer.appendChild(pillBtn);
    });
}

function onTaskCheckboxChanged() {
    const checkboxes = document.querySelectorAll('.task-checkbox-item');
    const chkExtra = document.getElementById('chk-tugas-tambahan');
    
    let totalItems = checkboxes.length;
    let checkedCount = 0;

    checkboxes.forEach(cb => {
        if (cb.checked) checkedCount++;
    });

    if (chkExtra && chkExtra.checked) {
        totalItems += 1;
        checkedCount += 1;
    }

    const percent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

    const progressText = document.getElementById('checklist-progress-text');
    const scorePercent = document.getElementById('checklist-score-percent');
    const scoreBadge = document.getElementById('checklist-score-badge');
    const scoreDesc = document.getElementById('checklist-score-desc');

    if (progressText) progressText.innerText = `${checkedCount} dari ${totalItems} Tugas Selesai`;
    if (scorePercent) scorePercent.innerText = `${percent}%`;

    if (scoreBadge && scoreDesc) {
        if (percent === 100) {
            scoreBadge.innerText = 'Sangat Produktif (Tuntas)';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
            scoreDesc.innerText = 'Seluruh tugas pokok harian tuntas diselesaikan';
        } else if (percent >= 75) {
            scoreBadge.innerText = 'Baik / Sesuai Standar';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800';
            scoreDesc.innerText = 'Mayoritas tugas pokok telah diselesaikan';
        } else if (percent >= 50) {
            scoreBadge.innerText = 'Cukup / Ada Kendala';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
            scoreDesc.innerText = 'Sebagian tugas belum selesai / tertunda';
        } else {
            scoreBadge.innerText = 'Perlu Perhatian';
            scoreBadge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
            scoreDesc.innerText = 'Sebagian besar tugas belum terselesaikan';
        }
    }
}

function populateSiswaPortalFields() {
    const user = getSiswaCurrentUser();
    if (!user) return;
    currentUser = user;
    window.currentUser = user;

    const noreg = currentUser.studentId || currentUser.nomorRegistrasi || currentUser.noreg || 'TEST-001';
    let me = (activeData || []).find(s => String(s.id).toUpperCase() === String(noreg).toUpperCase());
    
    // Resilient fallback if activeData is still loading or student not yet in activeData
    if (!me) {
        me = {
            id: noreg,
            namaLengkap: currentUser.namaLengkap || currentUser.name || (noreg === 'TEST-001' ? 'SISWA TESTING (SIMULASI)' : 'Siswa LTC'),
            kelas: currentUser.kelas || 'Kelas 1',
            masuk: currentUser.masuk || currentUser.tanggalMasuk || currentUser.tanggal_masuk || '2026-05-01',
            tanggalKeluar: currentUser.tanggalKeluar || currentUser.tanggal_keluar || currentUser.keluar || null,
            keluar: currentUser.keluar || null,
            section: currentUser.section || currentUser.bagian || 'GRINDING',
            departemen: currentUser.departemen || 'PRODUKSI',
            spv: currentUser.spv || currentUser.nama_spv || "MOHAMMAT YASIR MA'ARIF",
            dailyRecords: []
        };
    }
    
    // Set Step 1 identity fields
    const namaInput = document.getElementById('input-siswa-nama');
    const noregInput = document.getElementById('input-siswa-noreg');
    const kelasInput = document.getElementById('input-siswa-kelas');
    const masukInput = document.getElementById('input-siswa-masuk');
    const keluarInput = document.getElementById('input-siswa-keluar');
    
    if (namaInput) namaInput.value = me.namaLengkap || currentUser.namaLengkap || '';
    if (noregInput) noregInput.value = me.id || noreg || '';
    if (kelasInput) kelasInput.value = me.kelas || currentUser.kelas || 'Kelas 1';

    // Set Pas Foto 3x4 Siswa
    const fotoImg = document.getElementById('siswa-portal-foto');
    const fotoPlaceholder = document.getElementById('siswa-portal-foto-placeholder');
    const cleanNoreg = String(me.id || noreg || '').trim();

    if (fotoImg && cleanNoreg) {
        const baseUrl = (typeof window !== 'undefined' && window.PUBLIC_SUPABASE_URL) ? window.PUBLIC_SUPABASE_URL : 'https://xpoddtzxsopwzojycmwx.supabase.co';
        const photoUrl = `${baseUrl}/storage/v1/object/public/foto-siswa/${encodeURIComponent(cleanNoreg)}.jpg?t=${Date.now()}`;

        fotoImg.onload = function() {
            fotoImg.classList.remove('hidden');
            if (fotoPlaceholder) fotoPlaceholder.classList.add('hidden');
        };
        fotoImg.onerror = function() {
            fotoImg.classList.add('hidden');
            if (fotoPlaceholder) fotoPlaceholder.classList.remove('hidden');
        };
        fotoImg.src = photoUrl;
    } else if (fotoPlaceholder) {
        if (fotoImg) fotoImg.classList.add('hidden');
        fotoPlaceholder.classList.remove('hidden');
    }

    // Auto-select student's section only if not already selected
    const bagianSelect = document.getElementById('input-siswa-bagian');
    const mySection = (me.section || me.bagian || me.departemen || currentUser.section || currentUser.bagian || '').toUpperCase().trim();
    if (bagianSelect && !bagianSelect.value && mySection) {
        for (let opt of bagianSelect.options) {
            if (opt.value.toUpperCase().trim() === mySection) {
                bagianSelect.value = opt.value;
                break;
            }
        }
        onSiswaBagianChanged();
    }

    // Auto-select SPV only if not already selected
    const spvSelect = document.getElementById('input-siswa-spv');
    const mySpv = (me.spv || currentUser.spv || '').toUpperCase().trim();
    if (spvSelect && !spvSelect.value && mySpv) {
        for (let opt of spvSelect.options) {
            if (mySpv.includes(opt.value.toUpperCase().trim()) || opt.value.toUpperCase().trim().includes(mySpv)) {
                spvSelect.value = opt.value;
                break;
            }
        }
    }
    
    const rawMasuk = me.masuk || me.tanggal_masuk || me.tanggalMasuk || currentUser.masuk || currentUser.tanggalMasuk || '';
    const rawKeluar = me.tanggalKeluar || me.tanggal_keluar || me.keluar || currentUser.tanggalKeluar || '';

    const masukFormatted = rawMasuk ? (rawMasuk.includes('-') ? rawMasuk.split('-').reverse().join('/') : rawMasuk) : '-';
    const keluarFormatted = rawKeluar ? (rawKeluar.includes('-') ? rawKeluar.split('-').reverse().join('/') : rawKeluar) : '-';
    
    if (masukInput) masukInput.value = masukFormatted;
    if (keluarInput) keluarInput.value = keluarFormatted;

    // Set other fields in SiswaPortal view
    const pNama = document.getElementById('siswa-portal-dashboard-nama');
    const pNoreg = document.getElementById('siswa-portal-dashboard-noreg');
    if (pNama) pNama.innerText = me.namaLengkap || currentUser.namaLengkap || '';
    if (pNoreg) pNoreg.innerText = me.id || noreg || '';

    // Calculate Average Score & Attendance Record for this student using Cut-off Date (2026-08-02)
    const CUTOFF = window.ABSENSI_CUTOFF_DATE || '2026-08-02';
    const myNoreg = String(me.id || noreg || '').trim();

    let totalScore = 0;
    let daysCount = 0;
    let countSakit = 0;
    let countIjin = 0;
    let countAlpha = 0;

    // Merge date-based attendance records from both absensiData (Tab Absensi) and me.dailyRecords (Daily Manpower)
    const dateAttendanceMap = {};

    // 1. Prioritize absensiData (Data Absensi dari Tab Absensi Dashboard)
    if (typeof absensiData !== 'undefined' && Array.isArray(absensiData)) {
        absensiData.forEach(rec => {
            const recNoreg = String(rec.noreg || rec.studentId || '').trim();
            if (recNoreg === myNoreg) {
                const dateKey = rec.tanggal || rec.dateStr;
                const statusStr = String(rec.status || rec.hadir || '').trim();
                if (dateKey && statusStr) {
                    dateAttendanceMap[dateKey] = { status: statusStr, plan: 0, actual: 0, fromAbsensiTab: true };
                }
            }
        });
    }

    // 2. Add me.dailyRecords (Manpower logs)
    (me.dailyRecords || []).forEach(rec => {
        const dateKey = rec.dateStr || rec.tanggal;
        if (!dateKey) return;

        const statusStr = String(rec.hadir || '').trim();
        const planVal = Number(rec.plan) || 0;
        const actualVal = Number(rec.actual) || 0;

        if (!dateAttendanceMap[dateKey]) {
            dateAttendanceMap[dateKey] = { status: statusStr || (planVal > 0 ? 'Hadir' : ''), plan: planVal, actual: actualVal, fromManpower: true };
        } else {
            dateAttendanceMap[dateKey].plan = planVal;
            dateAttendanceMap[dateKey].actual = actualVal;
        }
    });

    // 3. Process Auto-Alpha for dates >= CUTOFF up to today
    const todayObj = new Date();
    const cutoffDateObj = typeof parseDateYYYYMMDD === 'function' ? parseDateYYYYMMDD(CUTOFF) : new Date(CUTOFF);
    const masukDateObj = me.masuk ? (typeof parseDateYYYYMMDD === 'function' ? parseDateYYYYMMDD(me.masuk) : new Date(me.masuk)) : null;

    if (cutoffDateObj && !isNaN(cutoffDateObj.getTime())) {
        let curr = new Date(cutoffDateObj.getTime());
        while (curr <= todayObj) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const dStr = `${y}-${m}-${d}`;

            if (dStr < CUTOFF) {
                curr.setDate(curr.getDate() + 1);
                continue;
            }

            const isSun = curr.getDay() === 0;
            const isSat = curr.getDay() === 6;
            const isWorkDay = !isSun && (!isSat || !String(me.hk || '').includes('5'));
            const isEnrolled = !masukDateObj || (curr >= masukDateObj);

            if (isWorkDay && isEnrolled && !dateAttendanceMap[dStr]) {
                // Auto-Alpha for missing log starting on Cutoff Date
                dateAttendanceMap[dStr] = { status: 'Alpha', plan: 0, actual: 0, autoAlpha: true };
            }
            curr.setDate(curr.getDate() + 1);
        }
    }

    // 4. Calculate Attendance Counts & Performance Scores
    Object.keys(dateAttendanceMap).forEach(dStr => {
        const item = dateAttendanceMap[dStr];
        const statusVal = item.status.toLowerCase();
        const isBeforeCutoff = dStr < CUTOFF;

        if (statusVal.includes('sakit')) {
            countSakit++;
            // Sakit is excluded from divider
        } else if (statusVal.includes('ijin') || statusVal.includes('izin')) {
            countIjin++;
            // Ijin is excluded from divider
        } else if (statusVal.includes('alpha') || statusVal.includes('alpa') || statusVal === 'absen' || statusVal.includes('tanpa keterangan')) {
            if (!isBeforeCutoff || item.fromAbsensiTab) {
                countAlpha++;
                daysCount++; // Penalize performance divider
            }
        } else {
            // Hadir or Performance log
            if (item.plan > 0) {
                const pct = Math.min(100, (item.actual / item.plan) * 100);
                totalScore += pct;
                daysCount++;
            } else if (statusVal.includes('hadir') || statusVal === '✔' || statusVal.includes('y')) {
                totalScore += 100;
                daysCount++;
            }
        }
    });

    const avgScore = daysCount > 0 ? Math.round(totalScore / daysCount) : 0;
    const scoreValEl = document.getElementById('siswa-portal-nilai');
    if (scoreValEl) scoreValEl.innerText = avgScore + '%';

    // Populate Catatan Absensi Siswa (Sakit, Ijin, Alpha)
    const sakitEl = document.getElementById('input-siswa-rekap-sakit');
    const ijinEl = document.getElementById('input-siswa-rekap-ijin');
    const alphaEl = document.getElementById('input-siswa-rekap-alpha');

    if (sakitEl) sakitEl.innerText = countSakit + ' Hari';
    if (ijinEl) ijinEl.innerText = countIjin + ' Hari';
    if (alphaEl) alphaEl.innerText = countAlpha + ' Hari';
    
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
        
        let rawShift = rec.shift || rec.Shift || '';
        if (rawShift && rawShift.toUpperCase().startsWith('SHIFT')) {
            const sNum = rawShift.replace(/\D/g, '');
            rawShift = sNum ? `Shift ${sNum}` : rawShift;
        }
        const shiftBadge = rawShift ? `<span class="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold text-[9px] mt-0.5">${rawShift}</span>` : '';

        tr.innerHTML = `
            <td class="py-3 px-4 text-xs font-semibold text-brand-textMain">
                <div>${rec.dateStr}</div>
                ${shiftBadge}
            </td>
            ${colData}
        `;
        tbody.appendChild(tr);
    });

    // Render Absensi Tab table (#siswa-portal-absensi-tbody)
    const absTbody = document.getElementById('siswa-portal-absensi-tbody');
    if (absTbody) {
        absTbody.innerHTML = '';
        const myNoreg = String(me.id || '').trim();
        const absLogs = [];
        
        if (typeof absensiData !== 'undefined' && Array.isArray(absensiData)) {
            absensiData.forEach(r => {
                const rNoreg = String(r.noreg || r.studentId || '').trim();
                if (rNoreg === myNoreg && (r.tanggal || r.dateStr)) {
                    absLogs.push({
                        tanggal: r.tanggal || r.dateStr,
                        status: r.status || r.hadir || 'Hadir',
                        keterangan: r.keterangan || '-'
                    });
                }
            });
        }

        if (absLogs.length === 0) {
            absTbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-xs text-brand-textSub italic">Belum ada rekaman absensi khusus.</td></tr>';
        } else {
            absLogs.slice(-20).reverse().forEach(a => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/50 transition-all-300 border-b border-slate-100";
                
                const st = (a.status || '').toLowerCase();
                const ket = (a.keterangan || '').toLowerCase();
                let badge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">✔ Hadir</span>';
                if (st.includes('off') || st.includes('libur') || ket.includes('off') || ket.includes('libur')) {
                    badge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Off / Libur</span>';
                } else if (st.includes('sakit')) {
                    badge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Sakit</span>';
                } else if (st.includes('ijin') || st.includes('izin')) {
                    badge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Ijin</span>';
                } else if (st.includes('alpha') || st.includes('alpa')) {
                    badge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Alpha</span>';
                }

                tr.innerHTML = `
                    <td class="py-3 px-4 text-xs font-semibold text-brand-textMain">${a.tanggal}</td>
                    <td class="py-3 px-4">${badge}</td>
                    <td class="py-3 px-4 text-xs text-brand-textSub font-medium">${a.keterangan || '-'}</td>
                `;
                absTbody.appendChild(tr);
            });
        }
    }
}

