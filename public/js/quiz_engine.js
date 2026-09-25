// ============================================================================
// ENGINE UJIAN SISWA (QUIZ ENGINE INTERAKTIF - LTC INDOPRIMA GEMILANG)
// Mengadopsi Konsep Quizizz / Wayground: Randomize, Timer, Auto-Save, Scorecard
// ============================================================================

(function() {
    let currentQuizId = null;
    let currentStudent = null;
    let quizInfo = null;
    let examQuestions = []; // Pertanyaan yang sudah diacak
    let currentQuestionIndex = 0;
    let studentAnswers = {}; // Map: { question_id: original_correct_key }
    let timerInterval = null;
    let remainingSeconds = 0;

    // ------------------------------------------------------------------------
    // 1. Inisialisasi Ujian
    // ------------------------------------------------------------------------
    window.addEventListener('DOMContentLoaded', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        currentQuizId = urlParams.get('id');

        // Ambil data user/siswa saat ini
        let userRaw = localStorage.getItem('currentUser');
        if (userRaw) {
            try { currentStudent = JSON.parse(userRaw); } catch(e) {}
        }

        if (!currentStudent || !currentStudent.noreg && !currentStudent.studentId && !currentStudent.id) {
            // Jika tidak ada user tersimpan, buat fallback atau prompt NoReg
            const promptNoreg = prompt('Masukkan NoReg Siswa Anda untuk memulai ujian:', '131');
            if (!promptNoreg) {
                alert('NoReg dibutuhkan untuk mengikuti ujian.');
                window.location.href = '/';
                return;
            }
            currentStudent = {
                noreg: promptNoreg.trim(),
                namaLengkap: 'Siswa ' + promptNoreg.trim()
            };
        }

        const studentNoreg = String(currentStudent.noreg || currentStudent.studentId || currentStudent.id || '').trim();
        const studentName = currentStudent.namaLengkap || currentStudent.name || `Siswa ${studentNoreg}`;

        // Tampilkan profil siswa di header
        const elName = document.getElementById('quiz-student-name');
        const elNoreg = document.getElementById('quiz-student-noreg');
        if (elName) elName.textContent = studentName;
        if (elNoreg) elNoreg.textContent = `NoReg: ${studentNoreg}`;

        if (!currentQuizId) {
            alert('Parameter ID Ujian tidak ditemukan di URL.');
            window.location.href = '/';
            return;
        }

        await loadAndPrepareQuiz(currentQuizId, studentNoreg);
    });

    async function loadAndPrepareQuiz(quizId, noreg) {
        try {
            const res = await executeRpcCall('getQuizData', []);
            if (!res || !res.success || !res.data) {
                alert('Gagal memuat basis data ujian dari server.');
                return;
            }

            const store = res.data;
            quizInfo = (store.quizzes || []).find(q => q.id === quizId);

            if (!quizInfo) {
                alert('Data jadwal ujian tidak ditemukan.');
                window.location.href = '/';
                return;
            }

            // Update Header Ujian
            const sec = (store.sections || []).find(s => s.id === quizInfo.section_id);
            const secName = sec ? sec.name : 'Teori';
            document.getElementById('quiz-header-title').textContent = quizInfo.title;
            document.getElementById('quiz-header-section').innerHTML = `
                <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>${secName} • Kelas ${quizInfo.kelas_level}</span>
            `;

            // Filter soal berdasarkan section_id
            const rawQuestions = (store.questions || []).filter(q => q.section_id === quizInfo.section_id);
            if (rawQuestions.length === 0) {
                alert('Belum ada soal pada stasiun kerja ini. Silakan hubungi admin.');
                window.location.href = '/';
                return;
            }

            // Cek apakah sudah pernah mengerjakan dan belum diberi izin remidi
            const prevSubs = (store.submissions || []).filter(s => s.quiz_id === quizId && String(s.noreg) === String(noreg));
            if (prevSubs.length > 0) {
                const lastSub = prevSubs[prevSubs.length - 1];
                if (!lastSub.remedial_granted) {
                    // Tampilkan skor sebelumnya
                    displayFinalScorecard({
                        score: lastSub.score,
                        kkm: quizInfo.kkm || 75,
                        totalQuestions: rawQuestions.length,
                        correctCount: lastSub.correct_count || Math.round((lastSub.score / 100) * rawQuestions.length),
                        attempt: prevSubs.length,
                        alreadyCompleted: true
                    });
                    return;
                } else {
                    // Siswa diizinkan remidi: reset cache ujian sesi lama (timer, jawaban, shuffle) jika timer sesi sebelumnya sudah habis
                    const timerKey = `quiz_timer_start_${quizId}_${noreg}`;
                    const ansKey = `quiz_answers_${quizId}_${noreg}`;
                    const sessionCacheKey = `quiz_questions_session_${quizId}_${noreg}`;
                    const prevStart = localStorage.getItem(timerKey);
                    if (prevStart) {
                        const elapsed = Math.floor((Date.now() - parseInt(prevStart)) / 1000);
                        if (elapsed >= (quizInfo.duration_minutes || 45) * 60) {
                            localStorage.removeItem(timerKey);
                            localStorage.removeItem(ansKey);
                            sessionStorage.removeItem(sessionCacheKey);
                        }
                    }
                }
            }

            // ----------------------------------------------------------------
            // Anti-Contek: Pengacakan Soal & Opsi Jawaban Unik per Siswa
            // ----------------------------------------------------------------
            const sessionCacheKey = `quiz_questions_session_${quizId}_${noreg}`;
            const cachedSession = sessionStorage.getItem(sessionCacheKey);

            if (cachedSession) {
                try {
                    examQuestions = JSON.parse(cachedSession);
                } catch (e) {
                    examQuestions = prepareShuffledQuestions(rawQuestions);
                    sessionStorage.setItem(sessionCacheKey, JSON.stringify(examQuestions));
                }
            } else {
                examQuestions = prepareShuffledQuestions(rawQuestions);
                sessionStorage.setItem(sessionCacheKey, JSON.stringify(examQuestions));
            }

            // Muat jawaban tersimpan dari LocalStorage jika reload
            const ansKey = `quiz_answers_${quizId}_${noreg}`;
            const savedAns = localStorage.getItem(ansKey);
            if (savedAns) {
                try { studentAnswers = JSON.parse(savedAns); } catch(e) {}
            }

            // Inisialisasi Timer Countdown
            initQuizTimer(quizId, noreg, quizInfo.duration_minutes || 45);

            // Inisialisasi Navigasi & Render Soal Pertama
            currentQuestionIndex = 0;
            renderCurrentQuestion();
            renderDrawerGrid();
            setupKeyboardShortcuts();

            // Inisialisasi Musik Pengiring (BGM)
            initQuizAudio();

        } catch (err) {
            console.error('[QuizEngine] Error initializing quiz:', err);
            alert('Terjadi kesalahan memuat kuis: ' + err.message);
        }
    }

    // ------------------------------------------------------------------------
    // Audio Player BGM (Musik Loop Otomatis, Tombol Speaker, & Slider Volume)
    // ------------------------------------------------------------------------
    let bgmAudioEl = null;
    let isBgmPlaying = false;
    let currentVolume = 35; // 0 - 100

    function initQuizAudio() {
        bgmAudioEl = document.getElementById('quiz-bgm-audio');
        if (!bgmAudioEl) return;

        // Muat volume tersimpan atau default 35%
        const savedVol = localStorage.getItem('quiz_bgm_volume');
        const isMutedPref = localStorage.getItem('quiz_bgm_muted') === 'true';

        currentVolume = savedVol !== null ? Math.max(0, Math.min(100, parseInt(savedVol) || 0)) : 35;

        // Terapkan volume awal
        if (isMutedPref) {
            bgmAudioEl.volume = 0;
            updateAudioUI(false, 0);
            return;
        } else {
            bgmAudioEl.volume = currentVolume / 100;
            updateAudioUI(true, currentVolume);
        }

        // Coba putar otomatis
        const playPromise = bgmAudioEl.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isBgmPlaying = true;
                updateAudioUI(true, currentVolume);
            }).catch(() => {
                // Kebijakan browser memerlukan interaksi pertama
                updateAudioUI(false, currentVolume);
                const handleFirstInteraction = () => {
                    if (localStorage.getItem('quiz_bgm_muted') !== 'true' && bgmAudioEl) {
                        bgmAudioEl.play().then(() => {
                            isBgmPlaying = true;
                            updateAudioUI(true, currentVolume);
                        }).catch(() => {});
                    }
                    document.removeEventListener('click', handleFirstInteraction);
                    document.removeEventListener('keydown', handleFirstInteraction);
                };
                document.addEventListener('click', handleFirstInteraction, { once: true });
                document.addEventListener('keydown', handleFirstInteraction, { once: true });
            });
        }
    }

    function setQuizVolume(val) {
        bgmAudioEl = bgmAudioEl || document.getElementById('quiz-bgm-audio');
        const num = Math.max(0, Math.min(100, parseInt(val) || 0));
        currentVolume = num;

        if (bgmAudioEl) {
            bgmAudioEl.volume = num / 100;
        }

        // Simpan volume aktif jika > 0
        if (num > 0) {
            localStorage.setItem('quiz_bgm_volume', String(num));
            localStorage.setItem('quiz_bgm_last_non_zero_vol', String(num));
            localStorage.setItem('quiz_bgm_muted', 'false');

            // Jika sedang pause dan volume dinaikkan, putar musik
            if (bgmAudioEl && bgmAudioEl.paused) {
                bgmAudioEl.play().then(() => {
                    isBgmPlaying = true;
                }).catch(() => {});
            }
            updateAudioUI(true, num);
        } else {
            // Volume 0 (Mute)
            localStorage.setItem('quiz_bgm_muted', 'true');
            if (bgmAudioEl && !bgmAudioEl.paused) {
                bgmAudioEl.pause();
                isBgmPlaying = false;
            }
            updateAudioUI(false, 0);
        }
    }
    window.setQuizVolume = setQuizVolume;

    function toggleQuizAudio() {
        bgmAudioEl = bgmAudioEl || document.getElementById('quiz-bgm-audio');
        if (!bgmAudioEl) return;

        const isCurrentlyMuted = bgmAudioEl.paused || bgmAudioEl.volume === 0;

        if (isCurrentlyMuted) {
            // Unmute: pulihkan volume sebelumnya (default 35)
            const lastVol = parseInt(localStorage.getItem('quiz_bgm_last_non_zero_vol') || '35');
            setQuizVolume(lastVol);
        } else {
            // Mute: simpan volume aktif lalu set 0
            const activeVol = Math.round(bgmAudioEl.volume * 100);
            if (activeVol > 0) {
                localStorage.setItem('quiz_bgm_last_non_zero_vol', String(activeVol));
            }
            setQuizVolume(0);
        }
    }
    window.toggleQuizAudio = toggleQuizAudio;

    function updateAudioUI(isPlaying, volumeValue) {
        const icon = document.getElementById('quiz-audio-icon');
        const slider = document.getElementById('quiz-volume-slider');
        const percentLabel = document.getElementById('quiz-volume-percent');
        const pill = document.getElementById('quiz-audio-control-pill');

        const vol = volumeValue !== undefined ? volumeValue : currentVolume;

        // Update Slider & Label
        if (slider && parseInt(slider.value) !== vol) {
            slider.value = vol;
        }
        if (percentLabel) {
            percentLabel.textContent = `${vol}%`;
            percentLabel.className = vol === 0 
                ? 'text-[10px] font-mono font-bold text-slate-500 min-w-[28px] text-right'
                : 'text-[10px] font-mono font-bold text-indigo-300 min-w-[28px] text-right';
        }

        // Update Icon & Status
        if (!icon) return;

        if (vol === 0 || !isPlaying) {
            icon.className = 'fa-solid fa-volume-xmark text-slate-500 text-xs';
            if (pill) pill.classList.add('opacity-75');
        } else if (vol <= 40) {
            icon.className = 'fa-solid fa-volume-low text-indigo-400 text-xs';
            if (pill) pill.classList.remove('opacity-75');
        } else {
            icon.className = 'fa-solid fa-volume-high text-indigo-400 text-xs';
            if (pill) pill.classList.remove('opacity-75');
        }
    }

    function stopQuizAudio() {
        if (bgmAudioEl && !bgmAudioEl.paused) {
            bgmAudioEl.pause();
            isBgmPlaying = false;
        }
    }

    // Helper: Acak urutan soal dan acak posisi opsi jawaban (A, B, C, D)
    function prepareShuffledQuestions(questions) {
        // Acak urutan soal
        const shuffledQ = [...questions].sort(() => Math.random() - 0.5);

        // Acak urutan opsi untuk setiap soal
        return shuffledQ.map(q => {
            const rawOpts = [
                { originalKey: 'A', text: q.options?.A || '' },
                { originalKey: 'B', text: q.options?.B || '' },
                { originalKey: 'C', text: q.options?.C || '' },
                { originalKey: 'D', text: q.options?.D || '' }
            ].filter(o => o.text.trim() !== '');

            // Acak posisi pilihan
            const randomizedOpts = [...rawOpts].sort(() => Math.random() - 0.5);

            // Petakan kembali ke A, B, C, D
            const finalOptions = {};
            const keyLetters = ['A', 'B', 'C', 'D'];
            randomizedOpts.forEach((opt, idx) => {
                finalOptions[keyLetters[idx]] = {
                    text: opt.text,
                    originalKey: opt.originalKey
                };
            });

            return {
                id: q.id,
                section_id: q.section_id,
                question: q.question,
                displayOptions: finalOptions // Format: { A: { text, originalKey }, B: ... }
            };
        });
    }

    // ------------------------------------------------------------------------
    // 2. Timer Countdown Real-Time
    // ------------------------------------------------------------------------
    function initQuizTimer(quizId, noreg, durationMinutes) {
        const timerKey = `quiz_timer_start_${quizId}_${noreg}`;
        let startTime = localStorage.getItem(timerKey);

        const totalSeconds = durationMinutes * 60;

        if (!startTime) {
            startTime = Date.now().toString();
            localStorage.setItem(timerKey, startTime);
        }

        const elapsedSeconds = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

        if (remainingSeconds <= 0) {
            autoSubmitOnTimeout();
            return;
        }

        updateTimerUI(remainingSeconds);

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            remainingSeconds--;
            updateTimerUI(remainingSeconds);

            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                autoSubmitOnTimeout();
            }
        }, 1000);
    }

    function updateTimerUI(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        const timerEl = document.getElementById('quiz-timer-countdown');
        const pillEl = document.getElementById('quiz-timer-pill');
        if (timerEl) timerEl.textContent = timeStr;

        if (pillEl) {
            if (seconds <= 60) {
                // Sisa 1 menit: Merah berkedip
                pillEl.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs font-mono font-bold text-rose-400 animate-pulse shadow-inner';
            } else if (seconds <= 300) {
                // Sisa 5 menit: Kuning/Amber
                pillEl.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-mono font-bold text-amber-400 shadow-inner';
            } else {
                // Normal
                pillEl.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700/80 text-xs font-mono font-bold text-indigo-400 shadow-inner';
            }
        }
    }

    function autoSubmitOnTimeout() {
        alert('Waktu ujian telah habis! Jawaban Anda akan otomatis dikumpulkan.');
        executeFinalSubmit(true);
    }

    // ------------------------------------------------------------------------
    // 3. Render Soal & Interaktivitas Opsi Jawaban
    // ------------------------------------------------------------------------
    function renderCurrentQuestion() {
        if (examQuestions.length === 0) return;
        const q = examQuestions[currentQuestionIndex];
        if (!q) return;

        // Update indikator nomor soal
        const numEl = document.getElementById('quiz-question-number');
        if (numEl) numEl.textContent = `Soal ${currentQuestionIndex + 1} dari ${examQuestions.length}`;

        // Update teks soal
        const qTextEl = document.getElementById('quiz-question-text');
        if (qTextEl) qTextEl.textContent = q.question;

        // Update Progress Bar
        const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
        const bar = document.getElementById('quiz-progress-bar');
        if (bar) bar.style.width = `${progress}%`;

        // Update answered count
        const answeredCount = Object.keys(studentAnswers).length;
        const ansCountEl = document.getElementById('quiz-answered-count');
        if (ansCountEl) ansCountEl.textContent = `${answeredCount} Terjawab`;

        // Render 4 Opsi Jawaban
        const optionsContainer = document.getElementById('quiz-options-container');
        if (!optionsContainer) return;

        const currentAnswerOriginal = studentAnswers[q.id]; // originalKey (misal 'B')

        const letters = ['A', 'B', 'C', 'D'];
        optionsContainer.innerHTML = letters.map(letter => {
            const opt = q.displayOptions[letter];
            if (!opt) return '';

            const isSelected = currentAnswerOriginal === opt.originalKey;

            const selectedClass = isSelected
                ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg ring-2 ring-indigo-500/40'
                : 'border-slate-700/80 bg-slate-800/40 text-slate-200 hover:border-slate-600 hover:bg-slate-800/70';

            const badgeClass = isSelected
                ? 'bg-indigo-600 text-white font-black'
                : 'bg-slate-700/60 text-slate-400 font-bold';

            return `
                <button type="button" onclick="selectAnswer('${q.id}', '${opt.originalKey}')"
                    class="p-4 rounded-2xl border ${selectedClass} text-left transition-all duration-200 flex items-start gap-3 group cursor-pointer focus:outline-none">
                    <span class="w-8 h-8 rounded-xl ${badgeClass} text-xs flex items-center justify-center shrink-0 transition-colors">
                        ${letter}
                    </span>
                    <span class="text-xs sm:text-sm font-semibold leading-relaxed pt-1.5 flex-1">
                        ${opt.text}
                    </span>
                    ${isSelected ? '<i class="fa-solid fa-circle-check text-indigo-400 text-base shrink-0 pt-1.5"></i>' : ''}
                </button>
            `;
        }).join('');

        // Update tombol navigasi
        const btnPrev = document.getElementById('btn-prev-question');
        const btnNext = document.getElementById('btn-next-question');

        if (btnPrev) {
            btnPrev.disabled = currentQuestionIndex === 0;
            btnPrev.classList.toggle('opacity-50', currentQuestionIndex === 0);
            btnPrev.classList.toggle('cursor-not-allowed', currentQuestionIndex === 0);
        }

        if (btnNext) {
            const isLast = currentQuestionIndex === examQuestions.length - 1;
            btnNext.innerHTML = isLast 
                ? 'Selesai <i class="fa-solid fa-flag-checkered"></i>' 
                : 'Selanjutnya <i class="fa-solid fa-arrow-right"></i>';
        }

        updateDrawerActiveState();
    }

    function selectAnswer(questionId, originalKey) {
        studentAnswers[questionId] = originalKey;

        // Auto-save ke LocalStorage
        const studentNoreg = String(currentStudent.noreg || currentStudent.studentId || currentStudent.id || '').trim();
        const ansKey = `quiz_answers_${currentQuizId}_${studentNoreg}`;
        localStorage.setItem(ansKey, JSON.stringify(studentAnswers));

        // Re-render UI
        renderCurrentQuestion();
        renderDrawerGrid();
    }
    window.selectAnswer = selectAnswer;

    function navigateQuestion(direction) {
        const nextIndex = currentQuestionIndex + direction;
        if (nextIndex >= 0 && nextIndex < examQuestions.length) {
            currentQuestionIndex = nextIndex;
            renderCurrentQuestion();
        } else if (nextIndex >= examQuestions.length) {
            confirmSubmitExam();
        }
    }
    window.navigateQuestion = navigateQuestion;

    function jumpToQuestion(index) {
        if (index >= 0 && index < examQuestions.length) {
            currentQuestionIndex = index;
            renderCurrentQuestion();
            toggleQuestionDrawer(false);
        }
    }
    window.jumpToQuestion = jumpToQuestion;

    // ------------------------------------------------------------------------
    // 4. Laci / Drawer Nomor Soal
    // ------------------------------------------------------------------------
    function toggleQuestionDrawer(isOpen) {
        const drawer = document.getElementById('quiz-drawer');
        const backdrop = document.getElementById('quiz-drawer-backdrop');
        if (!drawer || !backdrop) return;

        const willOpen = (isOpen !== undefined) ? isOpen : drawer.classList.contains('translate-x-full');

        if (willOpen) {
            drawer.classList.remove('translate-x-full');
            backdrop.classList.remove('hidden');
        } else {
            drawer.classList.add('translate-x-full');
            backdrop.classList.add('hidden');
        }
    }
    window.toggleQuestionDrawer = toggleQuestionDrawer;

    function renderDrawerGrid() {
        const grid = document.getElementById('quiz-drawer-grid');
        if (!grid) return;

        grid.innerHTML = examQuestions.map((q, idx) => {
            const isAnswered = !!studentAnswers[q.id];
            const isCurrent = idx === currentQuestionIndex;

            let style = 'bg-slate-800 text-slate-400 border border-slate-700/80';
            if (isAnswered) {
                style = 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/30';
            }
            if (isCurrent) {
                style += ' ring-2 ring-white';
            }

            return `
                <button type="button" onclick="jumpToQuestion(${idx})"
                    class="h-10 rounded-xl ${style} text-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 font-mono">
                    ${idx + 1}
                </button>
            `;
        }).join('');
    }

    function updateDrawerActiveState() {
        renderDrawerGrid();
    }

    // ------------------------------------------------------------------------
    // 5. Keyboard Shortcuts (A, B, C, D, Left, Right)
    // ------------------------------------------------------------------------
    function setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Abaikan jika modal konfirmasi terbuka
            if (!document.getElementById('modal-confirm-submit')?.classList.contains('hidden')) return;

            const key = e.key.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(key)) {
                const q = examQuestions[currentQuestionIndex];
                if (q && q.displayOptions && q.displayOptions[key]) {
                    selectAnswer(q.id, q.displayOptions[key].originalKey);
                }
            } else if (e.key === 'ArrowRight') {
                navigateQuestion(1);
            } else if (e.key === 'ArrowLeft') {
                navigateQuestion(-1);
            }
        });
    }

    // ------------------------------------------------------------------------
    // 6. Submit Ujian & Konfirmasi
    // ------------------------------------------------------------------------
    function confirmSubmitExam() {
        const total = examQuestions.length;
        const answered = Object.keys(studentAnswers).length;
        const unanswered = total - answered;

        const summaryText = document.getElementById('submit-summary-text');
        const warnEl = document.getElementById('submit-warning-unanswered');

        if (summaryText) {
            summaryText.textContent = `Anda telah menjawab ${answered} dari total ${total} soal.`;
        }

        if (warnEl) {
            if (unanswered > 0) {
                warnEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> Perhatian: Masih ada <strong>${unanswered}</strong> soal yang belum Anda jawab!`;
                warnEl.classList.remove('hidden');
            } else {
                warnEl.classList.add('hidden');
            }
        }

        document.getElementById('modal-confirm-submit')?.classList.remove('hidden');
    }
    window.confirmSubmitExam = confirmSubmitExam;

    function closeConfirmModal() {
        document.getElementById('modal-confirm-submit')?.classList.add('hidden');
    }
    window.closeConfirmModal = closeConfirmModal;

    async function executeFinalSubmit(isTimeout = false) {
        closeConfirmModal();

        const btn = document.getElementById('btn-final-submit');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1"></i> Mengirimkan...`;
        }

        const studentNoreg = String(currentStudent.noreg || currentStudent.studentId || currentStudent.id || '').trim();
        const studentName = currentStudent.namaLengkap || currentStudent.name || `Siswa ${studentNoreg}`;

        try {
            if (timerInterval) clearInterval(timerInterval);

            const payload = {
                quiz_id: currentQuizId,
                noreg: studentNoreg,
                nama: studentName,
                answers: studentAnswers
            };

            const res = await executeRpcCall('submitQuizAnswer', [payload]);
            if (res && res.success) {
                // Broadcast sync event ke tab Admin yang sedang terbuka
                try {
                    if (typeof BroadcastChannel !== 'undefined') {
                        const channel = new BroadcastChannel('ltc_quiz_sync_channel');
                        channel.postMessage({ type: 'QUIZ_SUBMITTED', noreg: studentNoreg, quizId: currentQuizId });
                        channel.close();
                    }
                    localStorage.setItem('ltc_quiz_last_submission', String(Date.now()));
                } catch (e) {}

                // Hapus cache pengerjaan lokal
                localStorage.removeItem(`quiz_answers_${currentQuizId}_${studentNoreg}`);
                localStorage.removeItem(`quiz_timer_start_${currentQuizId}_${studentNoreg}`);
                sessionStorage.removeItem(`quiz_questions_session_${currentQuizId}_${studentNoreg}`);

                // Tampilkan Skor Akhir
                displayFinalScorecard(res);
            } else {
                alert(res?.message || 'Gagal mengirimkan jawaban ujian.');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat mengirim jawaban: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `Ya, Kumpulkan`;
            }
        }
    }
    window.executeFinalSubmit = executeFinalSubmit;

    // ------------------------------------------------------------------------
    // 7. Tampilan Skor Post-Submit (Strict: Tanpa Kunci Jawaban / Pembahasan)
    // ------------------------------------------------------------------------
    function displayFinalScorecard(data) {
        // Hentikan musik saat hasil ujian ditampilkan
        stopQuizAudio();

        const scorecard = document.getElementById('quiz-scorecard-view');
        if (!scorecard) return;

        const score = data.score !== undefined ? data.score : 0;
        const kkm = data.kkm || 75;
        const isPassed = score >= kkm;

        // Big Score
        document.getElementById('scorecard-score').textContent = score.toFixed(1);
        document.getElementById('scorecard-kkm-info').innerHTML = `Standar Kelulusan (KKM): <strong class="text-white">${kkm}</strong>`;

        // Ringkasan
        document.getElementById('scorecard-total-q').textContent = data.totalQuestions || examQuestions.length;
        document.getElementById('scorecard-correct-q').textContent = data.correctCount !== undefined ? data.correctCount : '-';
        document.getElementById('scorecard-attempt').textContent = `Ke-${data.attempt || 1}`;

        // Badge Status & Styling
        const badge = document.getElementById('scorecard-status-badge');
        const iconWrapper = document.getElementById('scorecard-icon-wrapper');
        const icon = document.getElementById('scorecard-icon');
        const greeting = document.getElementById('scorecard-greeting');
        const subtitle = document.getElementById('scorecard-subtitle');
        const remedialNotice = document.getElementById('scorecard-remedial-notice');

        if (isPassed) {
            badge.className = 'px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider';
            badge.textContent = 'LULUS KKM';

            iconWrapper.className = 'w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-4xl mx-auto shadow-inner';
            icon.className = 'fa-solid fa-trophy';

            greeting.textContent = 'Selamat! Anda Berhasil Lulus.';
            subtitle.textContent = 'Nilai Anda memenuhi standar kualifikasi evaluasi teori LTC.';
            remedialNotice.classList.add('hidden');
        } else {
            badge.className = 'px-3.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider';
            badge.textContent = 'BELUM MEMENUHI KKM';

            iconWrapper.className = 'w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-4xl mx-auto shadow-inner';
            icon.className = 'fa-solid fa-triangle-exclamation';

            greeting.textContent = 'Hasil Evaluasi Teori';
            subtitle.textContent = 'Nilai Anda belum mencapai standar minimum KKM 75.';
            remedialNotice.classList.remove('hidden');
        }

        scorecard.classList.remove('hidden');
    }

    function exitQuizToPortal() {
        window.location.href = '/?view=siswa_portal';
    }
    window.exitQuizToPortal = exitQuizToPortal;

})();
