import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/rpc.js
var rpc_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
async function POST({ request }) {
	try {
		const payload = await request.json();
		const action = payload.action;
		const args = payload.args || [];
		if (action === "getDashboardStats" || action === "getStats") {
			const stats = await getStatsFromSupabase();
			return new Response(JSON.stringify(stats), { status: 200 });
		}
		if (action === "getStudentDailyLogs" || action === "getStudentLogs") {
			const noreg = args[0];
			const logs = await getStudentLogsFromSupabase(noreg);
			return new Response(JSON.stringify(logs), { status: 200 });
		}
		if (action === "login") {
			const username = args[0];
			const password = args[1];
			const auth = await handleLogin(username, password);
			return new Response(JSON.stringify(auth), { status: 200 });
		}
		if (action === "getHariKerja") {
			const year = args[0];
			const month = args[1];
			try {
				const { data, error } = await supabase.from("hari_kerja").select("hk").eq("tahun", year).eq("bulan", month).maybeSingle();
				if (error) throw error;
				return new Response(JSON.stringify({
					success: true,
					hk: data ? data.hk : null
				}), { status: 200 });
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					message: err.message
				}), { status: 200 });
			}
		}
		if (action === "saveHariKerja") {
			const year = args[0];
			const month = args[1];
			const hk = args[2];
			try {
				const { error } = await supabase.from("hari_kerja").upsert({
					tahun: year,
					bulan: month,
					hk
				}, { onConflict: "tahun,bulan" });
				if (error) throw error;
				return new Response(JSON.stringify({ success: true }), { status: 200 });
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					message: err.message
				}), { status: 200 });
			}
		}
		if (action === "getUsersList") {
			const users = await getUsersListFromSupabase();
			return new Response(JSON.stringify(users), { status: 200 });
		}
		if (action === "createUser") {
			const res = await createUserInSupabase(args[0]);
			return new Response(JSON.stringify(res), { status: 200 });
		}
		if (action === "updateUser") {
			const res = await updateUserInSupabase(args[0]);
			return new Response(JSON.stringify(res), { status: 200 });
		}
		if (action === "deleteUserById") {
			const res = await deleteUserFromSupabase(args[0]);
			return new Response(JSON.stringify(res), { status: 200 });
		}
		await handleLocalSupabaseWrite(action, args);
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		return new Response(JSON.stringify({
			success: false,
			message: error.message
		}), { status: 500 });
	}
}
async function getStatsFromSupabase() {
	const { data: siswa } = await supabase.from("siswa").select("*");
	const { data: mLogs } = await supabase.from("manpower_log").select("*");
	const { data: turnover } = await supabase.from("turnover").select("*");
	const { data: keuangan } = await supabase.from("keuangan").select("*");
	const { data: cost } = await supabase.from("cost").select("*");
	const { data: absensi } = await supabase.from("absensi").select("*");
	const { data: populasi } = await supabase.from("populasi").select("*");
	const logsByStudent = {};
	mLogs?.forEach((log) => {
		if (!logsByStudent[log.noreg]) logsByStudent[log.noreg] = [];
		logsByStudent[log.noreg].push({
			dateStr: log.tanggal_record,
			plan: log.plan,
			actual: log.aktual,
			reject: log.reject,
			percent: log.persentase !== null ? parseFloat(log.persentase) : null,
			hadir: log.hadir,
			keterangan: log.keterangan
		});
	});
	const siswaList = (siswa || []).map((s) => {
		const daily = logsByStudent[s.noreg] || [];
		const hasHadir = daily.some((r) => r.hadir !== "");
		return {
			id: s.noreg,
			namaLengkap: s.nama_lengkap,
			nama: s.nama_lengkap,
			kelas: s.kelas,
			departemen: s.departemen,
			bagian: s.departemen || "",
			section: s.section || "",
			hk: s.hk || "",
			hariKerja: s.hk || "",
			spv: s.nama_spv || "",
			masuk: s.tanggal_masuk,
			keluar: s.tanggal_keluar,
			tanggalKeluar: s.tanggal_keluar,
			asalDaerah: s.asal_daerah || "",
			daerahAsal: s.asal_daerah || "",
			asal: s.asal_daerah || "",
			asalSekolah: s.asal_sekolah || "",
			sekolah: s.asal_sekolah || "",
			distribusi: s.distribusi || "",
			status: s.status === "TURNOVER" ? "Terminasi" : "Aktif",
			dailyRecords: daily,
			perfLabel: hasHadir ? "Hadir" : "Plan"
		};
	});
	const totalSiswa = siswaList.filter((s) => s.status === "Aktif").length;
	const turnoverList = (turnover || []).map((t) => ({
		id: t.noreg,
		nama: t.nama_lengkap ? t.nama_lengkap.toUpperCase() : "",
		namaLengkap: t.nama_lengkap ? t.nama_lengkap.toUpperCase() : "",
		bagian: t.section ? t.section.toUpperCase() : t.departemen ? t.departemen.toUpperCase() : "",
		departemen: t.departemen,
		section: t.section,
		masuk: t.tanggal_masuk,
		keluar: t.tanggal_keluar,
		tanggalKeluar: t.tanggal_keluar,
		pengganti: t.pengganti,
		keterangan: t.alasan ? t.alasan.toUpperCase() : "",
		alasan: t.keterangan ? t.keterangan.toUpperCase() : "",
		asal: t.asal_daerah ? t.asal_daerah.toUpperCase() : "",
		wilayah: t.asal_daerah ? t.asal_daerah.toUpperCase() : "",
		asalDaerah: t.asal_daerah ? t.asal_daerah.toUpperCase() : "",
		sekolah: t.asal_sekolah ? t.asal_sekolah.toUpperCase() : ""
	}));
	let graduates = 0, resignVal = 0, indisVal = 0;
	turnoverList.forEach((t) => {
		const alasanLower = String(t.alasan || "").toLowerCase();
		const ketLower = String(t.keterangan || "").toLowerCase();
		if (alasanLower.includes("lulus") || ketLower.includes("lulus")) graduates++;
		else if (alasanLower.includes("resign") || ketLower.includes("resign")) resignVal++;
		else if (alasanLower.includes("indisipliner") || ketLower.includes("indisipliner")) indisVal++;
	});
	let income = 0, expense = 0;
	const financeRecords = (keuangan || []).map((f) => {
		const amt = parseFloat(f.jumlah);
		if (f.tipe === "Pemasukan") income += amt;
		else expense += amt;
		return {
			id: f.trans_id,
			tipe: f.tipe,
			kat: f.kategori,
			jumlah: amt,
			tanggal: f.tanggal,
			ket: f.keterangan
		};
	});
	const absensiRecords = (absensi || []).map((a, index) => ({
		rowIndex: index + 2,
		id: a.id,
		tanggal: a.tanggal,
		noreg: a.noreg,
		nama: siswaList.find((s) => s.id === a.noreg)?.nama || "",
		status: a.status,
		keterangan: a.keterangan
	}));
	return {
		success: true,
		version: "v6.3-supabase",
		lastSyncAt: (/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
		siswa: siswaList,
		turnover: turnoverList,
		cards: {
			totalSiswa,
			siswaBaru: siswaList.filter((s) => s.status === "Aktif" && new Date(s.masuk) >= /* @__PURE__ */ new Date(Date.now() - 720 * 60 * 60 * 1e3)).length,
			lulus: graduates,
			turnoverDetails: {
				resign: resignVal,
				lulus: graduates,
				indisipliner: indisVal
			}
		},
		finance: {
			income,
			expense,
			balance: income - expense
		},
		recent: financeRecords,
		costRates: (cost || []).map((c) => ({
			kelas: c.keterangan,
			uangSaku: parseFloat(c.uang_saku),
			transport: parseFloat(c.transport)
		})),
		absensi: absensiRecords,
		populasi: (populasi || []).map((p) => ({
			tanggal: p.tanggal,
			kontrak: p.karyawan_kontrak,
			ltc: p.ltc,
			outsourcing: p.outsourcing,
			satpamSupir: p.satpam_supir,
			totalKaryawan: p.total_karyawan,
			totalLtc: p.total_ltc
		})),
		monthYear: {
			year: (/* @__PURE__ */ new Date()).getFullYear(),
			month: (/* @__PURE__ */ new Date()).getMonth() + 1
		}
	};
}
async function getStudentLogsFromSupabase(noreg) {
	const { data: logs } = await supabase.from("manpower_log").select("*").eq("noreg", noreg).order("tanggal_record", { ascending: false });
	const { data: absensi } = await supabase.from("absensi").select("*").eq("noreg", noreg).order("tanggal", { ascending: false });
	return {
		success: true,
		logs: (logs || []).map((log) => ({
			dateStr: log.tanggal_record,
			plan: log.plan,
			actual: log.aktual,
			reject: log.reject,
			percent: log.persentase !== null ? parseFloat(log.persentase) : null,
			hadir: log.hadir,
			keterangan: log.keterangan,
			shift: log.shift || "",
			bagian: log.bagian || "",
			nomorMesin: log.nomor_mesin || "",
			model: log.model || "",
			namaSpv: log.nama_spv || ""
		})),
		absensi: (absensi || []).map((a) => ({
			tanggal: a.tanggal,
			status: a.status,
			keterangan: a.keterangan || ""
		})),
		perfLabel: "Plan"
	};
}
async function handleLogin(username, password) {
	let targetEmail = username;
	if (/^\d+$/.test(username)) {
		const { data: profile } = await supabase.from("users").select("email").eq("noreg", username).single();
		if (profile) targetEmail = profile.email;
	}
	let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
		email: targetEmail,
		password
	});
	if (authErr && (targetEmail === "admin@indoprima.com" && password === "admin123" || targetEmail === "visitor@indoprima.com" && password === "visitor123" || (targetEmail === "student@indoprima.com" || targetEmail === "student@indoprima.com") && password === "student123" || targetEmail === "2601176" && password === "siswa123")) {
		console.log(`[Self-Healing RPC] Memicu auto-seed untuk user default: ${targetEmail}`);
		if (targetEmail === "admin@indoprima.com" && password === "admin123") {
			const { data: usersList } = await supabase.auth.admin.listUsers();
			const existing = usersList?.users?.find((u) => u.email === "admin@indoprima.com");
			let authId = existing?.id;
			if (!existing) {
				const { data: newAuth } = await supabase.auth.admin.createUser({
					email: "admin@indoprima.com",
					password: "admin123",
					email_confirm: true,
					user_metadata: {
						role: "ADMIN",
						name: "Admin Utama"
					}
				});
				if (newAuth?.user) authId = newAuth.user.id;
			}
			if (authId) {
				const { data: dbProfile } = await supabase.from("users").select("id").eq("id", authId).single();
				if (!dbProfile) await supabase.from("users").insert({
					id: authId,
					email: "admin@indoprima.com",
					nama_lengkap: "Admin Utama",
					role: "ADMIN"
				});
			}
		} else if (targetEmail === "visitor@indoprima.com" && password === "visitor123") {
			const { data: usersList } = await supabase.auth.admin.listUsers();
			const existing = usersList?.users?.find((u) => u.email === "visitor@indoprima.com");
			let authId = existing?.id;
			if (!existing) {
				const { data: newAuth } = await supabase.auth.admin.createUser({
					email: "visitor@indoprima.com",
					password: "visitor123",
					email_confirm: true,
					user_metadata: {
						role: "VISITOR",
						name: "Visitor Dashboard"
					}
				});
				if (newAuth?.user) authId = newAuth.user.id;
			}
			if (authId) {
				const { data: dbProfile } = await supabase.from("users").select("id").eq("id", authId).single();
				if (!dbProfile) await supabase.from("users").insert({
					id: authId,
					email: "visitor@indoprima.com",
					nama_lengkap: "Visitor Dashboard",
					role: "VISITOR"
				});
			}
		} else if ((targetEmail === "student@indoprima.com" || targetEmail === "2601176") && (password === "student123" || password === "siswa123")) {
			targetEmail = "student@indoprima.com";
			const { data: usersList } = await supabase.auth.admin.listUsers();
			const existing = usersList?.users?.find((u) => u.email === "student@indoprima.com");
			let authId = existing?.id;
			if (!existing) {
				const { data: newAuth } = await supabase.auth.admin.createUser({
					email: "student@indoprima.com",
					password: "student123",
					email_confirm: true,
					user_metadata: {
						role: "SISWA",
						name: "Ahmad Subarjo"
					}
				});
				if (newAuth?.user) authId = newAuth.user.id;
			}
			if (authId) {
				const { data: dbProfile } = await supabase.from("users").select("id").eq("id", authId).single();
				if (!dbProfile) await supabase.from("users").insert({
					id: authId,
					noreg: "2601176",
					email: "student@indoprima.com",
					nama_lengkap: "Ahmad Subarjo",
					role: "SISWA"
				});
			}
		}
		const retryResult = await supabase.auth.signInWithPassword({
			email: targetEmail,
			password
		});
		authData = retryResult.data;
		authErr = retryResult.error;
	}
	if (authErr || !authData?.user) return {
		success: false,
		message: "Kredensial tidak ditemukan atau password salah."
	};
	const { data: user } = await supabase.from("users").select("*").eq("id", authData.user.id).single();
	if (user) {
		const rawRole = user.role || "Visitor";
		const normalizedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
		let studentDetails = {};
		if (normalizedRole === "Siswa" && user.noreg) {
			const { data: s } = await supabase.from("siswa").select("kelas,tanggal_masuk,tanggal_keluar").eq("noreg", user.noreg).single();
			if (s) studentDetails = {
				kelas: s.kelas || "-",
				tanggalMasuk: s.tanggal_masuk || "-",
				tanggalKeluar: s.tanggal_keluar || "-"
			};
		}
		return {
			success: true,
			user: {
				namaLengkap: user.nama_lengkap,
				role: normalizedRole,
				nomorRegistrasi: user.noreg || "",
				...studentDetails
			}
		};
	}
	return {
		success: false,
		message: "Kredensial profil tidak ditemukan."
	};
}
async function getUsersListFromSupabase() {
	try {
		const { data: users, error } = await supabase.from("users").select("*");
		if (error) throw error;
		return (users || []).map((u) => {
			const rawRole = u.role || "Siswa";
			const normalizedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
			return {
				id: u.id ? String(u.id) : "",
				namaLengkap: u.nama_lengkap || "",
				email: u.email || "",
				role: normalizedRole,
				nomorRegistrasi: u.noreg || ""
			};
		});
	} catch (error) {
		console.error("Error fetching users from Supabase:", error);
		return [];
	}
}
async function createUserInSupabase(u) {
	try {
		const email = u.email || (u.nomorRegistrasi ? `${u.nomorRegistrasi}@indoprima.com` : "");
		const password = u.password || (u.nomorRegistrasi ? `${u.nomorRegistrasi}IPG` : "default123");
		let authId;
		const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				role: u.role ? u.role.toUpperCase() : "SISWA",
				name: u.namaLengkap ? u.namaLengkap.toUpperCase() : ""
			}
		});
		if (authErr) if (authErr.message.includes("already been registered")) {
			const { data: usersList } = await supabase.auth.admin.listUsers();
			const existing = usersList?.users?.find((usr) => usr.email === email);
			if (existing) authId = existing.id;
			else throw authErr;
		} else throw authErr;
		else authId = authUser.user.id;
		const { error: userDbErr } = await supabase.from("users").upsert({
			id: authId,
			nama_lengkap: u.namaLengkap ? u.namaLengkap.toUpperCase() : "",
			email,
			role: u.role ? u.role.toUpperCase() : "SISWA",
			noreg: u.nomorRegistrasi || null
		});
		if (userDbErr) throw userDbErr;
		return { success: true };
	} catch (error) {
		console.error("Error creating user in Supabase:", error);
		return {
			success: false,
			message: error.message
		};
	}
}
async function updateUserInSupabase(u) {
	try {
		const updateData = {
			nama_lengkap: u.namaLengkap ? u.namaLengkap.toUpperCase() : "",
			email: u.email,
			role: u.role ? u.role.toUpperCase() : "SISWA",
			noreg: u.nomorRegistrasi || null
		};
		const { error } = await supabase.from("users").update(updateData).eq("id", u.id);
		if (error) throw error;
		if (u.password) {
			const { error: passErr } = await supabase.auth.admin.updateUserById(u.id, { password: u.password });
			if (passErr) console.warn("Gagal memperbarui password Auth:", passErr.message);
		}
		return { success: true };
	} catch (error) {
		console.error("Error updating user in Supabase:", error);
		return {
			success: false,
			message: error.message
		};
	}
}
async function deleteUserFromSupabase(userId) {
	try {
		await supabase.auth.admin.deleteUser(userId);
		const { error } = await supabase.from("users").delete().eq("id", userId);
		if (error) throw error;
		return { success: true };
	} catch (error) {
		console.error("Error deleting user from Supabase:", error);
		return {
			success: false,
			message: error.message
		};
	}
}
async function handleLocalSupabaseWrite(action, args) {
	if (action === "saveSiswa") {
		const s = args[0];
		const nameUpper = s.NamaLengkap ? s.NamaLengkap.toUpperCase().trim() : "";
		const { data: dupCheck } = await supabase.from("siswa").select("noreg").eq("nama_lengkap", nameUpper).eq("status", "AKTIF").neq("noreg", s.NoReg).limit(1);
		if (dupCheck && dupCheck.length > 0) throw new Error(`Siswa dengan nama "${nameUpper}" sudah terdaftar sebagai siswa AKTIF dengan NoReg ${dupCheck[0].noreg}!`);
		await supabase.from("siswa").upsert({
			noreg: s.NoReg,
			nama_lengkap: s.NamaLengkap ? s.NamaLengkap.toUpperCase() : "",
			kelas: s.Kelas,
			departemen: s.Departemen ? s.Departemen.toUpperCase() : s.Bagian ? s.Bagian.toUpperCase() : null,
			section: s.Section ? s.Section.toUpperCase() : "",
			hk: s.HK ? s.HK.toUpperCase() : s.HariKerja ? s.HariKerja.toUpperCase() : "6 HARI",
			nama_spv: s.NamaSPV ? s.NamaSPV.toUpperCase() : null,
			tanggal_masuk: s.TanggalMasuk,
			tanggal_keluar: s.TanggalKeluar || null,
			asal_daerah: s.AsalDaerah ? s.AsalDaerah.toUpperCase() : null,
			asal_sekolah: s.AsalSekolah ? s.AsalSekolah.toUpperCase() : null,
			distribusi: s.Distribusi,
			status: "AKTIF"
		});
		const { data: existingUser } = await supabase.from("users").select("id").eq("noreg", s.NoReg).single();
		if (!existingUser) {
			const email = `${s.NoReg}@indoprima.com`;
			const password = `${s.NoReg}IPG`;
			let authId;
			const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: {
					role: "SISWA",
					name: s.NamaLengkap ? s.NamaLengkap.toUpperCase() : ""
				}
			});
			if (authErr) {
				if (authErr.message.includes("already been registered")) {
					const { data: usersList } = await supabase.auth.admin.listUsers();
					const existing = usersList?.users?.find((usr) => usr.email === email);
					if (existing) authId = existing.id;
				}
			} else authId = authUser?.user?.id;
			if (authId) await supabase.from("users").upsert({
				id: authId,
				noreg: s.NoReg,
				email,
				nama_lengkap: s.NamaLengkap ? s.NamaLengkap.toUpperCase() : "",
				role: "SISWA"
			});
		} else await supabase.from("users").update({ nama_lengkap: s.NamaLengkap ? s.NamaLengkap.toUpperCase() : "" }).eq("noreg", s.NoReg);
	} else if (action === "deleteSiswa") {
		const noreg = args[0];
		const alasan = args[1];
		const keterangan = args[2];
		const { data: student } = await supabase.from("siswa").select("*").eq("noreg", noreg).single();
		if (student) {
			await supabase.from("turnover").insert({
				noreg: student.noreg,
				nama_lengkap: student.nama_lengkap ? student.nama_lengkap.toUpperCase() : "",
				departemen: student.departemen ? student.departemen.toUpperCase() : null,
				section: student.section ? student.section.toUpperCase() : "",
				tanggal_masuk: student.tanggal_masuk,
				tanggal_keluar: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
				alasan: alasan ? alasan.toUpperCase() : "DIKELUARKAN",
				keterangan: keterangan ? keterangan.toUpperCase() : "",
				asal_daerah: student.asal_daerah ? student.asal_daerah.toUpperCase() : null,
				asal_sekolah: student.asal_sekolah ? student.asal_sekolah.toUpperCase() : null
			});
			await supabase.from("siswa").update({
				status: "TURNOVER",
				tanggal_keluar: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
			}).eq("noreg", noreg);
			const { data: profile } = await supabase.from("users").select("id").eq("noreg", noreg).single();
			if (profile?.id) {
				await supabase.auth.admin.deleteUser(profile.id);
				await supabase.from("users").delete().eq("id", profile.id);
			}
		}
	} else if (action === "saveManpowerLog") {
		const l = args[0];
		const { data: studentData } = await supabase.from("siswa").select("nama_lengkap").eq("noreg", l.NoReg).single();
		const studentName = studentData ? studentData.nama_lengkap : null;
		const planNum = parseFloat(l.Plan);
		const aktualNum = parseFloat(l.Aktual);
		let persentase = null;
		if (!isNaN(planNum) && planNum > 0 && !isNaN(aktualNum)) persentase = aktualNum / planNum * 100;
		await supabase.from("manpower_log").upsert({
			noreg: l.NoReg,
			nama_lengkap: studentName,
			tanggal_record: l.TanggalRecord,
			plan: l.Plan,
			aktual: l.Aktual,
			reject: l.Reject,
			persentase,
			hadir: l.Hadir ? l.Hadir.toUpperCase() : "✔",
			keterangan: l.Keterangan ? l.Keterangan.toUpperCase() : "",
			shift: l.Shift ? l.Shift.toUpperCase() : null,
			bagian: l.Bagian ? l.Bagian.toUpperCase() : null,
			nomor_mesin: l.NomorMesin ? l.NomorMesin.toUpperCase() : null,
			model: l.Model ? l.Model.toUpperCase() : null,
			nama_spv: l.NamaSPV ? l.NamaSPV.toUpperCase() : null
		}, { onConflict: "noreg,tanggal_record" });
		let dbDate = l.TanggalRecord;
		if (dbDate && dbDate.includes("/")) {
			const parts = dbDate.split("/");
			dbDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
		const hadirVal = l.Hadir ? l.Hadir.toUpperCase() : "✔";
		let statusAbsen = "Hadir";
		if (hadirVal === "IJIN") statusAbsen = "Ijin";
		else if (hadirVal === "SAKIT") statusAbsen = "Sakit";
		else if (hadirVal === "ABSEN") statusAbsen = "Alpha";
		await supabase.from("absensi").upsert({
			noreg: l.NoReg,
			tanggal: dbDate,
			status: statusAbsen,
			keterangan: l.Keterangan ? l.Keterangan.toUpperCase() : ""
		}, { onConflict: "noreg,tanggal" });
	} else if (action === "saveTransaksiKeuangan") {
		const t = args[0];
		const normalizedTipe = t.tipe && t.tipe.toLowerCase() === "pemasukan" ? "Pemasukan" : "Pengeluaran";
		await supabase.from("keuangan").upsert({
			trans_id: t.transId || "TX-" + Date.now(),
			tipe: normalizedTipe,
			kategori: t.kat ? t.kat.toUpperCase() : t.kategori ? t.kategori.toUpperCase() : null,
			jumlah: t.jumlah,
			tanggal: t.tanggal,
			keterangan: t.ket ? t.ket.toUpperCase() : t.keterangan ? t.keterangan.toUpperCase() : ""
		});
	} else if (action === "deleteTransaksiKeuangan") await supabase.from("keuangan").delete().eq("trans_id", args[0]);
	else if (action === "saveTurnoverRecord") {
		const t = args[0];
		const isEdit = !!t.isEdit;
		const editId = t.editId || t.NoReg;
		if (isEdit && editId !== t.NoReg) await supabase.from("turnover").delete().eq("noreg", editId);
		await supabase.from("turnover").upsert({
			noreg: t.NoReg,
			nama_lengkap: t.NamaLengkap ? t.NamaLengkap.toUpperCase() : "",
			departemen: t.Departemen ? t.Departemen.toUpperCase() : t.Bagian ? t.Bagian.toUpperCase() : null,
			section: t.Section ? t.Section.toUpperCase() : "",
			tanggal_masuk: t.TanggalMasuk || null,
			tanggal_keluar: t.TanggalKeluar || null,
			alasan: t.Alasan ? t.Alasan.toUpperCase() : "",
			keterangan: t.Keterangan ? t.Keterangan.toUpperCase() : "",
			sync_at: /* @__PURE__ */ new Date()
		});
	} else if (action === "deleteTurnoverRecord") await supabase.from("turnover").delete().eq("noreg", args[0]);
	else if (action === "saveAbsensi") {
		const a = args[0];
		const toProperStatus = (st) => {
			if (!st) return "Hadir";
			const sLower = st.trim().toLowerCase();
			if (sLower === "alpha") return "Alpha";
			if (sLower === "ijin") return "Ijin";
			if (sLower === "sakit") return "Sakit";
			return "Hadir";
		};
		await supabase.from("absensi").upsert({
			noreg: a.noreg,
			tanggal: a.tanggal,
			status: toProperStatus(a.status),
			keterangan: a.keterangan ? a.keterangan.toUpperCase() : ""
		}, { onConflict: "noreg,tanggal" });
	} else if (action === "deleteAbsensi") await supabase.from("absensi").delete().eq("id", args[0]);
	else if (action === "savePopulasi") {
		const p = args[0];
		const { count, error: countErr } = await supabase.from("siswa").select("*", {
			count: "exact",
			head: true
		}).eq("status", "AKTIF");
		if (countErr) console.warn("Gagal menghitung siswa aktif untuk populasi:", countErr.message);
		const activeCount = count || 0;
		const { error: upsertErr } = await supabase.from("populasi").upsert({
			tanggal: p.tanggal,
			karyawan_kontrak: p.kontrak,
			ltc: activeCount,
			outsourcing: p.outsourcing,
			satpam_supir: p.satpamSupir,
			total_ltc: activeCount
		}, { onConflict: "tanggal" });
		if (upsertErr) throw new Error(upsertErr.message);
	} else if (action === "deletePopulasi") await supabase.from("populasi").delete().eq("tanggal", args[0]);
}
//#endregion
//#region \0virtual:astro:page:src/pages/api/rpc@_@js
var page = () => rpc_exports;
//#endregion
export { page };
