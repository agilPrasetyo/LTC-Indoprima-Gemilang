import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/manpower/index.js
var manpower_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	try {
		const l = await request.json();
		if (!l.NoReg || !l.TanggalRecord || !l.NamaSPV || !l.Bagian) return new Response(JSON.stringify({
			success: false,
			message: "NoReg, Tanggal Record, SPV, dan Bagian wajib diisi."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		let targetDate = l.TanggalRecord;
		if (targetDate.includes("/")) {
			const p = targetDate.split("/");
			targetDate = `${p[2]}-${p[1]}-${p[0]}`;
		}
		const { data: studentData } = await supabase.from("siswa").select("nama_lengkap").eq("noreg", l.NoReg).single();
		const studentName = studentData ? studentData.nama_lengkap : null;
		const { error } = await supabase.from("manpower_log").upsert({
			noreg: l.NoReg,
			nama_lengkap: studentName,
			tanggal_record: targetDate,
			plan: l.Plan !== void 0 ? l.Plan : null,
			aktual: l.Aktual !== void 0 ? l.Aktual : null,
			reject: l.Reject !== void 0 ? l.Reject : null,
			hadir: l.Hadir ? l.Hadir.toUpperCase() : "✔",
			keterangan: l.Keterangan ? l.Keterangan.toUpperCase() : "",
			shift: l.Shift ? l.Shift.toUpperCase() : null,
			bagian: l.Bagian ? l.Bagian.toUpperCase() : null,
			nomor_mesin: l.NomorMesin ? l.NomorMesin.toUpperCase() : null,
			model: l.Model ? l.Model.toUpperCase() : null,
			nama_spv: l.NamaSPV ? l.NamaSPV.toUpperCase() : null
		}, { onConflict: "noreg,tanggal_record" });
		if (error) throw error;
		return new Response(JSON.stringify({
			success: true,
			message: "Log manpower harian berhasil disimpan."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error saving manpower log:", err);
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
//#region \0virtual:astro:page:src/pages/api/manpower/index@_@js
var page = () => manpower_exports;
//#endregion
export { page };
