import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/siswa/index.js
var siswa_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var GET = async () => {
	try {
		const { data: students, error } = await supabase.from("v_siswa_aktif").select("*").order("nama_lengkap", { ascending: true });
		if (error) throw error;
		const mapped = (students || []).map((s) => ({
			id: s.noreg,
			namaLengkap: s.nama_lengkap,
			kelas: s.kelas,
			departemen: s.departemen,
			bagian: s.departemen || "",
			section: s.section,
			hk: s.hk,
			hariKerja: s.hk,
			spv: s.nama_spv || "",
			masuk: s.tanggal_masuk,
			distribusi: s.distribusi,
			keluar: s.tanggal_keluar,
			tanggalKeluar: s.tanggal_keluar,
			asalDaerah: s.asal_daerah || "",
			asalSekolah: s.asal_sekolah || "",
			status: s.status
		}));
		return new Response(JSON.stringify({
			success: true,
			students: mapped
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error fetching students:", err);
		return new Response(JSON.stringify({
			success: false,
			message: err.message
		}), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
};
var POST = async ({ request }) => {
	try {
		const s = await request.json();
		if (!s.NoReg || !s.NamaLengkap || !s.TanggalMasuk || !s.Distribusi || !s.Section) return new Response(JSON.stringify({
			success: false,
			message: "NoReg, Nama, Tanggal Masuk, Distribusi, dan Section wajib diisi."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const { error: siswaErr } = await supabase.from("siswa").insert({
			noreg: s.NoReg,
			nama_lengkap: s.NamaLengkap.toUpperCase(),
			departemen: s.Departemen ? s.Departemen.toUpperCase() : null,
			section: s.Section.toUpperCase(),
			hk: s.HK ? s.HK.toUpperCase() : "6 HARI",
			tanggal_masuk: s.TanggalMasuk,
			distribusi: s.Distribusi,
			tanggal_keluar: s.TanggalKeluar || null,
			nama_spv: s.NamaSPV ? s.NamaSPV.toUpperCase() : null,
			asal_daerah: s.AsalDaerah ? s.AsalDaerah.toUpperCase() : null,
			asal_sekolah: s.AsalSekolah ? s.AsalSekolah.toUpperCase() : null,
			status: "AKTIF"
		});
		if (siswaErr) throw siswaErr;
		const email = `${s.NoReg}@indoprima.com`;
		const password = `${s.NoReg}IPG`;
		let authId;
		const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				role: "SISWA",
				name: s.NamaLengkap.toUpperCase()
			}
		});
		if (authErr) if (authErr.message.includes("already been registered")) {
			const { data: usersList } = await supabase.auth.admin.listUsers();
			const existing = usersList?.users?.find((usr) => usr.email === email);
			if (existing) authId = existing.id;
			else {
				await supabase.from("siswa").delete().eq("noreg", s.NoReg);
				return new Response(JSON.stringify({
					success: false,
					message: "Gagal membuat akun login Supabase Auth: " + authErr.message
				}), {
					status: 400,
					headers: { "Content-Type": "application/json" }
				});
			}
		} else {
			console.error("Error creating auth user:", authErr);
			await supabase.from("siswa").delete().eq("noreg", s.NoReg);
			return new Response(JSON.stringify({
				success: false,
				message: "Gagal membuat akun login Supabase Auth: " + authErr.message
			}), {
				status: 400,
				headers: { "Content-Type": "application/json" }
			});
		}
		else authId = authUser.user.id;
		const { error: userDbErr } = await supabase.from("users").upsert({
			id: authId,
			noreg: s.NoReg,
			email,
			nama_lengkap: s.NamaLengkap.toUpperCase(),
			role: "SISWA"
		});
		if (userDbErr) {
			console.error("Error creating public profile user:", userDbErr);
			await supabase.from("siswa").delete().eq("noreg", s.NoReg);
			return new Response(JSON.stringify({
				success: false,
				message: "Gagal membuat profil login: " + userDbErr.message
			}), {
				status: 400,
				headers: { "Content-Type": "application/json" }
			});
		}
		return new Response(JSON.stringify({
			success: true,
			message: "Siswa dan akun login berhasil disimpan."
		}), {
			status: 201,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error adding student:", err);
		return new Response(JSON.stringify({
			success: false,
			message: err.message
		}), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/siswa/index@_@js
var page = () => siswa_exports;
//#endregion
export { page };
