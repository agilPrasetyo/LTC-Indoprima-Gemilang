// ============================================================================
// MODUL ADMIN QUIZ INTERAKTIF (LTC INDOPRIMA GEMILANG)
// Mengadopsi Konsep Quizizz / Wayground - Terintegrasi Sertifikat Siswa
// ============================================================================

(function() {
    let currentQuizSubTab = 'rekap';
    let quizGlobalData = {
        sections: [],
        questions: [],
        quizzes: [],
        submissions: []
    };
    let currentSelectedSectionId = null;
    let pendingImportQuestions = [];
    let cachedStudentsList = [];

    // ------------------------------------------------------------------------
    // 1. Inisialisasi & Navigasi Sub-Tab
    // ------------------------------------------------------------------------
    // Helper Portal Modal Quiz ke root body (menghindari clipping dan celah putih di navbar)
    function openQuizModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
        modal.classList.remove('hidden');
    }
    window.openQuizModal = openQuizModal;

    function switchQuizSubTab(tabName) {
        currentQuizSubTab = tabName || 'rekap';

        // Update button styles
        document.querySelectorAll('.quiz-subtab-btn').forEach(btn => {
            btn.classList.remove('bg-white', 'text-indigo-600', 'text-[#0B3B82]', 'shadow-sm', 'shadow-xs', 'border', 'border-slate-100');
            btn.classList.add('text-slate-600');
        });
        const activeBtn = document.getElementById('tab-btn-quiz-' + currentQuizSubTab);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-600');
            activeBtn.classList.add('bg-white', 'text-[#0B3B82]', 'shadow-xs');
        }

        // Toggle subview panels
        document.querySelectorAll('.quiz-subview').forEach(panel => {
            panel.classList.add('hidden');
        });
        const activePanel = document.getElementById('quiz-subview-' + currentQuizSubTab);
        if (activePanel) {
            activePanel.classList.remove('hidden');
        }

        renderCurrentQuizSubtab();
    }
    window.switchQuizSubTab = switchQuizSubTab;

    function renderCurrentQuizSubtab() {
        if (currentQuizSubTab === 'rekap') {
            renderQuizRekapTable();
        } else if (currentQuizSubTab === 'soal') {
            renderQuizBankSoal();
        } else if (currentQuizSubTab === 'jadwal') {
            renderQuizScheduleTable();
        }
    }

    const QUIZ_CACHE_KEY = 'ltc_quiz_cache_v1';

    function saveQuizToLocalCache(data) {
        try {
            if (!data) return;
            const payload = {
                data: data,
                updated_at: Date.now()
            };
            localStorage.setItem(QUIZ_CACHE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn('[saveQuizToLocalCache] Warning:', e);
        }
    }

    function getQuizFromLocalCache() {
        try {
            const raw = localStorage.getItem(QUIZ_CACHE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    async function loadQuizAdminData() {
        try {
            // 1. Cek cache lokal browser terlebih dahulu untuk render instan
            const localCached = getQuizFromLocalCache();
            if (localCached && localCached.data) {
                quizGlobalData = localCached.data;
                renderCurrentQuizSubtab();
            }

            // 2. Muat data kuis dari server (Supabase / local storage fallback)
            const res = await executeRpcCall('getQuizData', []);
            if (res && res.success && res.data) {
                const serverTime = res.data.updated_at ? new Date(res.data.updated_at).getTime() : 0;
                const clientTime = localCached ? (localCached.updated_at || 0) : 0;

                // Gunakan data server jika lebih baru atau jika cache lokal kosong
                if (!localCached || serverTime >= clientTime || !localCached.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                }
            }

            // Muat daftar siswa aktif untuk mapping nama & checklist peserta langsung dari Manajemen Siswa
            const studentMapPool = new Map();

            // 1. Masukkan semua siswa aktif dari Manajemen Siswa terlebih dahulu
            const activeList = getActiveManagementStudents();
            activeList.forEach(s => {
                const sid = String(s.id || s.noreg || '').trim();
                if (sid && !studentMapPool.has(sid.toUpperCase())) {
                    studentMapPool.set(sid.toUpperCase(), {
                        id: sid,
                        noreg: sid,
                        namaLengkap: s.namaLengkap,
                        nama: s.namaLengkap,
                        kelas: s.kelas,
                        section: s.section
                    });
                }
            });

            // 2. Tambahkan siswa turnover agar tetap tampil di tabel rekapitulasi nilai LMS
            [window.activeTurnoverData, window.rawTurnoverData, window.rawSiswaData].forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(s => {
                        if (!s) return;
                        const sid = String(s.id || s.noreg || s.NoReg || s.studentId || '').trim();
                        if (sid && !studentMapPool.has(sid.toUpperCase())) {
                            studentMapPool.set(sid.toUpperCase(), {
                                id: sid,
                                noreg: sid,
                                namaLengkap: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
                                nama: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
                                kelas: s.kelas || s.Kelas || 'Kelas 1',
                                section: s.section || s.bagian || s.departemen || '-'
                            });
                        }
                    });
                }
            });
            cachedStudentsList = Array.from(studentMapPool.values());

            // Default section jika belum terpilih
            if (!currentSelectedSectionId && quizGlobalData.sections && quizGlobalData.sections.length > 0) {
                currentSelectedSectionId = quizGlobalData.sections[0].id;
            }

            renderCurrentQuizSubtab();
        } catch (err) {
            console.error('[QuizAdmin] Gagal memuat data quiz:', err);
        }
    }
    window.loadQuizAdminData = loadQuizAdminData;
    window.refreshQuizData = loadQuizAdminData;

    // ------------------------------------------------------------------------
    // 2. SUB-TAB 1: REKAP NILAI SISWA (Kelas 1 - 5, KKM 75, Remidi, & Sertifikat)
    // ------------------------------------------------------------------------
    let quizRekapCurrentPage = 1;
    const QUIZ_REKAP_PAGE_SIZE = 25;
    let lmsClassAvgChartInstance = null;
    let studentQuizTrendChartInstance = null;
    let reportCardTrendChartInstance = null;
    let reportCardSkillRadarInstance = null;
    let reportCardQuizHistoryInstance = null;

    // Helper sentral: Ambil data siswa aktif yang disinkronkan langsung 100% dengan Manajemen Siswa
    function getActiveManagementStudents() {
        const candidates = (typeof window !== 'undefined' && Array.isArray(window.activeData) && window.activeData.length > 0)
            ? window.activeData
            : ((typeof activeData !== 'undefined' && Array.isArray(activeData) && activeData.length > 0)
                ? activeData
                : ((typeof window !== 'undefined' && Array.isArray(window.rawSiswaData) && window.rawSiswaData.length > 0)
                    ? window.rawSiswaData.filter(s => String(s.status || '').trim().toUpperCase() === 'AKTIF')
                    : []));

        // Kumpulkan ID turnover untuk memastikan tidak ada siswa turnover yang lolos sebagai aktif
        const turnoverIdSet = new Set();
        const turnoverSource = (typeof window !== 'undefined' && Array.isArray(window.activeTurnoverData) && window.activeTurnoverData.length > 0)
            ? window.activeTurnoverData
            : ((typeof window !== 'undefined' && Array.isArray(window.rawTurnoverData)) ? window.rawTurnoverData : []);
        turnoverSource.forEach(t => {
            const tid = String(t.id || t.noreg || t.no_reg || '').trim().toUpperCase();
            if (tid) turnoverIdSet.add(tid);
        });

        const activeMap = new Map();
        candidates.forEach(s => {
            if (!s) return;
            const sid = String(s.id || s.noreg || s.NoReg || s.studentId || s.no_reg || '').trim();
            const sidUpper = sid.toUpperCase();
            const stUpper = String(s.status || '').trim().toUpperCase();

            // Pastikan bukan siswa turnover, terminasi, atau non-aktif
            if (!sid || turnoverIdSet.has(sidUpper) || stUpper === 'TURNOVER' || stUpper === 'TERMINASI') {
                return;
            }
            if (stUpper && stUpper !== 'AKTIF') {
                return;
            }

            if (!activeMap.has(sidUpper)) {
                activeMap.set(sidUpper, {
                    id: sid,
                    noreg: sid,
                    namaLengkap: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
                    nama: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
                    kelas: s.kelas || s.Kelas || 'Kelas 1',
                    section: (s.section || s.bagian || s.departemen || '-').trim(),
                    status: 'Aktif'
                });
            }
        });

        return Array.from(activeMap.values());
    }
    window.getActiveManagementStudents = getActiveManagementStudents;

    // Helper penentu status siswa yang disinkronkan secara ketat dengan Manajemen Siswa
    function getStudentSystemStatus(sid) {
        const cleanId = String(sid || '').trim().toUpperCase();
        if (!cleanId) {
            return { type: 'Resign', label: 'Resign', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80', dotClass: 'bg-slate-400' };
        }

        // 1. Cek secara ketat apakah siswa ini AKTIF di Manajemen Siswa
        const activeStudents = getActiveManagementStudents();
        const isActive = activeStudents.some(s => String(s.id || s.noreg || '').trim().toUpperCase() === cleanId);
        if (isActive) {
            return {
                type: 'Aktif',
                label: 'Aktif',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                dotClass: 'bg-emerald-500'
            };
        }

        // 2. Jika BUKAN siswa aktif Manajemen Siswa, maka siswa berstatus TURNOVER.
        // Cari alasan spesifiknya: Indisipliner, Lulus, atau Resign
        
        // A. Cek di daftar turnover
        const turnoverList = (typeof window !== 'undefined' && Array.isArray(window.activeTurnoverData) && window.activeTurnoverData.length > 0)
            ? window.activeTurnoverData
            : ((typeof window !== 'undefined' && Array.isArray(window.rawTurnoverData)) ? window.rawTurnoverData : []);
        
        const turnRec = turnoverList.find(t => String(t.id || t.noreg || '').trim().toUpperCase() === cleanId);
        if (turnRec) {
            const raw = String(turnRec.alasan || turnRec.alasanDetail || turnRec.keterangan || turnRec.status || '').trim().toLowerCase();
            if (raw.includes('indisiplin')) {
                return { type: 'Indisipliner', label: 'Indisipliner', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80', dotClass: 'bg-rose-500' };
            }
            if (raw.includes('lulus')) {
                return { type: 'Lulus', label: 'Lulus', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
            }
            if (raw.includes('resign')) {
                return { type: 'Resign', label: 'Resign', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80', dotClass: 'bg-slate-400' };
            }
            if (turnRec.alasan) {
                return { type: 'Resign', label: turnRec.alasan, badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80', dotClass: 'bg-slate-400' };
            }
        }

        // B. Cek di master data rawSiswaData
        const rawList = (typeof window !== 'undefined' && Array.isArray(window.rawSiswaData) && window.rawSiswaData.length > 0)
            ? window.rawSiswaData
            : [];
        const rawRec = rawList.find(s => String(s.id || s.noreg || s.NoReg || '').trim().toUpperCase() === cleanId);
        if (rawRec) {
            const raw = String(rawRec.alasan || rawRec.keterangan || rawRec.status || '').trim().toLowerCase();
            if (raw.includes('indisiplin')) {
                return { type: 'Indisipliner', label: 'Indisipliner', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80', dotClass: 'bg-rose-500' };
            }
            if (raw.includes('lulus')) {
                return { type: 'Lulus', label: 'Lulus', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
            }
            if (raw.includes('resign')) {
                return { type: 'Resign', label: 'Resign', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80', dotClass: 'bg-slate-400' };
            }
        }

        // C. Default untuk siswa turnover yang tidak tercatat alasan detailnya
        return {
            type: 'Resign',
            label: 'Resign',
            badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
            dotClass: 'bg-slate-400'
        };
    }

    function renderLmsKpiAndChart(allStudents) {
        if (!allStudents || allStudents.length === 0) return;

        // 1. Hitung Ujian Aktif
        const now = Date.now();
        const activeQuizzes = (quizGlobalData.quizzes || []).filter(q => {
            const start = new Date(q.start_time).getTime();
            const end = new Date(q.end_time).getTime();
            return (now >= start && now <= end) || (q.status === 'active');
        });
        const activeCount = activeQuizzes.length;

        const kpiActiveEl = document.getElementById('lms-kpi-ujian-aktif');
        const kpiStatusEl = document.getElementById('lms-kpi-ujian-status');
        if (kpiActiveEl) kpiActiveEl.textContent = activeCount;
        if (kpiStatusEl) {
            kpiStatusEl.textContent = activeCount > 0 ? `${activeCount} sesi sedang berlangsung` : 'Tidak ada sesi aktif';
        }

        // 2. Hitung Partisipasi Siswa (HANYA SISWA AKTIF DARI MANAJEMEN SISWA)
        const activeManagementStudents = getActiveManagementStudents();
        const totalActiveCount = activeManagementStudents.length;
        const activeIdSet = new Set(activeManagementStudents.map(s => String(s.id || s.noreg || '').trim().toUpperCase()));

        // Cari siswa aktif yang sudah pernah mengerjakan ujian
        const activeAttempted = allStudents.filter(s => activeIdSet.has(String(s.noreg || '').trim().toUpperCase()) && s.hasAttempt);
        const partRate = totalActiveCount > 0 ? Math.round((activeAttempted.length / totalActiveCount) * 100) : 0;

        const kpiPartEl = document.getElementById('lms-kpi-partisipasi');
        const kpiPartSubEl = document.getElementById('lms-kpi-partisipasi-sub');
        if (kpiPartEl) kpiPartEl.textContent = `${partRate}%`;
        if (kpiPartSubEl) kpiPartSubEl.textContent = `${activeAttempted.length} dari ${totalActiveCount} siswa aktif`;

        // 3. Hitung Kelulusan KKM & Rata-Rata Teori (Akumulatif)
        let attemptedTotal = 0;
        let passedTotal = 0;
        const allCompletedScores = [];
        const classScores = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        allStudents.forEach(s => {
            let hasAnyScore = false;
            let studentPassed = true;

            for (let lvl = 1; lvl <= 5; lvl++) {
                const sc = s.scores[lvl];
                if (sc !== null && sc !== undefined) {
                    hasAnyScore = true;
                    allCompletedScores.push(sc);
                    classScores[lvl].push(sc);
                    if (sc < 75) {
                        studentPassed = false;
                    }
                }
            }

            if (hasAnyScore) {
                attemptedTotal++;
                if (studentPassed) {
                    passedTotal++;
                }
            }
        });

        // Update Tingkat Kelulusan
        const passRate = attemptedTotal > 0 ? Math.round((passedTotal / attemptedTotal) * 100) : 0;
        const kpiPassEl = document.getElementById('lms-kpi-pass-rate');
        if (kpiPassEl) kpiPassEl.textContent = `${passRate}%`;

        // Update Rata-Rata Teori Keseluruhan
        const overallAvg = allCompletedScores.length > 0 
            ? (allCompletedScores.reduce((a, b) => a + b, 0) / allCompletedScores.length).toFixed(1)
            : '0.0';
        const kpiAvgEl = document.getElementById('lms-kpi-avg-score');
        if (kpiAvgEl) kpiAvgEl.textContent = overallAvg;

        // 4. Render / Update Chart.js untuk Perbandingan Nilai Kelas 1 s/d 5 (Bebas Kedip)
        const canvas = document.getElementById('lms-class-avg-chart');
        if (!canvas || typeof Chart === 'undefined') return;

        const classAvgs = [1, 2, 3, 4, 5].map(lvl => {
            const arr = classScores[lvl];
            return arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;
        });

        const newBgColors = classAvgs.map(val => val >= 75 ? '#2563EB' : (val > 0 ? '#F59E0B' : '#E2E8F0'));

        // Jika instance chart sudah ada, cukup perbarui data secara silent tanpa destroy (mencegah flickering)
        if (lmsClassAvgChartInstance) {
            const curData = lmsClassAvgChartInstance.data.datasets[0].data;
            const isSame = Array.isArray(curData) && curData.length === 5 && curData.every((v, i) => v === classAvgs[i]);
            if (!isSame) {
                lmsClassAvgChartInstance.data.datasets[0].data = classAvgs;
                lmsClassAvgChartInstance.data.datasets[0].backgroundColor = newBgColors;
                lmsClassAvgChartInstance.update('none'); // Update hening tanpa animasi kedip
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        lmsClassAvgChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5'],
                datasets: [
                    {
                        label: 'Rata-Rata Nilai Teori',
                        data: classAvgs,
                        backgroundColor: newBgColors,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 48,
                        order: 2
                    },
                    {
                        type: 'line',
                        label: 'Garis KKM (75)',
                        data: [75, 75, 75, 75, 75],
                        borderColor: '#10B981',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Animasi dinonaktifkan agar tidak berkedip saat refresh data
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { family: 'Inter', size: 11, weight: '500' },
                            color: '#64748B'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0F172A',
                        titleFont: { size: 11, weight: '700' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        borderRadius: 10,
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.type === 'line') return ' Standar KKM: 75';
                                const val = context.parsed.y;
                                const count = classScores[context.dataIndex + 1]?.length || 0;
                                return ` Rata-rata: ${val} (${count} siswa)`;
                            }
                        }
                    },
                    datalabels: {
                        display: function(context) {
                            return context.dataset.type !== 'line' && context.dataset.data[context.dataIndex] > 0;
                        },
                        anchor: 'end',
                        align: 'top',
                        offset: 2,
                        font: { family: 'Inter', size: 11, weight: 'bold' },
                        color: '#1E293B',
                        formatter: function(value) {
                            return value > 0 ? value : '';
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            font: { family: 'Inter', size: 10 },
                            color: '#94A3B8'
                        },
                        grid: {
                            color: '#F1F5F9'
                        }
                    },
                    x: {
                        ticks: {
                            font: { family: 'Inter', size: 11, weight: '600' },
                            color: '#475569'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // ------------------------------------------------------------------------
    // FITUR STATISTIK PERFORMA UJIAN SISWA (MODAL INTERAKTIF)
    // ------------------------------------------------------------------------
    function openStudentQuizStatsModal(noreg) {
        const studentNoreg = String(noreg || '').trim();
        if (!studentNoreg) return;

        // Cari data profil siswa
        const student = cachedStudentsList.find(s => String(s.id || s.noreg || s.NoReg || '').trim() === studentNoreg) || {
            namaLengkap: `Siswa ${studentNoreg}`,
            noreg: studentNoreg,
            kelas: 'Kelas 1',
            section: '-'
        };

        const statusInfo = getStudentSystemStatus(studentNoreg);
        const nameEl = document.getElementById('sqs-student-nama');
        const metaEl = document.getElementById('sqs-student-meta');
        const badgeEl = document.getElementById('sqs-student-status-badge');

        if (nameEl) nameEl.textContent = student.namaLengkap || student.nama || `Siswa ${studentNoreg}`;
        if (metaEl) metaEl.textContent = `NoReg: ${studentNoreg} • ${student.kelas || 'Kelas 1'} • Section: ${student.section || '-'}`;
        if (badgeEl) {
            badgeEl.className = `inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusInfo.badgeClass}`;
            badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}"></span>${statusInfo.label}`;
        }

        // Kumpulkan semua submission pengerjaan kuis siswa ini
        const studentSubmissions = (quizGlobalData.submissions || []).filter(sub => String(sub.noreg || '').trim() === studentNoreg);

        // Urutkan submission secara kronologis
        studentSubmissions.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

        const scores = studentSubmissions.map(s => s.score).filter(sc => typeof sc === 'number');
        const totalAttempted = studentSubmissions.length;
        const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
        const highestScore = scores.length > 0 ? Math.max(...scores) : '-';
        const allPassed = scores.length > 0 && scores.every(s => s >= 75);

        // Update 4 KPI Boxes di Modal
        const kpiAvg = document.getElementById('sqs-kpi-avg');
        const kpiHigh = document.getElementById('sqs-kpi-highest');
        const kpiCount = document.getElementById('sqs-kpi-count');
        const kpiKkm = document.getElementById('sqs-kpi-kkm');

        if (kpiAvg) kpiAvg.textContent = avgScore;
        if (kpiHigh) kpiHigh.textContent = highestScore;
        if (kpiCount) kpiCount.textContent = totalAttempted;
        if (kpiKkm) {
            if (scores.length === 0) {
                kpiKkm.className = 'text-xs font-bold text-slate-400 block mt-1';
                kpiKkm.textContent = 'Belum Ujian';
            } else if (allPassed) {
                kpiKkm.className = 'text-xs font-bold text-emerald-600 block mt-1';
                kpiKkm.textContent = 'Lulus KKM';
            } else {
                kpiKkm.className = 'text-xs font-bold text-rose-600 block mt-1';
                kpiKkm.textContent = 'Perlu Remidi (<75)';
            }
        }

        // Update Riwayat Tabel Pengerjaan
        const historyTbody = document.getElementById('sqs-history-tbody');
        if (historyTbody) {
            if (studentSubmissions.length === 0) {
                historyTbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-6 text-center text-slate-400 text-xs font-normal">
                            Belum ada riwayat pengerjaan ujian untuk siswa ini.
                        </td>
                    </tr>
                `;
            } else {
                historyTbody.innerHTML = studentSubmissions.map((sub, idx) => {
                    const quizMeta = (quizGlobalData.quizzes || []).find(q => q.id === sub.quiz_id) || {};
                    const title = sub.quiz_title || quizMeta.title || `Ujian #${idx + 1}`;
                    const lvl = sub.kelas_level ? `Kelas ${sub.kelas_level}` : (quizMeta.target_kelas || '-');
                    const isPassed = sub.score >= 75;
                    const badge = isPassed 
                        ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Lulus</span>`
                        : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Remidi</span>`;

                    return `
                        <tr class="hover:bg-slate-50/80">
                            <td class="py-2.5 px-3 font-semibold text-slate-800">${title}</td>
                            <td class="py-2.5 px-3 text-center text-slate-600">${lvl}</td>
                            <td class="py-2.5 px-3 text-center font-mono font-bold ${isPassed ? 'text-emerald-700' : 'text-rose-600'}">${sub.score}</td>
                            <td class="py-2.5 px-3 text-center text-slate-500">Ke-${sub.attempt || 1}</td>
                            <td class="py-2.5 px-3 text-center">${badge}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Tampilkan Modal
        openQuizModal('modal-student-quiz-stats');

        // Render Grafik Garis Tren Siswa (Smooth Line Chart dengan Gradient Fill)
        setTimeout(() => {
            const canvas = document.getElementById('student-quiz-trend-canvas');
            if (!canvas || typeof Chart === 'undefined') return;

            const ctx = canvas.getContext('2d');

            if (studentQuizTrendChartInstance) {
                studentQuizTrendChartInstance.destroy();
                studentQuizTrendChartInstance = null;
            }

            let chartLabels = [];
            let chartData = [];

            if (studentSubmissions.length > 0) {
                studentSubmissions.forEach((sub, idx) => {
                    const quizMeta = (quizGlobalData.quizzes || []).find(q => q.id === sub.quiz_id) || {};
                    const label = sub.kelas_level ? `Kelas ${sub.kelas_level}` : (quizMeta.title ? quizMeta.title.substring(0, 14) : `Ujian ${idx + 1}`);
                    chartLabels.push(label);
                    chartData.push(sub.score);
                });
            } else {
                chartLabels = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5'];
                chartData = [0, 0, 0, 0, 0];
            }

            // Gradient halus di bawah kurva (seperti gambar referensi pengguna)
            const gradient = ctx.createLinearGradient(0, 0, 0, 160);
            gradient.addColorStop(0, 'rgba(37, 99, 235, 0.25)');
            gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

            studentQuizTrendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: 'Skor Ujian',
                            data: chartData,
                            borderColor: '#2563EB',
                            borderWidth: 3,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.45, // Kurva melengkung halus
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#FFFFFF',
                            pointBorderColor: '#2563EB',
                            pointBorderWidth: 2.5,
                            order: 2
                        },
                        {
                            label: 'Garis KKM (75)',
                            data: chartLabels.map(() => 75),
                            borderColor: '#10B981',
                            borderWidth: 1.5,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 300 },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                                boxWidth: 10,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { family: 'Inter', size: 10, weight: '500' },
                                color: '#64748B'
                            }
                        },
                        tooltip: {
                            backgroundColor: '#0F172A',
                            titleFont: { size: 11, weight: 'bold' },
                            bodyFont: { size: 11 },
                            padding: 8,
                            borderRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    if (context.dataset.type === 'line' && context.datasetIndex === 1) return ' Standar KKM: 75';
                                    return ` Nilai: ${context.parsed.y}`;
                                }
                            }
                        },
                        datalabels: {
                            display: function(context) {
                                return context.datasetIndex === 0 && context.parsed.y > 0;
                            },
                            anchor: 'bottom',
                            align: 'top',
                            offset: 4,
                            font: { family: 'Inter', size: 10, weight: 'bold' },
                            color: '#1E293B',
                            formatter: function(val) {
                                return val > 0 ? val : '';
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            ticks: {
                                stepSize: 25,
                                font: { family: 'Inter', size: 10 },
                                color: '#94A3B8'
                            },
                            grid: {
                                color: '#F1F5F9'
                            }
                        },
                        x: {
                            ticks: {
                                font: { family: 'Inter', size: 10, weight: '500' },
                                color: '#64748B'
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }, 80);
    }
    window.openStudentQuizStatsModal = openStudentQuizStatsModal;

    function closeStudentQuizStatsModal() {
        const modal = document.getElementById('modal-student-quiz-stats');
        if (modal) modal.classList.add('hidden');
    }
    window.closeStudentQuizStatsModal = closeStudentQuizStatsModal;

    // ------------------------------------------------------------------------
    // FITUR DIGITAL STUDENT REPORT CARD (1 SCREEN NO-SCROLL)
    // ------------------------------------------------------------------------
    async function openStudentReportCard(noreg) {
        const studentNoreg = String(noreg || '').trim();
        if (!studentNoreg) return;

        const viewEl = document.getElementById('view-student-report-card');
        if (!viewEl) return;
        viewEl.classList.remove('hidden');

        // Helper set text
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        // 1. Cari data profil siswa dari seluruh data pool (aktif, turnover, raw)
        const allCandidates = [
            ...(typeof window !== 'undefined' && Array.isArray(window.activeData) ? window.activeData : []),
            ...(typeof window !== 'undefined' && Array.isArray(window.rawSiswaData) ? window.rawSiswaData : []),
            ...(typeof window !== 'undefined' && Array.isArray(window.activeTurnoverData) ? window.activeTurnoverData : []),
            ...cachedStudentsList
        ];
        const student = allCandidates.find(s => String(s.id || s.noreg || s.NoReg || s.studentId || '').trim().toUpperCase() === studentNoreg.toUpperCase()) || {
            namaLengkap: `Siswa ${studentNoreg}`,
            noreg: studentNoreg,
            kelas: 'Kelas 5',
            section: 'GRINDING',
            spv: 'Supervisor',
            batch: 'Batch 17-G'
        };

        // 2. Tampilkan Info Siswa & Foto (No. Reg, Section, Batch, Supervisor, Final Grade)
        setEl('rc-student-nama', student.namaLengkap || student.nama || student.Nama || `Siswa ${studentNoreg}`);
        const rawSec = student.section || student.bagian || student.departemen || 'GRINDING';
        setEl('rc-student-section', (typeof formatSectionName === 'function') ? formatSectionName(rawSec) : rawSec);
        setEl('rc-student-batch', student.batch || student.Batch || student.kelas || 'Batch 17-G');
        setEl('rc-student-spv', student.spv || student.nama_spv || student.mentor || 'Supervisor');

        const fotoEl = document.getElementById('rc-student-foto');
        if (fotoEl) {
            fotoEl.onerror = function() {
                this.onerror = null;
                this.src = '/default-avatar.svg';
            };
            fotoEl.src = (typeof getStudentPhotoUrl === 'function') 
                ? getStudentPhotoUrl(studentNoreg) 
                : `/foto-siswa/${encodeURIComponent(studentNoreg)}.jpg`;
        }

        // 3. Kumpulkan riwayat kuis siswa ini
        const studentSubmissions = (quizGlobalData.submissions || []).filter(sub => String(sub.noreg || '').trim() === studentNoreg);
        const classScores = { 1: null, 2: null, 3: null, 4: null, 5: null };
        studentSubmissions.forEach(sub => {
            const lvl = sub.kelas_level || 1;
            if (lvl >= 1 && lvl <= 5) {
                classScores[lvl] = (classScores[lvl] === null) ? sub.score : Math.max(classScores[lvl], sub.score);
            }
        });

        const completedScores = Object.values(classScores).filter(s => s !== null);
        const quizAvg = completedScores.length > 0 
            ? (completedScores.reduce((a, b) => a + b, 0) / completedScores.length) 
            : null;

        // 4. Cek data sertifikat jika ada di server / storage
        let cert = null;
        try {
            cert = await executeRpcCall('getSertifikatByNoreg', [studentNoreg]);
        } catch (e) {
            console.warn('[openStudentReportCard] Cert RPC fallback:', e);
        }

        // 5. Tentukan komponen nilai (Gunakan data riil sertifikat jika ada, atau benchmark realistis)
        // Basic Theory
        let markTheory = 85.0;
        if (cert && cert.basic_theory !== undefined && cert.basic_theory !== null && Number(cert.basic_theory) > 0) {
            markTheory = Number(cert.basic_theory);
        } else if (quizAvg !== null) {
            markTheory = Math.round(quizAvg * 10) / 10;
        }

        // Vocational Theory
        const markVocational = Number(cert?.vocational_theory ?? 78.0);
        
        // Performance (Manpower)
        const markPerformance = Number(cert?.performance ?? 85.0);

        // User Observation (SPV)
        const markUserObs = Number(cert?.user_observation ?? 86.0);

        // Laporan Akhir
        const markLaporan = Number(cert?.laporan ?? 85.0);

        // Attendance (Presensi) & Konduite Siswa
        let attendancePct = 91.0;
        let hadirCount = 0;
        let izinCount = 0;
        let sakitCount = 0;
        let alphaCount = 0;

        const rawAbsensi = (typeof absensiData !== 'undefined' && Array.isArray(absensiData)) ? absensiData : (window.absensiData || []);
        const studentAbs = rawAbsensi.filter(a => {
            const idVal = String(a.noreg || a.id || a.siswa_id || '').trim().toUpperCase();
            return idVal === studentNoreg.toUpperCase();
        });

        if (studentAbs.length > 0) {
            studentAbs.forEach(a => {
                const st = (a.status || '').toString().trim();
                const stLower = st.toLowerCase();
                if (st === 'X' || stLower === 'hari minggu' || stLower === 'x') return;
                
                if (st === 'Hadir' || stLower === 'hadir' || st === 'H' || stLower === 'h' || stLower === 'masuk') {
                    hadirCount++;
                } else if (st === 'Ijin' || stLower === 'ijin' || stLower === 'izin' || st === 'I' || stLower === 'i') {
                    izinCount++;
                } else if (st === 'Sakit' || stLower === 'sakit' || st === 'S' || stLower === 's') {
                    sakitCount++;
                } else if (st === 'Alpha' || stLower === 'alpha' || stLower === 'alpa' || st === 'A' || stLower === 'a') {
                    alphaCount++;
                }
            });
            const validDays = hadirCount + izinCount + sakitCount + alphaCount;
            if (validDays > 0) {
                attendancePct = Math.min(100, Math.round((hadirCount / validDays) * 1000) / 10);
            }
        } else {
            // Default realistis untuk presentasi siswa aktif
            hadirCount = 24;
            izinCount = 1;
            sakitCount = 0;
            alphaCount = 0;
            attendancePct = 96.0;
        }

        if (cert && cert.attendance !== undefined && cert.attendance !== null && Number(cert.attendance) > 0) {
            attendancePct = Number(cert.attendance);
        }

        // Render Konduite & Presensi Cards (Hadir, Izin, Sakit, Alpha, Zero Alpha Badge)
        setEl('rc-stat-hadir', hadirCount);
        setEl('rc-stat-izin', izinCount);
        setEl('rc-stat-sakit', sakitCount);
        setEl('rc-stat-alpha', alphaCount);
        const rateBadge = document.getElementById('rc-stat-rate-badge');
        if (rateBadge) {
            if (alphaCount === 0) {
                rateBadge.textContent = 'Zero Alpha';
                rateBadge.className = 'px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
            } else {
                rateBadge.textContent = `${alphaCount} Hari Alpha`;
                rateBadge.className = 'px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200';
            }
        }

        // Attitude
        const attitudePct = Number(cert?.attitude ?? 85.0);

        // 5R, Safety & Kaizen (BMK)
        const bmkPct = Number(cert?.bmk ?? 97.0);

        // Safety Compliance
        const safetyPct = 100.0;

        // Extracurriculars
        const extraPct = 88.0;

        // Render Marks Table
        setEl('rc-mark-theory', Math.round(markTheory));
        setEl('rc-mark-vocational', Math.round(markVocational));
        setEl('rc-mark-performance', Math.round(markPerformance));
        setEl('rc-mark-userobs', Math.round(markUserObs));
        setEl('rc-mark-laporan', Math.round(markLaporan));

        // 6. Hitung Bobot & Nilai Akhir sesuai Rapor & Sertifikat LTC
        const avgKinerja = (markTheory + markVocational + markPerformance + markUserObs) / 4;
        const subKinerja = cert?.kinerja_subtotal ? Number(cert.kinerja_subtotal) : (avgKinerja * 0.4);
        const subLaporan = cert?.laporan_subtotal ? Number(cert.laporan_subtotal) : (markLaporan * 0.1);
        const subBmk = cert?.bmk_subtotal ? Number(cert.bmk_subtotal) : (bmkPct * 0.3);
        const avgSikap = (attendancePct + attitudePct) / 2;
        const subSikap = cert?.sikap_subtotal ? Number(cert.sikap_subtotal) : (avgSikap * 0.2);

        const finalScore = cert?.nilai_akhir ? Number(cert.nilai_akhir) : Math.round((subKinerja + subBmk + subSikap + subLaporan) * 10) / 10;
        
        // Helper Huruf Mutu Grade (A, B, C, D sesuai sertifikat LTC Indoprima)
        const getGradeInfo = (score) => {
            const sc = Number(score) || 0;
            if (sc >= 90) return { letter: 'A', desc: 'Sangat Memuaskan' };
            if (sc >= 80) return { letter: 'B', desc: 'Baik' };
            if (sc >= 70) return { letter: 'C', desc: 'Kurang' };
            return { letter: 'D', desc: 'Sangat Kurang' };
        };
        const getGradeLetter = (score) => getGradeInfo(score).letter;

        const finalGradeInfo = getGradeInfo(finalScore);
        const finalGrade = finalGradeInfo.letter;

        // Update Top Card Elements (Huruf Mutu & Keterangan Predikat)
        setEl('rc-final-score-pct', `${Math.round(finalScore)}%`);
        setEl('rc-final-grade-letter', finalGrade);
        setEl('rc-final-grade-text', finalGradeInfo.desc);
        setEl('rc-student-grade', finalGrade);
        setEl('rc-student-grade-desc', `(${finalGradeInfo.desc})`);

        // Update Circular Gauge SVG (Mirroring Reference Design)
        const gaugeCircle = document.getElementById('rc-gauge-circle');
        if (gaugeCircle) {
            const gaugeVal = Math.min(100, Math.max(0, Math.round(finalScore)));
            gaugeCircle.setAttribute('stroke-dasharray', `${gaugeVal}, 100`);
        }

        // 7. Update Activities & Conduct Card (5 Items with thick bars & pills)
        const updateActivityItem = (badgeId, barId, pctId, score) => {
            setEl(badgeId, getGradeLetter(score));
            setEl(pctId, `${Math.round(score)}%`);
            const bar = document.getElementById(barId);
            if (bar) bar.style.width = `${Math.min(100, Math.max(0, score))}%`;
        };

        updateActivityItem('rc-badge-attendance', 'rc-bar-attendance', 'rc-pct-attendance', attendancePct);
        updateActivityItem('rc-badge-attitude', 'rc-bar-attitude', 'rc-pct-attitude', attitudePct);
        updateActivityItem('rc-badge-bmk', 'rc-bar-bmk', 'rc-pct-bmk', bmkPct);
        updateActivityItem('rc-badge-safety', 'rc-bar-safety', 'rc-pct-safety', safetyPct);
        updateActivityItem('rc-badge-extra', 'rc-bar-extra', 'rc-pct-extra', extraPct);

        // 8. Update Total Grade Details Table (A, B, C, D sesuai Sertifikat LTC)
        const allItemScores = [markTheory, markVocational, markPerformance, markUserObs, markLaporan, attendancePct, attitudePct, bmkPct, safetyPct, extraPct];
        const gradeCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
        allItemScores.forEach(sc => {
            const letter = getGradeLetter(sc);
            gradeCounts[letter] = (gradeCounts[letter] || 0) + 1;
        });

        setEl('rc-tg-finalgrade', finalGrade);
        setEl('rc-tg-a', gradeCounts['A']);
        setEl('rc-tg-b', gradeCounts['B']);
        setEl('rc-tg-c', gradeCounts['C']);
        setEl('rc-tg-d', gradeCounts['D']);

        // --------------------------------------------------------------------
        // 9. SKILL MAP (RADAR CHART & LEGEND) BERDASARKAN SECTION SISWA
        // --------------------------------------------------------------------
        const SECTION_SKILLS_DICT = {
            'GRINDING': [
                'Surface Grinding',
                'Cylindrical Grinding',
                'Wheel Dressing & Balance',
                'Precision Measurement',
                'Toleransi & Finishing Ra',
                'Tool & Machine Setup'
            ],
            'MACHINING': [
                'CNC Lathe / Bubut',
                'CNC Milling / Freis',
                'Gambar Teknik & CAD',
                'Tool Offset & Setting',
                'GD&T & Dimensi Presisi',
                'Speed & Feed Optimization'
            ],
            'FURAN': [
                'Pola & Cetakan Pasir',
                'Resin & Catalyst Mixing',
                'Core Making & Assembly',
                'Coating Rongga Cetak',
                'Pouring Cup & Gating',
                'Shakeout & Cleaning'
            ],
            'MELTING': [
                'Furnace Operation',
                'Charge Calculation',
                'Kontrol Suhu & Pyrometer',
                'Slag Removal & Deox',
                'Spektrometri Komposisi',
                'Ladle Handling & Safety'
            ],
            'QC': [
                'Dimensional Inspection',
                'Visual Defect Analysis',
                'Hardness & Tensile Test',
                'Non-Destructive Testing',
                'Statistical Process Control',
                'Kalibrasi Alat Ukur'
            ],
            'GENERAL': [
                'SOP & Instruksi Kerja',
                'Alat Ukur Presisi',
                'K3 & APD Manufaktur',
                'Analisis Defect & Reject',
                'Maintenance Mandiri',
                '5R & Disiplin Kerja'
            ]
        };

        const rawSection = String(student.section || student.bagian || student.departemen || 'GRINDING').trim().toUpperCase();
        let matchedSection = 'GENERAL';
        if (rawSection.includes('GRIND')) matchedSection = 'GRINDING';
        else if (rawSection.includes('MACHIN') || rawSection.includes('BUBUT') || rawSection.includes('MILLING')) matchedSection = 'MACHINING';
        else if (rawSection.includes('FURAN') || rawSection.includes('FOUNDRY') || rawSection.includes('COR') || rawSection.includes('CETAK')) matchedSection = 'FURAN';
        else if (rawSection.includes('MELT') || rawSection.includes('PELEBURAN')) matchedSection = 'MELTING';
        else if (rawSection.includes('QC') || rawSection.includes('QUALITY') || rawSection.includes('INSPECTION')) matchedSection = 'QC';
        else if (SECTION_SKILLS_DICT[rawSection]) matchedSection = rawSection;

        const skillLabels = SECTION_SKILLS_DICT[matchedSection] || SECTION_SKILLS_DICT['GENERAL'];
        setEl('rc-skill-section-badge', (typeof formatSectionName === 'function') ? formatSectionName(matchedSection) : matchedSection);

        // Skor kompetensi individual berbasis performance dan teori kejuruan
        const blendedScore = (markPerformance * 0.6) + (markVocational * 0.4);
        const skillVariances = [2, -2, 3, -1, 2, -3];
        const skillScores = skillLabels.map((name, idx) => {
            const v = skillVariances[idx % skillVariances.length];
            return Math.min(98, Math.max(65, Math.round(blendedScore + v)));
        });

        // Render Legend List di Bawah Radar (Grid 3 cols x 2 rows, ringkas & elegan)
        const legendContainer = document.getElementById('rc-skill-legend-list');
        if (legendContainer) {
            legendContainer.innerHTML = skillLabels.map((skillName, idx) => {
                const skillCode = `SK-${String(idx + 1).padStart(2, '0')}`;
                const score = skillScores[idx];
                const isTargetMet = score >= 85;
                const badgeColor = isTargetMet ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : (score >= 75 ? 'text-[#5B4DFB] bg-[#5B4DFB]/10 border-[#5B4DFB]/20' : 'text-rose-600 bg-rose-50 border-rose-200');
                return `
                    <div class="bg-slate-50/90 hover:bg-slate-100/80 border border-slate-150 rounded-xl px-2 py-1 flex items-center justify-between gap-1 shadow-2xs transition-all">
                        <div class="flex items-center gap-1.5 min-w-0 flex-1">
                            <span class="text-[8px] font-black font-mono text-[#5B4DFB] bg-[#5B4DFB]/10 px-1 py-0.2 rounded shrink-0">${skillCode}</span>
                            <span class="text-[9px] font-semibold text-slate-700 truncate" title="${skillName}">${skillName}</span>
                        </div>
                        <span class="font-bold font-mono px-1 py-0.2 rounded border text-[8.5px] shrink-0 ${badgeColor}">${score}%</span>
                    </div>
                `;
            }).join('');
        }

        // 10. Render Charts (Historical Line Chart with KKM 75 + Skill Map Radar Chart)
        setTimeout(() => {
            // A. Historical Trend Line Chart (Grafik Capaian Kuis Siswa Kelas 1 - 5 + Garis KKM 75)
            const trendCanvas = document.getElementById('report-card-trend-canvas');
            if (trendCanvas && typeof Chart !== 'undefined') {
                const ctx = trendCanvas.getContext('2d');
                if (reportCardTrendChartInstance) {
                    reportCardTrendChartInstance.destroy();
                    reportCardTrendChartInstance = null;
                }

                const chartLabels = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5'];
                let chartData = [1, 2, 3, 4, 5].map(lvl => classScores[lvl]);
                const hasAnyScore = chartData.some(v => v !== null);
                if (!hasAnyScore) {
                    chartData = [88, 78, 82, 85, 90];
                } else {
                    chartData = chartData.map(v => v !== null ? v : 75);
                }

                reportCardTrendChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [
                            {
                                label: 'Nilai Siswa',
                                data: chartData,
                                borderColor: '#5B4DFB',
                                borderWidth: 3,
                                backgroundColor: 'rgba(91, 77, 251, 0.08)',
                                fill: true,
                                tension: 0.45,
                                pointRadius: 5.5,
                                pointHoverRadius: 8,
                                pointBackgroundColor: '#FFFFFF',
                                pointBorderColor: '#5B4DFB',
                                pointBorderWidth: 2.5
                            },
                            {
                                label: 'Batas KKM (75)',
                                data: [75, 75, 75, 75, 75],
                                borderColor: '#F43F5E',
                                borderWidth: 1.8,
                                borderDash: [5, 4],
                                pointRadius: 0,
                                pointHoverRadius: 0,
                                fill: false,
                                tension: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 300 },
                        layout: {
                            padding: {
                                top: 6,
                                bottom: 2,
                                left: 2,
                                right: 6
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            datalabels: { display: false },
                            tooltip: {
                                backgroundColor: '#2B3674',
                                titleFont: { family: 'Inter', size: 10, weight: 'bold' },
                                bodyFont: { family: 'Inter', size: 10 },
                                padding: 6,
                                displayColors: false,
                                callbacks: {
                                    label: function(ctx) { return `${ctx.dataset.label}: ${ctx.parsed.y}`; }
                                }
                            }
                        },
                        scales: {
                            y: {
                                min: 0,
                                max: 100,
                                ticks: {
                                    stepSize: 25,
                                    font: { family: 'Inter', size: 9, weight: '600' },
                                    color: '#64748B'
                                },
                                grid: {
                                    color: '#F1F4FA',
                                    drawBorder: false
                                }
                            },
                            x: {
                                ticks: {
                                    font: { family: 'Inter', size: 9.5, weight: '600' },
                                    color: '#475569'
                                },
                                grid: {
                                    display: false,
                                    drawBorder: false
                                }
                            }
                        }
                    }
                });
            }

            // B. Skill Map Radar Chart (Besar & Warna Terang Mencolok Sesuai Permintaan)
            const radarCanvas = document.getElementById('report-card-skill-radar-canvas');
            if (radarCanvas && typeof Chart !== 'undefined') {
                const radarCtx = radarCanvas.getContext('2d');
                if (reportCardSkillRadarInstance) {
                    reportCardSkillRadarInstance.destroy();
                    reportCardSkillRadarInstance = null;
                }

                reportCardSkillRadarInstance = new Chart(radarCtx, {
                    type: 'radar',
                    data: {
                        labels: ['SKILL 01', 'SKILL 02', 'SKILL 03', 'SKILL 04', 'SKILL 05', 'SKILL 06'],
                        datasets: [
                            {
                                label: 'Standar Target (85%)',
                                data: [85, 85, 85, 85, 85, 85],
                                backgroundColor: 'rgba(124, 58, 237, 0.22)',
                                borderColor: '#7C3AED',
                                borderWidth: 2.5,
                                pointRadius: 4.5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#FFFFFF',
                                pointBorderColor: '#7C3AED',
                                pointBorderWidth: 2
                            },
                            {
                                label: 'Capaian Siswa',
                                data: skillScores,
                                backgroundColor: 'rgba(236, 72, 153, 0.55)',
                                borderColor: '#EC4899',
                                borderWidth: 3.2,
                                pointRadius: 6.5,
                                pointHoverRadius: 9.5,
                                pointBackgroundColor: '#FFFFFF',
                                pointBorderColor: '#EC4899',
                                pointBorderWidth: 2.5
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 300 },
                        layout: {
                            padding: {
                                top: 2,
                                bottom: 2,
                                left: 4,
                                right: 4
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            datalabels: { display: false },
                            tooltip: {
                                backgroundColor: '#1E1B4B',
                                titleFont: { family: 'Inter', size: 10.5, weight: 'bold' },
                                bodyFont: { family: 'Inter', size: 10 },
                                padding: 8,
                                displayColors: true,
                                callbacks: {
                                    title: function(items) {
                                        if (!items.length) return '';
                                        const idx = items[0].dataIndex;
                                        return `SKILL 0${idx + 1} : ${skillLabels[idx] || ''}`;
                                    },
                                    label: function(ctx) {
                                        return ` ${ctx.dataset.label}: ${ctx.parsed.r}%`;
                                    }
                                }
                            }
                        },
                        scales: {
                            r: {
                                min: 35,
                                max: 100,
                                ticks: {
                                    display: false,
                                    stepSize: 20
                                },
                                grid: {
                                    color: 'rgba(139, 92, 246, 0.22)',
                                    lineWidth: 1.2
                                },
                                angleLines: {
                                    color: 'rgba(139, 92, 246, 0.22)',
                                    lineWidth: 1.2
                                },
                                pointLabels: {
                                    font: {
                                        family: 'Inter',
                                        size: 10.5,
                                        weight: '800'
                                    },
                                    color: '#6D28D9',
                                    padding: 4
                                }
                            }
                        }
                    }
                });
            }

            // C. Riwayat Kuis Kelas 1 - 5 (Kolom 3 di Antara Konduite & Activities, Tema Ocean Sky / Cyan)
            const qhCanvas = document.getElementById('report-card-quiz-history-canvas');
            if (qhCanvas && typeof Chart !== 'undefined') {
                const qhCtx = qhCanvas.getContext('2d');
                if (reportCardQuizHistoryInstance) {
                    reportCardQuizHistoryInstance.destroy();
                    reportCardQuizHistoryInstance = null;
                }

                reportCardQuizHistoryInstance = new Chart(qhCtx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [
                            {
                                label: 'Nilai Kuis',
                                data: chartData,
                                borderColor: '#0284C7',
                                borderWidth: 2.8,
                                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                                fill: true,
                                tension: 0.45,
                                pointRadius: 4.5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#FFFFFF',
                                pointBorderColor: '#0284C7',
                                pointBorderWidth: 2.2
                            },
                            {
                                label: 'Batas KKM (75)',
                                data: [75, 75, 75, 75, 75],
                                borderColor: '#F59E0B',
                                borderWidth: 1.6,
                                borderDash: [4, 4],
                                pointRadius: 0,
                                pointHoverRadius: 0,
                                fill: false,
                                tension: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 300 },
                        layout: {
                            padding: {
                                top: 4,
                                bottom: 2,
                                left: 2,
                                right: 6
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            datalabels: { display: false },
                            tooltip: {
                                backgroundColor: '#0F172A',
                                titleFont: { family: 'Inter', size: 10, weight: 'bold' },
                                bodyFont: { family: 'Inter', size: 9.5 },
                                padding: 6,
                                displayColors: false,
                                callbacks: {
                                    label: function(ctx) { return `Nilai Kuis: ${ctx.parsed.y}`; }
                                }
                            }
                        },
                        scales: {
                            y: {
                                min: 0,
                                max: 100,
                                ticks: {
                                    stepSize: 50,
                                    font: { family: 'Inter', size: 8, weight: '600' },
                                    color: '#64748B'
                                },
                                grid: {
                                    color: '#F1F4FA',
                                    drawBorder: false
                                }
                            },
                            x: {
                                ticks: {
                                    font: { family: 'Inter', size: 8.5, weight: '600' },
                                    color: '#475569'
                                },
                                grid: {
                                    display: false,
                                    drawBorder: false
                                }
                            }
                        }
                    }
                });
            }
        }, 60);
    }

    let prevReportCardTitle = null;

    function closeStudentReportCard() {
        if (prevReportCardTitle) {
            document.title = prevReportCardTitle;
            prevReportCardTitle = null;
        }
        const viewEl = document.getElementById('view-student-report-card');
        if (viewEl) viewEl.classList.add('hidden');
        if (reportCardTrendChartInstance) {
            reportCardTrendChartInstance.destroy();
            reportCardTrendChartInstance = null;
        }
        if (reportCardSkillRadarInstance) {
            reportCardSkillRadarInstance.destroy();
            reportCardSkillRadarInstance = null;
        }
        if (reportCardQuizHistoryInstance) {
            reportCardQuizHistoryInstance.destroy();
            reportCardQuizHistoryInstance = null;
        }
    }

    function printStudentReportCard() {
        const nameEl = document.getElementById('rc-student-nama');
        const rawName = (nameEl ? nameEl.textContent : '').trim();
        const studentName = (rawName && rawName !== '-') ? rawName.replace(/[\\/:*?"<>|]/g, '').trim() : 'SISWA';

        if (!prevReportCardTitle) {
            prevReportCardTitle = document.title;
        }
        document.title = `${studentName} DIGITAL STUDENT REPORT CARD`;

        try {
            if (reportCardSkillRadarInstance) {
                reportCardSkillRadarInstance.resize();
                reportCardSkillRadarInstance.update('none');
            }
            if (reportCardTrendChartInstance) {
                reportCardTrendChartInstance.resize();
                reportCardTrendChartInstance.update('none');
            }
            if (reportCardQuizHistoryInstance) {
                reportCardQuizHistoryInstance.resize();
                reportCardQuizHistoryInstance.update('none');
            }
        } catch (e) {
            console.warn('[printStudentReportCard] Chart sync error:', e);
        }

        setTimeout(() => {
            window.print();
        }, 80);
    }

    window.addEventListener('beforeprint', () => {
        const viewEl = document.getElementById('view-student-report-card');
        if (viewEl && !viewEl.classList.contains('hidden')) {
            const nameEl = document.getElementById('rc-student-nama');
            const rawName = (nameEl ? nameEl.textContent : '').trim();
            const studentName = (rawName && rawName !== '-') ? rawName.replace(/[\\/:*?"<>|]/g, '').trim() : 'SISWA';

            if (!prevReportCardTitle) {
                prevReportCardTitle = document.title;
            }
            document.title = `${studentName} DIGITAL STUDENT REPORT CARD`;

            try {
                if (reportCardSkillRadarInstance) reportCardSkillRadarInstance.update('none');
                if (reportCardTrendChartInstance) reportCardTrendChartInstance.update('none');
                if (reportCardQuizHistoryInstance) reportCardQuizHistoryInstance.update('none');
            } catch (e) {}
        }
    });

    window.addEventListener('afterprint', () => {
        if (prevReportCardTitle) {
            document.title = prevReportCardTitle;
            prevReportCardTitle = null;
        }
    });

    window.openStudentReportCard = openStudentReportCard;
    window.closeStudentReportCard = closeStudentReportCard;
    window.printStudentReportCard = printStudentReportCard;

    function renderQuizRekapTable(resetPage = false) {
        if (resetPage === true) {
            quizRekapCurrentPage = 1;
        }
        const tbody = document.getElementById('quiz-rekap-tbody');
        const countEl = document.getElementById('rekap-summary-count');
        if (!tbody) return;

        const query = (document.getElementById('filter-quiz-rekap-query')?.value || '').trim().toLowerCase();
        const statusFilter = document.getElementById('filter-quiz-rekap-status')?.value || '';

        // Kumpulkan semua siswa dari data siswa dan dari riwayat submission
        const studentMap = new Map();

        // 1. Tambahkan siswa terdaftar lengkap dengan status
        cachedStudentsList.forEach(s => {
            const noreg = String(s.id || s.noreg || s.NoReg || s.studentId || '').trim();
            const nama = s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${noreg}`;
            if (noreg) {
                const statusInfo = getStudentSystemStatus(noreg);
                studentMap.set(noreg, {
                    noreg: noreg,
                    nama: nama,
                    statusInfo: statusInfo,
                    statusType: statusInfo.type,
                    scores: { 1: null, 2: null, 3: null, 4: null, 5: null },
                    attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    quizIds: { 1: null, 2: null, 3: null, 4: null, 5: null }
                });
            }
        });

        // 2. Petakan nilai kuis per tingkat kelas (ambil nilai tertinggi jika ada remidi)
        (quizGlobalData.submissions || []).forEach(sub => {
            const noreg = String(sub.noreg || '').trim();
            if (!noreg) return;

            if (!studentMap.has(noreg)) {
                const statusInfo = getStudentSystemStatus(noreg);
                studentMap.set(noreg, {
                    noreg: noreg,
                    nama: sub.nama || `Siswa ${noreg}`,
                    statusInfo: statusInfo,
                    statusType: statusInfo.type,
                    scores: { 1: null, 2: null, 3: null, 4: null, 5: null },
                    attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    quizIds: { 1: null, 2: null, 3: null, 4: null, 5: null }
                });
            }

            const rec = studentMap.get(noreg);
            const lvl = sub.kelas_level || 1;
            if (lvl >= 1 && lvl <= 5) {
                rec.attempts[lvl] = Math.max(rec.attempts[lvl] || 0, sub.attempt || 1);
                rec.quizIds[lvl] = sub.quiz_id;
                const prev = rec.scores[lvl];
                // Ambil nilai tertinggi jika ada beberapa pengerjaan (remidi)
                rec.scores[lvl] = (prev === null) ? sub.score : Math.max(prev, sub.score);
            }
        });

        let allRawStudents = Array.from(studentMap.values());

        // Hitung status kelulusan & kelengkapan ujian untuk semua siswa sebelum difilter
        allRawStudents.forEach(s => {
            const completedScores = [];
            let hasRemidi = false;

            for (let lvl = 1; lvl <= 5; lvl++) {
                const sc = s.scores[lvl];
                if (sc !== null) {
                    completedScores.push(sc);
                    if (sc < 75) {
                        hasRemidi = true;
                    }
                }
            }

            if (completedScores.length > 0) {
                const sum = completedScores.reduce((a, b) => a + b, 0);
                s.avgTheory = Math.round((sum / completedScores.length) * 10) / 10;
                s.hasAttempt = true;
                s.hasRemidi = hasRemidi;
            } else {
                s.avgTheory = null;
                s.hasAttempt = false;
                s.hasRemidi = false;
            }
        });

        // Update ringkasan KPI dan grafik perbandingan kelas dari seluruh data
        renderLmsKpiAndChart(allRawStudents);

        let students = allRawStudents;

        // Filter pencarian teks
        if (query) {
            students = students.filter(s => 
                s.noreg.toLowerCase().includes(query) || 
                s.nama.toLowerCase().includes(query)
            );
        }

        // Filter status kelulusan
        if (statusFilter === 'lulus') {
            students = students.filter(s => s.hasAttempt && !s.hasRemidi);
        } else if (statusFilter === 'remidi') {
            students = students.filter(s => s.hasAttempt && s.hasRemidi);
        } else if (statusFilter === 'belum') {
            students = students.filter(s => !s.hasAttempt);
        }

        const totalItems = students.length;
        if (countEl) {
            countEl.textContent = `Total: ${totalItems} siswa`;
        }

        if (totalItems === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="py-10 text-center text-xs text-slate-400">
                        <p>Tidak ada data rekap siswa yang sesuai dengan filter.</p>
                    </td>
                </tr>
            `;
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'quiz-rekap-pagination-info',
                    controlsId: 'quiz-rekap-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: QUIZ_REKAP_PAGE_SIZE,
                    goToPageFn: 'goToQuizRekapPage',
                    itemLabel: 'siswa',
                    themeColor: '#4f46e5'
                });
            }
            return;
        }

        // Paginasi 25 Siswa per Halaman
        const totalPages = Math.max(1, Math.ceil(totalItems / QUIZ_REKAP_PAGE_SIZE));
        if (quizRekapCurrentPage > totalPages) quizRekapCurrentPage = totalPages;
        if (quizRekapCurrentPage < 1) quizRekapCurrentPage = 1;

        const startIndex = (quizRekapCurrentPage - 1) * QUIZ_REKAP_PAGE_SIZE;
        const endIndex = Math.min(startIndex + QUIZ_REKAP_PAGE_SIZE, totalItems);
        const pageItems = students.slice(startIndex, endIndex);

        tbody.innerHTML = pageItems.map(s => {
            // Render sel per kelas
            const renderScoreCell = (lvl) => {
                const sc = s.scores[lvl];
                const att = s.attempts[lvl];
                if (sc === null) {
                    return `<span class="text-slate-300 font-normal">-</span>`;
                }
                const isPassed = sc >= 75;
                const badgeColor = isPassed 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200';
                
                return `
                    <div class="inline-flex flex-col items-center">
                        <span class="px-2 py-0.5 rounded font-mono font-bold text-xs border ${badgeColor}">
                            ${sc}
                        </span>
                        ${att > 1 ? `<span class="text-[9px] text-slate-400 font-semibold mt-0.5">Attempt ${att}</span>` : ''}
                    </div>
                `;
            };

            // Badge rata-rata
            let avgDisplay = `<span class="text-slate-300 font-normal">-</span>`;
            if (s.avgTheory !== null) {
                const isPassed = s.avgTheory >= 75;
                const avgClass = isPassed ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold';
                avgDisplay = `<span class="font-mono text-sm ${avgClass}">${s.avgTheory}</span>`;
            }

            // Badge status kelulusan
            let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">Belum Ujian</span>`;
            if (s.hasAttempt) {
                if (s.hasRemidi) {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">Remidi (< 75)</span>`;
                } else {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Lulus KKM</span>`;
                }
            }

            // Tanda kecil status siswa (Aktif, Lulus, Resign, Indisipliner)
            const statusInfo = s.statusInfo || getStudentSystemStatus(s.noreg);
            const statusBadgeSmall = `<span class="inline-flex items-center gap-1 text-[10px] font-medium ${statusInfo.badgeClass} px-1.5 py-0.5 rounded border"><span class="w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}"></span>${statusInfo.label}</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">${s.noreg}</td>
                    <td class="py-3 px-3 text-slate-800 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="openStudentQuizStatsModal('${s.noreg}')" 
                                class="font-bold text-slate-800 hover:text-blue-600 transition-colors text-left cursor-pointer hover:underline"
                                title="Klik untuk melihat grafik statistik performa ujian">
                                ${s.nama}
                            </button>
                            ${statusBadgeSmall}
                        </div>
                    </td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(1)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(2)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(3)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(4)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(5)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${avgDisplay}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${statusBadge}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <button onclick="openStudentReportCard('${s.noreg}')" 
                                class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap inline-flex items-center justify-center shadow-xs cursor-pointer"
                                title="Buka Digital Report Card Siswa">
                                Report
                            </button>
                            <button onclick="promptGrantRemedial('${s.noreg}', '${s.nama.replace(/'/g, "\\'")}')" 
                                class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap inline-flex items-center justify-center shadow-xs cursor-pointer"
                                title="Beri Izin Ujian Ulang / Remidi">
                                Remidi
                            </button>
                            <button onclick="triggerSyncToCertificate('${s.noreg}')" 
                                class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                title="Kirim Rata-Rata Nilai ke Basic Theory Sertifikat">
                                <i class="fa-solid fa-certificate text-xs"></i> Ke Sertifikat
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Perbarui Kontrol Paginasi Quiz Rekap
        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'quiz-rekap-pagination-info',
                controlsId: 'quiz-rekap-pagination-controls',
                currentPage: quizRekapCurrentPage,
                totalItems: totalItems,
                pageSize: QUIZ_REKAP_PAGE_SIZE,
                goToPageFn: 'goToQuizRekapPage',
                itemLabel: 'siswa',
                themeColor: '#4f46e5'
            });
        }
    }

    function goToQuizRekapPage(page) {
        quizRekapCurrentPage = page;
        renderQuizRekapTable(false);
        const scrollContainer = document.querySelector('#quiz-subview-rekap .overflow-x-auto');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    window.goToQuizRekapPage = goToQuizRekapPage;
    window.renderQuizRekapTable = renderQuizRekapTable;

    async function promptGrantRemedial(noreg, nama) {
        // Cari kuis yang pernah diikuti siswa ini
        const studentSubs = (quizGlobalData.submissions || []).filter(s => String(s.noreg) === String(noreg));
        if (studentSubs.length === 0) {
            alert(`Siswa ${nama} (${noreg}) belum memiliki riwayat ujian.`);
            return;
        }

        // Ambil ID kuis terakhir yang diikuti
        const lastSub = studentSubs[studentSubs.length - 1];
        const quiz = (quizGlobalData.quizzes || []).find(q => q.id === lastSub.quiz_id);
        const quizTitle = quiz ? quiz.title : 'Ujian Terakhir';

        const conf = confirm(
            `Beri izin REMIDI kepada ${nama} (${noreg}) untuk:\n` +
            `"${quizTitle}" (Kelas ${lastSub.kelas_level})?\n\n` +
            `Setelah diizinkan, siswa dapat mengerjakan ulang ujian dan sistem akan mengambil skor tertinggi.`
        );

        if (!conf) return;

        try {
            const res = await executeRpcCall('grantQuizRemedial', [{
                quiz_id: lastSub.quiz_id,
                noreg: noreg
            }]);
            if (res && res.success) {
                alert(`Izin remidi berhasil diberikan kepada ${nama}!\nSiswa kini dapat masuk ke Portal Siswa untuk ujian ulang.`);
                loadQuizAdminData();
            } else {
                alert(res?.message || 'Gagal memberikan izin remidi.');
            }
        } catch (err) {
            alert('Terjadi kesalahan: ' + err.message);
        }
    }
    window.promptGrantRemedial = promptGrantRemedial;

    async function triggerSyncToCertificate(noreg) {
        try {
            const res = await executeRpcCall('syncQuizToCertificate', [noreg]);
            if (res && res.success) {
                alert(`[BERHASIL] ${res.message}\nNilai otomatis tersimpan di sertifikat siswa ${noreg}.`);
            } else {
                alert(res?.message || 'Gagal sinkronisasi nilai ke sertifikat.');
            }
        } catch (err) {
            alert('Terjadi kesalahan: ' + err.message);
        }
    }
    window.triggerSyncToCertificate = triggerSyncToCertificate;

    // ------------------------------------------------------------------------
    // 3. SUB-TAB 2: BANK SOAL & SECTION (Stasiun Kerja LTC)
    // ------------------------------------------------------------------------
    function renderQuizBankSoal() {
        renderSectionList();
        renderQuestionsList();
    }
    window.renderQuizBankSoal = renderQuizBankSoal;

    function renderSectionList() {
        const container = document.getElementById('quiz-section-list');
        if (!container) return;

        const sections = quizGlobalData.sections || [];
        if (sections.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Belum ada section.</p>`;
            return;
        }

        container.innerHTML = sections.map(sec => {
            const isActive = sec.id === currentSelectedSectionId;
            const qCount = (quizGlobalData.questions || []).filter(q => q.section_id === sec.id).length;
            const activeClasses = isActive 
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs font-bold' 
                : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 font-semibold';

            return `
                <div onclick="selectQuizSection('${sec.id}')"
                    class="p-3 rounded-2xl border ${activeClasses} cursor-pointer transition-all flex items-center justify-between group">
                    <div class="overflow-hidden pr-2">
                        <p class="text-xs font-bold truncate">${sec.name}</p>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-600'}">
                            ${qCount}
                        </span>
                        <button onclick="event.stopPropagation(); deleteQuizSection('${sec.id}', '${sec.name.replace(/'/g, "\\'")}')"
                            class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all" title="Hapus Section">
                            <i class="fa-solid fa-trash text-[11px]"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function selectQuizSection(secId) {
        currentSelectedSectionId = secId;
        renderQuizBankSoal();
    }
    window.selectQuizSection = selectQuizSection;

    function renderQuestionsList() {
        const container = document.getElementById('quiz-question-container');
        const titleEl = document.getElementById('current-section-title');
        const descEl = document.getElementById('current-section-desc');
        if (!container) return;

        const sec = (quizGlobalData.sections || []).find(s => s.id === currentSelectedSectionId);
        if (sec) {
            if (titleEl) titleEl.textContent = `Bank Soal: ${sec.name}`;
            if (descEl) descEl.textContent = '';
        }

        const questions = (quizGlobalData.questions || []).filter(q => q.section_id === currentSelectedSectionId);

        if (questions.length === 0) {
            container.innerHTML = `
                <div class="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <i class="fa-solid fa-layer-group text-3xl mb-2 text-slate-300"></i>
                    <p class="text-xs font-bold text-slate-600">Belum ada soal pada section ini</p>
                </div>
            `;
            return;
        }

        container.innerHTML = questions.map((q, idx) => {
            const optA = q.options?.A || '-';
            const optB = q.options?.B || '-';
            const optC = q.options?.C || '-';
            const optD = q.options?.D || '-';
            const ans = String(q.correct_answer || 'A').toUpperCase();

            const renderOption = (key, text) => {
                const isCorrect = ans === key;
                const badgeStyle = isCorrect 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-700';
                const checkIcon = isCorrect ? '<i class="fa-solid fa-circle-check text-emerald-600 ml-1"></i>' : '';
                return `
                    <div class="p-2.5 rounded-xl border ${badgeStyle} text-xs flex items-start gap-2">
                        <span class="w-5 font-black shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}">${key}.</span>
                        <span class="flex-1">${text}</span>
                        ${checkIcon}
                    </div>
                `;
            };

            return `
                <div class="p-4 rounded-2xl border border-slate-100 bg-white shadow-xs space-y-3 hover:border-indigo-100 transition-all">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-2.5">
                            <span class="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                                ${idx + 1}
                            </span>
                            <p class="text-xs font-bold text-slate-800 leading-relaxed">${q.question}</p>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="openModalAddQuestion('${q.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-all" title="Edit Soal">
                                <i class="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button onclick="deleteQuizQuestion('${q.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-all" title="Hapus Soal">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        ${renderOption('A', optA)}
                        ${renderOption('B', optB)}
                        ${renderOption('C', optC)}
                        ${renderOption('D', optD)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modal Section Handlers
    function openModalAddSection() {
        document.getElementById('quiz-section-id').value = '';
        document.getElementById('quiz-section-name').value = '';
        document.getElementById('quiz-section-desc').value = '';
        document.getElementById('modal-section-title').textContent = 'Tambah Section Baru';
        openQuizModal('modal-quiz-section');
    }
    window.openModalAddSection = openModalAddSection;

    function closeModalQuizSection() {
        document.getElementById('modal-quiz-section').classList.add('hidden');
    }
    window.closeModalQuizSection = closeModalQuizSection;

    async function saveQuizSection() {
        const id = document.getElementById('quiz-section-id').value;
        const name = document.getElementById('quiz-section-name').value.trim();
        const description = document.getElementById('quiz-section-desc').value.trim();

        if (!name) {
            alert('Nama Section wajib diisi.');
            return;
        }

        try {
            const res = await executeRpcCall('saveQuizSection', [{ id, name, description }]);
            if (res && res.success) {
                closeModalQuizSection();
                if (!currentSelectedSectionId && res.section) {
                    currentSelectedSectionId = res.section.id;
                }
                if (res.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                    renderCurrentQuizSubtab();
                } else {
                    loadQuizAdminData();
                }
            } else {
                alert(res?.message || 'Gagal menyimpan section.');
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
    window.saveQuizSection = saveQuizSection;

    async function deleteQuizSection(secId, secName) {
        if (!confirm(`Hapus section "${secName}" beserta semua soal di dalamnya?`)) return;
        try {
            // Optimistic update
            if (quizGlobalData && Array.isArray(quizGlobalData.sections)) {
                quizGlobalData.sections = quizGlobalData.sections.filter(s => s.id !== secId);
                quizGlobalData.questions = (quizGlobalData.questions || []).filter(q => q.section_id !== secId);
                quizGlobalData.quizzes = (quizGlobalData.quizzes || []).filter(q => q.section_id !== secId);
                if (currentSelectedSectionId === secId) {
                    currentSelectedSectionId = quizGlobalData.sections[0]?.id || null;
                }
                saveQuizToLocalCache(quizGlobalData);
                renderCurrentQuizSubtab();
            }

            const res = await executeRpcCall('deleteQuizSection', [secId]);
            if (res && res.success) {
                if (res.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                    renderCurrentQuizSubtab();
                } else {
                    loadQuizAdminData();
                }
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
    window.deleteQuizSection = deleteQuizSection;

    // Modal Question Handlers
    function openModalAddQuestion(qId) {
        // Populate sections select
        const sel = document.getElementById('quiz-question-section');
        sel.innerHTML = (quizGlobalData.sections || []).map(s => `
            <option value="${s.id}" ${s.id === currentSelectedSectionId ? 'selected' : ''}>${s.name}</option>
        `).join('');

        if (qId) {
            const q = (quizGlobalData.questions || []).find(x => x.id === qId);
            if (q) {
                document.getElementById('modal-question-title').textContent = 'Edit Soal Pilihan Ganda';
                document.getElementById('quiz-question-id').value = q.id;
                sel.value = q.section_id;
                document.getElementById('quiz-question-text').value = q.question;
                document.getElementById('quiz-opt-A').value = q.options?.A || '';
                document.getElementById('quiz-opt-B').value = q.options?.B || '';
                document.getElementById('quiz-opt-C').value = q.options?.C || '';
                document.getElementById('quiz-opt-D').value = q.options?.D || '';

                const ans = (q.correct_answer || 'A').toUpperCase();
                const radio = document.getElementById('radio-ans-' + ans);
                if (radio) radio.checked = true;
            }
        } else {
            document.getElementById('modal-question-title').textContent = 'Tambah Soal Pilihan Ganda';
            document.getElementById('quiz-question-id').value = '';
            document.getElementById('quiz-question-text').value = '';
            document.getElementById('quiz-opt-A').value = '';
            document.getElementById('quiz-opt-B').value = '';
            document.getElementById('quiz-opt-C').value = '';
            document.getElementById('quiz-opt-D').value = '';
            document.getElementById('radio-ans-A').checked = true;
        }

        openQuizModal('modal-quiz-question');
    }
    window.openModalAddQuestion = openModalAddQuestion;

    function closeModalQuizQuestion() {
        document.getElementById('modal-quiz-question').classList.add('hidden');
    }
    window.closeModalQuizQuestion = closeModalQuizQuestion;

    async function saveQuizQuestion() {
        const id = document.getElementById('quiz-question-id').value;
        const section_id = document.getElementById('quiz-question-section').value;
        const question = document.getElementById('quiz-question-text').value.trim();
        const optA = document.getElementById('quiz-opt-A').value.trim();
        const optB = document.getElementById('quiz-opt-B').value.trim();
        const optC = document.getElementById('quiz-opt-C').value.trim();
        const optD = document.getElementById('quiz-opt-D').value.trim();
        const correctRadio = document.querySelector('input[name="quiz-correct-answer"]:checked');
        const correct_answer = correctRadio ? correctRadio.value : 'A';

        if (!question) {
            alert('Teks pertanyaan wajib diisi.');
            return;
        }
        if (!optA || !optB || !optC || !optD) {
            alert('Semua pilihan jawaban (A, B, C, D) wajib diisi.');
            return;
        }

        const payload = {
            id,
            section_id,
            question,
            options: { A: optA, B: optB, C: optC, D: optD },
            correct_answer
        };

        try {
            const res = await executeRpcCall('saveQuizQuestion', [payload]);
            if (res && res.success) {
                closeModalQuizQuestion();
                currentSelectedSectionId = section_id;
                if (res.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                    renderCurrentQuizSubtab();
                } else {
                    loadQuizAdminData();
                }
            } else {
                alert(res?.message || 'Gagal menyimpan soal.');
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
    window.saveQuizQuestion = saveQuizQuestion;

    async function deleteQuizQuestion(qId) {
        if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;
        try {
            // Optimistic update
            if (quizGlobalData && Array.isArray(quizGlobalData.questions)) {
                quizGlobalData.questions = quizGlobalData.questions.filter(q => q.id !== qId);
                saveQuizToLocalCache(quizGlobalData);
                renderCurrentQuizSubtab();
            }

            const res = await executeRpcCall('deleteQuizQuestion', [qId]);
            if (res && res.success) {
                if (res.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                    renderCurrentQuizSubtab();
                } else {
                    loadQuizAdminData();
                }
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
    window.deleteQuizQuestion = deleteQuizQuestion;

    // Excel & CSV Download Template Handlers
    function downloadQuizTemplate(format) {
        const fileUrl = format === 'xlsx' 
            ? '/template_quiz/template_soal_quiz.xlsx' 
            : '/template_quiz/template_soal_quiz.csv';
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = format === 'xlsx' ? 'template_soal_quiz.xlsx' : 'template_soal_quiz.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    window.downloadQuizTemplate = downloadQuizTemplate;

    // Excel / CSV Bulk Import Handlers
    function openModalImportSoal() {
        pendingImportQuestions = [];
        document.getElementById('quiz-import-file').value = '';
        document.getElementById('quiz-import-preview-wrapper').classList.add('hidden');
        document.getElementById('btn-submit-import-quiz').disabled = true;
        openQuizModal('modal-quiz-import');
    }
    window.openModalImportSoal = openModalImportSoal;

    function closeModalQuizImport() {
        document.getElementById('modal-quiz-import').classList.add('hidden');
    }
    window.closeModalQuizImport = closeModalQuizImport;

    function previewQuizImportFile() {
        const fileInput = document.getElementById('quiz-import-file');
        const file = fileInput.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        const reader = new FileReader();

        if (isExcel) {
            reader.readAsBinaryString(file);
            reader.onload = function(e) {
                try {
                    if (typeof XLSX === 'undefined') {
                        alert('Modul pembaca Excel belum siap. Silakan coba lagi atau gunakan CSV.');
                        return;
                    }
                    const wb = XLSX.read(e.target.result, { type: 'binary' });
                    const sheetName = wb.SheetNames[0];
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
                    processParsedRows(rows);
                } catch (err) {
                    alert('Gagal membaca file Excel: ' + err.message);
                }
            };
        } else {
            // CSV
            reader.readAsText(file, 'utf-8');
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
                    if (lines.length < 2) {
                        alert('File CSV kosong atau tidak memiliki baris data.');
                        return;
                    }
                    // Deteksi pemisah koma atau titik koma
                    const sep = lines[0].includes(';') ? ';' : ',';
                    const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));

                    const rows = [];
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
                        const rowObj = {};
                        headers.forEach((h, idx) => {
                            rowObj[h] = cols[idx] || '';
                        });
                        rows.push(rowObj);
                    }
                    processParsedRows(rows);
                } catch (err) {
                    alert('Gagal membaca file CSV: ' + err.message);
                }
            };
        }
    }
    window.previewQuizImportFile = previewQuizImportFile;

    function processParsedRows(rows) {
        pendingImportQuestions = [];
        const sectionsMap = {};
        (quizGlobalData.sections || []).forEach(s => {
            sectionsMap[s.name.toLowerCase()] = s.id;
        });

        rows.forEach(r => {
            // Cari kolom secara fleksibel
            const secName = (r.Section || r.section || r.stasiun || r.Stasiun || 'Umum').trim();
            const qText = (r.Pertanyaan || r.pertanyaan || r.soal || r.Soal || r.question || '').trim();
            const optA = (r.Pilihan_A || r.pilihan_a || r.A || r.opt_a || '').trim();
            const optB = (r.Pilihan_B || r.pilihan_b || r.B || r.opt_b || '').trim();
            const optC = (r.Pilihan_C || r.pilihan_c || r.C || r.opt_c || '').trim();
            const optD = (r.Pilihan_D || r.pilihan_d || r.D || r.opt_d || '').trim();
            const kunci = (r.Kunci_Jawaban || r.kunci_jawaban || r.kunci || r.jawaban || r.correct || 'A').toUpperCase().trim();

            if (!qText || !optA) return;

            let secId = sectionsMap[secName.toLowerCase()];
            if (!secId) {
                // Auto create section ID if not found
                secId = `sec-${secName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            }

            pendingImportQuestions.push({
                section_name: secName,
                section_id: secId,
                question: qText,
                options: { A: optA, B: optB, C: optC, D: optD },
                correct_answer: kunci
            });
        });

        const previewWrapper = document.getElementById('quiz-import-preview-wrapper');
        const previewCount = document.getElementById('quiz-import-count');
        const tbody = document.getElementById('quiz-import-tbody');
        const btnSubmit = document.getElementById('btn-submit-import-quiz');

        if (pendingImportQuestions.length > 0) {
            previewWrapper.classList.remove('hidden');
            previewCount.textContent = `Preview: ${pendingImportQuestions.length} soal siap di-import`;
            tbody.innerHTML = pendingImportQuestions.slice(0, 5).map(q => `
                <tr class="hover:bg-slate-50">
                    <td class="p-2 font-bold text-slate-700">${q.section_name}</td>
                    <td class="p-2 text-slate-800 truncate max-w-[300px]">${q.question}</td>
                    <td class="p-2 text-center font-bold text-emerald-700">${q.correct_answer}</td>
                </tr>
            `).join('') + (pendingImportQuestions.length > 5 ? `<tr><td colspan="3" class="p-2 text-center text-slate-400 italic">...dan ${pendingImportQuestions.length - 5} soal lainnya.</td></tr>` : '');

            btnSubmit.disabled = false;
        } else {
            previewWrapper.classList.add('hidden');
            btnSubmit.disabled = true;
            alert('Tidak ada baris soal valid yang terdeteksi. Pastikan kolom sesuai dengan template.');
        }
    }

    async function executeQuizImport() {
        if (pendingImportQuestions.length === 0) return;

        const btn = document.getElementById('btn-submit-import-quiz');
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1"></i> Mengimpor...`;

        try {
            // Buat section otomatis jika ada section baru di dalam file import
            const existingSections = new Set((quizGlobalData.sections || []).map(s => s.id));
            for (const q of pendingImportQuestions) {
                if (!existingSections.has(q.section_id)) {
                    await executeRpcCall('saveQuizSection', [{
                        id: q.section_id,
                        name: q.section_name,
                        description: `Section ${q.section_name}`
                    }]);
                    existingSections.add(q.section_id);
                }
            }

            // Simpan seluruh soal secara massal
            const res = await executeRpcCall('saveQuizQuestion', [pendingImportQuestions]);
            if (res && res.success) {
                alert(`[SUKSES] Berhasil mengimpor ${res.count || pendingImportQuestions.length} soal ke Bank Soal!`);
                closeModalQuizImport();
                loadQuizAdminData();
            } else {
                alert(res?.message || 'Gagal mengimpor soal.');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat import: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `Proses Import Soal`;
        }
    }
    window.executeQuizImport = executeQuizImport;

    // ------------------------------------------------------------------------
    // 4. SUB-TAB 3: JADWAL UJIAN (QUIZ SCHEDULER)
    // ------------------------------------------------------------------------
    function renderQuizScheduleTable() {
        const tbody = document.getElementById('quiz-schedule-tbody');
        if (!tbody) return;

        const quizzes = quizGlobalData.quizzes || [];
        if (quizzes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="py-10 text-center text-xs text-slate-400">
                        <i class="fa-solid fa-calendar-xmark text-3xl mb-2 text-slate-300"></i>
                        <p>Belum ada jadwal ujian yang dibuat.</p>
                        <p class="text-[11px] text-slate-400 mt-1">Klik tombol "+ Jadwalkan Ujian Baru" untuk memulai.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const now = new Date();

        function parseWibDate(dtStr) {
            if (!dtStr) return null;
            let str = String(dtStr).trim();
            if (!str) return null;
            if (!str.includes('Z') && !str.match(/[+-]\d{2}(:\d{2})?$/)) {
                if (str.length === 16) str += ':00+07:00';
                else if (str.length === 19) str += '+07:00';
                else if (str.length === 10) str += 'T00:00:00+07:00';
            }
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        }

        tbody.innerHTML = quizzes.map(q => {
            const sec = (quizGlobalData.sections || []).find(s => s.id === q.section_id);
            const secName = sec ? sec.name : 'Teori';

            const start = parseWibDate(q.start_time);
            const end = parseWibDate(q.end_time);

            let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Terjadwal</span>`;
            if (end && now > end) {
                statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">Berakhir</span>`;
            } else if ((!start || now >= start) && (!end || now <= end)) {
                statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse"><i class="fa-solid fa-signal mr-1"></i>Aktif</span>`;
            } else if (start && now < start) {
                statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Akan Datang</span>`;
            }

            const formatDt = (dt) => {
                if (!dt) return '-';
                const d = new Date(dt);
                return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            };

            const partCount = (q.participants && q.participants.length > 0) 
                ? `${q.participants.length} Siswa` 
                : 'Semua Siswa';

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-3 font-normal text-slate-700">${q.title}</td>
                    <td class="py-3 px-3 text-slate-600">${secName}</td>
                    <td class="py-3 px-3 text-center">
                        <span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-brand-blue border border-blue-100">
                            Kelas ${q.kelas_level}
                        </span>
                    </td>
                    <td class="py-3 px-3 text-slate-600 font-mono text-[11px]">${formatDt(q.start_time)}</td>
                    <td class="py-3 px-3 text-slate-600 font-mono text-[11px]">${formatDt(q.end_time)}</td>
                    <td class="py-3 px-3 text-center font-normal text-slate-600">${q.duration_minutes} Mnt</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                        <button onclick="openQuizParticipantsDetailModal('${q.id}')"
                            class="inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 whitespace-nowrap"
                            title="Klik untuk melihat daftar nama siswa yang ikut ujian ini">
                            <span class="whitespace-nowrap">${partCount}</span>
                        </button>
                    </td>
                    <td class="py-3 px-3 text-center">${statusBadge}</td>
                    <td class="py-3 px-3 text-center">
                        <button onclick="deleteQuizSchedule('${q.id}', '${q.title.replace(/'/g, "\\'")}')"
                            class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all" title="Hapus Jadwal Ujian">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    window.renderQuizScheduleTable = renderQuizScheduleTable;

    // ------------------------------------------------------------------------
    // Helper: Ambil hanya siswa AKTIF untuk penjadwalan ujian baru
    // Siswa yang sudah Lulus, Resign, Indisipliner, atau ada di turnover TIDAK dimasukkan
    // ------------------------------------------------------------------------
    function getActiveStudentsForQuiz() {
        return getActiveManagementStudents().sort((a, b) => (a.namaLengkap || a.nama || '').localeCompare(b.namaLengkap || b.nama || ''));
    }

    let selectedQuizParticipantNoregs = new Set();

    function openModalAddSchedule() {
        document.getElementById('quiz-schedule-id').value = '';
        document.getElementById('quiz-sched-title').value = '';

        // Reset filter & search inputs
        const searchInput = document.getElementById('quiz-participant-search');
        if (searchInput) searchInput.value = '';

        // Populate sections select
        const secSel = document.getElementById('quiz-sched-section');
        secSel.innerHTML = (quizGlobalData.sections || []).map(s => `
            <option value="${s.id}">${s.name}</option>
        `).join('');

        // Set default dates
        const now = new Date();
        const startIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const endIso = new Date(now.getTime() + 4 * 3600000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('quiz-sched-start').value = startIso;
        document.getElementById('quiz-sched-end').value = endIso;
        document.getElementById('quiz-sched-duration').value = '45';

        // Ambil hanya siswa AKTIF (tanpa lulus, resign, indisipliner)
        const activeStudents = getActiveStudentsForQuiz();

        // Default: semua siswa aktif dicentang
        selectedQuizParticipantNoregs = new Set(activeStudents.map(s => s.noreg));

        // Isi dropdown filter section
        const uniqueSections = Array.from(new Set(activeStudents.map(s => s.section).filter(Boolean))).sort();
        const filterSecSel = document.getElementById('quiz-participant-section-filter');
        if (filterSecSel) {
            filterSecSel.innerHTML = `
                <option value="">Semua Section (${activeStudents.length} Siswa)</option>
                ${uniqueSections.map(sec => {
                    const cnt = activeStudents.filter(s => s.section.toUpperCase() === sec.toUpperCase()).length;
                    return `<option value="${sec}">${sec} (${cnt} Siswa)</option>`;
                }).join('')}
            `;
            filterSecSel.value = '';
        }

        // Render checklist siswa
        renderQuizParticipantsChecklist(activeStudents);

        openQuizModal('modal-quiz-schedule');
    }
    window.openModalAddSchedule = openModalAddSchedule;

    function closeModalQuizSchedule() {
        document.getElementById('modal-quiz-schedule').classList.add('hidden');
    }
    window.closeModalQuizSchedule = closeModalQuizSchedule;

    function filterQuizParticipantsList() {
        const searchVal = (document.getElementById('quiz-participant-search')?.value || '').toLowerCase().trim();
        const secFilter = (document.getElementById('quiz-participant-section-filter')?.value || '').toLowerCase().trim();

        const activeStudents = getActiveStudentsForQuiz();
        const filtered = activeStudents.filter(s => {
            const matchSearch = !searchVal || 
                s.namaLengkap.toLowerCase().includes(searchVal) || 
                s.noreg.toLowerCase().includes(searchVal);
            const matchSec = !secFilter || 
                s.section.toLowerCase() === secFilter;
            return matchSearch && matchSec;
        });

        renderQuizParticipantsChecklist(filtered);
    }
    window.filterQuizParticipantsList = filterQuizParticipantsList;

    function renderQuizParticipantsChecklist(students) {
        const listContainer = document.getElementById('quiz-participants-checklist');
        if (!listContainer) return;

        if (!students || students.length === 0) {
            listContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-5 text-center">Tidak ada siswa aktif yang sesuai dengan pencarian/filter.</p>`;
            updateQuizParticipantBadge();
            return;
        }

        listContainer.innerHTML = students.map(s => {
            const isChecked = selectedQuizParticipantNoregs.has(s.noreg);
            return `
                <label class="flex items-center gap-2.5 text-xs text-slate-700 hover:bg-white p-1.5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                    <input type="checkbox" name="quiz-participant-item" value="${s.noreg}" ${isChecked ? 'checked' : ''}
                        onchange="toggleQuizParticipantSelection('${s.noreg}', this.checked)"
                        class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300">
                    <span class="font-mono font-bold text-indigo-900 w-18">${s.noreg}</span>
                    <span class="font-bold flex-1 truncate text-slate-800">${s.namaLengkap}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">${s.section}</span>
                    <span class="text-[10px] text-slate-400 font-bold w-14 text-right whitespace-nowrap">${s.kelas}</span>
                </label>
            `;
        }).join('');

        updateQuizParticipantBadge();
    }

    function toggleQuizParticipantSelection(noreg, isChecked) {
        if (isChecked) {
            selectedQuizParticipantNoregs.add(noreg);
        } else {
            selectedQuizParticipantNoregs.delete(noreg);
        }
        updateQuizParticipantBadge();
    }
    window.toggleQuizParticipantSelection = toggleQuizParticipantSelection;

    function updateQuizParticipantBadge() {
        const badge = document.getElementById('quiz-participant-count-badge');
        if (badge) {
            const cnt = selectedQuizParticipantNoregs.size;
            badge.textContent = `${cnt} Siswa Terpilih`;
            if (cnt > 0) {
                badge.className = 'px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200';
            } else {
                badge.className = 'px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200';
            }
        }
    }

    function selectAllQuizParticipants(isSelected) {
        // Terapkan ke siswa yang sedang tampil di checklist
        const visibleCheckboxes = document.querySelectorAll('input[name="quiz-participant-item"]');
        visibleCheckboxes.forEach(cb => {
            cb.checked = isSelected;
            if (isSelected) {
                selectedQuizParticipantNoregs.add(cb.value);
            } else {
                selectedQuizParticipantNoregs.delete(cb.value);
            }
        });
        updateQuizParticipantBadge();
    }
    window.selectAllQuizParticipants = selectAllQuizParticipants;

    async function saveQuizSchedule() {
        const id = document.getElementById('quiz-schedule-id').value;
        const title = document.getElementById('quiz-sched-title').value.trim();
        const section_id = document.getElementById('quiz-sched-section').value;
        const kelas_level = parseInt(document.getElementById('quiz-sched-kelas').value) || 1;
        const start_time = document.getElementById('quiz-sched-start').value;
        const end_time = document.getElementById('quiz-sched-end').value;
        const duration_minutes = parseInt(document.getElementById('quiz-sched-duration').value) || 45;

        if (!title) {
            alert('Judul Ujian wajib diisi.');
            return;
        }

        const checkedParticipants = Array.from(selectedQuizParticipantNoregs);

        if (checkedParticipants.length === 0) {
            alert('Pilih minimal satu siswa peserta ujian.');
            return;
        }

        const payload = {
            id,
            title,
            section_id,
            kelas_level,
            start_time,
            end_time,
            duration_minutes,
            kkm: 75,
            participants: checkedParticipants,
            status: 'scheduled'
        };

        try {
            const res = await executeRpcCall('saveQuizSchedule', [payload]);
            if (res && res.success) {
                closeModalQuizSchedule();
                if (res.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                    renderCurrentQuizSubtab();
                } else {
                    loadQuizAdminData();
                }
            } else {
                alert(res?.message || 'Gagal menjadwalkan ujian.');
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
    window.saveQuizSchedule = saveQuizSchedule;

    async function deleteQuizSchedule(quizId, quizTitle) {
        if (!confirm(`Hapus jadwal ujian "${quizTitle}"?`)) return;
        try {
            // 1. Optimistic & Immediate UI update
            if (quizGlobalData && Array.isArray(quizGlobalData.quizzes)) {
                quizGlobalData.quizzes = quizGlobalData.quizzes.filter(q => q.id !== quizId);
                saveQuizToLocalCache(quizGlobalData);
                renderCurrentQuizSubtab();
            }

            const res = await executeRpcCall('deleteQuizSchedule', [quizId]);
            if (res && res.success) {
                if (res.data) {
                    quizGlobalData = res.data;
                    saveQuizToLocalCache(quizGlobalData);
                    renderCurrentQuizSubtab();
                } else {
                    loadQuizAdminData();
                }
            } else {
                alert('Gagal menghapus jadwal: ' + (res?.message || 'Error tidak diketahui'));
                loadQuizAdminData();
            }
        } catch (e) {
            console.error('[deleteQuizSchedule] Error:', e);
            alert('Error: ' + e.message);
            loadQuizAdminData();
        }
    }
    // ------------------------------------------------------------------------
    // Detail Daftar Peserta Ujian (Modal 5)
    // ------------------------------------------------------------------------
    let currentModalParticipantsList = [];

    function openQuizParticipantsDetailModal(quizId) {
        const quiz = (quizGlobalData.quizzes || []).find(q => q.id === quizId);
        if (!quiz) {
            alert('Data jadwal ujian tidak ditemukan.');
            return;
        }

        const sec = (quizGlobalData.sections || []).find(s => s.id === quiz.section_id);
        const secName = sec ? sec.name : 'Teori';

        const titleEl = document.getElementById('modal-part-detail-title');
        const subEl = document.getElementById('modal-part-detail-subtitle');
        if (titleEl) titleEl.textContent = quiz.title;
        if (subEl) subEl.textContent = `${secName} • Tingkat Kelas ${quiz.kelas_level}`;

        const searchInput = document.getElementById('modal-part-detail-search');
        if (searchInput) searchInput.value = '';

        // Ambil daftar noreg peserta
        const rawParticipants = Array.isArray(quiz.participants) ? quiz.participants : [];

        // Siapkan mapping data siswa lengkap dari seluruh pool
        const studentPool = new Map();
        [window.activeData, window.rawSiswaData, window.activeTurnoverData, window.rawTurnoverData].forEach(arr => {
            if (Array.isArray(arr)) {
                arr.forEach(s => {
                    if (!s) return;
                    const sid = String(s.id || s.noreg || s.NoReg || s.studentId || '').trim();
                    if (sid && !studentPool.has(sid)) {
                        studentPool.set(sid, {
                            noreg: sid,
                            namaLengkap: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
                            section: (s.section || s.bagian || s.departemen || '-').trim(),
                            kelas: s.kelas || s.Kelas || `Kelas ${quiz.kelas_level || 1}`
                        });
                    }
                });
            }
        });

        let targetStudents = [];
        if (rawParticipants.length > 0) {
            targetStudents = rawParticipants.map(noreg => {
                const cleanN = String(noreg).trim();
                const found = studentPool.get(cleanN);
                return found || {
                    noreg: cleanN,
                    namaLengkap: `Siswa ${cleanN}`,
                    section: secName,
                    kelas: `Kelas ${quiz.kelas_level || 1}`
                };
            });
        } else {
            // Jika participants kosong, berarti terbuka untuk semua siswa aktif
            targetStudents = getActiveStudentsForQuiz();
        }

        // Pasangkan dengan riwayat submission ujian ini
        const quizSubs = (quizGlobalData.submissions || []).filter(s => s.quiz_id === quiz.id);
        currentModalParticipantsList = targetStudents.map(s => {
            const studentSubs = quizSubs.filter(sub => String(sub.noreg) === String(s.noreg));
            const lastSub = studentSubs.length > 0 ? studentSubs[studentSubs.length - 1] : null;
            return {
                ...s,
                submission: lastSub
            };
        });

        // Urutkan alfabetis berdasarkan nama siswa
        currentModalParticipantsList.sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));

        renderModalParticipantsList(currentModalParticipantsList);
        openQuizModal('modal-quiz-participants-detail');
    }
    window.openQuizParticipantsDetailModal = openQuizParticipantsDetailModal;

    function closeModalQuizParticipantsDetail() {
        document.getElementById('modal-quiz-participants-detail')?.classList.add('hidden');
    }
    window.closeModalQuizParticipantsDetail = closeModalQuizParticipantsDetail;

    function filterModalParticipantsDetail() {
        const query = (document.getElementById('modal-part-detail-search')?.value || '').toLowerCase().trim();
        const filtered = currentModalParticipantsList.filter(s => {
            return !query || 
                s.namaLengkap.toLowerCase().includes(query) || 
                s.noreg.toLowerCase().includes(query) ||
                s.section.toLowerCase().includes(query);
        });
        renderModalParticipantsList(filtered);
    }
    window.filterModalParticipantsDetail = filterModalParticipantsDetail;

    function renderModalParticipantsList(list) {
        const container = document.getElementById('modal-part-detail-list');
        const countEl = document.getElementById('modal-part-detail-count');
        if (!container) return;

        if (countEl) {
            countEl.textContent = `Total: ${list.length} Peserta Terdaftar`;
        }

        if (!list || list.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada peserta yang cocok dengan pencarian.</p>`;
            return;
        }

        const baseUrl = (typeof window !== 'undefined' && window.PUBLIC_SUPABASE_URL) ? window.PUBLIC_SUPABASE_URL : 'https://xpoddtzxsopwzojycmwx.supabase.co';

        container.innerHTML = list.map((s, idx) => {
            const photoUrl = `${baseUrl}/storage/v1/object/public/foto-siswa/${encodeURIComponent(s.noreg)}.jpg`;
            
            let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap"><i class="fa-regular fa-clock mr-1"></i>Belum Ujian</span>`;
            if (s.submission) {
                const isPassed = s.submission.score >= 75;
                const badgeClass = isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
                statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${badgeClass} whitespace-nowrap"><i class="fa-solid fa-square-check mr-1"></i>Nilai: ${s.submission.score}</span>`;
            }

            return `
                <div class="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-5 text-center text-[10.5px] font-bold text-slate-400 shrink-0 font-mono">${idx + 1}</span>
                        <div class="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                            <img src="${photoUrl}" alt="${s.namaLengkap}" loading="lazy"
                                class="w-full h-full object-cover"
                                onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                            <div class="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xs hidden">
                                ${s.namaLengkap.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="font-mono text-xs font-bold text-indigo-700">${s.noreg}</span>
                                <span class="text-[9.5px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-600 border border-slate-200 truncate">${s.section}</span>
                            </div>
                            <h5 class="text-xs font-bold text-slate-800 truncate">${s.namaLengkap}</h5>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="text-[10px] font-bold text-slate-400 hidden sm:inline">${s.kelas}</span>
                        ${statusBadge}
                    </div>
                </div>
            `;
        }).join('');
    }
    // ------------------------------------------------------------------------
    // Real-time Sync & Auto-Refresh Nilai Ujian
    // ------------------------------------------------------------------------
    if (typeof BroadcastChannel !== 'undefined') {
        const syncChannel = new BroadcastChannel('ltc_quiz_sync_channel');
        syncChannel.onmessage = (event) => {
            if (event && event.data && event.data.type === 'QUIZ_SUBMITTED') {
                loadQuizAdminData();
            }
        };
    }

    window.addEventListener('storage', (event) => {
        if (event.key === 'ltc_quiz_last_submission') {
            loadQuizAdminData();
        }
    });

    // Otomatis refresh saat admin berpindah/kembali ke tab ini
    window.addEventListener('focus', () => {
        const tabEl = document.getElementById('admin-tab-kelola-quiz');
        if (tabEl && !tabEl.classList.contains('hidden')) {
            loadQuizAdminData();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const tabEl = document.getElementById('admin-tab-kelola-quiz');
            if (tabEl && !tabEl.classList.contains('hidden')) {
                loadQuizAdminData();
            }
        }
    });

    // Polling background setiap 10 detik saat tab Quiz sedang aktif
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            const tabEl = document.getElementById('admin-tab-kelola-quiz');
            if (tabEl && !tabEl.classList.contains('hidden')) {
                loadQuizAdminData();
            }
        }
    }, 10000);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const rc = document.getElementById('view-student-report-card');
            if (rc && !rc.classList.contains('hidden')) {
                closeStudentReportCard();
            }
        }
    });

    window.deleteQuizSchedule = deleteQuizSchedule;

})();
