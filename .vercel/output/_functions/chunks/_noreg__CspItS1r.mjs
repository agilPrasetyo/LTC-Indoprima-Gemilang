import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/siswa/[noreg].js
var _noreg__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	PUT: () => PUT
});
var PUT = async ({ params, request }) => {
	try {
		const { noreg } = params;
		const s = await request.json();
		if (!noreg || !s.NamaLengkap || !s.TanggalMasuk || !s.Distribusi || !s.Section) return new Response(JSON.stringify({
			success: false,
			message: "NoReg, Nama, Tanggal Masuk, Distribusi, dan Section wajib diisi."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const { error: siswaErr } = await supabase.from("siswa").update({
			nama_lengkap: s.NamaLengkap.toUpperCase(),
			departemen: s.Departemen ? s.Departemen.toUpperCase() : null,
			section: s.Section.toUpperCase(),
			hk: s.HK ? s.HK.toUpperCase() : "6 HARI",
			tanggal_masuk: s.TanggalMasuk,
			distribusi: s.Distribusi,
			tanggal_keluar: s.TanggalKeluar || null,
			nama_spv: s.NamaSPV ? s.NamaSPV.toUpperCase() : null,
			asal_daerah: s.AsalDaerah ? s.AsalDaerah.toUpperCase() : null,
			asal_sekolah: s.AsalSekolah ? s.AsalSekolah.toUpperCase() : null
		}).eq("noreg", noreg);
		if (siswaErr) throw siswaErr;
		const { error: userErr } = await supabase.from("users").update({ nama_lengkap: s.NamaLengkap.toUpperCase() }).eq("noreg", noreg);
		if (userErr) console.warn("Gagal memperbarui nama lengkap di profil login user:", userErr.message);
		return new Response(JSON.stringify({
			success: true,
			message: "Profil siswa berhasil diperbarui."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error updating student:", err);
		return new Response(JSON.stringify({
			success: false,
			message: err.message
		}), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
};
var DELETE = async ({ params, request }) => {
	try {
		const { noreg } = params;
		const { alasan, keterangan, pengganti } = await request.json();
		if (!noreg || !alasan || !keterangan) return new Response(JSON.stringify({
			success: false,
			message: "NoReg, Alasan, dan Keterangan wajib disertakan."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const { data: s, error: fetchErr } = await supabase.from("siswa").select("*").eq("noreg", noreg).single();
		if (fetchErr || !s) return new Response(JSON.stringify({
			success: false,
			message: "Data siswa tidak ditemukan."
		}), {
			status: 404,
			headers: { "Content-Type": "application/json" }
		});
		const { error: turnoverErr } = await supabase.from("turnover").insert({
			noreg: s.noreg,
			nama_lengkap: s.nama_lengkap.toUpperCase(),
			departemen: s.departemen ? s.departemen.toUpperCase() : null,
			section: s.section.toUpperCase(),
			tanggal_masuk: s.tanggal_masuk,
			tanggal_keluar: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			pengganti: pengganti ? pengganti.toUpperCase() : null,
			keterangan: keterangan.toUpperCase(),
			alasan: alasan.toUpperCase(),
			asal_daerah: s.asal_daerah ? s.asal_daerah.toUpperCase() : null,
			asal_sekolah: s.asal_sekolah ? s.asal_sekolah.toUpperCase() : null
		});
		if (turnoverErr) throw turnoverErr;
		const { error: updateErr } = await supabase.from("siswa").update({
			status: "TURNOVER",
			tanggal_keluar: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		}).eq("noreg", noreg);
		if (updateErr) throw updateErr;
		const { data: profile } = await supabase.from("users").select("id").eq("noreg", noreg).single();
		if (profile?.id) {
			const { error: authDelErr } = await supabase.auth.admin.deleteUser(profile.id);
			if (authDelErr) console.warn("Gagal menghapus kredensial login Supabase Auth:", authDelErr.message);
			const { error: profileDelErr } = await supabase.from("users").delete().eq("id", profile.id);
			if (profileDelErr) console.warn("Gagal menghapus profil tabel public.users:", profileDelErr.message);
		}
		return new Response(JSON.stringify({
			success: true,
			message: "Siswa berhasil ditransisikan ke status TURNOVER."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error processing student turnover:", err);
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
//#region \0virtual:astro:page:src/pages/api/siswa/[noreg]@_@js
var page = () => _noreg__exports;
//#endregion
export { page };
