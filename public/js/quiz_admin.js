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
            btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm', 'border', 'border-slate-100');
            btn.classList.add('text-slate-600');
        });
        const activeBtn = document.getElementById('tab-btn-quiz-' + currentQuizSubTab);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-600');
            activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm', 'border', 'border-slate-100');
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

            // Muat daftar siswa aktif untuk mapping nama & checklist peserta dari seluruh pool data
            const studentMapPool = new Map();
            [window.activeData, window.rawSiswaData, window.activeTurnoverData, window.rawTurnoverData].forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(s => {
                        if (!s) return;
                        const sid = String(s.id || s.noreg || s.NoReg || s.studentId || '').trim();
                        if (sid && !studentMapPool.has(sid)) {
                            studentMapPool.set(sid, {
                                id: sid,
                                noreg: sid,
                                namaLengkap: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
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

        // 1. Tambahkan siswa terdaftar
        cachedStudentsList.forEach(s => {
            const noreg = String(s.id || s.noreg || s.NoReg || s.studentId || '').trim();
            const nama = s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${noreg}`;
            if (noreg) {
                studentMap.set(noreg, {
                    noreg: noreg,
                    nama: nama,
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
                studentMap.set(noreg, {
                    noreg: noreg,
                    nama: sub.nama || `Siswa ${noreg}`,
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

        let students = Array.from(studentMap.values());

        // Filter pencarian teks
        if (query) {
            students = students.filter(s => 
                s.noreg.toLowerCase().includes(query) || 
                s.nama.toLowerCase().includes(query)
            );
        }

        // Hitung rata-rata dan evaluasi KKM 75
        students.forEach(s => {
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
                        <i class="fa-solid fa-clipboard-question text-3xl mb-2 text-slate-300"></i>
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
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Remidi (< 75)</span>`;
                } else {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"><i class="fa-solid fa-check mr-1"></i>Lulus KKM</span>`;
                }
            }

            return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">${s.noreg}</td>
                    <td class="py-3 px-3 text-slate-800 font-bold whitespace-nowrap">${s.nama}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(1)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(2)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(3)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(4)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${renderScoreCell(5)}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${avgDisplay}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">${statusBadge}</td>
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
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
        const turnoverSet = new Set();
        const turnoverSource = (typeof window !== 'undefined' && Array.isArray(window.activeTurnoverData) && window.activeTurnoverData.length > 0)
            ? window.activeTurnoverData
            : ((typeof window !== 'undefined' && Array.isArray(window.rawTurnoverData)) ? window.rawTurnoverData : []);
        turnoverSource.forEach(t => {
            const tid = String(t.id || t.noreg || '').trim().toUpperCase();
            if (tid) turnoverSet.add(tid);
        });

        const candidates = (typeof window !== 'undefined' && Array.isArray(window.activeData) && window.activeData.length > 0)
            ? window.activeData
            : ((typeof window !== 'undefined' && Array.isArray(window.rawSiswaData))
                ? window.rawSiswaData.filter(s => String(s.status || '').toUpperCase() === 'AKTIF')
                : []);

        const activeMap = new Map();
        candidates.forEach(s => {
            if (!s) return;
            const sid = String(s.id || s.noreg || s.NoReg || s.studentId || '').trim();
            const stUpper = String(s.status || '').trim().toUpperCase();
            // Siswa yang sudah lulus, resign, indisipliner, atau ada di tabel turnover TIDAK boleh masuk
            if (!sid || turnoverSet.has(sid.toUpperCase()) || (stUpper && stUpper !== 'AKTIF')) {
                return;
            }
            if (!activeMap.has(sid)) {
                activeMap.set(sid, {
                    id: sid,
                    noreg: sid,
                    namaLengkap: s.namaLengkap || s.nama || s.Nama || s.name || `Siswa ${sid}`,
                    kelas: s.kelas || s.Kelas || 'Kelas 1',
                    section: (s.section || s.bagian || s.departemen || '-').trim()
                });
            }
        });

        return Array.from(activeMap.values()).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
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
    window.deleteQuizSchedule = deleteQuizSchedule;

})();
