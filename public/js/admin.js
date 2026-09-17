
    function getRpcRunner() {
        return (typeof executeRpcCall === 'function' ? executeRpcCall : (typeof window !== 'undefined' && window.executeRpcCall ? window.executeRpcCall : (typeof executeGASCall === 'function' ? executeGASCall : (typeof window !== 'undefined' && window.executeGASCall ? window.executeGASCall : null))));
    }

    var currentAdminTab = 'kelola-siswa';

    // ============================================================
    // UTILITY: Hitung Kelas otomatis dari Tanggal Masuk
    // Rumus: =DATEDIF(tgl_masuk, TODAY(), "m") + 1
    // Sama persis dengan rumus Excel yang digunakan
    // ============================================================
    function hitungKelas(sOrMasuk) {
        let tgl = typeof sOrMasuk === 'object' && sOrMasuk !== null ? (sOrMasuk.masuk || sOrMasuk.tanggalMasuk || sOrMasuk.tanggal_masuk) : sOrMasuk;
        let tglKeluar = typeof sOrMasuk === 'object' && sOrMasuk !== null ? (sOrMasuk.tanggalKeluar || sOrMasuk.keluar) : null;
        let isTerminasi = typeof sOrMasuk === 'object' && sOrMasuk !== null && (sOrMasuk.status === 'Terminasi' || sOrMasuk.status === 'TURNOVER');
        if (tgl && typeof hitungKelasSiswa === 'function') {
            return hitungKelasSiswa(tgl, isTerminasi && tglKeluar ? parseDateYYYYMMDD(tglKeluar) : new Date());
        }
        if (typeof sOrMasuk === 'object' && sOrMasuk !== null) {
            if (sOrMasuk.kelas && sOrMasuk.kelas !== '-' && sOrMasuk.kelas !== 'null' && sOrMasuk.kelas !== 'undefined') {
                const strK = String(sOrMasuk.kelas).trim();
                if (strK.length > 0) {
                    const num = parseInt(strK.replace(/Kelas\s+/i, ''));
                    if (!isNaN(num)) return 'Kelas ' + Math.min(5, num);
                    return strK;
                }
            }
        }
        return 'Kelas 1';
    }

    function switchAdminTab(tabId) {
        currentAdminTab = tabId || 'kelola-siswa';
        
        // Update sidebar sub-menu buttons style
        updateAdminSubmenuHighlight(currentAdminTab);

        // Toggle tab content panels
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const activeContent = document.getElementById('admin-tab-' + currentAdminTab);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }
        
        // Trigger specific render
        renderAdminView();
    }

    function updateAdminSubmenuHighlight(tabId) {
        document.querySelectorAll('.admin-subnav-btn').forEach(btn => {
            btn.classList.remove('bg-blue-50', 'text-[#0B3B82]', 'font-medium', 'bg-white', 'text-brand-blue', 'font-bold', 'font-semibold', 'shadow-xs', 'border', 'border-slate-200/80');
            btn.classList.add('text-slate-600', 'hover:text-[#0B3B82]', 'hover:bg-slate-50', 'font-normal');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('text-[#0B3B82]', 'text-brand-blue');
                icon.classList.add('text-slate-400');
            }
        });
        const activeSub = document.getElementById('subnav-admin-' + tabId);
        if (activeSub) {
            activeSub.classList.remove('text-slate-600', 'hover:bg-slate-50', 'font-bold', 'font-semibold');
            activeSub.classList.add('bg-blue-50', 'text-[#0B3B82]', 'font-medium');
            const icon = activeSub.querySelector('i');
            if (icon) {
                icon.classList.remove('text-slate-400');
                icon.classList.add('text-[#0B3B82]');
            }
        }
    }
    window.updateAdminSubmenuHighlight = updateAdminSubmenuHighlight;
    window.switchAdminTab = switchAdminTab;

    function renderAdminView() {
        // Muat status sinkronisasi
        loadSyncStatus();

        if (currentAdminTab === 'sync-akun') {
            const tbody = document.getElementById('admin-tbody');
            if (!tbody) return;

            // Hanya tampilkan spinner saat data benar-benar masih kosong (first initial load)
            if (!rawUsersData || rawUsersData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-xs text-brand-textSub"><i class="fa-solid fa-spinner animate-spin text-brand-blue text-lg mb-2"></i><br>Memuat basis data pengguna...</td></tr>';
            }

            const rpc = getRpcRunner();
            if (rpc) {
                rpc('getUsersList', [])
                    .then(data => {
                        rawUsersData = data || [];
                        filterAdminUsersTable();
                    })
                    .catch(err => {
                        console.error('Gagal memuat data pengguna:', err);
                        if (!rawUsersData || rawUsersData.length === 0) {
                            rawUsersData = typeof fallbackUsers !== 'undefined' ? fallbackUsers : [];
                        }
                        filterAdminUsersTable();
                    });
            } else {
                if (!rawUsersData || rawUsersData.length === 0) {
                    rawUsersData = typeof fallbackUsers !== 'undefined' ? fallbackUsers : [];
                }
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
        } else if (currentAdminTab === 'kelola-k3') {
            if (typeof filterAdminSafetyTable === 'function') filterAdminSafetyTable();
        } else if (currentAdminTab === 'kelola-sertifikat') {
            renderAdminSertifikatTab();
        } else if (currentAdminTab === 'kelola-quiz') {
            if (typeof loadQuizAdminData === 'function') {
                loadQuizAdminData();
            }
        }
    }

    let userCurrentPage = 1;
    const USER_PAGE_SIZE = 25;

    function filterAdminUsersTable(resetPage = false) {
        if (resetPage === true) {
            userCurrentPage = 1;
        }
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
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'user-pagination-info',
                    controlsId: 'user-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: USER_PAGE_SIZE,
                    goToPageFn: 'goToUserPage',
                    itemLabel: 'akun',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        const totalItems = users.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / USER_PAGE_SIZE));
        if (userCurrentPage > totalPages) userCurrentPage = totalPages;
        if (userCurrentPage < 1) userCurrentPage = 1;

        const startIndex = (userCurrentPage - 1) * USER_PAGE_SIZE;
        const endIndex = Math.min(startIndex + USER_PAGE_SIZE, totalItems);
        const pageItems = users.slice(startIndex, endIndex);

        pageItems.forEach(u => {
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

        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'user-pagination-info',
                controlsId: 'user-pagination-controls',
                currentPage: userCurrentPage,
                totalItems: totalItems,
                pageSize: USER_PAGE_SIZE,
                goToPageFn: 'goToUserPage',
                itemLabel: 'akun',
                themeColor: '#0B3B82'
            });
        }
    }

    function goToUserPage(page) {
        userCurrentPage = page;
        filterAdminUsersTable(false);
        const scrollContainer = document.querySelector('#admin-tab-sync-akun .overflow-x-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.goToUserPage = goToUserPage;
    window.filterAdminUsersTable = filterAdminUsersTable;

    function openUserRegisterModal() {
        clearFormUserAdmin();
        const modal = document.getElementById('user-register-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    function closeUserRegisterModal() {
        const modal = document.getElementById('user-register-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
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
        showToast('Mendaftarkan akun pengguna baru...', 'info');

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('createUser', [payload])
                .then(res => {
                    if (res && res.success !== false) {
                        showToast('Akun pengguna baru berhasil didaftarkan!', 'success');
                        clearFormUserAdmin();
                        closeUserRegisterModal();
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminView();
                    } else {
                        showToast('Gagal mendaftarkan user: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Error server: ' + (err.message || err.toString()), 'error');
                });
        }
    }

    window.openUserRegisterModal = openUserRegisterModal;
    window.closeUserRegisterModal = closeUserRegisterModal;
    window.saveUserAdmin = saveUserAdmin;

    function clearFormUserAdmin() {
        const n = document.getElementById('admin-user-nama');
        const e = document.getElementById('admin-user-email');
        const p = document.getElementById('admin-user-pass');
        const nr = document.getElementById('admin-user-noreg');
        if (n) n.value = '';
        if (e) e.value = '';
        if (p) p.value = '';
        if (nr) nr.value = '';
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

        showToast('Memperbarui data akun...', 'info');

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('updateUser', [payload])
                .then(res => {
                    if (res && res.success !== false) {
                        showToast('Akun berhasil diperbarui!', 'success');
                        closeUserEditModal();
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminView();
                    } else {
                        showToast('Gagal memperbarui akun: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Error server: ' + (err.message || err.toString()), 'error');
                });
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
        showToast('Menghapus akun pengguna...', 'info');

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('deleteUserById', [userId])
                .then(res => {
                    if (res && res.success !== false) {
                        showToast('Pengguna berhasil dihapus.', 'success');
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminView();
                    } else {
                        showToast('Gagal menghapus pengguna: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Error server: ' + (err.message || err.toString()), 'error');
                });
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

    let siswaCurrentPage = 1;
    let SISWA_PAGE_SIZE = 10;

    function changeSiswaPageSize(size) {
        SISWA_PAGE_SIZE = parseInt(size, 10) || 10;
        renderAdminSiswaTable(true);
    }
    window.changeSiswaPageSize = changeSiswaPageSize;

    function renderAdminSiswaTable(resetPage = false) {
        if (resetPage === true) {
            siswaCurrentPage = 1;
        }
        const tbody = document.getElementById('admin-siswa-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="16" class="py-8 text-center text-brand-textSub"><i class="fa-solid fa-spinner animate-spin text-brand-blue text-lg mb-2"></i><br>Memuat basis data siswa...</td></tr>';

        // Ambil data siswa aktif
        const students = activeData || [];
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="16" class="py-8 text-center text-brand-textSub italic">Tidak ada data siswa aktif terdaftar.</td></tr>';
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'siswa-pagination-info',
                    controlsId: 'siswa-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: SISWA_PAGE_SIZE,
                    goToPageFn: 'goToSiswaPage',
                    itemLabel: 'siswa',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        // Jalankan populasi filter secara dinamis
        populateAdminSiswaFilters();

        const queryFilter = (document.getElementById('filter-siswa-query')?.value || '').toLowerCase().trim();
        const sectionFilter = document.getElementById('filter-siswa-section')?.value || '';
        const kelasFilter = document.getElementById('filter-siswa-kelas')?.value || '';
        const asalFilter = document.getElementById('filter-siswa-asal')?.value || '';
        const sekolahFilter = document.getElementById('filter-siswa-sekolah')?.value || '';

        let filtered = students.filter(s => String(s.status || '').toUpperCase() === "AKTIF");

        if (queryFilter) {
            filtered = filtered.filter(s => 
                (s.namaLengkap || '').toLowerCase().includes(queryFilter) ||
                (s.id || '').toLowerCase().includes(queryFilter) ||
                (s.section || '').toLowerCase().includes(queryFilter) ||
                (s.departemen || '').toLowerCase().includes(queryFilter) ||
                (s.spv || '').toLowerCase().includes(queryFilter) ||
                (s.asalSekolah || '').toLowerCase().includes(queryFilter) ||
                (s.daerahAsal || s.asalDaerah || '').toLowerCase().includes(queryFilter) ||
                (s.alamat || '').toLowerCase().includes(queryFilter) ||
                (s.telepon || s.noTelp || s.no_telp || '').toLowerCase().includes(queryFilter)
            );
        }

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

        const totalItems = filtered.length;
        if (totalItems === 0) {
            tbody.innerHTML = '<tr><td colspan="16" class="py-8 text-center text-brand-textSub italic">Tidak ada data siswa yang cocok dengan filter.</td></tr>';
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'siswa-pagination-info',
                    controlsId: 'siswa-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: SISWA_PAGE_SIZE,
                    goToPageFn: 'goToSiswaPage',
                    itemLabel: 'siswa',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        // Hitung paginasi 25 siswa per halaman
        const totalPages = Math.max(1, Math.ceil(totalItems / SISWA_PAGE_SIZE));
        if (siswaCurrentPage > totalPages) siswaCurrentPage = totalPages;
        if (siswaCurrentPage < 1) siswaCurrentPage = 1;

        const startIndex = (siswaCurrentPage - 1) * SISWA_PAGE_SIZE;
        const endIndex = Math.min(startIndex + SISWA_PAGE_SIZE, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        pageItems.forEach(s => {
            const tr = document.createElement('tr');
            tr.className = "group hover:bg-slate-50/50 transition-all-300 border-b border-slate-50 text-xs font-semibold";

            // Format tanggal masuk, keluar, dan distribusi
            const masukFormatted = s.masuk ? s.masuk.split('-').reverse().join('/') : '-';
            const keluarFormatted = s.tanggalKeluar ? s.tanggalKeluar.split('-').reverse().join('/') : (s.keluar ? s.keluar.split('-').reverse().join('/') : '-');
            const distribusiFormatted = s.distribusi ? s.distribusi.split('-').reverse().join('/') : '-';

            tr.innerHTML = `
                <!-- 1. Aksi (Sticky Left 0) -->
                <td class="py-2 px-2.5 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[170px] max-w-[170px] w-[170px] whitespace-nowrap">
                    <button onclick="openCertificateModal('${s.id}')" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-all-300 mr-1 shadow-xs" title="Penerbitan & Cetak Sertifikat Siswa">
                        <i class="fa-solid fa-award"></i>
                    </button>
                    <button onclick="editStudentTrigger('${s.id}')" class="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300 mr-1">
                        <i class="fa-solid fa-user-pen"></i> Edit
                    </button>
                    <button onclick="deleteStudentConfirm('${s.id}')" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
                <!-- 2. NoReg (Sticky Left 170px) -->
                <td class="py-2 px-3 sticky left-[170px] bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[90px] max-w-[90px] w-[90px] font-mono font-bold text-slate-800">${s.id}</td>
                <!-- 3. Nama (Sticky Left 260px) -->
                <td class="py-2 px-3.5 sticky left-[260px] bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[200px] max-w-[200px] w-[200px] font-bold text-brand-textMain whitespace-nowrap overflow-hidden text-ellipsis">${s.namaLengkap}</td>
                <!-- 4. Departemen -->
                <td class="py-2 px-3 min-w-[120px]"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-brand-blue border border-blue-100">${s.departemen || '-'}</span></td>
                <!-- 5. Section -->
                <td class="py-2 px-3 min-w-[130px] font-bold text-slate-700">${s.section || '-'}</td>
                <!-- 6. HK -->
                <td class="py-2 px-3 min-w-[90px]"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">${s.hk || s.hariKerja || '6 Hari'}</span></td>
                <!-- 7. Kelas (dihitung otomatis dari tanggal masuk) -->
                <td class="py-2 px-3 min-w-[95px]">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap
                        ${(() => { 
                            const k = hitungKelas(s); 
                            if (k.includes('Kelas 1')) return 'bg-red-100 text-red-800 border-red-300';
                            if (k.includes('Kelas 2')) return 'bg-amber-100 text-amber-800 border-amber-300';
                            if (k.includes('Kelas 3')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                            if (k.includes('Kelas 4')) return 'bg-sky-100 text-sky-800 border-sky-300';
                            return 'bg-slate-200 text-slate-800 border-slate-300'; 
                        })()}
                    ">${hitungKelas(s)}</span>
                </td>
                <!-- 8. Masuk LTC -->
                <td class="py-2 px-3 min-w-[95px] text-brand-textSub font-mono">${masukFormatted}</td>
                <!-- 9. Distribusi -->
                <td class="py-2 px-3 min-w-[95px] text-brand-textSub font-mono">${distribusiFormatted}</td>
                <!-- 10. Akhir LTC -->
                <td class="py-2 px-3 min-w-[95px] text-brand-textSub font-mono">${keluarFormatted}</td>
                <!-- 11. SPV -->
                <td class="py-2 px-3 min-w-[140px] text-brand-textSub">${s.spv || '-'}</td>
                <!-- 12. Daerah Asal -->
                <td class="py-2 px-3 min-w-[110px] text-brand-textSub">${s.daerahAsal || s.asalDaerah || s.asal || s.asal_daerah || '-'}</td>
                <!-- 13. Sekolah -->
                <td class="py-2 px-3 min-w-[140px] text-brand-textSub">${s.asalSekolah || s.sekolah || s.asal_sekolah || '-'}</td>
                <!-- 14. Tgl Lahir -->
                <td class="py-2 px-3 min-w-[125px] text-brand-textSub">${s.tanggalLahir ? (s.tempatLahir ? s.tempatLahir + ', ' : '') + s.tanggalLahir.split('-').reverse().join('/') : (s.tempatLahir || '-')}</td>
                <!-- 15. Alamat -->
                <td class="py-2 px-3 min-w-[150px] text-brand-textSub max-w-[190px] truncate" title="${s.alamat || ''}">${s.alamat || '-'}</td>
                <!-- 16. No Telp -->
                <td class="py-2 px-3 min-w-[120px] font-mono text-brand-textSub">${s.telepon || s.noTelp || s.no_telp || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        // Perbarui Kontrol Paginasi Siswa Aktif
        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'siswa-pagination-info',
                controlsId: 'siswa-pagination-controls',
                currentPage: siswaCurrentPage,
                totalItems: totalItems,
                pageSize: SISWA_PAGE_SIZE,
                goToPageFn: 'goToSiswaPage',
                itemLabel: 'siswa',
                themeColor: '#0B3B82'
            });
        }
    }

    function goToSiswaPage(page) {
        siswaCurrentPage = page;
        renderAdminSiswaTable(false);
        const scrollContainer = document.querySelector('#admin-tab-kelola-siswa .overflow-x-auto');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    window.goToSiswaPage = goToSiswaPage;
    window.renderAdminSiswaTable = renderAdminSiswaTable;

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

    // ============================================================
    // UTILITY: Pas Foto 3x4 Siswa (Auto Crop & Compress <= 25 KB)
    // ============================================================
    function resetStudentPhotoModal() {
        const preview = document.getElementById('student-modal-foto-preview');
        const placeholder = document.getElementById('student-modal-foto-placeholder');
        const sizeBadge = document.getElementById('student-modal-foto-size');
        const removeBtn = document.getElementById('student-modal-foto-remove-btn');
        const fileInput = document.getElementById('student-modal-foto-file');
        const base64Input = document.getElementById('student-modal-foto-base64');
        const actionInput = document.getElementById('student-modal-foto-action');

        if (preview) { preview.src = ''; preview.classList.add('hidden'); }
        if (placeholder) placeholder.classList.remove('hidden');
        if (sizeBadge) { sizeBadge.textContent = ''; sizeBadge.classList.add('hidden'); }
        if (removeBtn) removeBtn.classList.add('hidden');
        if (fileInput) fileInput.value = '';
        if (base64Input) base64Input.value = '';
        if (actionInput) actionInput.value = 'none';
    }

    function loadStudentPhotoInModal(noreg) {
        resetStudentPhotoModal();
        if (!noreg) return;

        const preview = document.getElementById('student-modal-foto-preview');
        const placeholder = document.getElementById('student-modal-foto-placeholder');
        const removeBtn = document.getElementById('student-modal-foto-remove-btn');
        const actionInput = document.getElementById('student-modal-foto-action');

        const baseUrl = (typeof window !== 'undefined' && window.PUBLIC_SUPABASE_URL) ? window.PUBLIC_SUPABASE_URL : 'https://xpoddtzxsopwzojycmwx.supabase.co';
        const photoUrl = `${baseUrl}/storage/v1/object/public/foto-siswa/${encodeURIComponent(noreg)}.jpg?t=${Date.now()}`;

        const testImg = new Image();
        testImg.onload = function() {
            if (preview) {
                preview.src = photoUrl;
                preview.classList.remove('hidden');
            }
            if (placeholder) placeholder.classList.add('hidden');
            if (removeBtn) removeBtn.classList.remove('hidden');
            if (actionInput) actionInput.value = 'none';
        };
        testImg.onerror = function() {
            if (preview) {
                preview.src = '';
                preview.classList.add('hidden');
            }
            if (placeholder) placeholder.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.add('hidden');
            if (actionInput) actionInput.value = 'none';
        };
        testImg.src = photoUrl;
    }

    function clearStudentPhotoSelection() {
        resetStudentPhotoModal();
        const actionInput = document.getElementById('student-modal-foto-action');
        if (actionInput) actionInput.value = 'delete';
    }

    function handleStudentPhotoSelected(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Pilih file gambar valid (JPG, PNG, WEBP).', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const result = cropAndCompressImageTo3x4(img, 300, 400, 25600);
                
                const preview = document.getElementById('student-modal-foto-preview');
                const placeholder = document.getElementById('student-modal-foto-placeholder');
                const sizeBadge = document.getElementById('student-modal-foto-size');
                const removeBtn = document.getElementById('student-modal-foto-remove-btn');
                const base64Input = document.getElementById('student-modal-foto-base64');
                const actionInput = document.getElementById('student-modal-foto-action');

                if (preview) {
                    preview.src = result.dataUrl;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (sizeBadge) {
                    const kb = (result.sizeInBytes / 1024).toFixed(1);
                    sizeBadge.textContent = `${kb} KB / 25 KB`;
                    sizeBadge.className = "text-[10px] font-mono font-bold text-emerald-600";
                    sizeBadge.classList.remove('hidden');
                }
                if (removeBtn) removeBtn.classList.remove('hidden');
                if (base64Input) base64Input.value = result.dataUrl;
                if (actionInput) actionInput.value = 'update';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function cropAndCompressImageTo3x4(img, targetWidth = 300, targetHeight = 400, maxBytes = 25600) {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight; // 0.75
        let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

        if (imgAspect > targetAspect) {
            sHeight = img.height;
            sWidth = img.height * targetAspect;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = img.width;
            sHeight = img.width / targetAspect;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let base64Part = dataUrl.split(',')[1] || '';
        let sizeInBytes = Math.round((base64Part.length * 3) / 4);

        while (sizeInBytes > maxBytes && quality > 0.15) {
            quality -= 0.05;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            base64Part = dataUrl.split(',')[1] || '';
            sizeInBytes = Math.round((base64Part.length * 3) / 4);
        }

        if (sizeInBytes > maxBytes) {
            canvas.width = 240;
            canvas.height = 320;
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 240, 320);
            quality = 0.75;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            base64Part = dataUrl.split(',')[1] || '';
            sizeInBytes = Math.round((base64Part.length * 3) / 4);
            while (sizeInBytes > maxBytes && quality > 0.15) {
                quality -= 0.05;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
                base64Part = dataUrl.split(',')[1] || '';
                sizeInBytes = Math.round((base64Part.length * 3) / 4);
            }
        }

        return { dataUrl, sizeInBytes };
    }

    if (typeof window !== 'undefined') {
        window.handleStudentPhotoSelected = handleStudentPhotoSelected;
        window.clearStudentPhotoSelection = clearStudentPhotoSelection;
    }

    function openStudentModal(isEdit = false) {
        const modal = document.getElementById('student-form-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        // Reset Modal Form
        document.getElementById('student-edit-mode').value = isEdit ? "true" : "false";
        document.getElementById('student-noreg').disabled = false; // Membolehkan pengeditan NoReg
        document.getElementById('student-modal-title').textContent = isEdit ? "Edit Informasi Siswa" : "Tambah Siswa Baru";
        
        if (!isEdit) {
            resetStudentPhotoModal();
            document.getElementById('student-old-noreg').value = '';
            document.getElementById('student-noreg').value = '';
            document.getElementById('student-nama').value = '';
            document.getElementById('student-hk').value = '6 Hari';
            document.getElementById('student-departemen').value = 'PRODUKSI';
            document.getElementById('student-section').value = 'PAINTING';
            document.getElementById('student-spv').value = '';
            document.getElementById('student-asal-daerah').value = '';
            document.getElementById('student-sekolah').value = '';
            if (document.getElementById('student-tempat-lahir')) document.getElementById('student-tempat-lahir').value = '';
            if (document.getElementById('student-tanggal-lahir')) document.getElementById('student-tanggal-lahir').value = '';
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
        loadStudentPhotoInModal(s.id);
        
        document.getElementById('student-old-noreg').value = s.id;
        document.getElementById('student-noreg').value = s.id;
        document.getElementById('student-nama').value = s.namaLengkap;
        document.getElementById('student-kelas').value = s.kelas || hitungKelas(s.masuk);
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
        
        document.getElementById('student-asal-daerah').value = s.daerahAsal || s.asalDaerah || s.asal || s.asal_daerah || '';
        document.getElementById('student-sekolah').value = s.asalSekolah || s.sekolah || s.asal_sekolah || '';
        if (document.getElementById('student-tempat-lahir')) {
            document.getElementById('student-tempat-lahir').value = s.tempatLahir || s.tempat_lahir || '';
        }
        if (document.getElementById('student-tanggal-lahir')) {
            document.getElementById('student-tanggal-lahir').value = s.tanggalLahir || s.tanggal_lahir || '';
        }
        
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
        const oldNoReg = document.getElementById('student-old-noreg').value.trim();
        const noreg = document.getElementById('student-noreg').value.trim();
        const nama = document.getElementById('student-nama').value.trim();
        const kelas = document.getElementById('student-kelas').value.trim();
        const hk = document.getElementById('student-hk').value.trim();
        const departemen = document.getElementById('student-departemen').value;
        const section = document.getElementById('student-section').value;
        const spv = document.getElementById('student-spv').value.trim();
        const asal = document.getElementById('student-asal-daerah').value.trim();
        const sekolah = document.getElementById('student-sekolah').value.trim();
        const tempatLahir = document.getElementById('student-tempat-lahir') ? document.getElementById('student-tempat-lahir').value.trim() : '';
        const tanggalLahir = document.getElementById('student-tanggal-lahir') ? document.getElementById('student-tanggal-lahir').value : '';
        const tglMasuk = document.getElementById('student-tgl-masuk').value;
        const tglKeluar = document.getElementById('student-tgl-keluar').value;
        const distribusi = document.getElementById('student-distribusi').value;
        const isEdit = document.getElementById('student-edit-mode').value === "true";

        if (!noreg || !nama || !tglMasuk) {
            showToast('NoReg, Nama Lengkap, dan Tanggal Masuk wajib diisi.', 'error');
            return;
        }

        const payload = {
            OldNoReg: oldNoReg || noreg,
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
            TempatLahir: tempatLahir,
            TanggalLahir: tanggalLahir || null,
            HK: hk,
            isEdit: isEdit
        };

        showToast('Menyimpan data siswa...', 'info');

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('saveSiswa', [payload])
                .then(async res => {
                    if (res && res.success !== false) {
                        // Proses Upload / Hapus Pas Foto Siswa jika ada perubahan
                        const photoAction = document.getElementById('student-modal-foto-action')?.value;
                        const photoBase64 = document.getElementById('student-modal-foto-base64')?.value;

                        if (photoAction === 'update' && photoBase64) {
                            try {
                                const upRes = await rpc('uploadFotoSiswa', [{ noreg: noreg, photoBase64: photoBase64 }]);
                                if (upRes && upRes.success === false) {
                                    showToast('Siswa disimpan, tapi foto gagal: ' + (upRes.message || 'Error'), 'error');
                                } else {
                                    showToast('Data siswa & pas foto 3x4 berhasil disimpan!', 'success');
                                }
                            } catch (pErr) {
                                console.warn('Gagal upload foto siswa:', pErr);
                                showToast('Siswa disimpan, tapi gagal upload foto: ' + (pErr.message || pErr), 'error');
                            }
                        } else if (photoAction === 'delete') {
                            try {
                                await rpc('deleteFotoSiswa', [{ noreg: noreg }]);
                                showToast('Data siswa disimpan & foto dihapus.', 'info');
                            } catch (pErr) {
                                console.warn('Gagal hapus foto siswa:', pErr);
                            }
                        } else {
                            showToast('Data siswa berhasil disimpan!', 'success');
                        }

                        closeStudentModal();
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminSiswaTable();
                    } else {
                        showToast('Gagal menyimpan data siswa: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Gagal menyimpan: ' + (err.message || err.toString()), 'error');
                });
        }
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
        showToast('Menghapus siswa dan mencatat turnover...', 'info');

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('deleteSiswa', [noreg, alasan, keterangan])
                .then(res => {
                    if (res && res.success !== false) {
                        showToast('Siswa dihapus & tercatat di Turnover!', 'success');
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else {
                            renderAdminSiswaTable();
                            renderAdminTurnoverTable();
                        }
                    } else {
                        showToast('Gagal menghapus siswa: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Gagal menghapus: ' + (err.message || err.toString()), 'error');
                });
        }
    }

    // ============================================================
    // LOG MANPOWER HARIAN (TAB 3)
    // ============================================================

    function initLogManpowerTab() {
        renderAdminManpowerTable();
    }

    let manpowerCurrentPage = 1;
    const MANPOWER_PAGE_SIZE = 25;

    function renderAdminManpowerTable(resetPage = false) {
        if (resetPage === true) {
            manpowerCurrentPage = 1;
        }
        const tbody = document.getElementById('admin-manpower-tbody');
        if (!tbody) return;

        // Kumpulkan semua catatan dailyRecords dari seluruh siswa aktif
        let logs = [];
        (activeData || []).forEach(siswa => {
            (siswa.dailyRecords || []).forEach(rec => {
                let rawDate = rec.dateStr || rec.tanggal_record || '';
                if (rawDate && rawDate.includes('/')) {
                    const p = rawDate.split('/');
                    if (p.length === 3) {
                        rawDate = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                    }
                }
                    let shiftFormatted = rec.shift || rec.Shift || 'Shift 1';
                    if (shiftFormatted && shiftFormatted.toUpperCase().startsWith('SHIFT')) {
                        const sNum = shiftFormatted.replace(/\D/g, '');
                        shiftFormatted = sNum ? `Shift ${sNum}` : shiftFormatted;
                    }

                    logs.push({
                        noreg: siswa.id,
                        namaLengkap: siswa.namaLengkap,
                        tanggal: rawDate,
                        hadir: rec.hadir || '✔',
                        plan: rec.plan !== null && rec.plan !== undefined ? rec.plan : null,
                        actual: rec.actual !== null && rec.actual !== undefined ? rec.actual : null,
                        reject: rec.reject !== null && rec.reject !== undefined ? rec.reject : 0,
                        percent: rec.percent !== null && rec.percent !== undefined ? rec.percent : null,
                        shift: shiftFormatted,
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
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'manpower-pagination-info',
                    controlsId: 'manpower-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: MANPOWER_PAGE_SIZE,
                    goToPageFn: 'goToManpowerPage',
                    itemLabel: 'catatan',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        const totalItems = logs.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / MANPOWER_PAGE_SIZE));
        if (manpowerCurrentPage > totalPages) manpowerCurrentPage = totalPages;
        if (manpowerCurrentPage < 1) manpowerCurrentPage = 1;

        const startIndex = (manpowerCurrentPage - 1) * MANPOWER_PAGE_SIZE;
        const endIndex = Math.min(startIndex + MANPOWER_PAGE_SIZE, totalItems);
        const pageItems = logs.slice(startIndex, endIndex);

        pageItems.forEach(r => {
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
            } else if (hadirUpper === 'OFF' || hadirUpper === 'LIBUR') {
                hadirBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Off</span>';
            } else {
                hadirBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">✔ Hadir</span>';
            }

            // Format Plan/Aktual/Reject vs Hadir
            let hasilDisplay = '';
            if (r.plan !== null && r.plan > 0) {
                const pct = Math.round((r.actual / r.plan) * 100);
                const badgeBg = pct >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (pct >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');
                hasilDisplay = `
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 flex-wrap">
                            <span class="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 whitespace-nowrap" title="Target Plan">Plan: ${r.plan}</span>
                            <span class="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap" title="Aktual">Aktual: ${r.actual}</span>
                            <span class="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 whitespace-nowrap" title="Reject">Reject: ${r.reject || 0}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg} whitespace-nowrap">${pct}% Target</span>
                            <span class="text-[10px] text-slate-400 font-medium whitespace-nowrap">SPV: ${r.spv || '-'}</span>
                        </div>
                    </div>
                `;
            } else if (r.actual !== null && r.actual > 0) {
                hasilDisplay = `
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 flex-wrap">
                            <span class="text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap" title="Target Plan">Plan: 0</span>
                            <span class="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap" title="Aktual">Aktual: ${r.actual}</span>
                            <span class="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 whitespace-nowrap" title="Reject">Reject: ${r.reject || 0}</span>
                        </div>
                        <div class="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">SPV: ${r.spv || '-'}</div>
                    </div>
                `;
            } else {
                hasilDisplay = `
                    <div class="text-slate-400 text-xs font-medium">-</div>
                    <div class="text-[10px] text-slate-400 font-normal whitespace-nowrap">SPV: ${r.spv || '-'}</div>
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
                <td class="py-3 px-4 font-bold text-brand-textMain truncate max-w-[200px]" title="${r.namaLengkap}">${r.namaLengkap}</td>
                <td class="py-3 px-4 text-center whitespace-nowrap">${hadirBadge}</td>
                <td class="py-3 px-4">
                    <div class="font-bold text-slate-700 truncate max-w-[190px]" title="${r.shift || 'Shift 1'} • ${r.bagian || '-'}">${r.shift || 'Shift 1'} • ${r.bagian || '-'}</div>
                    <div class="text-[10px] text-slate-400 font-normal truncate max-w-[190px]" title="Mesin: ${r.mesin || '-'} | Model: ${r.model || '-'}">Mesin: ${r.mesin || '-'} | Model: ${r.model || '-'}</div>
                </td>
                <td class="py-3 px-4 whitespace-nowrap">${hasilDisplay}</td>
                <td class="py-3 px-4 text-slate-600 truncate max-w-xs" title="${r.keterangan || ''}">${r.keterangan || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'manpower-pagination-info',
                controlsId: 'manpower-pagination-controls',
                currentPage: manpowerCurrentPage,
                totalItems: totalItems,
                pageSize: MANPOWER_PAGE_SIZE,
                goToPageFn: 'goToManpowerPage',
                itemLabel: 'catatan',
                themeColor: '#0B3B82'
            });
        }
    }

    function goToManpowerPage(page) {
        manpowerCurrentPage = page;
        renderAdminManpowerTable(false);
        const scrollContainer = document.querySelector('#admin-tab-log-manpower .overflow-x-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.goToManpowerPage = goToManpowerPage;
    window.renderAdminManpowerTable = renderAdminManpowerTable;

    function updateMpModalEfficiency() {
        const plan = parseInt(document.getElementById('mp-modal-plan')?.value, 10) || 0;
        const actual = parseInt(document.getElementById('mp-modal-actual')?.value, 10) || 0;
        const badge = document.getElementById('mp-modal-efficiency-badge');
        if (!badge) return;
        if (plan > 0) {
            const pct = Math.round((actual / plan) * 100);
            badge.textContent = pct + '% Target';
            if (pct >= 100) {
                badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
            } else if (pct >= 75) {
                badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800';
            } else if (pct >= 50) {
                badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800';
            } else {
                badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800';
            }
        } else {
            badge.textContent = '0%';
            badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700';
        }
    }

    function onMpModalHadirChange() {
        const hadir = document.getElementById('mp-modal-hadir')?.value;
        const prodGroup = document.getElementById('mp-modal-prod-group');
        if (!prodGroup) return;
        if (hadir === 'Ijin' || hadir === 'Sakit' || hadir === 'Alpha' || hadir === 'Off') {
            prodGroup.classList.add('opacity-40', 'pointer-events-none');
        } else {
            prodGroup.classList.remove('opacity-40', 'pointer-events-none');
        }
    }

    function openManpowerLogModal(noreg = null, tanggal = null) {
        const modal = document.getElementById('manpower-log-modal');
        if (!modal) return;

        const isEdit = !!(noreg && tanggal);
        document.getElementById('mp-modal-is-edit').value = isEdit ? "true" : "false";
        document.getElementById('mp-modal-title').textContent = isEdit ? "Edit Log Manpower Harian" : "Input Log Manpower Harian";

        const studentContainer = document.getElementById('mp-modal-student-container');
        const studentBanner = document.getElementById('mp-modal-student-banner');

        // Populate dropdown siswa aktif (hanya digunakan saat Tambah Log Baru)
        const studentSelect = document.getElementById('mp-modal-student');
        if (studentSelect) {
            studentSelect.innerHTML = '';
            const students = (activeData || []).filter(s => String(s.status || '').toUpperCase() === "AKTIF");
            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.id} - ${s.namaLengkap}`;
                studentSelect.appendChild(opt);
            });
            studentSelect.disabled = isEdit;
        }

        if (isEdit) {
            if (studentContainer) studentContainer.classList.add('hidden');
            if (studentBanner) studentBanner.classList.remove('hidden');

            if (studentSelect) studentSelect.value = noreg;
            const origDateInput = document.getElementById('mp-modal-orig-date');
            if (origDateInput) origDateInput.value = tanggal || '';
            document.getElementById('mp-modal-date').value = tanggal;
            document.getElementById('mp-modal-date').disabled = false;

            // Cari rincian data siswa & record dari activeData
            const s = (activeData || []).find(std => std.id === noreg);
            const rec = s ? (s.dailyRecords || []).find(r => r.dateStr === tanggal) : null;

            if (s) {
                const avatarEl = document.getElementById('mp-modal-banner-avatar');
                const namaEl = document.getElementById('mp-modal-banner-nama');
                const noregEl = document.getElementById('mp-modal-banner-noreg');
                const bagianEl = document.getElementById('mp-modal-banner-bagian');
                const spvEl = document.getElementById('mp-modal-banner-spv');

                if (avatarEl) avatarEl.textContent = (s.namaLengkap || 'S').charAt(0).toUpperCase();
                if (namaEl) namaEl.textContent = s.namaLengkap || '-';
                if (noregEl) noregEl.textContent = s.id || '-';
                if (bagianEl) bagianEl.textContent = rec?.bagian || s.section || s.bagian || '-';
                if (spvEl) spvEl.textContent = rec?.nama_spv || s.spv || '-';
            }

            if (rec) {
                const hadirVal = rec.hadir === "✔" || rec.hadir === "Hadir" ? "✔" : (rec.hadir || "✔");
                document.getElementById('mp-modal-hadir').value = hadirVal;
                
                const shiftSelect = document.getElementById('mp-modal-shift');
                if (shiftSelect) {
                    const targetShift = (rec.shift || 'Shift 1').toUpperCase().trim();
                    let found = false;
                    for (let opt of shiftSelect.options) {
                        if (opt.value.toUpperCase().trim() === targetShift) {
                            shiftSelect.value = opt.value;
                            found = true;
                            break;
                        }
                    }
                    if (!found) shiftSelect.value = "Shift 1";
                }

                document.getElementById('mp-modal-bagian').value = rec.bagian || s?.section || "PAINTING";
                document.getElementById('mp-modal-mesin').value = rec.nomor_mesin || "";
                document.getElementById('mp-modal-model').value = rec.model || "";
                document.getElementById('mp-modal-plan').value = rec.plan !== null && rec.plan !== undefined ? rec.plan : 0;
                document.getElementById('mp-modal-actual').value = rec.actual !== null && rec.actual !== undefined ? rec.actual : 0;
                document.getElementById('mp-modal-reject').value = rec.reject !== null && rec.reject !== undefined ? rec.reject : 0;
                document.getElementById('mp-modal-spv').value = rec.nama_spv || s?.spv || "";
                document.getElementById('mp-modal-keterangan').value = rec.keterangan || "";
            }
        } else {
            if (studentContainer) studentContainer.classList.remove('hidden');
            if (studentBanner) studentBanner.classList.add('hidden');

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
        updateMpModalEfficiency();
        onMpModalHadirChange();
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
        const origDate = document.getElementById('mp-modal-orig-date')?.value || '';
        const isEdit = document.getElementById('mp-modal-is-edit')?.value === 'true';
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

        const planNum = Math.max(0, parseInt(String(planVal || '0').replace(/[^0-9]/g, ''), 10) || 0);
        const actualNum = Math.max(0, parseInt(String(actualVal || '0').replace(/[^0-9]/g, ''), 10) || 0);
        const rejectNum = Math.max(0, parseInt(String(rejectVal || '0').replace(/[^0-9]/g, ''), 10) || 0);

        const payload = {
            NoReg: noreg,
            TanggalRecord: dateFormatted,
            Hadir: hadirVal,
            Shift: shiftVal,
            Bagian: bagianVal,
            NomorMesin: mesinVal || '-',
            Model: modelVal || '-',
            Plan: planNum,
            Aktual: actualNum,
            Reject: rejectNum,
            NamaSPV: spvVal || '-',
            Keterangan: keteranganVal || '-'
        };

        if (isEdit && origDate && origDate !== dateVal) {
            payload.OriginalTanggalRecord = origDate;
        }

        showToast('Menyimpan log manpower...', 'info');

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('saveManpowerLog', [payload])
                .then(res => {
                    if (res && res.success !== false) {
                        showToast('Log manpower harian berhasil disimpan!', 'success');
                        _updateLocalManpowerCache(noreg, dateVal, payload, origDate);
                        closeManpowerLogModal();
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminManpowerTable();
                    } else {
                        showToast('Gagal menyimpan log: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Error server: ' + (err.message || err.toString()), 'error');
                });
        }
    }

    function _updateLocalManpowerCache(noreg, dateVal, payload, origDateVal) {
        const studentIdx = (activeData || []).findIndex(s => s.id === noreg);
        if (studentIdx !== -1) {
            let recs = activeData[studentIdx].dailyRecords || [];
            if (origDateVal && origDateVal !== dateVal) {
                recs = recs.filter(r => r.dateStr !== origDateVal);
            }
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
        showToast('Menghapus log manpower...', 'info');
        const rpc = getRpcRunner();
        if (rpc) {
            rpc('deleteManpowerLog', [noreg, tanggal])
                .then(res => {
                    if (res && res.success !== false) {
                        showToast('Log manpower berhasil dihapus!', 'success');
                        _removeLocalManpowerCache(noreg, tanggal);
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminManpowerTable();
                    } else {
                        showToast('Gagal menghapus: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Error: ' + (err.message || err), 'error');
                });
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

    function populateAdminTurnoverMonthFilter() {
        const select = document.getElementById('filter-admin-turnover-bulan');
        if (!select) return;

        const currentVal = select.value;
        const records = activeTurnoverData || [];
        const monthSet = new Set();

        records.forEach(t => {
            const exitDate = String(t.tanggalKeluar || t.keluar || t.masuk || '').substring(0, 7);
            if (exitDate && exitDate.match(/^\d{4}-\d{2}$/)) {
                monthSet.add(exitDate);
            }
        });

        const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
        const monthNamesIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        let html = '<option value="">Semua Bulan</option>';
        months.forEach(m => {
            const [year, monthNum] = m.split('-');
            const monthName = monthNamesIndo[parseInt(monthNum, 10) - 1] || m;
            const label = `${monthName} ${year}`;
            html += `<option value="${m}" ${currentVal === m ? 'selected' : ''}>${label}</option>`;
        });

        select.innerHTML = html;
    }

    let turnoverCurrentPage = 1;
    let TURNOVER_PAGE_SIZE = 10;

    function changeTurnoverPageSize(size) {
        TURNOVER_PAGE_SIZE = parseInt(size, 10) || 10;
        renderAdminTurnoverTable(true);
    }
    window.changeTurnoverPageSize = changeTurnoverPageSize;

    function renderAdminTurnoverTable(resetPage = false) {
        if (resetPage === true) {
            turnoverCurrentPage = 1;
        }
        const tbody = document.getElementById('admin-turnover-tbody');
        if (!tbody) return;

        const records = activeTurnoverData || [];
        tbody.innerHTML = '';

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada data turnover terdaftar.</td></tr>';
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'turnover-pagination-info',
                    controlsId: 'turnover-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: TURNOVER_PAGE_SIZE,
                    goToPageFn: 'goToTurnoverPage',
                    itemLabel: 'data',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        // Populate month dropdown options dynamically
        populateAdminTurnoverMonthFilter();

        const searchQuery = (document.getElementById('filter-admin-turnover-search')?.value || '').toLowerCase().trim();
        const selectedMonth = document.getElementById('filter-admin-turnover-bulan')?.value || '';

        // 1. Filter by Search Query & Selected Month
        let filtered = records.filter(t => {
            if (selectedMonth) {
                const exitStr = String(t.tanggalKeluar || t.keluar || t.masuk || '').substring(0, 7);
                if (exitStr !== selectedMonth) return false;
            }

            if (searchQuery) {
                const idStr = String(t.id || t.noreg || '').toLowerCase();
                const namaStr = String(t.namaLengkap || t.nama || '').toLowerCase();
                const bagianStr = String(t.bagian || t.section || '').toLowerCase();
                const daerahStr = String(t.asalDaerah || t.wilayah || t.asal || '').toLowerCase();
                const sekolahStr = String(t.asalSekolah || t.sekolah || '').toLowerCase();
                const alasanStr = String(t.alasan || '').toLowerCase();
                const ketStr = String(t.keterangan || '').toLowerCase();
                const tglMasukStr = String(t.masuk || '').toLowerCase();
                const tglKeluarStr = String(t.tanggalKeluar || t.keluar || '').toLowerCase();

                const stdMatch = (typeof rawSiswaData !== 'undefined' ? rawSiswaData : []).find(x => String(x.id) === String(t.id));
                const ttlStr = String((t.tempatLahir || (stdMatch ? stdMatch.tempatLahir : '') || '') + ' ' + (t.tanggalLahir || (stdMatch ? stdMatch.tanggalLahir : '') || '')).toLowerCase();
                const alamatStr = String(t.alamat || (stdMatch ? stdMatch.alamat : '') || '').toLowerCase();
                const telpStr = String(t.telepon || t.noTelp || (stdMatch ? (stdMatch.telepon || stdMatch.noTelp) : '') || '').toLowerCase();

                const matchSearch = idStr.includes(searchQuery) ||
                                    namaStr.includes(searchQuery) ||
                                    bagianStr.includes(searchQuery) ||
                                    daerahStr.includes(searchQuery) ||
                                    sekolahStr.includes(searchQuery) ||
                                    alasanStr.includes(searchQuery) ||
                                    ketStr.includes(searchQuery) ||
                                    tglMasukStr.includes(searchQuery) ||
                                    tglKeluarStr.includes(searchQuery) ||
                                    ttlStr.includes(searchQuery) ||
                                    alamatStr.includes(searchQuery) ||
                                    telpStr.includes(searchQuery);

                if (!matchSearch) return false;
            }

            return true;
        });

        // 2. Sort by NEWEST DATE FIRST (Descending by tanggalKeluar or masuk)
        filtered.sort((a, b) => {
            const dateA = a.tanggalKeluar || a.keluar || a.masuk || '';
            const dateB = b.tanggalKeluar || b.keluar || b.masuk || '';
            return dateB.localeCompare(dateA);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada data turnover yang sesuai filter pencarian.</td></tr>';
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'turnover-pagination-info',
                    controlsId: 'turnover-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: TURNOVER_PAGE_SIZE,
                    goToPageFn: 'goToTurnoverPage',
                    itemLabel: 'data',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / TURNOVER_PAGE_SIZE));
        if (turnoverCurrentPage > totalPages) turnoverCurrentPage = totalPages;
        if (turnoverCurrentPage < 1) turnoverCurrentPage = 1;

        const startIndex = (turnoverCurrentPage - 1) * TURNOVER_PAGE_SIZE;
        const endIndex = Math.min(startIndex + TURNOVER_PAGE_SIZE, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        pageItems.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all-300 border-b border-slate-50 text-xs font-semibold";
            const alasanColors = {
                'Resign': 'bg-rose-50 text-rose-600',
                'Lulus': 'bg-emerald-50 text-emerald-600',
                'Indisipliner': 'bg-amber-50 text-amber-700'
            };
            const alasanBadge = alasanColors[t.alasan] || 'bg-slate-50 text-slate-500';
            const kelasDisplay = (t.kelas && t.kelas !== '-') ? t.kelas : (typeof hitungKelasSiswa === 'function' ? hitungKelasSiswa(t.masuk || t.tanggalMasuk, t.tanggalKeluar || t.keluar) : (typeof hitungKelas === 'function' ? hitungKelas(t.masuk) : '-'));

            const photoUrl = t.foto || (typeof getStudentPhotoUrl === 'function' ? getStudentPhotoUrl(t.id) : '');
            const photoHtml = photoUrl 
                ? `<img src="${photoUrl}" loading="lazy" class="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-xs" alt="Foto" onerror="this.onerror=null; this.outerHTML='<div class=\\\'w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0\\\'><i class=\\\'fa-solid fa-user text-[10px]\\\'></i></div>'" />`
                : `<div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0"><i class="fa-solid fa-user text-[10px]"></i></div>`;

            // Sinkronkan TTL, Alamat, dan No. Telepon dari objek turnover atau data siswa
            const std = (typeof rawSiswaData !== 'undefined' ? rawSiswaData : []).find(x => String(x.id) === String(t.id));
            const tempatLahir = t.tempatLahir || (std ? std.tempatLahir : '') || '';
            const tanggalLahir = t.tanggalLahir || (std ? std.tanggalLahir : '') || '';
            const alamat = t.alamat || (std ? std.alamat : '') || '';
            const telepon = t.telepon || t.noTelp || t.no_telp || (std ? (std.telepon || std.noTelp || std.no_telp) : '') || '';

            const ttlFormatted = tanggalLahir 
                ? (tempatLahir ? tempatLahir + ', ' : '') + tanggalLahir.split('-').reverse().join('/') 
                : (tempatLahir || '-');
            const alamatFormatted = alamat || '-';
            const telpFormatted = telepon || '-';

            tr.innerHTML = `
                <!-- 1. Aksi (Sticky Left 0) -->
                <td class="py-2 px-2.5 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors duration-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100 min-w-[130px] max-w-[130px] w-[130px] whitespace-nowrap text-left space-x-1">
                    <button onclick="editTurnoverTrigger('${t.id}')" class="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button onclick="deleteTurnoverConfirm('${t.id}')" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all-300">
                        <i class="fa-solid fa-trash-can"></i> Hapus
                    </button>
                </td>
                <!-- 2. NoReg -->
                <td class="py-2 px-3 font-mono font-bold text-slate-700">${t.id}</td>
                <!-- 3. Nama -->
                <td class="py-2 px-3">
                    <div class="flex items-center gap-2.5">
                        ${photoHtml}
                        <span class="font-bold text-brand-textMain whitespace-nowrap">${t.namaLengkap}</span>
                    </div>
                </td>
                <!-- 4. Bagian -->
                <td class="py-2 px-3 text-brand-textSub">${t.bagian || '-'}</td>
                <!-- 5. Kelas -->
                <td class="py-2 px-3 text-brand-textSub font-semibold whitespace-nowrap min-w-[105px]">${kelasDisplay}</td>
                <!-- 6. Kota / Daerah -->
                <td class="py-2 px-3 text-brand-textSub font-semibold">${t.asalDaerah || t.wilayah || t.asal || '-'}</td>
                <!-- 7. Sekolah Asal -->
                <td class="py-2 px-3 text-brand-textSub font-semibold">${t.asalSekolah || t.sekolah || '-'}</td>
                <!-- 8. Tempat, Tanggal Lahir -->
                <td class="py-2 px-3 min-w-[130px] text-brand-textSub">${ttlFormatted}</td>
                <!-- 9. Alamat -->
                <td class="py-2 px-3 min-w-[160px] text-brand-textSub max-w-[190px] truncate" title="${alamat !== '-' ? alamat : ''}">${alamatFormatted}</td>
                <!-- 10. No. Telepon -->
                <td class="py-2 px-3 min-w-[125px] font-mono text-brand-textSub">${telpFormatted}</td>
                <!-- 11. Tgl Masuk -->
                <td class="py-2 px-3 font-mono text-brand-textSub whitespace-nowrap min-w-[95px]">${t.masuk ? t.masuk.split('-').reverse().join('/') : '-'}</td>
                <!-- 12. Tgl Keluar -->
                <td class="py-2 px-3 font-mono text-brand-textSub whitespace-nowrap min-w-[95px]">${t.tanggalKeluar ? t.tanggalKeluar.split('-').reverse().join('/') : '-'}</td>
                <!-- 13. Alasan -->
                <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${alasanBadge}">${t.alasan || '-'}</span></td>
                <!-- 14. Keterangan -->
                <td class="py-2 px-3 text-brand-textSub max-w-[150px] truncate" title="${t.keterangan || ''}">${t.keterangan || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'turnover-pagination-info',
                controlsId: 'turnover-pagination-controls',
                currentPage: turnoverCurrentPage,
                totalItems: totalItems,
                pageSize: TURNOVER_PAGE_SIZE,
                goToPageFn: 'goToTurnoverPage',
                itemLabel: 'data',
                themeColor: '#0B3B82'
            });
        }
    }

    function goToTurnoverPage(page) {
        turnoverCurrentPage = page;
        renderAdminTurnoverTable(false);
        const scrollContainer = document.querySelector('#admin-tab-kelola-turnover .overflow-x-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.goToTurnoverPage = goToTurnoverPage;
    window.renderAdminTurnoverTable = renderAdminTurnoverTable;

    function resetTurnoverPhotoModal() {
        const preview = document.getElementById('turnover-modal-foto-preview');
        const placeholder = document.getElementById('turnover-modal-foto-placeholder');
        const sizeBadge = document.getElementById('turnover-modal-foto-size');
        const removeBtn = document.getElementById('turnover-modal-foto-remove-btn');
        const fileInput = document.getElementById('turnover-modal-foto-file');
        const base64Input = document.getElementById('turnover-modal-foto-base64');
        const actionInput = document.getElementById('turnover-modal-foto-action');

        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
        if (sizeBadge) {
            sizeBadge.textContent = '0 KB / 25 KB';
            sizeBadge.classList.add('hidden');
        }
        if (removeBtn) removeBtn.classList.add('hidden');
        if (fileInput) fileInput.value = '';
        if (base64Input) base64Input.value = '';
        if (actionInput) actionInput.value = 'none';
    }

    function clearTurnoverPhotoSelection() {
        resetTurnoverPhotoModal();
        const actionInput = document.getElementById('turnover-modal-foto-action');
        if (actionInput) actionInput.value = 'delete';
    }

    function handleTurnoverPhotoSelected(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Pilih file gambar valid (JPG, PNG, WEBP).', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const result = cropAndCompressImageTo3x4(img, 300, 400, 25600);
                
                const preview = document.getElementById('turnover-modal-foto-preview');
                const placeholder = document.getElementById('turnover-modal-foto-placeholder');
                const sizeBadge = document.getElementById('turnover-modal-foto-size');
                const removeBtn = document.getElementById('turnover-modal-foto-remove-btn');
                const base64Input = document.getElementById('turnover-modal-foto-base64');
                const actionInput = document.getElementById('turnover-modal-foto-action');

                if (preview) {
                    preview.src = result.dataUrl;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (sizeBadge) {
                    const kb = (result.sizeInBytes / 1024).toFixed(1);
                    sizeBadge.textContent = `${kb} KB / 25 KB`;
                    sizeBadge.className = "text-[10px] font-mono font-bold text-emerald-600";
                    sizeBadge.classList.remove('hidden');
                }
                if (removeBtn) removeBtn.classList.remove('hidden');
                if (base64Input) base64Input.value = result.dataUrl;
                if (actionInput) actionInput.value = 'update';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    window.handleTurnoverPhotoSelected = handleTurnoverPhotoSelected;
    window.clearTurnoverPhotoSelection = clearTurnoverPhotoSelection;

    function openTurnoverModal(isEdit = false) {
        const modal = document.getElementById('turnover-form-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        document.getElementById('turnover-edit-mode').value = isEdit ? 'true' : 'false';
        document.getElementById('turnover-modal-title').textContent = isEdit ? 'Edit Data Turnover' : 'Tambah Data Turnover';
        resetTurnoverPhotoModal();
        if (!isEdit) {
            document.getElementById('turnover-edit-id').value = '';
            document.getElementById('turnover-noreg').value = '';
            document.getElementById('turnover-nama').value = '';
            document.getElementById('turnover-bagian').value = 'PAINTING';
            const kelasInput = document.getElementById('turnover-kelas');
            if (kelasInput) kelasInput.value = '';
            const daerahInput = document.getElementById('turnover-daerah');
            if (daerahInput) daerahInput.value = '';
            const sekolahInput = document.getElementById('turnover-sekolah');
            if (sekolahInput) sekolahInput.value = '';
            if (document.getElementById('turnover-tempat-lahir')) document.getElementById('turnover-tempat-lahir').value = '';
            if (document.getElementById('turnover-tanggal-lahir')) document.getElementById('turnover-tanggal-lahir').value = '';
            if (document.getElementById('turnover-telepon')) document.getElementById('turnover-telepon').value = '';
            if (document.getElementById('turnover-alamat')) document.getElementById('turnover-alamat').value = '';
            document.getElementById('turnover-alasan').value = 'Resign';
            document.getElementById('turnover-keterangan').value = '';
            const today = new Date();
            const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            document.getElementById('turnover-tgl-masuk').value = fmt(today);
            document.getElementById('turnover-tgl-keluar').value = fmt(today);
        }
        setTimeout(() => modal.querySelector('.glass-modal-card')?.classList?.replace('scale-95','scale-100'), 10);
    }

    function closeTurnoverModal() {
        const modal = document.getElementById('turnover-form-modal');
        if (modal) modal.classList.add('hidden');
        resetTurnoverPhotoModal();
    }

    function editTurnoverTrigger(idOrIdx) {
        let t = null;
        if (typeof idOrIdx === 'string') {
            t = (activeTurnoverData || []).find(x => String(x.id) === String(idOrIdx));
        } else {
            t = (activeTurnoverData || [])[idOrIdx];
        }
        if (!t) return;
        openTurnoverModal(true);
        document.getElementById('turnover-edit-id').value = t.id;
        document.getElementById('turnover-noreg').value = t.id;
        document.getElementById('turnover-nama').value = t.namaLengkap || '';
        const bagianSelect = document.getElementById('turnover-bagian');
        if (bagianSelect) {
            const targetBg = String(t.bagian || '').toLowerCase();
            let found = false;
            for (let opt of bagianSelect.options) {
                if (opt.value.toLowerCase() === targetBg) {
                    bagianSelect.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) bagianSelect.value = t.bagian || 'PAINTING';
        }

        const kelasInput = document.getElementById('turnover-kelas');
        if (kelasInput) kelasInput.value = t.kelas || '';
        const daerahInput = document.getElementById('turnover-daerah');
        if (daerahInput) daerahInput.value = t.asalDaerah || t.wilayah || t.asal || '';
        const sekolahInput = document.getElementById('turnover-sekolah');
        if (sekolahInput) sekolahInput.value = t.asalSekolah || t.sekolah || '';

        const std = (typeof rawSiswaData !== 'undefined' ? rawSiswaData : []).find(x => String(x.id) === String(t.id));
        if (document.getElementById('turnover-tempat-lahir')) document.getElementById('turnover-tempat-lahir').value = t.tempatLahir || (std ? std.tempatLahir : '') || '';
        if (document.getElementById('turnover-tanggal-lahir')) document.getElementById('turnover-tanggal-lahir').value = t.tanggalLahir || (std ? std.tanggalLahir : '') || '';
        if (document.getElementById('turnover-telepon')) document.getElementById('turnover-telepon').value = t.telepon || t.noTelp || (std ? (std.telepon || std.noTelp) : '') || '';
        if (document.getElementById('turnover-alamat')) document.getElementById('turnover-alamat').value = t.alamat || (std ? std.alamat : '') || '';

        const alasanSelect = document.getElementById('turnover-alasan');
        if (alasanSelect) {
            const targetAlasan = String(t.alasan || '').toLowerCase();
            let found = false;
            for (let opt of alasanSelect.options) {
                if (opt.value.toLowerCase() === targetAlasan) {
                    alasanSelect.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) alasanSelect.value = t.alasan || 'Resign';
        }

        document.getElementById('turnover-keterangan').value = t.keterangan || '';
        document.getElementById('turnover-tgl-masuk').value = t.masuk || '';
        document.getElementById('turnover-tgl-keluar').value = t.tanggalKeluar || '';

        // Tampilkan Pas Foto yang sudah tersimpan jika ada
        const photoUrl = t.foto || (typeof getStudentPhotoUrl === 'function' ? getStudentPhotoUrl(t.id) : '');
        if (photoUrl) {
            const preview = document.getElementById('turnover-modal-foto-preview');
            const placeholder = document.getElementById('turnover-modal-foto-placeholder');
            const removeBtn = document.getElementById('turnover-modal-foto-remove-btn');
            const actionInput = document.getElementById('turnover-modal-foto-action');
            if (preview && placeholder) {
                const testImg = new Image();
                testImg.onload = function() {
                    preview.src = photoUrl;
                    preview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    if (removeBtn) removeBtn.classList.remove('hidden');
                    if (actionInput) actionInput.value = 'none';
                };
                testImg.onerror = function() {
                    resetTurnoverPhotoModal();
                };
                testImg.src = photoUrl;
            }
        }
    }

    function saveTurnoverData() {
        const noreg = document.getElementById('turnover-noreg').value.trim();
        const nama = document.getElementById('turnover-nama').value.trim();
        const bagian = document.getElementById('turnover-bagian').value;
        const kelasVal = document.getElementById('turnover-kelas') ? document.getElementById('turnover-kelas').value.trim() : '';
        const daerahVal = document.getElementById('turnover-daerah') ? document.getElementById('turnover-daerah').value.trim() : '';
        const sekolahVal = document.getElementById('turnover-sekolah') ? document.getElementById('turnover-sekolah').value.trim() : '';
        const tempatLahirVal = document.getElementById('turnover-tempat-lahir') ? document.getElementById('turnover-tempat-lahir').value.trim() : '';
        const tglLahirVal = document.getElementById('turnover-tanggal-lahir') ? document.getElementById('turnover-tanggal-lahir').value : '';
        const teleponVal = document.getElementById('turnover-telepon') ? document.getElementById('turnover-telepon').value.trim() : '';
        const alamatVal = document.getElementById('turnover-alamat') ? document.getElementById('turnover-alamat').value.trim() : '';
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

        const payload = {
            NoReg: noreg, NamaLengkap: nama, Bagian: bagian,
            Kelas: kelasVal, AsalDaerah: daerahVal, Kota: daerahVal, AsalSekolah: sekolahVal, Sekolah: sekolahVal,
            TempatLahir: tempatLahirVal, TanggalLahir: tglLahirVal, Telepon: teleponVal, NoTelp: teleponVal, Alamat: alamatVal,
            TanggalMasuk: tglMasuk || null, TanggalKeluar: tglKeluar || null,
            Alasan: alasan, Keterangan: keterangan, isEdit, editId
        };

        const rpc = getRpcRunner();
        if (rpc) {
            showToast('Menyimpan data turnover...', 'info');
            rpc('saveTurnoverRecord', [payload])
                .then(async res => {
                    if (res && res.success !== false) {
                        const photoAction = document.getElementById('turnover-modal-foto-action')?.value;
                        const photoBase64 = document.getElementById('turnover-modal-foto-base64')?.value;

                        if (photoAction === 'update' && photoBase64) {
                            try {
                                const upRes = await rpc('uploadFotoSiswa', [{ noreg: noreg, photoBase64: photoBase64 }]);
                                if (upRes && upRes.success === false) {
                                    showToast('Turnover disimpan, tapi foto gagal: ' + (upRes.message || 'Error'), 'error');
                                } else {
                                    showToast('Data turnover & foto berhasil disimpan!', 'success');
                                }
                            } catch (pErr) {
                                console.warn('Gagal upload foto turnover:', pErr);
                                showToast('Turnover disimpan, tapi gagal upload foto: ' + (pErr.message || pErr), 'error');
                            }
                        } else if (photoAction === 'delete') {
                            try {
                                await rpc('deleteFotoSiswa', [{ noreg: noreg }]);
                                showToast('Data turnover disimpan & foto dihapus.', 'info');
                            } catch (pErr) {
                                console.warn('Gagal hapus foto turnover:', pErr);
                            }
                        } else {
                            showToast('Data turnover berhasil disimpan!', 'success');
                        }

                        // Perbarui data foto lokal jika ada
                        const targetPhoto = (photoAction === 'update' && photoBase64)
                            ? photoBase64
                            : (photoAction === 'delete' ? '' : (typeof getStudentPhotoUrl === 'function' ? getStudentPhotoUrl(noreg) : ''));

                        if (!isEdit) {
                            activeTurnoverData.unshift({
                                id: noreg, namaLengkap: nama, bagian, kelas: kelasVal, asalDaerah: daerahVal, wilayah: daerahVal, asalSekolah: sekolahVal, sekolah: sekolahVal,
                                tempatLahir: tempatLahirVal, tanggalLahir: tglLahirVal, telepon: teleponVal, noTelp: teleponVal, alamat: alamatVal,
                                alasan, keterangan, masuk: tglMasuk, tanggalKeluar: tglKeluar, foto: targetPhoto
                            });
                        } else {
                            const idx = activeTurnoverData.findIndex(t => t.id === editId);
                            if (idx !== -1) {
                                activeTurnoverData[idx] = { 
                                    ...activeTurnoverData[idx], 
                                    id: noreg, namaLengkap: nama, bagian, kelas: kelasVal, asalDaerah: daerahVal, wilayah: daerahVal, asalSekolah: sekolahVal, sekolah: sekolahVal,
                                    tempatLahir: tempatLahirVal, tanggalLahir: tglLahirVal, telepon: teleponVal, noTelp: teleponVal, alamat: alamatVal,
                                    alasan, keterangan, masuk: tglMasuk, tanggalKeluar: tglKeluar,
                                    foto: targetPhoto || activeTurnoverData[idx].foto
                                };
                            }
                        }

                        closeTurnoverModal();
                        if (typeof loadDashboardData === 'function') loadDashboardData();
                        else renderAdminTurnoverTable();
                    } else {
                        showToast('Gagal menyimpan data turnover: ' + (res?.message || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    showToast('Gagal menyimpan: ' + (err.message || err.toString()), 'error');
                });
            return;
        }

        if (typeof google !== 'undefined') {
            google.script.run.withSuccessHandler(res => {
                if (res.success) {
                    showToast('Data turnover berhasil disimpan!');
                    closeTurnoverModal();
                    loadDashboardData();
                    setTimeout(() => renderAdminTurnoverTable(), 1000);
                } else {
                    showToast('Gagal menyimpan: ' + (res.message || 'Unknown error'), 'error');
                }
            }).withFailureHandler(err => {
                showToast('Gagal menyimpan data turnover: ' + (err.message || err.toString()), 'error');
            }).saveTurnoverRecord(payload);
        } else {
            if (!isEdit) {
                activeTurnoverData.unshift({
                    id: noreg, namaLengkap: nama, bagian, kelas: kelasVal, asalDaerah: daerahVal, wilayah: daerahVal, asalSekolah: sekolahVal, sekolah: sekolahVal,
                    tempatLahir: tempatLahirVal, tanggalLahir: tglLahirVal, telepon: teleponVal, noTelp: teleponVal, alamat: alamatVal,
                    alasan, keterangan, masuk: tglMasuk, tanggalKeluar: tglKeluar
                });
            } else {
                const idx = activeTurnoverData.findIndex(t => t.id === editId);
                if (idx !== -1) {
                    activeTurnoverData[idx] = { 
                        ...activeTurnoverData[idx], 
                        id: noreg, namaLengkap: nama, bagian, kelas: kelasVal, asalDaerah: daerahVal, wilayah: daerahVal, asalSekolah: sekolahVal, sekolah: sekolahVal,
                        tempatLahir: tempatLahirVal, tanggalLahir: tglLahirVal, telepon: teleponVal, noTelp: teleponVal, alamat: alamatVal,
                        alasan, keterangan, masuk: tglMasuk, tanggalKeluar: tglKeluar 
                    };
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
                const rpc = getRpcRunner();
                if (rpc) {
                    showToast('Menghapus data turnover...', 'info');
                    rpc('deleteTurnoverRecord', [id])
                        .then(res => {
                            if (res && res.success !== false) {
                                showToast('Data turnover berhasil dihapus.', 'success');
                                const idx = activeTurnoverData.findIndex(t => t.id === id);
                                if (idx !== -1) activeTurnoverData.splice(idx, 1);
                                if (typeof loadDashboardData === 'function') loadDashboardData();
                                else renderAdminTurnoverTable();
                            } else {
                                showToast('Gagal menghapus: ' + (res?.message || 'Unknown error'), 'error');
                            }
                        })
                        .catch(err => {
                            showToast('Gagal menghapus: ' + (err.message || err.toString()), 'error');
                        });
                    return;
                }

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

    let populasiCurrentPage = 1;
    const POPULASI_PAGE_SIZE = 25;

    function renderAdminPopulasiTable(resetPage = false) {
        if (resetPage === true) {
            populasiCurrentPage = 1;
        }
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
                    <td colspan="10" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada data populasi ditemukan.</td>
                </tr>
            `;
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'populasi-pagination-info',
                    controlsId: 'populasi-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: POPULASI_PAGE_SIZE,
                    goToPageFn: 'goToPopulasiPage',
                    itemLabel: 'hari',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / POPULASI_PAGE_SIZE));
        if (populasiCurrentPage > totalPages) populasiCurrentPage = totalPages;
        if (populasiCurrentPage < 1) populasiCurrentPage = 1;

        const startIndex = (populasiCurrentPage - 1) * POPULASI_PAGE_SIZE;
        const endIndex = Math.min(startIndex + POPULASI_PAGE_SIZE, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        pageItems.forEach(p => {
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
                <td class="py-3 px-4 text-slate-700 font-bold">${p.order !== undefined && p.order !== null ? p.order : '-'}</td>
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

        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'populasi-pagination-info',
                controlsId: 'populasi-pagination-controls',
                currentPage: populasiCurrentPage,
                totalItems: totalItems,
                pageSize: POPULASI_PAGE_SIZE,
                goToPageFn: 'goToPopulasiPage',
                itemLabel: 'hari',
                themeColor: '#0B3B82'
            });
        }
    }

    function goToPopulasiPage(page) {
        populasiCurrentPage = page;
        renderAdminPopulasiTable(false);
        const scrollContainer = document.querySelector('#admin-tab-kelola-populasi .overflow-x-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.goToPopulasiPage = goToPopulasiPage;
    window.renderAdminPopulasiTable = renderAdminPopulasiTable;

    function formatToYYYYMMDD(str) {
        if (!str) return '';
        str = String(str).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const partsSlash = str.split('/');
        if (partsSlash.length === 3) {
            if (partsSlash[0].length === 4) return `${partsSlash[0]}-${partsSlash[1].padStart(2,'0')}-${partsSlash[2].padStart(2,'0')}`;
            return `${partsSlash[2]}-${partsSlash[1].padStart(2,'0')}-${partsSlash[0].padStart(2,'0')}`;
        }
        const partsDash = str.split('-');
        if (partsDash.length === 3 && partsDash[0].length !== 4) {
            return `${partsDash[2]}-${partsDash[1].padStart(2,'0')}-${partsDash[0].padStart(2,'0')}`;
        }
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return str;
    }

    function openPopulasiModal(editMode = false, tanggal = '') {
        const modal = document.getElementById('populasi-form-modal');
        const title = document.getElementById('populasi-modal-title');
        const tglInput = document.getElementById('populasi-tanggal');
        
        document.getElementById('populasi-edit-mode').value = editMode ? 'true' : 'false';
        const isoDate = formatToYYYYMMDD(tanggal);

        if (tglInput) {
            tglInput.dataset.rawDate = isoDate || tanggal;
        }

        if (editMode) {
            title.innerText = "Edit Data Populasi";
            if (tglInput) {
                tglInput.value = isoDate || tanggal;
                tglInput.disabled = true; // Tanggal bertindak sebagai ID, tidak bisa diubah pas edit
            }
            
            const p = rawPopulasiData.find(x => x.tanggal === tanggal || formatToYYYYMMDD(x.tanggal) === isoDate);
            if (p) {
                document.getElementById('populasi-kontrak').value = p.kontrak;
                if (document.getElementById('populasi-ltc')) {
                    document.getElementById('populasi-ltc').value = p.ltc !== undefined ? p.ltc : (p.totalLtc || '');
                }
                document.getElementById('populasi-outsourcing').value = p.outsourcing;
                document.getElementById('populasi-satpam-supir').value = p.satpamSupir;
                const orderInput = document.getElementById('populasi-order');
                if (orderInput) orderInput.value = p.order !== undefined && p.order !== null ? p.order : '';
            }
        } else {
            title.innerText = "Tambah Data Populasi";
            if (tglInput) {
                tglInput.value = '';
                tglInput.disabled = false;
            }
            document.getElementById('populasi-kontrak').value = '100';
            if (document.getElementById('populasi-ltc')) {
                document.getElementById('populasi-ltc').value = '';
            }
            document.getElementById('populasi-outsourcing').value = '10';
            document.getElementById('populasi-satpam-supir').value = '5';
            const orderInput = document.getElementById('populasi-order');
            if (orderInput) orderInput.value = '';
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
        const tglInput = document.getElementById('populasi-tanggal');
        let tanggal = tglInput ? (tglInput.value || tglInput.dataset.rawDate) : '';
        tanggal = formatToYYYYMMDD(tanggal);

        const kontrak = parseInt(document.getElementById('populasi-kontrak').value) || 0;
        const ltcInput = document.getElementById('populasi-ltc');
        const rawLtc = ltcInput ? parseInt(ltcInput.value) : NaN;
        const ltc = isNaN(rawLtc) ? null : rawLtc;
        const outsourcing = parseInt(document.getElementById('populasi-outsourcing').value) || 0;
        const satpamSupir = parseInt(document.getElementById('populasi-satpam-supir').value) || 0;
        const rawOrder = document.getElementById('populasi-order') ? parseInt(document.getElementById('populasi-order').value) : NaN;
        const order = isNaN(rawOrder) ? null : rawOrder;
        
        if (!tanggal) {
            showToast('Tanggal wajib diisi.', 'error');
            return;
        }

        const payload = { tanggal, kontrak, ltc, totalLtc: ltc, outsourcing, satpamSupir, order };

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
            const idx = rawPopulasiData.findIndex(x => x.tanggal === tanggal || formatToYYYYMMDD(x.tanggal) === tanggal);
            if (idx !== -1) {
                const finalLtc = ltc !== null ? ltc : rawPopulasiData[idx].ltc;
                rawPopulasiData[idx] = { 
                    ...rawPopulasiData[idx], 
                    kontrak, 
                    ltc: finalLtc,
                    totalLtc: finalLtc,
                    outsourcing, 
                    satpamSupir,
                    order,
                    totalKaryawan: kontrak + finalLtc + outsourcing + satpamSupir
                };
                showToast('Mode Preview: Data populasi berhasil diperbarui.');
            } else {
                // Di pratinjau lokal, jumlah LTC adalah input ltc atau panjang rawSiswaData
                const ltcCount = ltc !== null ? ltc : (rawSiswaData.length || 29); 
                rawPopulasiData.push({
                    tanggal,
                    kontrak,
                    ltc: ltcCount,
                    outsourcing,
                    satpamSupir,
                    order,
                    totalKaryawan: kontrak + ltcCount + outsourcing + satpamSupir,
                    totalLtc: ltcCount
                });
                showToast('Mode Preview: Data populasi baru berhasil ditambahkan.');
            }
            closePopulasiModal();
            renderAdminPopulasiTable();
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

    // ============================================================
    // EXPORT TO EXCEL FITUR UNTUK 6 TAB ADMIN
    // ============================================================
    window.exportDataArrayToExcel = function(headers, rows, fileName, sheetName = 'Sheet1') {
        if (typeof XLSX !== 'undefined') {
            const wsData = [headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            XLSX.writeFile(wb, fileName);
            if (typeof showToast === 'function') showToast(`Berhasil mengeksport file ${fileName}`);
        } else {
            let csvContent = '\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\n';
            rows.forEach(row => {
                csvContent += row.map(v => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`).join(',') + '\n';
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName.replace('.xlsx', '.csv'));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (typeof showToast === 'function') showToast(`Berhasil mengeksport data ke file CSV (${fileName.replace('.xlsx', '.csv')})`);
        }
    };

    window.exportAdminAkunToExcel = function() {
        const doExport = (usersList) => {
            const headers = ['User ID', 'Nama Lengkap', 'Email / Username', 'Role', 'NoReg', 'Password', 'Status'];
            let rows = (usersList || []).map(u => {
                let passwordHint = u.password || '-';
                if (!u.password || u.password === '-') {
                    const roleUpper = String(u.role || '').toUpperCase();
                    const noreg = u.nomorRegistrasi || u.noreg || '';
                    if (roleUpper === 'SISWA' && noreg) passwordHint = `${noreg}IPG`;
                    else if (roleUpper === 'ADMIN') passwordHint = 'admin123';
                    else if (roleUpper === 'VISITOR') passwordHint = 'visitor123';
                }

                return [
                    u.id || u.user_id || '-',
                    u.namaLengkap || u.nama_lengkap || u.nama || '-',
                    u.email || u.username || '-',
                    u.role || u.Role || '-',
                    u.nomorRegistrasi || u.noreg || '-',
                    passwordHint,
                    u.status || 'AKTIF'
                ];
            });

            if (rows.length === 0) {
                const tbody = document.getElementById('admin-tbody');
                if (tbody) {
                    const trs = tbody.querySelectorAll('tr');
                    trs.forEach(tr => {
                        const tds = tr.querySelectorAll('td');
                        if (tds.length >= 6) {
                            rows.push([
                                tds[0]?.innerText?.trim() || '-',
                                tds[1]?.innerText?.trim() || '-',
                                tds[2]?.innerText?.trim() || '-',
                                tds[3]?.innerText?.trim() || '-',
                                tds[4]?.innerText?.trim() || '-',
                                tds[5]?.innerText?.trim() || '-',
                                'AKTIF'
                            ]);
                        }
                    });
                }
            }

            exportDataArrayToExcel(headers, rows, 'Data_Manajemen_Akun_LTC.xlsx', 'Manajemen Akun');
        };

        if (rawUsersData && rawUsersData.length > 0) {
            doExport(rawUsersData);
        } else {
            showToast('Menyiapkan data ekspor akun...', 'info');
            const rpc = getRpcRunner();
            if (rpc) {
                rpc('getUsersList', [])
                    .then(data => {
                        rawUsersData = data || [];
                        doExport(rawUsersData);
                    })
                    .catch(err => {
                        console.error('Error fetching users for export:', err);
                        doExport(typeof fallbackUsers !== 'undefined' ? fallbackUsers : []);
                    });
            } else {
                doExport(typeof fallbackUsers !== 'undefined' ? fallbackUsers : []);
            }
        }
    };

    window.exportAdminSiswaToExcel = function() {
        const headers = ['NoReg', 'Nama Lengkap', 'Departemen', 'Section', 'HK', 'Kelas', 'Masuk LTC', 'Distribusi', 'Akhir LTC', 'SPV', 'Daerah Asal', 'Sekolah'];
        const rows = (activeData || []).map(s => [
            s.id || '-',
            s.namaLengkap || '-',
            s.departemen || 'PRODUKSI',
            s.section || s.bagian || '-',
            s.hk || s.hariKerja || '6 HARI',
            typeof hitungKelas === 'function' ? hitungKelas(s) : (s.kelas || 'Kelas 1'),
            s.masuk || s.tanggalMasuk || '-',
            s.distribusi || '-',
            s.tanggalKeluar || s.keluar || '-',
            s.spv || '-',
            s.daerahAsal || s.asalDaerah || '-',
            s.asalSekolah || '-'
        ]);
        exportDataArrayToExcel(headers, rows, 'Data_Manajemen_Siswa_Aktif_LTC.xlsx', 'Siswa Aktif');
    };

    window.exportAdminManpowerToExcel = function() {
        const headers = ['Tanggal', 'NoReg', 'Nama Siswa', 'Bagian / Section', 'Kehadiran', 'Shift', 'Mesin', 'Target / Plan', 'Hasil / Actual', 'Reject', 'SPV', 'Keterangan'];
        const rows = [];
        (activeData || []).forEach(s => {
            (s.dailyRecords || []).forEach(r => {
                rows.push([
                    r.dateStr || '-',
                    s.id || '-',
                    s.namaLengkap || '-',
                    s.bagian || s.section || '-',
                    r.hadir || 'Hadir',
                    r.shift || '-',
                    r.mesin || '-',
                    r.plan !== null && r.plan !== undefined ? r.plan : '-',
                    r.actual !== null && r.actual !== undefined ? r.actual : '-',
                    r.reject !== null && r.reject !== undefined ? r.reject : '-',
                    r.spv || s.spv || '-',
                    r.keterangan || '-'
                ]);
            });
        });
        exportDataArrayToExcel(headers, rows, 'Data_Log_Manpower_Harian_LTC.xlsx', 'Log Manpower');
    };

    window.exportAdminTurnoverToExcel = function() {
        const headers = ['NoReg', 'Nama Lengkap', 'Bagian / Section', 'Kelas', 'Kota / Daerah', 'Sekolah Asal', 'Tempat, Tanggal Lahir', 'Alamat', 'No. Telepon', 'Tgl Masuk', 'Tgl Keluar', 'Tipe Turnover / Alasan', 'Keterangan'];
        const rows = (activeTurnoverData || []).map(s => {
            const std = (typeof rawSiswaData !== 'undefined' ? rawSiswaData : []).find(x => String(x.id) === String(s.id));
            const tempatLahir = s.tempatLahir || (std ? std.tempatLahir : '') || '';
            const tanggalLahir = s.tanggalLahir || (std ? std.tanggalLahir : '') || '';
            const ttl = tanggalLahir ? (tempatLahir ? tempatLahir + ', ' : '') + tanggalLahir.split('-').reverse().join('/') : (tempatLahir || '-');
            const alamat = s.alamat || (std ? std.alamat : '') || '-';
            const telp = s.telepon || s.noTelp || s.no_telp || (std ? (std.telepon || std.noTelp || std.no_telp) : '') || '-';

            return [
                s.id || '-',
                s.namaLengkap || '-',
                s.bagian || s.section || '-',
                s.kelas || 'Kelas 1',
                s.daerahAsal || s.asalDaerah || s.wilayah || '-',
                s.asalSekolah || '-',
                ttl,
                alamat,
                telp,
                s.masuk || s.tanggalMasuk || '-',
                s.tanggalKeluar || s.keluar || '-',
                s.tipeTurnover || s.alasan || '-',
                s.keterangan || '-'
            ];
        });
        exportDataArrayToExcel(headers, rows, 'Data_Kelola_Turnover_LTC.xlsx', 'Kelola Turnover');
    };

    window.exportAdminPopulasiToExcel = function() {
        const headers = ['Tanggal Rekap', 'Karyawan Kontrak', 'LTC', 'Outsourcing', 'Satpam & Supir', 'Total Karyawan MP', 'Total LTC', 'Persentase LTC %', 'Order'];
        const rows = (rawPopulasiData || []).map(p => {
            const totK = p.totalKaryawan || 146;
            const totL = p.totalLtc || 30;
            const pct = totK > 0 ? ((totL / totK) * 100).toFixed(2) + '%' : '0%';
            return [
                p.tanggal || '-',
                p.kontrak || '-',
                p.ltc || '-',
                p.outsourcing || '-',
                p.satpamSupir || '-',
                totK,
                totL,
                pct,
                p.order || '-'
            ];
        });
        exportDataArrayToExcel(headers, rows, 'Data_Kelola_Populasi_LTC.xlsx', 'Kelola Populasi');
    };

    window.exportAdminK3ToExcel = function() {
        const headers = ['Tanggal', 'NoReg', 'Nama Siswa', 'Kelas', 'Section', 'SPV', 'Jenis Kecelakaan', 'Kategori', 'Keterangan'];
        const rows = (safetyIncidentsData || []).map(i => [
            i.tanggal || '-',
            i.studentId || i.noreg || '-',
            i.namaSiswa || i.namaLengkap || '-',
            i.kelas || '-',
            i.section || i.bagian || '-',
            i.spv || '-',
            i.jenisKecelakaan || '-',
            i.kategori || '-',
            i.keterangan || '-'
        ]);
        exportDataArrayToExcel(headers, rows, 'Data_Manajemen_K3_LTC.xlsx', 'Manajemen K3');
    };

    // ============================================================
    // FITUR SERTIFIKAT SISWA LTC (ADMIN ONLY)
    // ============================================================

    function formatIndoDate(dateStr) {
        if (!dateStr) return '';
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const mon = parseInt(parts[1], 10) - 1;
                const yr = parseInt(parts[2], 10);
                if (!isNaN(day) && !isNaN(mon) && !isNaN(yr)) {
                    return `${day} ${months[mon] || ''} ${yr}`;
                }
            }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    // CACHE LOKAL BROWSER (PERSISTENSI PENILAIAN SERTIFIKAT)
    function loadLocalCertCache() {
        try {
            const raw = localStorage.getItem('ltc_cert_cache');
            if (raw) return JSON.parse(raw) || {};
        } catch (e) {}
        return {};
    }

    function saveLocalCertCache(map) {
        try {
            if (map && typeof map === 'object') {
                localStorage.setItem('ltc_cert_cache', JSON.stringify(map));
            }
        } catch (e) {}
    }

    var certRecordsMap = loadLocalCertCache();

    function openCertificateModal(studentId) {
        const modal = document.getElementById('modal-sertifikat-siswa');
        if (!modal) return;

        // Cari siswa di activeData atau rawTurnoverData
        const s = (activeData || []).find(std => String(std.id) === String(studentId)) ||
                  (rawTurnoverData || []).find(std => String(std.id) === String(studentId)) ||
                  (rawSiswaData || []).find(std => String(std.id) === String(studentId));

        if (!s) {
            showToast('Data siswa tidak ditemukan.', 'error');
            return;
        }

        if (typeof isStudentIneligibleForCertificate === 'function' && isStudentIneligibleForCertificate(s)) {
            showToast(`Siswa ${s.namaLengkap || studentId} berstatus Resign / Indisipliner sehingga tidak berhak mendapatkan sertifikat.`, 'warning');
            return;
        }

        // Set biodata
        document.getElementById('cert-noreg').value = s.id;
        const badgeNoreg = document.getElementById('cert-badge-noreg');
        if (badgeNoreg) badgeNoreg.textContent = s.id;
        
        const namaEl = document.getElementById('cert-display-nama');
        if (namaEl) namaEl.textContent = s.namaLengkap || '-';

        const deptEl = document.getElementById('cert-display-dept');
        if (deptEl) deptEl.textContent = `${s.departemen || 'PRODUKSI'} • ${s.section || s.bagian || '-'}`;

        const tglMasukStr = s.masuk || s.tanggalMasuk || '';
        const tglKeluarStr = s.tanggalKeluar || s.keluar || '';
        const textPeriode = (tglMasukStr ? tglMasukStr.split('-').reverse().join('/') : '-') + 
                            ' s.d ' + 
                            (tglKeluarStr ? tglKeluarStr.split('-').reverse().join('/') : '-');
        const dispPeriode = document.getElementById('cert-display-periode-text');
        if (dispPeriode) dispPeriode.textContent = textPeriode;

        // Foto preview
        const fotoImg = document.getElementById('cert-foto-preview');
        const fotoPlc = document.getElementById('cert-foto-placeholder');
        const candidatePhotoUrl = s.foto || (typeof getStudentPhotoUrl === 'function' ? getStudentPhotoUrl(s.id) : '');
        if (candidatePhotoUrl && fotoImg) {
            fotoImg.onload = function() {
                fotoImg.classList.remove('hidden');
                if (fotoPlc) fotoPlc.classList.add('hidden');
            };
            fotoImg.onerror = function() {
                fotoImg.classList.add('hidden');
                if (fotoPlc) fotoPlc.classList.remove('hidden');
            };
            fotoImg.src = candidatePhotoUrl + (candidatePhotoUrl.includes('?') ? '' : `?t=${Date.now()}`);
        } else if (fotoImg) {
            fotoImg.src = '';
            fotoImg.classList.add('hidden');
            if (fotoPlc) fotoPlc.classList.remove('hidden');
        }

        // Default Nomor Sertifikat
        const yearNow = new Date().getFullYear();
        const noregSuffix = String(s.id || '0000').slice(-3);
        const defaultNoSertifikat = `${noregSuffix}/LTC/17-G/V/${yearNow}`;
        document.getElementById('cert-nomor-sertifikat').value = defaultNoSertifikat;

        // Tempat, Tanggal Lahir
        let ttlStr = '';
        if (s.tempatLahir && s.tanggalLahir) {
            ttlStr = `${s.tempatLahir}, ${formatIndoDate(s.tanggalLahir)}`;
        } else if (s.tanggalLahir) {
            ttlStr = formatIndoDate(s.tanggalLahir);
        } else if (s.daerahAsal || s.asalDaerah) {
            ttlStr = `${s.daerahAsal || s.asalDaerah}, -`;
        }
        document.getElementById('cert-ttl').value = ttlStr;

        // Periode Pelatihan (dalam teks formal sertifikat)
        let formalPeriode = '';
        if (tglMasukStr && tglKeluarStr) {
            formalPeriode = `${formatIndoDate(tglMasukStr)} s.d ${formatIndoDate(tglKeluarStr)}`;
        } else {
            formalPeriode = '17 November 2025 s.d 16 April 2026';
        }
        document.getElementById('cert-periode').value = formalPeriode;

        // Kota & Tanggal Terbit Sertifikat
        const todayIndo = formatIndoDate(new Date());
        document.getElementById('cert-tgl-terbit').value = `Gresik, ${todayIndo}`;

        // Reset Form Nilai Sementara
        document.getElementById('cert-nilai-basic-theory').value = '';
        document.getElementById('cert-nilai-vocational').value = '';
        document.getElementById('cert-nilai-performance').value = '';
        document.getElementById('cert-nilai-user-obs').value = '';
        document.getElementById('cert-nilai-bmk').value = '';
        document.getElementById('cert-nilai-attendance').value = '';
        document.getElementById('cert-nilai-attitude').value = '';
        document.getElementById('cert-nilai-laporan').value = '';

        // Auto-fill performa & absensi awal
        autoFillPerformanceScore(false);
        autoFillAttendanceScore(false);

        const populateFromData = (d) => {
            if (!d) return;
            if (d.nomor_sertifikat) document.getElementById('cert-nomor-sertifikat').value = d.nomor_sertifikat;
            if (d.tempat_tanggal_lahir) document.getElementById('cert-ttl').value = d.tempat_tanggal_lahir;
            if (d.periode_pelatihan) document.getElementById('cert-periode').value = d.periode_pelatihan;
            if (d.tanggal_terbit || d.tanggal_cetak) document.getElementById('cert-tgl-terbit').value = d.tanggal_terbit || d.tanggal_cetak;
            
            const bTheory = d.basic_theory ?? d.nilai_basic_theory;
            if (bTheory !== null && bTheory !== undefined && bTheory !== '') document.getElementById('cert-nilai-basic-theory').value = bTheory;

            const vTheory = d.vocational_theory ?? d.nilai_vocational;
            if (vTheory !== null && vTheory !== undefined && vTheory !== '') document.getElementById('cert-nilai-vocational').value = vTheory;

            const perf = d.performance ?? d.nilai_performance;
            if (perf !== null && perf !== undefined && perf !== '') document.getElementById('cert-nilai-performance').value = perf;

            const uObs = d.user_observation ?? d.nilai_user_observation;
            if (uObs !== null && uObs !== undefined && uObs !== '') document.getElementById('cert-nilai-user-obs').value = uObs;

            const bmk = d.bmk ?? d.nilai_bmk;
            if (bmk !== null && bmk !== undefined && bmk !== '') document.getElementById('cert-nilai-bmk').value = bmk;

            const att = d.attendance ?? d.nilai_attendance;
            if (att !== null && att !== undefined && att !== '') document.getElementById('cert-nilai-attendance').value = att;

            const attit = d.attitude ?? d.nilai_attitude;
            if (attit !== null && attit !== undefined && attit !== '') document.getElementById('cert-nilai-attitude').value = attit;

            const lap = d.laporan ?? d.nilai_laporan_akhir;
            if (lap !== null && lap !== undefined && lap !== '') document.getElementById('cert-nilai-laporan').value = lap;

            recalculateCertificateScores();
        };

        // Langsung tampilkan dari cache memori jika sudah pernah dimuat
        const cachedCert = certRecordsMap[String(s.id).trim()];
        if (cachedCert) {
            populateFromData(cachedCert);
        }

        // Ambil data sertifikat tersimpan dari database via RPC
        const rpc = getRpcRunner();
        if (rpc) {
            rpc('getSertifikatByNoreg', [s.id])
                .then(res => {
                    if (res && res.success && res.data) {
                        const serverTime = new Date(res.data.updated_at || 0).getTime();
                        const localTime = new Date(cachedCert?.updated_at || 0).getTime();
                        if (!cachedCert || serverTime >= localTime) {
                            populateFromData(res.data);
                            certRecordsMap[String(s.id).trim()] = res.data;
                            saveLocalCertCache(certRecordsMap);
                        } else if (cachedCert) {
                            populateFromData(cachedCert);
                        }
                    } else if (cachedCert) {
                        populateFromData(cachedCert);
                    }
                    recalculateCertificateScores();
                })
                .catch(err => {
                    console.warn('Info load sertifikat:', err.message);
                    if (cachedCert) populateFromData(cachedCert);
                    recalculateCertificateScores();
                });
        } else {
            recalculateCertificateScores();
        }

        modal.classList.remove('hidden');
    }

    function closeCertificateModal() {
        const modal = document.getElementById('modal-sertifikat-siswa');
        if (modal) modal.classList.add('hidden');
    }

    function autoFillPerformanceScore(triggerToast = true) {
        const noreg = document.getElementById('cert-noreg')?.value;
        if (!noreg) return;

        const s = (activeData || []).find(std => String(std.id) === String(noreg));
        let score = 90.0;

        if (s) {
            const recs = s.dailyRecords || [];
            let totalActual = 0;
            let totalPlan = 0;

            recs.forEach(r => {
                if (r.plan && r.plan > 0 && r.actual !== null && r.actual !== undefined) {
                    totalPlan += r.plan;
                    totalActual += r.actual;
                }
            });

            if (totalPlan > 0) {
                score = Math.min(100, Math.max(0, Math.round((totalActual / totalPlan) * 1000) / 10));
            } else if (s.percent !== undefined && s.percent !== null && !isNaN(s.percent)) {
                score = Math.min(100, Math.max(0, parseFloat(s.percent)));
            } else {
                score = 90.0;
            }
        }

        const input = document.getElementById('cert-nilai-performance');
        if (input) {
            input.value = score.toFixed(1);
            recalculateCertificateScores();
            if (triggerToast && typeof showToast === 'function') {
                showToast(`Nilai Performa ${score.toFixed(1)} berhasil diisi otomatis!`, 'info');
            }
        }
    }

    function autoFillAttendanceScore(triggerToast = true) {
        const noreg = document.getElementById('cert-noreg')?.value;
        if (!noreg) return;

        const s = (activeData || []).find(std => String(std.id) === String(noreg));
        let score = 100.0;

        if (s && s.dailyRecords && s.dailyRecords.length > 0) {
            let totalDays = 0;
            let hadirDays = 0;
            s.dailyRecords.forEach(r => {
                const h = String(r.hadir || '').toUpperCase();
                if (h !== 'OFF' && h !== 'LIBUR') {
                    totalDays++;
                    if (h === '✔' || h === 'HADIR' || h === 'TRUE') {
                        hadirDays++;
                    }
                }
            });
            if (totalDays > 0) {
                score = Math.min(100, Math.max(0, Math.round((hadirDays / totalDays) * 1000) / 10));
            }
        } else {
            score = 100.0;
        }

        const input = document.getElementById('cert-nilai-attendance');
        if (input) {
            input.value = score.toFixed(1);
            recalculateCertificateScores();
            if (triggerToast && typeof showToast === 'function') {
                showToast(`Nilai Kehadiran ${score.toFixed(1)}% berhasil diisi otomatis!`, 'info');
            }
        }
    }

    function recalculateCertificateScores() {
        const parse = (id) => {
            const raw = String(document.getElementById(id)?.value || '').replace(',', '.').trim();
            const val = parseFloat(raw);
            return isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
        };

        // I. Kinerja (Bobot 40%): Average of Basic Theory, Vocational, Performance, User Obs
        const basicTheory = parse('cert-nilai-basic-theory');
        const vocational = parse('cert-nilai-vocational');
        const performance = parse('cert-nilai-performance');
        const userObs = parse('cert-nilai-user-obs');

        const avgKinerja = (basicTheory + vocational + performance + userObs) / 4;
        const subtotalKinerja = (avgKinerja * 0.40);
        const badgeKinerja = document.getElementById('cert-badge-subtotal-kinerja');
        if (badgeKinerja) badgeKinerja.textContent = `Subtotal: ${subtotalKinerja.toFixed(2)} / 40.0`;

        // II. BMK (Bobot 30%): 5R, Safety & Kaizen
        const bmk = parse('cert-nilai-bmk');
        const subtotalBmk = (bmk * 0.30);
        const badgeBmk = document.getElementById('cert-badge-subtotal-bmk');
        if (badgeBmk) badgeBmk.textContent = `${subtotalBmk.toFixed(2)} / 30.0`;

        // III. Sikap (Bobot 20%): Average of Attendance & Attitude
        const attendance = parse('cert-nilai-attendance');
        const attitude = parse('cert-nilai-attitude');
        const avgSikap = (attendance + attitude) / 2;
        const subtotalSikap = (avgSikap * 0.20);
        const badgeSikap = document.getElementById('cert-badge-subtotal-sikap');
        if (badgeSikap) badgeSikap.textContent = `${subtotalSikap.toFixed(2)} / 20.0`;

        // IV. Laporan (Bobot 10%): Presentasi Laporan
        const laporan = parse('cert-nilai-laporan');
        const subtotalLaporan = (laporan * 0.10);
        const badgeLaporan = document.getElementById('cert-badge-subtotal-laporan');
        if (badgeLaporan) badgeLaporan.textContent = `${subtotalLaporan.toFixed(2)} / 10.0`;

        // Total Nilai Akhir
        const nilaiAkhir = subtotalKinerja + subtotalBmk + subtotalSikap + subtotalLaporan;
        const dispNilaiAkhir = document.getElementById('cert-display-nilai-akhir');
        if (dispNilaiAkhir) dispNilaiAkhir.textContent = nilaiAkhir.toFixed(1);

        // Predikat Kelulusan
        let predikat = 'Kurang (D)';
        let badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-400/30';
        if (nilaiAkhir >= 90) {
            predikat = 'Sangat Baik (A)';
            badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
        } else if (nilaiAkhir >= 80) {
            predikat = 'Baik (B)';
            badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-400/30';
        } else if (nilaiAkhir >= 70) {
            predikat = 'Cukup (C)';
            badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
        }

        const dispPredikat = document.getElementById('cert-display-predikat');
        if (dispPredikat) {
            dispPredikat.textContent = predikat;
            dispPredikat.className = `px-3 py-1 rounded-xl text-xs font-bold border ${badgeClass}`;
        }

        return {
            avgKinerja, subtotalKinerja,
            bmk, subtotalBmk,
            avgSikap, subtotalSikap,
            laporan, subtotalLaporan,
            nilaiAkhir, predikat
        };
    }

    async function saveCertificateData(showFeedback = true) {
        const noreg = document.getElementById('cert-noreg')?.value;
        if (!noreg) {
            if (showFeedback && typeof showToast === 'function') showToast('NoReg siswa tidak valid.', 'error');
            return null;
        }

        const sTarget = (activeData || []).find(std => String(std.id) === String(noreg)) ||
                        (typeof activeTurnoverData !== 'undefined' ? activeTurnoverData : []).find(std => String(std.id) === String(noreg)) ||
                        (rawSiswaData || []).find(std => String(std.id) === String(noreg));

        if (sTarget && typeof isStudentIneligibleForCertificate === 'function' && isStudentIneligibleForCertificate(sTarget)) {
            if (showFeedback && typeof showToast === 'function') {
                showToast(`Siswa ${sTarget.namaLengkap || noreg} berstatus Resign / Indisipliner (tidak berhak mendapatkan sertifikat).`, 'warning');
            }
            return null;
        }

        const calc = recalculateCertificateScores();
        const parseNum = (id) => {
            const raw = String(document.getElementById(id)?.value || '').replace(',', '.').trim();
            const val = parseFloat(raw);
            return isNaN(val) ? 0 : val;
        };

        const nowIso = new Date().toISOString();
        const payload = {
            noreg: noreg,
            nomor_sertifikat: document.getElementById('cert-nomor-sertifikat')?.value || '',
            tempat_tanggal_lahir: document.getElementById('cert-ttl')?.value || '',
            periode_pelatihan: document.getElementById('cert-periode')?.value || '',
            tanggal_terbit: document.getElementById('cert-tgl-terbit')?.value || '',
            basic_theory: parseNum('cert-nilai-basic-theory'),
            vocational_theory: parseNum('cert-nilai-vocational'),
            performance: parseNum('cert-nilai-performance'),
            user_observation: parseNum('cert-nilai-user-obs'),
            kinerja_subtotal: calc.subtotalKinerja,
            subtotal_kinerja: calc.subtotalKinerja,
            bmk: parseNum('cert-nilai-bmk'),
            bmk_subtotal: calc.subtotalBmk,
            subtotal_bmk: calc.subtotalBmk,
            attendance: parseNum('cert-nilai-attendance'),
            attitude: parseNum('cert-nilai-attitude'),
            sikap_subtotal: calc.subtotalSikap,
            subtotal_sikap: calc.subtotalSikap,
            laporan: parseNum('cert-nilai-laporan'),
            laporan_subtotal: calc.subtotalLaporan,
            subtotal_laporan: calc.subtotalLaporan,
            nilai_akhir: calc.nilaiAkhir,
            predikat: calc.predikat,
            updated_at: nowIso
        };

        if (showFeedback && typeof showToast === 'function') {
            showToast('Menyimpan data sertifikat...', 'info');
        }

        const rpc = getRpcRunner();
        if (rpc) {
            try {
                const res = await rpc('saveSertifikat', [payload]);
                if (res && res.success !== false) {
                    if (showFeedback && typeof showToast === 'function') showToast('Data sertifikat berhasil disimpan!', 'success');
                } else if (showFeedback && typeof showToast === 'function') {
                    showToast('Data sertifikat berhasil disimpan lokal.', 'info');
                }
            } catch (err) {
                console.warn('Error RPC saveSertifikat:', err);
                if (showFeedback && typeof showToast === 'function') {
                    showToast('Data sertifikat berhasil disimpan lokal.', 'info');
                }
            }
        } else if (showFeedback && typeof showToast === 'function') {
            showToast('Data sertifikat berhasil disimpan lokal.', 'info');
        }

        // Simpan ke cache certRecordsMap dan refresh tabel sertifikat jika sedang aktif
        certRecordsMap[String(payload.noreg).trim()] = {
            ...payload,
            updated_at: nowIso
        };
        saveLocalCertCache(certRecordsMap);
        if (typeof filterAdminCertTable === 'function') {
            filterAdminCertTable();
        }

        // Otomatis menutup modal penilaian sertifikat
        closeCertificateModal();

        return payload;
    }

    async function saveAndDownloadCertificatePDF() {
        const noreg = document.getElementById('cert-noreg')?.value;
        if (!noreg) {
            showToast('Pilih siswa terlebih dahulu.', 'error');
            return;
        }

        const s = (activeData || []).find(std => String(std.id) === String(noreg)) ||
                  (typeof activeTurnoverData !== 'undefined' ? activeTurnoverData : []).find(std => String(std.id) === String(noreg)) ||
                  (rawSiswaData || []).find(std => String(std.id) === String(noreg));

        if (!s) {
            showToast('Data siswa tidak ditemukan.', 'error');
            return;
        }

        if (typeof isStudentIneligibleForCertificate === 'function' && isStudentIneligibleForCertificate(s)) {
            showToast(`Siswa ${s.namaLengkap || noreg} berstatus Resign / Indisipliner sehingga tidak berhak mendapatkan sertifikat.`, 'warning');
            return;
        }

        if (typeof window.generateAndDownloadCertificate !== 'function') {
            showToast('Engine sertifikat belum siap. Periksa koneksi ke script sertifikat.', 'error');
            return;
        }

        showToast('Menyiapkan dan menyimpan data sertifikat...', 'info');

        // 1. Simpan data sertifikat ke backend/lokal terlebih dahulu (sekaligus menutup modal)
        await saveCertificateData(false);
        const calc = recalculateCertificateScores();

        // 2. Tutup modal secara otomatis
        closeCertificateModal();

        // 3. Siapkan data untuk PDF engine
        const certData = {
            noreg: noreg,
            nama: s.namaLengkap || document.getElementById('cert-display-nama')?.textContent || 'SISWA',
            nomorSertifikat: document.getElementById('cert-nomor-sertifikat')?.value || '',
            ttl: document.getElementById('cert-ttl')?.value || '',
            periode: document.getElementById('cert-periode')?.value || '',
            tglTerbit: document.getElementById('cert-tgl-terbit')?.value || '',
            fotoUrl: s.foto || (typeof getStudentPhotoUrl === 'function' ? getStudentPhotoUrl(noreg) : ''),
            // 4 Komponen Nilai untuk Halaman 3
            subtotalKinerja: calc.subtotalKinerja,
            subtotalBmk: calc.subtotalBmk,
            subtotalSikap: calc.subtotalSikap,
            subtotalLaporan: calc.subtotalLaporan,
            nilaiAkhir: calc.nilaiAkhir,
            predikat: calc.predikat
        };

        try {
            showToast('Sedang membuat file PDF Sertifikat...', 'info');
            const result = await window.generateAndDownloadCertificate(certData);
            if (result && result.success) {
                showToast(`Sertifikat ${certData.nama} berhasil diunduh!`, 'success');
            }
        } catch (err) {
            console.error('Gagal membuat sertifikat PDF:', err);
            showToast('Gagal membuat PDF: ' + (err.message || err.toString()), 'error');
        }
    }

    // =========================================================================
    // MODUL TABEL KELOLA SERTIFIKAT & FILTERING ADMIN
    // =========================================================================

    function isStudentIneligibleForCertificate(student) {
        if (!student) return true;
        const id = String(student.id || student.noreg || '').trim();

        // 1. Cek status & alasan langsung pada record siswa
        const statusStr = String(student.status || '').toLowerCase().trim();
        const alasanStr = String(student.alasan || '').toLowerCase().trim();

        if (statusStr.includes('resign') || statusStr.includes('indisiplin') || statusStr.includes('indisipliner') || statusStr.includes('keluar') || statusStr.includes('dropout')) {
            return true;
        }
        if (alasanStr.includes('resign') || alasanStr.includes('indisiplin') || alasanStr.includes('indisipliner') || alasanStr.includes('keluar') || alasanStr.includes('dropout')) {
            return true;
        }

        // 2. Cek histori pada daftar turnover (activeTurnoverData / rawTurnoverData)
        const turnoverList = (typeof activeTurnoverData !== 'undefined' && Array.isArray(activeTurnoverData)) 
            ? activeTurnoverData 
            : (typeof rawTurnoverData !== 'undefined' && Array.isArray(rawTurnoverData) ? rawTurnoverData : []);
            
        const turnoverRecord = turnoverList.find(t => String(t.id || t.noreg || '').trim() === id);
        if (turnoverRecord) {
            const tAlasan = String(turnoverRecord.alasan || '').toLowerCase().trim();
            const tStatus = String(turnoverRecord.status || '').toLowerCase().trim();
            if (tAlasan.includes('resign') || tAlasan.includes('indisiplin') || tAlasan.includes('indisipliner')) {
                return true;
            }
            if (tStatus.includes('resign') || tStatus.includes('indisiplin') || tStatus.includes('indisipliner')) {
                return true;
            }
        }

        return false;
    }

    function getAllStudentsForCertificate() {
        const list = [];
        const seen = new Set();
        const turnoverList = (typeof activeTurnoverData !== 'undefined' && Array.isArray(activeTurnoverData)) 
            ? activeTurnoverData 
            : (typeof rawTurnoverData !== 'undefined' && Array.isArray(rawTurnoverData) ? rawTurnoverData : []);

        [activeData, turnoverList, rawSiswaData].forEach(arr => {
            if (Array.isArray(arr)) {
                arr.forEach(s => {
                    if (s && s.id && !seen.has(String(s.id))) {
                        seen.add(String(s.id));
                        // Eksklusif filter: Siswa dengan status Resign atau Indisipliner TIDAK DAPAT sertifikat
                        if (!isStudentIneligibleForCertificate(s)) {
                            list.push(s);
                        }
                    }
                });
            }
        });
        return list;
    }

    function renderAdminSertifikatTab() {
        const tbody = document.getElementById('admin-cert-tbody');
        if (tbody && (!tbody.children.length || tbody.innerText.includes('Memuat'))) {
            tbody.innerHTML = '<tr><td colspan="10" class="py-12 text-center text-xs text-slate-400 italic"><i class="fa-solid fa-spinner animate-spin text-brand-blue text-lg mb-2"></i><br>Memuat basis data evaluasi dan sertifikat...</td></tr>';
        }

        const rpc = getRpcRunner();
        if (rpc) {
            rpc('getSertifikatList', [])
                .then(res => {
                    const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
                    list.forEach(c => {
                        if (c && c.noreg) {
                            const id = String(c.noreg).trim();
                            const existing = certRecordsMap[id];
                            const serverTime = new Date(c.updated_at || 0).getTime();
                            const localTime = new Date(existing?.updated_at || 0).getTime();
                            // Jika data lokal browser lebih baru (misal hasil simpan pengguna di device ini), pertahankan data lokal!
                            if (!existing || serverTime >= localTime) {
                                certRecordsMap[id] = c;
                            }
                        }
                    });
                    saveLocalCertCache(certRecordsMap);
                    populateCertFilters();
                    filterAdminCertTable();
                })
                .catch(err => {
                    console.warn('[renderAdminSertifikatTab] Notice load sertifikat list:', err);
                    populateCertFilters();
                    filterAdminCertTable();
                });
        } else {
            populateCertFilters();
            filterAdminCertTable();
        }
    }

    function populateCertFilters() {
        const batchSelect = document.getElementById('filter-cert-batch');
        const deptSelect = document.getElementById('filter-cert-dept');
        const students = getAllStudentsForCertificate();

        if (batchSelect && batchSelect.options.length <= 1) {
            const currentVal = batchSelect.value;
            const batches = new Set();
            students.forEach(s => {
                if (s.kelas) batches.add(String(s.kelas).trim());
            });
            Array.from(batches).sort().forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = b;
                batchSelect.appendChild(opt);
            });
            batchSelect.value = currentVal;
        }

        if (deptSelect && deptSelect.options.length <= 1) {
            const currentVal = deptSelect.value;
            const depts = new Set();
            students.forEach(s => {
                if (s.departemen) depts.add(String(s.departemen).trim());
            });
            Array.from(depts).sort().forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                deptSelect.appendChild(opt);
            });
            deptSelect.value = currentVal;
        }
    }

    let certCurrentPage = 1;
    const CERT_PAGE_SIZE = 25;
    let selectedCertStudentIds = new Set();

    function filterAdminCertTable(resetPage = false) {
        if (resetPage === true) {
            certCurrentPage = 1;
        }
        const query = document.getElementById('filter-cert-query')?.value.trim().toLowerCase() || '';
        const filterBatch = document.getElementById('filter-cert-batch')?.value.trim().toLowerCase() || '';
        const filterDept = document.getElementById('filter-cert-dept')?.value.trim().toLowerCase() || '';
        const filterStatus = document.getElementById('filter-cert-status')?.value || '';

        const students = getAllStudentsForCertificate();

        const filtered = students.filter(s => {
            const idStr = String(s.id || '').toLowerCase();
            const namaStr = String(s.namaLengkap || '').toLowerCase();
            if (query && !idStr.includes(query) && !namaStr.includes(query)) return false;

            if (filterBatch && String(s.kelas || '').toLowerCase() !== filterBatch) return false;
            if (filterDept && String(s.departemen || '').toLowerCase() !== filterDept) return false;

            const cert = certRecordsMap[String(s.id).trim()];
            const isEvaluated = !!(cert && ((cert.nilai_akhir !== undefined && cert.nilai_akhir !== null && parseFloat(cert.nilai_akhir) > 0) || (cert.subtotal_kinerja !== undefined && parseFloat(cert.subtotal_kinerja) > 0) || (cert.kinerja_subtotal !== undefined && parseFloat(cert.kinerja_subtotal) > 0)));

            if (filterStatus === 'siap' && !isEvaluated) return false;
            if (filterStatus === 'belum' && isEvaluated) return false;

            return true;
        });

        // Hitung Ringkasan KPI (berdasarkan seluruh data terfilter)
        let siapCount = 0;
        let totalScore = 0;

        filtered.forEach(s => {
            const cert = certRecordsMap[String(s.id).trim()];
            const isEvaluated = !!(cert && ((cert.nilai_akhir !== undefined && cert.nilai_akhir !== null && parseFloat(cert.nilai_akhir) > 0) || (cert.subtotal_kinerja !== undefined && parseFloat(cert.subtotal_kinerja) > 0) || (cert.kinerja_subtotal !== undefined && parseFloat(cert.kinerja_subtotal) > 0)));
            if (isEvaluated) {
                siapCount++;
                totalScore += parseFloat(cert.nilai_akhir || 0);
            }
        });

        const totalSiswa = filtered.length;
        const belumCount = Math.max(0, totalSiswa - siapCount);
        const avgScore = siapCount > 0 ? (totalScore / siapCount).toFixed(1) : '0.0';

        const elTotal = document.getElementById('cert-stat-total');
        if (elTotal) elTotal.textContent = totalSiswa;
        const elBelum = document.getElementById('cert-stat-belum');
        if (elBelum) elBelum.textContent = belumCount;
        const elSiap = document.getElementById('cert-stat-siap');
        if (elSiap) elSiap.textContent = siapCount;
        const elAvg = document.getElementById('cert-stat-avg');
        if (elAvg) elAvg.textContent = avgScore;

        // Render Baris Tabel
        const tbody = document.getElementById('admin-cert-tbody');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="py-12 text-center text-xs text-slate-400 italic">
                        <i class="fa-solid fa-circle-exclamation text-slate-300 text-lg mb-2"></i><br>
                        Tidak ada data siswa yang cocok dengan kriteria filter saat ini.
                    </td>
                </tr>
            `;
            const selectAllCb = document.getElementById('cert-select-all');
            if (selectAllCb) {
                selectAllCb.checked = false;
                selectAllCb.indeterminate = false;
            }
            updateCertBatchActionsUI();
            if (typeof renderPaginationUI === 'function') {
                renderPaginationUI({
                    infoId: 'cert-pagination-info',
                    controlsId: 'cert-pagination-controls',
                    currentPage: 1,
                    totalItems: 0,
                    pageSize: CERT_PAGE_SIZE,
                    goToPageFn: 'goToCertPage',
                    itemLabel: 'siswa',
                    themeColor: '#0B3B82'
                });
            }
            return;
        }

        // Paginasi 25 Siswa per Halaman
        const totalPages = Math.max(1, Math.ceil(totalSiswa / CERT_PAGE_SIZE));
        if (certCurrentPage > totalPages) certCurrentPage = totalPages;
        if (certCurrentPage < 1) certCurrentPage = 1;

        const startIndex = (certCurrentPage - 1) * CERT_PAGE_SIZE;
        const endIndex = Math.min(startIndex + CERT_PAGE_SIZE, totalSiswa);
        const pageItems = filtered.slice(startIndex, endIndex);

        tbody.innerHTML = pageItems.map((s, idx) => {
            const cert = certRecordsMap[String(s.id).trim()] || null;
            const isEvaluated = !!(cert && ((cert.nilai_akhir !== undefined && cert.nilai_akhir !== null && parseFloat(cert.nilai_akhir) > 0) || (cert.subtotal_kinerja !== undefined && parseFloat(cert.subtotal_kinerja) > 0) || (cert.kinerja_subtotal !== undefined && parseFloat(cert.kinerja_subtotal) > 0)));
            const isSelected = selectedCertStudentIds.has(String(s.id).trim());

            const kVal = (isEvaluated && cert) ? parseFloat(cert.subtotal_kinerja ?? cert.kinerja_subtotal ?? 0) : null;
            const bVal = (isEvaluated && cert) ? parseFloat(cert.subtotal_bmk ?? cert.bmk_subtotal ?? 0) : null;
            const sVal = (isEvaluated && cert) ? parseFloat(cert.subtotal_sikap ?? cert.sikap_subtotal ?? 0) : null;
            const lVal = (isEvaluated && cert) ? parseFloat(cert.subtotal_laporan ?? cert.laporan_subtotal ?? (cert.nilai_laporan_akhir ? cert.nilai_laporan_akhir * 0.1 : 0)) : null;
            const nAkhir = (isEvaluated && cert) ? parseFloat(cert.nilai_akhir ?? 0) : null;

            let predikatBadge = '-';
            if (isEvaluated && nAkhir !== null) {
                let pClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (nAkhir < 70) pClass = 'bg-rose-50 text-rose-700 border-rose-200';
                else if (nAkhir < 80) pClass = 'bg-amber-50 text-amber-700 border-amber-200';
                else if (nAkhir < 90) pClass = 'bg-blue-50 text-blue-700 border-blue-200';

                predikatBadge = `
                    <div class="flex items-center justify-center gap-1.5">
                        <span class="font-mono font-black text-xs text-slate-800">${nAkhir.toFixed(1)}</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border ${pClass}">${cert.predikat || 'A'}</span>
                    </div>
                `;
            }

            const statusBadge = isEvaluated
                ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"><i class="fa-solid fa-circle-check mr-1"></i>Siap Cetak</span>`
                : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap"><i class="fa-regular fa-clock mr-1"></i>Belum Dinilai</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}">
                    <td class="py-3 px-3 text-center">
                        ${isEvaluated 
                            ? `<input type="checkbox" name="cert-student-item" value="${s.id}" ${isSelected ? 'checked' : ''} onchange="toggleCertStudentSelection('${s.id}', this.checked)" class="w-4 h-4 rounded text-[#0B3B82] focus:ring-blue-500 border-slate-300 cursor-pointer">`
                            : `<input type="checkbox" disabled class="w-4 h-4 rounded text-slate-300 border-slate-200 cursor-not-allowed opacity-30" title="Siswa belum dinilai">`
                        }
                    </td>
                    <td class="py-3 px-3.5 text-center font-mono text-xs text-slate-400">${startIndex + idx + 1}</td>
                    <td class="py-3 px-4">
                        <div class="min-w-0">
                            <div class="font-bold text-slate-800 text-xs truncate">${s.namaLengkap || '-'}</div>
                            <div class="font-mono text-slate-400 text-[11px]">${s.id}</div>
                        </div>
                    </td>
                    <td class="py-3 px-3.5">
                        <span class="px-2 py-0.5 bg-blue-50 text-[#0B3B82] rounded-md font-bold text-[10px]">${s.kelas || 'Kelas 1'}</span>
                        <div class="text-[11px] text-slate-500 font-normal mt-0.5 truncate">${s.departemen || '-'}</div>
                    </td>
                    <td class="py-3 px-3 text-center">
                        ${kVal !== null ? `<span class="font-mono font-bold text-blue-700 text-xs">${kVal.toFixed(1)}</span> <span class="text-[10px] text-slate-400">/ 40</span>` : '<span class="text-slate-300 font-mono">-</span>'}
                    </td>
                    <td class="py-3 px-3 text-center">
                        ${bVal !== null ? `<span class="font-mono font-bold text-amber-700 text-xs">${bVal.toFixed(1)}</span> <span class="text-[10px] text-slate-400">/ 30</span>` : '<span class="text-slate-300 font-mono">-</span>'}
                    </td>
                    <td class="py-3 px-3 text-center">
                        ${sVal !== null ? `<span class="font-mono font-bold text-emerald-700 text-xs">${sVal.toFixed(1)}</span> <span class="text-[10px] text-slate-400">/ 20</span>` : '<span class="text-slate-300 font-mono">-</span>'}
                    </td>
                    <td class="py-3 px-3 text-center">
                        ${lVal !== null ? `<span class="font-mono font-bold text-purple-700 text-xs">${lVal.toFixed(1)}</span> <span class="text-[10px] text-slate-400">/ 10</span>` : '<span class="text-slate-300 font-mono">-</span>'}
                    </td>
                    <td class="py-3 px-3.5 text-center">
                        ${predikatBadge}
                    </td>
                    <td class="py-3 px-3 text-center">
                        ${statusBadge}
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="openCertificateModal('${s.id}')"
                                class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B3B82] border border-blue-200/80 flex items-center justify-center transition-all cursor-pointer shadow-xs text-xs" 
                                title="${isEvaluated ? 'Edit Nilai Siswa' : 'Input Nilai Siswa'}">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="downloadStudentCertificatePDF('${s.id}')"
                                class="w-8 h-8 rounded-lg ${isEvaluated ? 'bg-[#0B3B82] hover:bg-blue-700 text-white shadow-xs cursor-pointer' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'} flex items-center justify-center transition-all text-xs"
                                ${!isEvaluated ? 'disabled title="Harap lengkapi penilaian siswa terlebih dahulu"' : 'title="Cetak file resmi Sertifikat PDF"'}>
                                <i class="fa-solid fa-file-pdf"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Perbarui Status Checkbox Select All Halaman Ini
        const pageEvaluatedIds = pageItems
            .filter(s => {
                const cert = certRecordsMap[String(s.id).trim()];
                return !!(cert && ((cert.nilai_akhir !== undefined && cert.nilai_akhir !== null && parseFloat(cert.nilai_akhir) > 0) || (cert.subtotal_kinerja !== undefined && parseFloat(cert.subtotal_kinerja) > 0) || (cert.kinerja_subtotal !== undefined && parseFloat(cert.kinerja_subtotal) > 0)));
            })
            .map(s => String(s.id).trim());

        const selectAllCb = document.getElementById('cert-select-all');
        if (selectAllCb) {
            if (pageEvaluatedIds.length > 0) {
                const checkedCount = pageEvaluatedIds.filter(id => selectedCertStudentIds.has(id)).length;
                selectAllCb.checked = (checkedCount === pageEvaluatedIds.length);
                selectAllCb.indeterminate = (checkedCount > 0 && checkedCount < pageEvaluatedIds.length);
            } else {
                selectAllCb.checked = false;
                selectAllCb.indeterminate = false;
            }
        }

        updateCertBatchActionsUI();

        // Perbarui Kontrol Paginasi Kelola Sertifikat
        if (typeof renderPaginationUI === 'function') {
            renderPaginationUI({
                infoId: 'cert-pagination-info',
                controlsId: 'cert-pagination-controls',
                currentPage: certCurrentPage,
                totalItems: totalSiswa,
                pageSize: CERT_PAGE_SIZE,
                goToPageFn: 'goToCertPage',
                itemLabel: 'siswa',
                themeColor: '#0B3B82'
            });
        }
    }

    function goToCertPage(page) {
        certCurrentPage = page;
        filterAdminCertTable(false);
        const scrollContainer = document.querySelector('#admin-tab-kelola-sertifikat .overflow-x-auto');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    window.goToCertPage = goToCertPage;

    // ==========================================
    // SELEKSI SISWA & BATCH DOWNLOAD SERTIFIKAT
    // ==========================================

    function toggleCertStudentSelection(studentId, isChecked) {
        const sId = String(studentId).trim();
        if (isChecked) {
            selectedCertStudentIds.add(sId);
        } else {
            selectedCertStudentIds.delete(sId);
        }
        updateCertSelectAllCheckbox();
        updateCertBatchActionsUI();
    }

    function toggleSelectAllCertStudents(isChecked) {
        const checkboxes = document.querySelectorAll('input[name="cert-student-item"]:not(:disabled)');
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            const sId = String(cb.value).trim();
            if (isChecked) {
                selectedCertStudentIds.add(sId);
            } else {
                selectedCertStudentIds.delete(sId);
            }
        });
        updateCertSelectAllCheckbox();
        updateCertBatchActionsUI();
    }

    function selectAllReadyCertStudents() {
        const students = getAllStudentsForCertificate();
        let addedCount = 0;
        students.forEach(s => {
            if (typeof isStudentIneligibleForCertificate === 'function' && isStudentIneligibleForCertificate(s)) return;
            const cert = certRecordsMap[String(s.id).trim()];
            const isEvaluated = !!(cert && ((cert.nilai_akhir !== undefined && cert.nilai_akhir !== null && cert.nilai_akhir > 0) || cert.subtotal_kinerja !== undefined));
            if (isEvaluated) {
                selectedCertStudentIds.add(String(s.id).trim());
                addedCount++;
            }
        });
        filterAdminCertTable(false);
        showToast(`${addedCount} siswa berstatus Siap Cetak berhasil dicentang.`, 'info');
    }

    function clearCertStudentSelection() {
        selectedCertStudentIds.clear();
        filterAdminCertTable(false);
    }

    function updateCertSelectAllCheckbox() {
        const selectAllCb = document.getElementById('cert-select-all');
        if (!selectAllCb) return;
        const checkboxes = Array.from(document.querySelectorAll('input[name="cert-student-item"]:not(:disabled)'));
        if (checkboxes.length === 0) {
            selectAllCb.checked = false;
            selectAllCb.indeterminate = false;
            return;
        }
        const checkedCount = checkboxes.filter(cb => cb.checked).length;
        selectAllCb.checked = (checkedCount === checkboxes.length);
        selectAllCb.indeterminate = (checkedCount > 0 && checkedCount < checkboxes.length);
    }

    function updateCertBatchActionsUI() {
        const bar = document.getElementById('cert-batch-action-bar');
        const countEl = document.getElementById('cert-batch-selected-count');
        const totalSelected = selectedCertStudentIds.size;
        if (!bar) return;

        if (totalSelected > 0) {
            bar.classList.remove('hidden');
            bar.classList.add('flex');
            if (countEl) countEl.textContent = `${totalSelected} Siswa Dipilih`;
        } else {
            bar.classList.add('hidden');
            bar.classList.remove('flex');
        }
    }

    function getStudentCertificateData(studentId) {
        const s = (activeData || []).find(std => String(std.id) === String(studentId)) ||
                  (typeof activeTurnoverData !== 'undefined' ? activeTurnoverData : []).find(std => String(std.id) === String(studentId)) ||
                  (rawSiswaData || []).find(std => String(std.id) === String(studentId));

        if (!s) return null;
        if (typeof isStudentIneligibleForCertificate === 'function' && isStudentIneligibleForCertificate(s)) return null;

        const cert = certRecordsMap[String(studentId).trim()];
        if (!cert || (!cert.nilai_akhir && cert.nilai_akhir !== 0)) return null;

        const yearNow = new Date().getFullYear();
        const noregSuffix = String(s.id || '0000').slice(-3);
        const defaultNoSertifikat = `${noregSuffix}/LTC/17-G/V/${yearNow}`;

        const tglMasukStr = s.masuk || s.tanggalMasuk || '';
        const tglKeluarStr = s.tanggalKeluar || s.keluar || '';
        const formalPeriode = (tglMasukStr && tglKeluarStr) 
            ? `${formatIndoDate(tglMasukStr)} s.d ${formatIndoDate(tglKeluarStr)}` 
            : '17 November 2025 s.d 16 April 2026';

        let ttlStr = '';
        if (s.tempatLahir && s.tanggalLahir) {
            ttlStr = `${s.tempatLahir}, ${formatIndoDate(s.tanggalLahir)}`;
        } else if (s.tanggalLahir) {
            ttlStr = formatIndoDate(s.tanggalLahir);
        } else if (s.daerahAsal || s.asalDaerah) {
            ttlStr = `${s.daerahAsal || s.asalDaerah}, -`;
        }

        return {
            noreg: s.id,
            nama: s.namaLengkap || 'SISWA',
            nomorSertifikat: cert.nomor_sertifikat || defaultNoSertifikat,
            ttl: cert.tempat_tanggal_lahir || ttlStr,
            periode: cert.periode_pelatihan || formalPeriode,
            tglTerbit: cert.tanggal_terbit || `Gresik, ${formatIndoDate(new Date())}`,
            fotoUrl: s.foto || (typeof getStudentPhotoUrl === 'function' ? getStudentPhotoUrl(s.id) : ''),
            subtotalKinerja: parseFloat(cert.subtotal_kinerja ?? cert.kinerja_subtotal ?? 0),
            subtotalBmk: parseFloat(cert.subtotal_bmk ?? cert.bmk_subtotal ?? 0),
            subtotalSikap: parseFloat(cert.subtotal_sikap ?? cert.sikap_subtotal ?? 0),
            subtotalLaporan: parseFloat(cert.nilai_laporan_akhir ?? cert.laporan_subtotal ?? 0),
            nilaiAkhir: parseFloat(cert.nilai_akhir ?? 0),
            predikat: cert.predikat || 'Sangat Baik (A)'
        };
    }

    async function downloadStudentCertificatePDF(studentId) {
        const certData = getStudentCertificateData(studentId);
        if (!certData) {
            const s = (activeData || []).find(std => String(std.id) === String(studentId));
            if (s && typeof isStudentIneligibleForCertificate === 'function' && isStudentIneligibleForCertificate(s)) {
                showToast(`Siswa ${s.namaLengkap || studentId} berstatus Resign / Indisipliner sehingga tidak berhak mendapatkan sertifikat.`, 'warning');
            } else {
                showToast(`Nilai siswa belum diisi atau data tidak ditemukan. Harap isi nilai siswa terlebih dahulu.`, 'warning');
            }
            return;
        }

        if (typeof window.generateAndDownloadCertificate !== 'function') {
            showToast('Engine sertifikat belum siap di browser.', 'error');
            return;
        }

        showToast(`Membuat sertifikat PDF untuk ${certData.nama}...`, 'info');

        try {
            const result = await window.generateAndDownloadCertificate(certData);
            if (result && result.success) {
                showToast(`Sertifikat ${certData.nama} berhasil diunduh!`, 'success');
            }
        } catch (err) {
            console.error('Gagal membuat sertifikat PDF:', err);
            showToast('Gagal membuat PDF: ' + (err.message || err.toString()), 'error');
        }
    }

    async function downloadBatchCertificates(format = 'pdf') {
        if (selectedCertStudentIds.size === 0) {
            showToast('Pilih minimal satu siswa untuk mengunduh sertifikat.', 'warning');
            return;
        }

        if (typeof window.generateBatchCertificates !== 'function') {
            showToast('Engine pembuatan sertifikat belum siap di browser.', 'error');
            return;
        }

        const certDataList = [];
        for (const sId of selectedCertStudentIds) {
            const certData = getStudentCertificateData(sId);
            if (certData) {
                certDataList.push(certData);
            }
        }

        if (certDataList.length === 0) {
            showToast('Tidak ada data siswa terpilih yang memiliki nilai valid untuk dicetak.', 'warning');
            return;
        }

        const modal = document.getElementById('modal-cert-batch-progress');
        const titleEl = document.getElementById('cert-batch-progress-title');
        const descEl = document.getElementById('cert-batch-progress-desc');
        const barEl = document.getElementById('cert-batch-progress-bar');
        const statusEl = document.getElementById('cert-batch-progress-status');
        const percentEl = document.getElementById('cert-batch-progress-percent');

        if (modal) modal.classList.remove('hidden');
        if (titleEl) titleEl.textContent = format === 'zip' ? 'Membuat Arsip ZIP Sertifikat...' : 'Menggabungkan Dokumen PDF...';
        if (barEl) barEl.style.width = '0%';
        if (statusEl) statusEl.textContent = `0 / ${certDataList.length} Siswa`;
        if (percentEl) percentEl.textContent = '0%';

        const onProgress = ({ current, total, studentName }) => {
            const pct = Math.round((current / total) * 100);
            if (barEl) barEl.style.width = `${pct}%`;
            if (statusEl) statusEl.textContent = `${current} / ${total} Siswa`;
            if (percentEl) percentEl.textContent = `${pct}%`;
            if (descEl) descEl.textContent = `Memproses: ${studentName}`;
        };

        try {
            const result = await window.generateBatchCertificates(certDataList, format, onProgress);
            if (modal) modal.classList.add('hidden');
            showToast(`Berhasil mengunduh ${result.count} sertifikat (${format === 'zip' ? 'File ZIP' : '1 File PDF Gabungan'})!`, 'success');
        } catch (err) {
            console.error('Gagal download batch sertifikat:', err);
            if (modal) modal.classList.add('hidden');
            showToast('Gagal memproses batch: ' + (err.message || err.toString()), 'error');
        }
    }

    function resetAdminCertFilters() {
        const q = document.getElementById('filter-cert-query');
        if (q) q.value = '';
        const b = document.getElementById('filter-cert-batch');
        if (b) b.value = '';
        const d = document.getElementById('filter-cert-dept');
        if (d) d.value = '';
        const s = document.getElementById('filter-cert-status');
        if (s) s.value = '';
        filterAdminCertTable(true);
    }

    // Ekspor fungsi sertifikat ke window global
    window.openCertificateModal = openCertificateModal;
    window.closeCertificateModal = closeCertificateModal;
    window.autoFillPerformanceScore = autoFillPerformanceScore;
    window.autoFillAttendanceScore = autoFillAttendanceScore;
    window.recalculateCertificateScores = recalculateCertificateScores;
    window.saveCertificateData = saveCertificateData;
    window.saveAndDownloadCertificatePDF = saveAndDownloadCertificatePDF;
    window.renderAdminSertifikatTab = renderAdminSertifikatTab;
    window.filterAdminCertTable = filterAdminCertTable;
    window.downloadStudentCertificatePDF = downloadStudentCertificatePDF;
    window.resetAdminCertFilters = resetAdminCertFilters;
    window.toggleCertStudentSelection = toggleCertStudentSelection;
    window.toggleSelectAllCertStudents = toggleSelectAllCertStudents;
    window.selectAllReadyCertStudents = selectAllReadyCertStudents;
    window.clearCertStudentSelection = clearCertStudentSelection;
    window.downloadBatchCertificates = downloadBatchCertificates;


