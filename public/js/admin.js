
    var currentAdminTab = 'sync-akun';

    // ============================================================
    // UTILITY: Hitung Kelas otomatis dari Tanggal Masuk
    // Rumus: =DATEDIF(tgl_masuk, TODAY(), "m") + 1
    // Sama persis dengan rumus Excel yang digunakan
    // ============================================================
    function hitungKelas(tanggalMasuk) {
        if (!tanggalMasuk) return 'Kelas 1';
        const masuk = new Date(tanggalMasuk);
        if (isNaN(masuk.getTime())) return 'Kelas 1';
        const now = new Date();
        // Hitung bulan penuh (DATEDIF dengan "m")
        let bulan = (now.getFullYear() - masuk.getFullYear()) * 12 + (now.getMonth() - masuk.getMonth());
        // Jika hari ini belum mencapai hari masuk di bulan ini, kurangi 1 bulan
        if (now.getDate() < masuk.getDate()) bulan--;
        if (bulan < 0) bulan = 0;
        return `Kelas ${bulan + 1}`;
    }

    function switchAdminTab(tabId) {
        currentAdminTab = tabId;
        
        // Update tab buttons style
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.className = "admin-tab-btn px-5 py-3 text-xs font-semibold border-b-2 border-transparent text-brand-textSub hover:text-brand-textMain transition-all duration-200 flex items-center gap-2";
        });
        
        const activeBtn = document.getElementById('tab-btn-' + tabId);
        if (activeBtn) {
            activeBtn.className = "admin-tab-btn px-5 py-3 text-xs font-bold border-b-2 border-brand-blue text-brand-blue transition-all duration-200 flex items-center gap-2";
        }
        
        // Toggle tab content panels
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const activeContent = document.getElementById('admin-tab-' + tabId);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }
        
        // Trigger specific render
        renderAdminView();
    }

    function renderAdminView() {
        // Muat status sinkronisasi
        loadSyncStatus();

        if (currentAdminTab === 'sync-akun') {
            const tbody = document.getElementById('admin-tbody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-xs text-brand-textSub"><i class="fa-solid fa-spinner animate-spin text-brand-blue text-lg mb-2"></i><br>Memuat basis data pengguna...</td></tr>';

            if (typeof google !== 'undefined') {
                google.script.run.withSuccessHandler(data => {
                    rawUsersData = data || [];
                    filterAdminUsersTable();
                }).getUsersList();
            } else {
                rawUsersData = fallbackUsers;
                filterAdminUsersTable();
            }
        } else if (currentAdminTab === 'kelola-siswa') {
            renderAdminSiswaTable();
        } else if (currentAdminTab === 'log-manpower') {
            initLogManpowerTab();
        } else if (currentAdminTab === 'kelola-turnover') {
            renderAdminTurnoverTable();
        } else if (currentAdminTab === 'kelola-populasi') {
            renderAdminPopulasiTable();
        }
    }

    function filterAdminUsersTable() {
        const input = document.getElementById('filter-user-query');
        const query = input ? input.value.trim().toLowerCase() : '';
        const users = rawUsersData || [];

        if (!query) {
            displayAdminUsersTable(users);
            return;
        }

        const filtered = users.filter(u => {
            const idStr = String(u.id || '').toLowerCase();
            const namaStr = String(u.namaLengkap || '').toLowerCase();
            const emailStr = String(u.email || '').toLowerCase();
            const roleStr = String(u.role || '').toLowerCase();
            const noregStr = String(u.nomorRegistrasi || '').toLowerCase();

            return idStr.includes(query) ||
                   namaStr.includes(query) ||
                   emailStr.includes(query) ||
                   roleStr.includes(query) ||
                   noregStr.includes(query);
        });

        displayAdminUsersTable(filtered);
    }

    function displayAdminUsersTable(users) {
        const tbody = document.getElementById('admin-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (users.length === 0) {
            const input = document.getElementById('filter-user-query');
            const query = input ? input.value.trim() : '';
            const msg = query ? `Tidak ada akun yang cocok dengan pencarian "${query}".` : 'Tidak ada kredensial pengguna terdaftar.';
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-brand-textSub italic">${msg}</td></tr>`;
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all-300 text-xs font-semibold";

            let roleBadge = "bg-slate-50 text-slate-600";
            if (u.role === 'Admin') roleBadge = "bg-rose-50 text-rose-600 border border-rose-100";
            else if (u.role === 'Visitor') roleBadge = "bg-blue-50 text-brand-blue border border-blue-100";
            else if (u.role === 'Siswa') roleBadge = "bg-emerald-50 text-emerald-600 border border-emerald-100";

            let passwordHint = '-';
            if (u.role === 'Siswa' && u.nomorRegistrasi) {
                passwordHint = `${u.nomorRegistrasi}IPG`;
            } else if (u.role === 'Admin') {
                passwordHint = 'admin123';
            } else if (u.role === 'Visitor') {
                passwordHint = 'visitor123';
            }

            tr.innerHTML = `
                <td class="py-3 px-4 font-semibold text-brand-textSub">${u.id}</td>
                <td class="py-3 px-4 font-bold text-brand-textMain">${u.namaLengkap}</td>
                <td class="py-3 px-4 text-brand-textSub">${u.email}</td>
                <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadge}">${u.role}</span></td>
                <td class="py-3 px-4 text-brand-textSub font-semibold">${u.nomorRegistrasi || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub font-mono">${passwordHint}</td>
                <td class="py-3 px-4 text-right space-x-1.5 w-[160px]">
                    <button onclick="openUserEditModal('${u.id}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-user-pen"></i> Edit
                    </button>
                    <button onclick="deleteUserAdmin('${u.id}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function saveUserAdmin() {
        const namaLengkap = document.getElementById('admin-user-nama').value.trim();
        const email = document.getElementById('admin-user-email').value.trim();
        const password = document.getElementById('admin-user-pass').value.trim();
        const role = document.getElementById('admin-user-role').value;
        const nomorRegistrasi = document.getElementById('admin-user-noreg').value.trim();

        if (!namaLengkap || !email || !password) {
            showToast('Harap lengkapi nama lengkap, email login, dan password sandi.', 'error');
            return;
        }

        const payload = { namaLengkap, email, password, role, nomorRegistrasi };

        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast('Akun pengguna baru berhasil didaftarkan!');
                    clearFormUserAdmin();
                    renderAdminView();
                } else {
                    showToast('Gagal mendaftarkan user: ' + res.message, 'error');
                }
            }).createUser(payload);
        } else {
            showToast('Mode Preview: Akun ditambahkan ke basis data memori lokal.', 'info');
            const generatedId = "USER-" + Date.now();
            fallbackUsers.push({ id: generatedId, ...payload });
            clearFormUserAdmin();
            renderAdminView();
        }
    }

    function clearFormUserAdmin() {
        document.getElementById('admin-user-nama').value = '';
        document.getElementById('admin-user-email').value = '';
        document.getElementById('admin-user-pass').value = '';
        document.getElementById('admin-user-noreg').value = '';
    }

    // ============================================================
    // EDIT USER AKUN
    // ============================================================

    function openUserEditModal(userId) {
        const u = rawUsersData.find(u => u.id === userId);
        if (!u) return;
        document.getElementById('edit-user-id').value = u.id;
        document.getElementById('edit-user-nama').value = u.namaLengkap || '';
        document.getElementById('edit-user-email').value = u.email || '';
        document.getElementById('edit-user-pass').value = '';
        document.getElementById('edit-user-role').value = u.role || 'Visitor';
        document.getElementById('edit-user-noreg').value = u.nomorRegistrasi || '';
        const modal = document.getElementById('user-edit-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.querySelector('.glass-modal-card').classList.replace('scale-95','scale-100'), 10);
        }
    }

    function closeUserEditModal() {
        const modal = document.getElementById('user-edit-modal');
        if (modal) modal.classList.add('hidden');
    }

    function saveUserEdit() {
        const userId = document.getElementById('edit-user-id').value;
        const nama = document.getElementById('edit-user-nama').value.trim();
        const email = document.getElementById('edit-user-email').value.trim();
        const pass = document.getElementById('edit-user-pass').value.trim();
        const role = document.getElementById('edit-user-role').value;
        const noreg = document.getElementById('edit-user-noreg').value.trim();

        if (!nama || !email) {
            showToast('Nama dan Email wajib diisi.', 'error');
            return;
        }

        const payload = { id: userId, namaLengkap: nama, email, role, nomorRegistrasi: noreg };
        if (pass) payload.password = pass;

        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast('Akun berhasil diperbarui!');
                    closeUserEditModal();
                    renderAdminView();
                } else {
                    showToast('Gagal memperbarui akun: ' + res.message, 'error');
                }
            }).updateUser(payload);
        } else {
            const idx = fallbackUsers.findIndex(u => u.id === userId);
            if (idx !== -1) {
                fallbackUsers[idx] = { ...fallbackUsers[idx], ...payload };
                showToast('Mode Preview: Akun berhasil diperbarui.');
                closeUserEditModal();
                renderAdminView();
            }
        }
    }

    function deleteUserAdmin(userId) {
        showGlassModal({
            title: "Hapus Akun Pengguna",
            message: `Apakah Anda benar-benar yakin ingin menghapus akses akun <strong>${userId}</strong> secara permanen?`,
            confirmText: "Ya, Hapus",
            confirmClass: "bg-rose-600 hover:bg-rose-700",
            onConfirm: () => {
                executeUserDeletion(userId);
            }
        });
    }

    function executeUserDeletion(userId) {
        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast('Pengguna berhasil dihapus.');
                    renderAdminView();
                } else {
                    showToast('Gagal menghapus pengguna: ' + res.message, 'error');
                }
            }).deleteUserById(userId);
        } else {
            showToast('Mode Preview: Pengguna dihapus dari memori lokal.', 'info');
            const idx = fallbackUsers.findIndex(u => u.id === userId);
            if (idx !== -1) fallbackUsers.splice(idx, 1);
            renderAdminView();
        }
    }

    function syncExternalToLocalAdmin() {
        showToast('Memulai sinkronisasi paksa lintas server...');
        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast(`Sinkronisasi sukses! ${res.count} data siswa terintegrasi.`);
                    renderAdminView();
                } else {
                    showToast('Gagal sinkronisasi manual: ' + res.message, 'error');
                }
            }).syncExternalUsersManual();
        } else {
            setTimeout(() => {
                showToast('Mode Preview: Menjalankan simulasi sinkronisasi basis data.', 'success');
            }, 800);
        }
    }

    // ============================================================
    // SINKRONISASI DATABASE CACHE
    // ============================================================

    function loadSyncStatus() {
        const label = document.getElementById('last-sync-label');
        if (!label) return;
        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res && res.lastSync) {
                    label.textContent = res.lastSync;
                    label.classList.remove('text-white');
                    label.classList.add(res.hasCacheData ? 'text-green-200' : 'text-yellow-200');
                } else {
                    label.textContent = 'Belum pernah disinkronisasi';
                    label.classList.add('text-yellow-200');
                }
            }).withFailureHandler(() => {
                label.textContent = 'Tidak dapat membaca status';
            }).getSyncStatus();
        } else {
            label.textContent = 'Mode Preview (data simulasi)';
        }
    }

    function runSyncToLocal() {
        const btn      = document.getElementById('btn-sync-now');
        const icon     = document.getElementById('sync-icon');
        const wrap     = document.getElementById('sync-progress-wrap');
        const bar      = document.getElementById('sync-progress-bar');
        const msg      = document.getElementById('sync-progress-msg');
        const label    = document.getElementById('last-sync-label');

        if (!btn) return;
        btn.disabled = true;
        if (icon)  { icon.classList.add('animate-spin'); }
        if (wrap)  { wrap.classList.remove('hidden'); }
        if (bar)   { bar.style.width = '20%'; }
        if (msg)   { msg.textContent = 'Menghubungi Spreadsheet sumber...'; }

        showToast('Memulai sinkronisasi penuh. Harap tunggu, proses ini mungkin memakan 30-60 detik...', 'info');

        const simulateProgress = () => {
            let pct = 20;
            const interval = setInterval(() => {
                pct = Math.min(pct + 10, 85);
                if (bar) bar.style.width = pct + '%';
                if (pct >= 85) clearInterval(interval);
            }, 1500);
            return interval;
        };
        const progressInterval = simulateProgress();

        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    clearInterval(progressInterval);
                    if (bar)  bar.style.width = '100%';
                    if (icon) icon.classList.remove('animate-spin');
                    btn.disabled = false;

                    if (res && res.success) {
                        if (msg)   msg.textContent = `Selesai! Siswa: ${res.detail.siswa}, Log: ${res.detail.manpower}, Turnover: ${res.detail.turnover}`;
                        if (label) label.textContent = res.detail.syncAt;
                        showToast(`Sync berhasil! ${res.detail.siswa} siswa, ${res.detail.manpower} log harian, ${res.detail.turnover} turnover tersinkronisasi.`);
                        if (typeof loadDashboardData === 'function') { loadDashboardData(); }
                    } else {
                        if (msg) msg.textContent = 'Gagal: ' + (res ? res.message : 'Unknown error');
                        showToast('Sinkronisasi gagal: ' + (res ? res.message : 'Error tidak diketahui'), 'error');
                    }
                    setTimeout(() => { if (wrap) wrap.classList.add('hidden'); }, 5000);
                })
                .withFailureHandler(err => {
                    clearInterval(progressInterval);
                    if (bar)  bar.style.width = '0%';
                    if (icon) icon.classList.remove('animate-spin');
                    btn.disabled = false;
                    if (msg)  msg.textContent = 'Error: ' + err.message;
                    showToast('Error saat sinkronisasi: ' + err.message, 'error');
                    setTimeout(() => { if (wrap) wrap.classList.add('hidden'); }, 5000);
                })
                .syncToLocal();
        } else {
            setTimeout(() => {
                clearInterval(progressInterval);
                if (bar)  bar.style.width = '100%';
                if (icon) icon.classList.remove('animate-spin');
                btn.disabled = false;
                const now = new Date().toLocaleString('id-ID');
                if (msg)   msg.textContent = 'Mode Preview: Simulasi selesai.';
                if (label) label.textContent = now;
                showToast('Mode Preview: Simulasi sinkronisasi berhasil.', 'success');
                setTimeout(() => { if (wrap) wrap.classList.add('hidden'); }, 3000);
            }, 2500);
        }
    }

    function runCreateTrigger() {
        showToast('Membuat jadwal sinkronisasi otomatis setiap 6 jam...', 'info');
        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    if (res && res.success) {
                        showToast('Jadwal otomatis berhasil dibuat! Sync akan berjalan setiap 6 jam.');
                    } else {
                        showToast('Gagal membuat jadwal: ' + (res ? res.message : 'Unknown'), 'error');
                    }
                })
                .withFailureHandler(err => {
                    showToast('Error membuat jadwal: ' + err.message, 'error');
                })
                .createSyncTrigger();
        } else {
            showToast('Mode Preview: Jadwal otomatis tidak dapat dibuat di luar GAS.', 'info');
        }
    }

    // ============================================================
    // MANAJEMEN SISWA (TAB 2)
    // ============================================================

    function renderAdminSiswaTable() {
        const tbody = document.getElementById('admin-siswa-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="13" class="py-8 text-center text-brand-textSub"><i class="fa-solid fa-spinner animate-spin text-brand-blue text-lg mb-2"></i><br>Memuat basis data siswa...</td></tr>';

        // Ambil data siswa aktif
        const students = activeData || [];
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" class="py-8 text-center text-brand-textSub italic">Tidak ada data siswa aktif terdaftar.</td></tr>';
            return;
        }

        // Jalankan populasi filter secara dinamis
        populateAdminSiswaFilters();

        const sectionFilter = document.getElementById('filter-siswa-section')?.value || '';
        const kelasFilter = document.getElementById('filter-siswa-kelas')?.value || '';
        const asalFilter = document.getElementById('filter-siswa-asal')?.value || '';
        const sekolahFilter = document.getElementById('filter-siswa-sekolah')?.value || '';

        let filtered = students.filter(s => s.status === "Aktif");

        if (sectionFilter) {
            filtered = filtered.filter(s => s.section === sectionFilter);
        }
        if (kelasFilter) {
            filtered = filtered.filter(s => s.kelas === kelasFilter);
        }
        if (asalFilter) {
            filtered = filtered.filter(s => (s.daerahAsal || s.asalDaerah) === asalFilter);
        }
        if (sekolahFilter) {
            filtered = filtered.filter(s => s.asalSekolah === sekolahFilter);
        }
        // Urutkan: Kelas 5 paling atas, Kelas 1 paling bawah (descending), sub-sort nama ascending
        filtered.sort((a, b) => {
            const getKelasNum = (masukStr) => {
                const kStr = hitungKelas(masukStr);
                const match = kStr.match(/\d+/);
                return match ? parseInt(match[0], 10) : 1;
            };
            const classA = getKelasNum(a.masuk);
            const classB = getKelasNum(b.masuk);
            if (classB !== classA) {
                return classB - classA;
            }
            return (a.namaLengkap || '').localeCompare(b.namaLengkap || '');
        });

        filtered.forEach(s => {
            const tr = document.createElement('tr');
            tr.className = "group hover:bg-slate-50/50 transition-all-300 border-b border-slate-50 text-xs font-semibold";

            // Format tanggal masuk, keluar, dan distribusi
            const masukFormatted = s.masuk ? s.masuk.split('-').reverse().join('/') : '-';
            const keluarFormatted = s.tanggalKeluar ? s.tanggalKeluar.split('-').reverse().join('/') : (s.keluar ? s.keluar.split('-').reverse().join('/') : '-');
            const distribusiFormatted = s.distribusi ? s.distribusi.split('-').reverse().join('/') : '-';

            tr.innerHTML = `
                <!-- 1. Aksi (Sticky Left 0) -->
                <td class="py-3 px-3 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[155px] max-w-[155px] w-[155px] whitespace-nowrap">
                    <button onclick="editStudentTrigger('${s.id}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300 mr-1">
                        <i class="fa-solid fa-user-pen"></i> Edit
                    </button>
                    <button onclick="deleteStudentConfirm('${s.id}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
                <!-- 2. NoReg (Sticky Left 155px) -->
                <td class="py-3 px-4 sticky left-[155px] bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[90px] max-w-[90px] w-[90px] font-mono font-bold text-slate-800">${s.id}</td>
                <!-- 3. Nama (Sticky Left 245px) -->
                <td class="py-3 px-4 sticky left-[245px] bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[200px] max-w-[200px] w-[200px] font-bold text-brand-textMain whitespace-nowrap overflow-hidden text-ellipsis">${s.namaLengkap}</td>
                <!-- 4. Departemen -->
                <td class="py-3 px-4 min-w-[120px]"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-brand-blue border border-blue-100">${s.departemen || '-'}</span></td>
                <!-- 5. Section -->
                <td class="py-3 px-4 min-w-[130px] font-bold text-slate-700">${s.section || '-'}</td>
                <!-- 6. HK -->
                <td class="py-3 px-4 min-w-[100px]"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">${s.hk || s.hariKerja || '6 Hari'}</span></td>
                <!-- 7. Kelas (dihitung otomatis dari tanggal masuk) -->
                <td class="py-3 px-4 min-w-[100px]">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap
                        ${(() => { 
                            const k = s.kelas || hitungKelas(s.masuk); 
                            if (k.includes('Kelas 1')) return 'bg-red-100 text-red-800 border-red-300';
                            if (k.includes('Kelas 2')) return 'bg-amber-100 text-amber-800 border-amber-300';
                            if (k.includes('Kelas 3')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                            if (k.includes('Kelas 4')) return 'bg-sky-100 text-sky-800 border-sky-300';
                            return 'bg-slate-200 text-slate-800 border-slate-300'; 
                        })()}
                    ">${s.kelas || hitungKelas(s.masuk)}</span>
                </td>
                <!-- 8. Masuk LTC -->
                <td class="py-3 px-4 min-w-[100px] text-brand-textSub font-mono">${masukFormatted}</td>
                <!-- 9. Distribusi -->
                <td class="py-3 px-4 min-w-[100px] text-brand-textSub font-mono">${distribusiFormatted}</td>
                <!-- 10. Akhir LTC -->
                <td class="py-3 px-4 min-w-[100px] text-brand-textSub font-mono">${keluarFormatted}</td>
                <!-- 11. SPV -->
                <td class="py-3 px-4 min-w-[150px] text-brand-textSub">${s.spv || '-'}</td>
                <!-- 12. Daerah Asal -->
                <td class="py-3 px-4 min-w-[120px] text-brand-textSub">${s.daerahAsal || s.asalDaerah || '-'}</td>
                <!-- 13. Sekolah -->
                <td class="py-3 px-4 min-w-[150px] text-brand-textSub">${s.asalSekolah || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function populateAdminSiswaFilters() {
        const sectionSelect = document.getElementById('filter-siswa-section');
        const kelasSelect = document.getElementById('filter-siswa-kelas');
        const asalSelect = document.getElementById('filter-siswa-asal');
        const sekolahSelect = document.getElementById('filter-siswa-sekolah');

        if (!sectionSelect) return;

        const students = activeData || [];

        // Simpan pilihan saat ini
        const currentSection = sectionSelect.value;
        const currentKelas = kelasSelect.value;
        const currentAsal = asalSelect.value;
        const currentSekolah = sekolahSelect.value;

        // Kosongkan dan pasang opsi default
        sectionSelect.innerHTML = '<option value="">Semua Section</option>';
        kelasSelect.innerHTML = '<option value="">Semua Kelas</option>';
        asalSelect.innerHTML = '<option value="">Semua Daerah Asal</option>';
        sekolahSelect.innerHTML = '<option value="">Semua Sekolah</option>';

        // Dapatkan data unik dan terurut
        const sections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
        const kelasList = [...new Set(students.map(s => s.kelas).filter(Boolean))].sort();
        const asals = [...new Set(students.map(s => s.daerahAsal || s.asalDaerah).filter(Boolean))].sort();
        const sekolahs = [...new Set(students.map(s => s.asalSekolah).filter(Boolean))].sort();

        // Masukkan data ke dropdown
        sections.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            sectionSelect.appendChild(opt);
        });
        kelasList.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            kelasSelect.appendChild(opt);
        });
        asals.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            asalSelect.appendChild(opt);
        });
        sekolahs.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            sekolahSelect.appendChild(opt);
        });

        // Kembalikan pilihan user
        sectionSelect.value = currentSection;
        kelasSelect.value = currentKelas;
        asalSelect.value = currentAsal;
        sekolahSelect.value = currentSekolah;
    }

    function openStudentModal(isEdit = false) {
        const modal = document.getElementById('student-form-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        // Reset Modal Form
        document.getElementById('student-edit-mode').value = isEdit ? "true" : "false";
        document.getElementById('student-noreg').disabled = isEdit;
        document.getElementById('student-modal-title').textContent = isEdit ? "Edit Informasi Siswa" : "Tambah Siswa Baru";
        
        if (!isEdit) {
            document.getElementById('student-noreg').value = '';
            document.getElementById('student-nama').value = '';
            document.getElementById('student-hk').value = '6 Hari';
            document.getElementById('student-departemen').value = 'PRODUKSI';
            document.getElementById('student-section').value = 'PAINTING';
            document.getElementById('student-spv').value = '';
            document.getElementById('student-asal-daerah').value = '';
            document.getElementById('student-sekolah').value = '';
            document.getElementById('student-distribusi').value = '';
            
            // Set tgl masuk ke hari ini
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;
            document.getElementById('student-tgl-masuk').value = todayStr;
            document.getElementById('student-tgl-keluar').value = '';

            // Auto-hitung kelas dari tanggal masuk hari ini
            document.getElementById('student-kelas').value = hitungKelas(todayStr);
        }

        // Pasang event listener auto-hitung kelas saat tanggal masuk berubah
        const tglMasukInput = document.getElementById('student-tgl-masuk');
        const kelasInput = document.getElementById('student-kelas');
        if (tglMasukInput && kelasInput) {
            // Hapus listener lama agar tidak menumpuk
            const newInput = tglMasukInput.cloneNode(true);
            tglMasukInput.parentNode.replaceChild(newInput, tglMasukInput);
            newInput.addEventListener('change', () => {
                const calculated = hitungKelas(newInput.value);
                kelasInput.value = calculated;
            });
        }
    }

    function closeStudentModal() {
        const modal = document.getElementById('student-form-modal');
        if (modal) modal.classList.add('hidden');
    }

    function editStudentTrigger(noreg) {
        const s = activeData.find(std => std.id === noreg);
        if (!s) return;
        
        openStudentModal(true);
        
        document.getElementById('student-noreg').value = s.id;
        document.getElementById('student-nama').value = s.namaLengkap;
        // Auto-hitung kelas dari tanggal masuk (mengikuti rumus DATEDIF)
        document.getElementById('student-kelas').value = hitungKelas(s.masuk);
        document.getElementById('student-hk').value = s.hk || s.hariKerja || '6 Hari';
        document.getElementById('student-departemen').value = s.departemen || 'PRODUKSI';
        document.getElementById('student-section').value = s.section || 'PAINTING';
        
        const spvVal = (s.spv || '').toUpperCase().trim();
        const spvSelect = document.getElementById('student-spv');
        if (spvSelect) {
            if (spvVal && !Array.from(spvSelect.options).some(opt => opt.value === spvVal)) {
                const newOpt = document.createElement('option');
                newOpt.value = spvVal;
                newOpt.textContent = spvVal;
                spvSelect.appendChild(newOpt);
            }
            spvSelect.value = spvVal;
        }
        
        document.getElementById('student-asal-daerah').value = s.daerahAsal || s.asalDaerah || '';
        document.getElementById('student-sekolah').value = s.asalSekolah || '';
        
        // Tanggal Masuk
        if (s.masuk) {
            document.getElementById('student-tgl-masuk').value = s.masuk;
        } else {
            document.getElementById('student-tgl-masuk').value = '';
        }
        
        // Tanggal Keluar
        const tglKeluarVal = s.tanggalKeluar || s.keluar;
        if (tglKeluarVal) {
            document.getElementById('student-tgl-keluar').value = tglKeluarVal;
        } else {
            document.getElementById('student-tgl-keluar').value = '';
        }

        // Distribusi
        if (s.distribusi) {
            document.getElementById('student-distribusi').value = s.distribusi;
        } else {
            document.getElementById('student-distribusi').value = '';
        }
    }

    function saveStudent() {
        const noreg = document.getElementById('student-noreg').value.trim();
        const nama = document.getElementById('student-nama').value.trim();
        const kelas = document.getElementById('student-kelas').value.trim();
        const hk = document.getElementById('student-hk').value.trim();
        const departemen = document.getElementById('student-departemen').value;
        const section = document.getElementById('student-section').value;
        const spv = document.getElementById('student-spv').value.trim();
        const asal = document.getElementById('student-asal-daerah').value.trim();
        const sekolah = document.getElementById('student-sekolah').value.trim();
        const tglMasuk = document.getElementById('student-tgl-masuk').value;
        const tglKeluar = document.getElementById('student-tgl-keluar').value;
        const distribusi = document.getElementById('student-distribusi').value;
        const isEdit = document.getElementById('student-edit-mode').value === "true";

        if (!noreg || !nama || !tglMasuk) {
            showToast('NoReg, Nama Lengkap, dan Tanggal Masuk wajib diisi.', 'error');
            return;
        }

        const payload = {
            NoReg: noreg,
            NamaLengkap: nama,
            Kelas: kelas,
            Departemen: departemen,
            Section: section,
            NamaSPV: spv,
            TanggalMasuk: tglMasuk || null,
            TanggalKeluar: tglKeluar || null,
            Distribusi: distribusi || null,
            AsalDaerah: asal,
            AsalSekolah: sekolah,
            HK: hk,
            isEdit: isEdit
        };

        google.script.run.withSuccessHandler(res => {
            if (res.success) {
                showToast('Data siswa berhasil disimpan!');
                closeStudentModal();

                // ====================================================
                // OPTIMISTIC UPDATE: langsung update activeData lokal
                // agar tabel segera berubah tanpa menunggu server reload
                // ====================================================
                const perfLabel = (section.includes('ADM') || section.includes('ADMINISTRASI')) ? 'Hadir' : 'Plan';

                if (isEdit) {
                    // Update record yang sudah ada di activeData
                    const idx = (activeData || []).findIndex(s => s.id === noreg);
                    if (idx !== -1) {
                        activeData[idx].namaLengkap = nama;
                        activeData[idx].kelas = kelas;
                        activeData[idx].departemen = departemen;
                        activeData[idx].section = section;
                        activeData[idx].spv = spv;
                        activeData[idx].masuk = tglMasuk;
                        activeData[idx].tanggalKeluar = tglKeluar;
                        activeData[idx].distribusi = distribusi;
                        activeData[idx].daerahAsal = asal;
                        activeData[idx].asalSekolah = sekolah;
                        activeData[idx].hk = hk;
                    }
                } else {
                    // Tambahkan siswa baru ke activeData
                    if (!(activeData || []).some(s => s.id === noreg)) {
                        activeData.push({
                            id: noreg,
                            namaLengkap: nama,
                            kelas: kelas,
                            departemen: departemen,
                            section: section,
                            spv: spv,
                            masuk: tglMasuk,
                            tanggalKeluar: tglKeluar,
                            distribusi: distribusi,
                            daerahAsal: asal,
                            asalSekolah: sekolah,
                            hk: hk,
                            perfLabel: perfLabel,
                            nilai: 0,
                            status: 'Aktif',
                            dailyRecords: []
                        });
                    }
                }

                // Re-render tabel SEGERA dengan data lokal yang sudah diperbarui
                renderAdminSiswaTable();

                // Refresh dari server di background (tidak menghambat UI)
                setTimeout(() => loadDashboardData(), 1500);
            } else {
                showToast('Gagal menyimpan data siswa: ' + res.message, 'error');
            }
        }).withFailureHandler(err => {
            showToast('Gagal menyimpan: ' + (err.message || err), 'error');
        }).saveSiswa(payload);
    }


    function deleteStudentConfirm(noreg) {
        // Cari nama siswa untuk ditampilkan di dialog
        const siswa = (activeData || []).find(s => s.id === noreg);
        const namaDisplay = siswa ? `<strong>${siswa.namaLengkap}</strong> (${noreg})` : `<strong>${noreg}</strong>`;

        // Buat konten form inline untuk dialog konfirmasi
        const formHtml = `
            <p class="text-sm text-brand-textSub mb-4">Menghapus siswa ${namaDisplay} akan otomatis mencatatnya ke <span class="font-semibold text-amber-400">Turnover</span>. Isi detail di bawah:</p>
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-semibold text-brand-textSub mb-1">Alasan Turnover <span class="text-rose-400">*</span></label>
                    <select id="delete-siswa-alasan" class="w-full bg-brand-card border border-white/10 text-brand-text text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                        <option value="LULUS" selected>LULUS</option>
                        <option value="RESIGN">RESIGN</option>
                        <option value="INDISIPLINER">INDISIPLINER</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-brand-textSub mb-1">Keterangan (opsional)</label>
                    <input id="delete-siswa-keterangan" type="text" placeholder="Misal: mengundurkan diri atas kemauan sendiri" class="w-full bg-brand-card border border-white/10 text-brand-text text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
            </div>`;

        showGlassModal({
            title: "Hapus & Catat ke Turnover",
            message: formHtml,
            confirmText: "Ya, Hapus & Catat Turnover",
            confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
            confirmStyle: "background-color: #dc2626;",
            onConfirm: () => {
                const alasan = document.getElementById('delete-siswa-alasan')?.value || 'LULUS';
                const keterangan = document.getElementById('delete-siswa-keterangan')?.value?.trim() || '';
                executeStudentDeletion(noreg, alasan, keterangan);
            }
        });
    }

    function executeStudentDeletion(noreg, alasan, keterangan) {
        if (typeof google !== 'undefined') {
            showToast('Menghapus siswa dan mencatat turnover...', 'info');

            google.script.run
                .withSuccessHandler(res => {
                    if (res.success) {
                        // Optimistic update: hapus dari activeData lokal LANGSUNG
                        const idx = (activeData || []).findIndex(s => s.id === noreg);
                        if (idx !== -1) {
                            activeData.splice(idx, 1);
                        }
                        // Re-render tabel SEGERA dengan data yang sudah diperbarui
                        renderAdminSiswaTable();
                        renderAdminTurnoverTable();

                        showToast('Siswa dihapus & tercatat di Turnover!', 'success');

                        // Refresh data dari server di background (tidak perlu tunggu)
                        setTimeout(() => {
                            loadDashboardData();
                        }, 1500);
                    } else {
                        showToast('Gagal menghapus siswa: ' + res.message, 'error');
                    }
                })
                .withFailureHandler(err => {
                    showToast('Error: ' + err.message, 'error');
                })
                .deleteSiswa(noreg, alasan, keterangan);
        } else {
            // Mode Preview: simulasi lokal
            const siswaIdx = fallbackSiswa.findIndex(s => s.id === noreg);
            const siswaData = siswaIdx !== -1 ? fallbackSiswa[siswaIdx] : null;
            if (siswaIdx !== -1) fallbackSiswa.splice(siswaIdx, 1);

            // Hapus juga dari activeData lokal
            const idx = (activeData || []).findIndex(s => s.id === noreg);
            if (idx !== -1) activeData.splice(idx, 1);

            // Tambahkan ke activeTurnoverData lokal
            if (siswaData) {
                const today = new Date();
                const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                activeTurnoverData.unshift({
                    id: noreg,
                    namaLengkap: siswaData.namaLengkap,
                    bagian: siswaData.bagian,
                    masuk: siswaData.masuk,
                    tanggalKeluar: fmt(today),
                    alasan: alasan || 'Dikeluarkan',
                    keterangan: keterangan || ''
                });
            }

            showToast('Mode Preview: Siswa dihapus & dicatat ke Turnover lokal.', 'info');
            renderAdminSiswaTable();
            renderAdminTurnoverTable();
            setTimeout(() => loadDashboardData(), 300);
        }
    }

    // ============================================================
    // LOG MANPOWER HARIAN (TAB 3)
    // ============================================================

    function initLogManpowerTab() {
        renderAdminManpowerTable();
    }

    function renderAdminManpowerTable() {
        const tbody = document.getElementById('admin-manpower-tbody');
        if (!tbody) return;

        // Kumpulkan semua catatan dailyRecords dari seluruh siswa aktif
        let logs = [];
        (activeData || []).forEach(siswa => {
            (siswa.dailyRecords || []).forEach(rec => {
                logs.push({
                    noreg: siswa.id,
                    namaLengkap: siswa.namaLengkap,
                    tanggal: rec.dateStr || rec.tanggal_record || '',
                    hadir: rec.hadir || '✔',
                    plan: rec.plan !== null && rec.plan !== undefined ? rec.plan : null,
                    actual: rec.actual !== null && rec.actual !== undefined ? rec.actual : null,
                    reject: rec.reject !== null && rec.reject !== undefined ? rec.reject : 0,
                    percent: rec.percent !== null && rec.percent !== undefined ? rec.percent : null,
                    shift: rec.shift || rec.Shift || 'Shift 1',
                    bagian: rec.bagian || rec.Bagian || siswa.section || '-',
                    mesin: rec.nomor_mesin || rec.nomorMesin || rec.NomorMesin || '-',
                    model: rec.model || rec.Model || '-',
                    spv: rec.nama_spv || rec.namaSpv || rec.NamaSPV || siswa.spv || '-',
                    keterangan: rec.keterangan || rec.Keterangan || '-'
                });
            });
        });

        // Filter berdasarkan Query Pencarian
        const queryInput = document.getElementById('filter-manpower-query');
        const query = queryInput ? queryInput.value.trim().toLowerCase() : '';
        if (query) {
            logs = logs.filter(l => {
                return (l.noreg || '').toLowerCase().includes(query) ||
                       (l.namaLengkap || '').toLowerCase().includes(query) ||
                       (l.bagian || '').toLowerCase().includes(query) ||
                       (l.spv || '').toLowerCase().includes(query) ||
                       (l.keterangan || '').toLowerCase().includes(query);
            });
        }

        // Filter berdasarkan Tanggal
        const dateInput = document.getElementById('filter-manpower-date');
        const dateVal = dateInput ? dateInput.value : '';
        if (dateVal) {
            logs = logs.filter(l => l.tanggal === dateVal);
        }

        // Urutkan berdasarkan Tanggal Terbaru (Descending)
        logs.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada catatan log manpower harian terdaftar. Klik "+ Input Log Manpower" untuk menambah baru.</td></tr>';
            return;
        }

        logs.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all-300 border-b border-slate-50 text-xs font-semibold";

            // Format tanggal display (DD/MM/YYYY)
            let dateDisplay = r.tanggal;
            if (r.tanggal && r.tanggal.includes('-')) {
                dateDisplay = r.tanggal.split('-').reverse().join('/');
            }

            // Status Kehadiran Badge
            let hadirBadge = '';
            const hadirUpper = String(r.hadir || '').toUpperCase();
            if (hadirUpper === 'IJIN') {
                hadirBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Ijin</span>';
            } else if (hadirUpper === 'SAKIT') {
                hadirBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">Sakit</span>';
            } else if (hadirUpper === 'ALPHA' || hadirUpper === 'ABSEN') {
                hadirBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">Alpha</span>';
            } else {
                hadirBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">✔ Hadir</span>';
            }

            // Format Plan/Aktual/Reject vs Hadir
            let hasilDisplay = '';
            if (r.plan !== null && r.plan > 0) {
                const pct = Math.round((r.actual / r.plan) * 100);
                const pctClass = pct >= 90 ? 'text-emerald-600' : (pct >= 75 ? 'text-amber-600' : 'text-rose-600');
                hasilDisplay = `
                    <div class="font-bold text-slate-800">T: ${r.plan} | H: ${r.actual} | R: ${r.reject || 0} <span class="${pctClass}">(${pct}%)</span></div>
                    <div class="text-[10px] text-slate-400 font-normal">SPV: ${r.spv || '-'}</div>
                `;
            } else {
                hasilDisplay = `
                    <div class="font-bold text-slate-700">-</div>
                    <div class="text-[10px] text-slate-400 font-normal">SPV: ${r.spv || '-'}</div>
                `;
            }

            tr.innerHTML = `
                <td class="py-3 px-4 text-center whitespace-nowrap space-x-1">
                    <button onclick="openManpowerLogModal('${r.noreg}', '${r.tanggal}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deleteManpowerLogConfirm('${r.noreg}', '${r.tanggal}', '${r.namaLengkap.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
                <td class="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">${dateDisplay}</td>
                <td class="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">${r.noreg}</td>
                <td class="py-3 px-4 font-bold text-brand-textMain whitespace-nowrap">${r.namaLengkap}</td>
                <td class="py-3 px-4 text-center whitespace-nowrap">${hadirBadge}</td>
                <td class="py-3 px-4 whitespace-nowrap">
                    <div class="font-bold text-slate-700">${r.shift || 'Shift 1'} • ${r.bagian || '-'}</div>
                    <div class="text-[10px] text-slate-400 font-normal">Mesin: ${r.mesin || '-'} | Model: ${r.model || '-'}</div>
                </td>
                <td class="py-3 px-4 whitespace-nowrap">${hasilDisplay}</td>
                <td class="py-3 px-4 text-slate-600 max-w-xs truncate" title="${r.keterangan || ''}">${r.keterangan || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function openManpowerLogModal(noreg = null, tanggal = null) {
        const modal = document.getElementById('manpower-log-modal');
        if (!modal) return;

        const isEdit = !!(noreg && tanggal);
        document.getElementById('mp-modal-is-edit').value = isEdit ? "true" : "false";
        document.getElementById('mp-modal-title').textContent = isEdit ? "Edit Log Manpower Harian" : "Input Log Manpower Harian";

        // Populate dropdown siswa aktif
        const studentSelect = document.getElementById('mp-modal-student');
        if (studentSelect) {
            studentSelect.innerHTML = '';
            const students = (activeData || []).filter(s => s.status === "Aktif");
            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.id} - ${s.namaLengkap}`;
                studentSelect.appendChild(opt);
            });
            studentSelect.disabled = isEdit;
        }

        if (isEdit) {
            if (studentSelect) studentSelect.value = noreg;
            document.getElementById('mp-modal-date').value = tanggal;
            document.getElementById('mp-modal-date').disabled = true;

            // Cari rincian data dari activeData
            const s = (activeData || []).find(std => std.id === noreg);
            const rec = s ? (s.dailyRecords || []).find(r => r.dateStr === tanggal) : null;

            if (rec) {
                const hadirVal = rec.hadir === "✔" || rec.hadir === "Hadir" ? "✔" : (rec.hadir || "✔");
                document.getElementById('mp-modal-hadir').value = hadirVal;
                document.getElementById('mp-modal-shift').value = rec.shift || "Shift 1";
                document.getElementById('mp-modal-bagian').value = rec.bagian || s.section || "PAINTING";
                document.getElementById('mp-modal-mesin').value = rec.nomor_mesin || "";
                document.getElementById('mp-modal-model').value = rec.model || "";
                document.getElementById('mp-modal-plan').value = rec.plan !== null && rec.plan !== undefined ? rec.plan : 0;
                document.getElementById('mp-modal-actual').value = rec.actual !== null && rec.actual !== undefined ? rec.actual : 0;
                document.getElementById('mp-modal-reject').value = rec.reject !== null && rec.reject !== undefined ? rec.reject : 0;
                document.getElementById('mp-modal-spv').value = rec.nama_spv || s.spv || "";
                document.getElementById('mp-modal-keterangan').value = rec.keterangan || "";
            }
        } else {
            if (studentSelect && studentSelect.options.length > 0) {
                studentSelect.selectedIndex = 0;
            }
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            document.getElementById('mp-modal-date').value = `${yyyy}-${mm}-${dd}`;
            document.getElementById('mp-modal-date').disabled = false;

            document.getElementById('mp-modal-hadir').value = "✔";
            document.getElementById('mp-modal-shift').value = "Shift 1";
            document.getElementById('mp-modal-bagian').value = "PAINTING";
            document.getElementById('mp-modal-mesin').value = "";
            document.getElementById('mp-modal-model').value = "";
            document.getElementById('mp-modal-plan').value = 0;
            document.getElementById('mp-modal-actual').value = 0;
            document.getElementById('mp-modal-reject').value = 0;
            document.getElementById('mp-modal-spv').value = "";
            document.getElementById('mp-modal-keterangan').value = "";
        }

        onMpModalStudentChange();
        modal.classList.remove('hidden');
    }

    function closeManpowerLogModal() {
        const modal = document.getElementById('manpower-log-modal');
        if (modal) modal.classList.add('hidden');
    }

    function onMpModalStudentChange() {
        const select = document.getElementById('mp-modal-student');
        if (!select) return;
        const noreg = select.value;
        const s = (activeData || []).find(std => std.id === noreg);
        const infoLabel = document.getElementById('mp-modal-info-label');
        if (s && infoLabel) {
            infoLabel.textContent = `Bagian Default: ${s.section || s.bagian || '-'} | SPV: ${s.spv || '-'}`;
            const bagianSelect = document.getElementById('mp-modal-bagian');
            const isEdit = document.getElementById('mp-modal-is-edit').value === "true";
            if (!isEdit && bagianSelect && s.section) {
                const upperSec = s.section.toUpperCase();
                if (Array.from(bagianSelect.options).some(o => o.value === upperSec)) {
                    bagianSelect.value = upperSec;
                }
            }
        }
    }

    function saveManpowerLogModal() {
        const studentSelect = document.getElementById('mp-modal-student');
        const noreg = studentSelect ? studentSelect.value : '';
        const dateVal = document.getElementById('mp-modal-date').value;
        const hadirVal = document.getElementById('mp-modal-hadir').value;
        const shiftVal = document.getElementById('mp-modal-shift').value;
        const bagianVal = document.getElementById('mp-modal-bagian').value;
        const mesinVal = document.getElementById('mp-modal-mesin').value.trim();
        const modelVal = document.getElementById('mp-modal-model').value.trim();
        const planVal = document.getElementById('mp-modal-plan').value;
        const actualVal = document.getElementById('mp-modal-actual').value;
        const rejectVal = document.getElementById('mp-modal-reject').value;
        const spvVal = document.getElementById('mp-modal-spv').value;
        const keteranganVal = document.getElementById('mp-modal-keterangan').value.trim();

        if (!noreg || !dateVal) {
            showToast('Pilih siswa dan tanggal record terlebih dahulu.', 'error');
            return;
        }

        // Format tanggal YYYY-MM-DD ke DD/MM/YYYY untuk kompatibilitas API
        const parts = dateVal.split('-');
        const dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

        const payload = {
            NoReg: noreg,
            TanggalRecord: dateFormatted,
            Hadir: hadirVal,
            Shift: shiftVal,
            Bagian: bagianVal,
            NomorMesin: mesinVal || '-',
            Model: modelVal || '-',
            Plan: planVal !== "" ? parseFloat(planVal) : 0,
            Aktual: actualVal !== "" ? parseFloat(actualVal) : 0,
            Reject: rejectVal !== "" ? parseFloat(rejectVal) : 0,
            NamaSPV: spvVal || '-',
            Keterangan: keteranganVal || '-'
        };

        showToast('Menyimpan log manpower...', 'info');

        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast('Log manpower harian berhasil disimpan!', 'success');
                    _updateLocalManpowerCache(noreg, dateVal, payload);
                    closeManpowerLogModal();
                    renderAdminManpowerTable();
                    setTimeout(() => loadDashboardData(), 1000);
                } else {
                    showToast('Gagal menyimpan log: ' + (res.message || 'Unknown error'), 'error');
                }
            }).withFailureHandler(err => {
                showToast('Error server: ' + (err.message || err.toString()), 'error');
            }).saveManpowerLog(payload);
        } else {
            // Mode preview lokal
            showToast('Mode Preview: Log manpower disimpan ke data lokal.', 'success');
            _updateLocalManpowerCache(noreg, dateVal, payload);
            closeManpowerLogModal();
            renderAdminManpowerTable();
        }
    }

    function _updateLocalManpowerCache(noreg, dateVal, payload) {
        const studentIdx = (activeData || []).findIndex(s => s.id === noreg);
        if (studentIdx !== -1) {
            const recs = activeData[studentIdx].dailyRecords || [];
            const existIdx = recs.findIndex(r => r.dateStr === dateVal);

            const newRec = {
                dateStr: dateVal,
                hadir: payload.Hadir,
                plan: payload.Plan,
                actual: payload.Aktual,
                reject: payload.Reject,
                percent: payload.Plan > 0 ? Math.round((payload.Aktual / payload.Plan) * 100) : 100,
                shift: payload.Shift,
                bagian: payload.Bagian,
                nomor_mesin: payload.NomorMesin,
                model: payload.Model,
                nama_spv: payload.NamaSPV,
                keterangan: payload.Keterangan
            };

            if (existIdx !== -1) {
                recs[existIdx] = newRec;
            } else {
                recs.push(newRec);
            }
            activeData[studentIdx].dailyRecords = recs;
        }
    }

    function deleteManpowerLogConfirm(noreg, tanggal, nama) {
        showGlassModal({
            title: "Hapus Log Manpower",
            message: `Apakah Anda yakin ingin menghapus catatan log manpower untuk <strong>${nama}</strong> tanggal <strong>${tanggal}</strong>?`,
            confirmText: "Ya, Hapus Log",
            confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
            onConfirm: () => {
                executeManpowerLogDeletion(noreg, tanggal);
            }
        });
    }

    function executeManpowerLogDeletion(noreg, tanggal) {
        let dateFormatted = tanggal;
        if (tanggal && tanggal.includes('-')) {
            const parts = tanggal.split('-');
            dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success !== false) {
                    showToast('Log manpower berhasil dihapus!', 'success');
                    _removeLocalManpowerCache(noreg, tanggal);
                    renderAdminManpowerTable();
                } else {
                    showToast('Gagal menghapus: ' + (res.message || 'Unknown error'), 'error');
                }
            }).withFailureHandler(err => {
                showToast('Error: ' + err.message, 'error');
            }).deleteManpowerLog(noreg, dateFormatted);
        } else {
            showToast('Mode Preview: Log manpower dihapus dari memori lokal.', 'info');
            _removeLocalManpowerCache(noreg, tanggal);
            renderAdminManpowerTable();
        }
    }

    function _removeLocalManpowerCache(noreg, tanggal) {
        const studentIdx = (activeData || []).findIndex(s => s.id === noreg);
        if (studentIdx !== -1) {
            const recs = activeData[studentIdx].dailyRecords || [];
            activeData[studentIdx].dailyRecords = recs.filter(r => r.dateStr !== tanggal);
        }
    }

    // ============================================================
    // KELOLA TURNOVER (TAB 4)
    // ============================================================

    function renderAdminTurnoverTable() {
        const tbody = document.getElementById('admin-turnover-tbody');
        if (!tbody) return;

        const records = activeTurnoverData || [];
        tbody.innerHTML = '';

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada data turnover terdaftar.</td></tr>';
            return;
        }

        records.forEach((t, idx) => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all-300 border-b border-slate-50";
            const alasanColors = {
                'Resign': 'bg-rose-50 text-rose-600',
                'Lulus': 'bg-emerald-50 text-emerald-600',
                'Indisipliner': 'bg-amber-50 text-amber-700'
            };
            const alasanBadge = alasanColors[t.alasan] || 'bg-slate-50 text-slate-500';
            tr.innerHTML = `
                <td class="py-3 px-4 font-mono font-bold text-slate-700">${t.id}</td>
                <td class="py-3 px-4 font-bold text-brand-textMain">${t.namaLengkap}</td>
                <td class="py-3 px-4 text-brand-textSub">${t.bagian || '-'}</td>
                <td class="py-3 px-4 font-mono text-brand-textSub">${t.masuk ? t.masuk.split('-').reverse().join('/') : '-'}</td>
                <td class="py-3 px-4 font-mono text-brand-textSub">${t.tanggalKeluar ? t.tanggalKeluar.split('-').reverse().join('/') : '-'}</td>
                <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${alasanBadge}">${t.alasan || '-'}</span></td>
                <td class="py-3 px-4 text-brand-textSub max-w-[160px] truncate">${t.keterangan || '-'}</td>
                <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button onclick="editTurnoverTrigger(${idx})" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button onclick="deleteTurnoverConfirm('${t.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function openTurnoverModal(isEdit = false) {
        const modal = document.getElementById('turnover-form-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        document.getElementById('turnover-edit-mode').value = isEdit ? 'true' : 'false';
        document.getElementById('turnover-modal-title').textContent = isEdit ? 'Edit Data Turnover' : 'Tambah Data Turnover';
        if (!isEdit) {
            document.getElementById('turnover-edit-id').value = '';
            document.getElementById('turnover-noreg').value = '';
            document.getElementById('turnover-nama').value = '';
            document.getElementById('turnover-bagian').value = 'PAINTING';
            document.getElementById('turnover-alasan').value = 'Resign';
            document.getElementById('turnover-keterangan').value = '';
            const today = new Date();
            const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            document.getElementById('turnover-tgl-masuk').value = fmt(today);
            document.getElementById('turnover-tgl-keluar').value = fmt(today);
        }
        setTimeout(() => modal.querySelector('.glass-modal-card').classList.replace('scale-95','scale-100'), 10);
    }

    function closeTurnoverModal() {
        const modal = document.getElementById('turnover-form-modal');
        if (modal) modal.classList.add('hidden');
    }

    function editTurnoverTrigger(idx) {
        const t = activeTurnoverData[idx];
        if (!t) return;
        openTurnoverModal(true);
        document.getElementById('turnover-edit-id').value = t.id;
        document.getElementById('turnover-noreg').value = t.id;
        document.getElementById('turnover-nama').value = t.namaLengkap || '';
        document.getElementById('turnover-bagian').value = t.bagian || 'PAINTING';
        document.getElementById('turnover-alasan').value = t.alasan || 'Resign';
        document.getElementById('turnover-keterangan').value = t.keterangan || '';
        document.getElementById('turnover-tgl-masuk').value = t.masuk || '';
        document.getElementById('turnover-tgl-keluar').value = t.tanggalKeluar || '';
    }

    function saveTurnoverData() {
        const noreg = document.getElementById('turnover-noreg').value.trim();
        const nama = document.getElementById('turnover-nama').value.trim();
        const bagian = document.getElementById('turnover-bagian').value;
        const alasan = document.getElementById('turnover-alasan').value;
        const keterangan = document.getElementById('turnover-keterangan').value.trim();
        const tglMasuk = document.getElementById('turnover-tgl-masuk').value;
        const tglKeluar = document.getElementById('turnover-tgl-keluar').value;
        const isEdit = document.getElementById('turnover-edit-mode').value === 'true';
        const editId = document.getElementById('turnover-edit-id').value;

        if (!noreg || !nama || !tglKeluar) {
            showToast('NoReg, Nama, dan Tanggal Keluar wajib diisi.', 'error');
            return;
        }

        const convertDate = d => { if (!d) return ''; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
        const payload = {
            NoReg: noreg, NamaLengkap: nama, Bagian: bagian,
            TanggalMasuk: convertDate(tglMasuk), TanggalKeluar: convertDate(tglKeluar),
            Alasan: alasan, Keterangan: keterangan, isEdit, editId
        };

        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast('Data turnover berhasil disimpan!');
                    closeTurnoverModal();
                    loadDashboardData();
                    setTimeout(() => renderAdminTurnoverTable(), 1000);
                } else {
                    showToast('Gagal menyimpan: ' + res.message, 'error');
                }
            }).saveTurnoverRecord(payload);
        } else {
            if (!isEdit) {
                activeTurnoverData.unshift({
                    id: noreg, namaLengkap: nama, bagian, alasan, keterangan,
                    masuk: tglMasuk, tanggalKeluar: tglKeluar
                });
            } else {
                const idx = activeTurnoverData.findIndex(t => t.id === editId);
                if (idx !== -1) {
                    activeTurnoverData[idx] = { ...activeTurnoverData[idx], id: noreg, namaLengkap: nama, bagian, alasan, keterangan, masuk: tglMasuk, tanggalKeluar: tglKeluar };
                }
            }
            showToast('Mode Preview: Data turnover disimpan di memori lokal.');
            closeTurnoverModal();
            renderAdminTurnoverTable();
        }
    }

    function deleteTurnoverConfirm(id) {
        showGlassModal({
            title: 'Hapus Data Turnover',
            message: `Yakin ingin menghapus data turnover untuk NoReg <strong>${id}</strong>?`,
            confirmText: 'Ya, Hapus',
            confirmClass: 'bg-rose-600 hover:bg-rose-700',
            onConfirm: () => {
                if (typeof google !== 'undefined') {
                    google.script.run.withSuccessHandler(res => {
                        if (res.success) {
                            showToast('Data turnover berhasil dihapus.');
                            loadDashboardData();
                            setTimeout(() => renderAdminTurnoverTable(), 1000);
                        } else {
                            showToast('Gagal menghapus: ' + res.message, 'error');
                        }
                    }).deleteTurnoverRecord(id);
                } else {
                    const idx = activeTurnoverData.findIndex(t => t.id === id);
                    if (idx !== -1) activeTurnoverData.splice(idx, 1);
                    showToast('Mode Preview: Data turnover dihapus.');
                    renderAdminTurnoverTable();
                }
            }
        });
    }

    // ============================================================
    // KELOLA POPULASI BULANAN
    // ============================================================

    function renderAdminPopulasiTable() {
        const tbody = document.getElementById('admin-populasi-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const filterVal = (document.getElementById('filter-populasi-tanggal')?.value || '').trim();

        let filtered = [...rawPopulasiData];

        if (filterVal) {
            filtered = filtered.filter(p => p.tanggal.includes(filterVal));
        }

        // Urutkan berdasarkan tanggal terbaru
        filtered.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada data populasi ditemukan.</td>
                </tr>
            `;
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all-300 text-xs font-semibold";
            
            // Hitung persentase LTC: totalLtc / totalKaryawan * 100%
            const pct = p.totalKaryawan > 0 ? ((p.totalLtc / p.totalKaryawan) * 100).toFixed(2) + '%' : '0.00%';

            tr.innerHTML = `
                <td class="py-3 px-4 font-bold text-brand-textMain">${p.tanggal}</td>
                <td class="py-3 px-4 text-brand-textSub">${p.kontrak.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-brand-textSub">${p.ltc.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-brand-textSub">${p.outsourcing.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-brand-textSub">${p.satpamSupir.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-brand-blue font-bold">${p.totalKaryawan.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-brand-teal font-bold">${p.totalLtc.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-indigo-600 font-bold">${pct}</td>
                <td class="py-3 px-4 text-right space-x-1.5">
                    <button onclick="openPopulasiModal(true, '${p.tanggal}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deletePopulasiAdmin('${p.tanggal}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function openPopulasiModal(editMode = false, tanggal = '') {
        const modal = document.getElementById('populasi-form-modal');
        const title = document.getElementById('populasi-modal-title');
        const tglInput = document.getElementById('populasi-tanggal');
        
        document.getElementById('populasi-edit-mode').value = editMode ? 'true' : 'false';
        
        if (editMode) {
            title.innerText = "Edit Data Populasi";
            tglInput.value = tanggal;
            tglInput.disabled = true; // Tanggal bertindak sebagai ID, tidak bisa diubah pas edit
            
            const p = rawPopulasiData.find(x => x.tanggal === tanggal);
            if (p) {
                document.getElementById('populasi-kontrak').value = p.kontrak;
                document.getElementById('populasi-outsourcing').value = p.outsourcing;
                document.getElementById('populasi-satpam-supir').value = p.satpamSupir;
            }
        } else {
            title.innerText = "Tambah Data Populasi";
            tglInput.value = '';
            tglInput.disabled = false;
            document.getElementById('populasi-kontrak').value = '100';
            document.getElementById('populasi-outsourcing').value = '10';
            document.getElementById('populasi-satpam-supir').value = '5';
        }
        
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.querySelector('.glass-modal-card').classList.replace('scale-95','scale-100'), 10);
        }
    }

    function closePopulasiModal() {
        const modal = document.getElementById('populasi-form-modal');
        if (modal) modal.classList.add('hidden');
    }

    function savePopulasiData() {
        const tanggal = document.getElementById('populasi-tanggal').value;
        const kontrak = parseInt(document.getElementById('populasi-kontrak').value) || 0;
        const outsourcing = parseInt(document.getElementById('populasi-outsourcing').value) || 0;
        const satpamSupir = parseInt(document.getElementById('populasi-satpam-supir').value) || 0;
        
        if (!tanggal) {
            showToast('Tanggal wajib diisi.', 'error');
            return;
        }

        const payload = { tanggal, kontrak, outsourcing, satpamSupir };

        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    if (res && res.success) {
                        showToast('Data populasi berhasil disimpan!');
                        closePopulasiModal();
                        loadDashboardData();
                    } else {
                        showToast('Gagal menyimpan data: ' + (res ? res.message : 'Respon kosong'), 'error');
                    }
                })
                .withFailureHandler(err => {
                    showToast('Error Server: ' + (err.message || err.toString()), 'error');
                })
                .savePopulasi(payload);
        } else {
            // Mode Pratinjau Lokal
            const idx = rawPopulasiData.findIndex(x => x.tanggal === tanggal);
            if (idx !== -1) {
                rawPopulasiData[idx] = { 
                    ...rawPopulasiData[idx], 
                    kontrak, 
                    outsourcing, 
                    satpamSupir,
                    totalKaryawan: kontrak + rawPopulasiData[idx].ltc + outsourcing + satpamSupir
                };
                showToast('Mode Preview: Data populasi berhasil diperbarui.');
            } else {
                // Di pratinjau lokal, jumlah LTC adalah panjang rawSiswaData
                const ltcCount = rawSiswaData.length || 5; 
                rawPopulasiData.push({
                    tanggal,
                    kontrak,
                    ltc: ltcCount,
                    outsourcing,
                    satpamSupir,
                    totalKaryawan: kontrak + ltcCount + outsourcing + satpamSupir,
                    totalLtc: ltcCount
                });
                showToast('Mode Preview: Data populasi ditambahkan.');
            }
            closePopulasiModal();
            renderAdminView();
            if (typeof calculateDynamicPerformance === 'function') calculateDynamicPerformance();
        }
    }

    function deletePopulasiAdmin(tanggal) {
        showGlassModal({
            title: "Hapus Data Populasi",
            message: `Apakah Anda yakin ingin menghapus data rekap populasi untuk tanggal <strong>${tanggal}</strong>?`,
            confirmText: "Ya, Hapus",
            confirmClass: "bg-rose-600 hover:bg-rose-700",
            onConfirm: () => {
                executePopulasiDeletion(tanggal);
            }
        });
    }

    function executePopulasiDeletion(tanggal) {
        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    if (res && res.success) {
                        showToast('Data populasi berhasil dihapus.');
                        loadDashboardData();
                    } else {
                        showToast('Gagal menghapus data: ' + (res ? res.message : 'Respon kosong'), 'error');
                    }
                })
                .withFailureHandler(err => {
                    showToast('Error Server: ' + (err.message || err.toString()), 'error');
                })
                .deletePopulasi(tanggal);
        } else {
            showToast('Mode Preview: Data populasi berhasil dihapus dari memori lokal.', 'info');
            const idx = rawPopulasiData.findIndex(x => x.tanggal === tanggal);
            if (idx !== -1) rawPopulasiData.splice(idx, 1);
            renderAdminView();
            if (typeof calculateDynamicPerformance === 'function') calculateDynamicPerformance();
        }
    }


