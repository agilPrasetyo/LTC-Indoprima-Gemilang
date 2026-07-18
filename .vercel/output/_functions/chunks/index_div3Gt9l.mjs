import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/populasi/index.js
var populasi_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var GET = async () => {
	try {
		const { data: pop, error } = await supabase.from("populasi").select("*").order("tanggal", { ascending: false });
		if (error) throw error;
		const mapped = (pop || []).map((p) => ({
			tanggal: p.tanggal,
			karyawanKontrak: p.karyawan_kontrak,
			ltc: p.ltc,
			outsourcing: p.outsourcing,
			satpamSupir: p.satpam_supir,
			totalKaryawan: p.total_karyawan,
			totalLtc: p.total_ltc
		}));
		return new Response(JSON.stringify({
			success: true,
			population: mapped
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error fetching population data:", err);
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
		const p = await request.json();
		if (!p.tanggal) return new Response(JSON.stringify({
			success: false,
			message: "Tanggal populasi wajib diisi."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		let targetDate = p.tanggal;
		if (targetDate.includes("/")) {
			const parts = targetDate.split("/");
			targetDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
		const { error } = await supabase.from("populasi").upsert({
			tanggal: targetDate,
			karyawan_kontrak: parseInt(p.karyawanKontrak) || 0,
			ltc: parseInt(p.ltc) || 0,
			outsourcing: parseInt(p.outsourcing) || 0,
			satpam_supir: parseInt(p.satpamSupir) || 0,
			total_ltc: parseInt(p.totalLtc) || 0
		}, { onConflict: "tanggal" });
		if (error) throw error;
		return new Response(JSON.stringify({
			success: true,
			message: "Data populasi berhasil disimpan."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in populasi POST API:", err);
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
//#region \0virtual:astro:page:src/pages/api/populasi/index@_@js
var page = () => populasi_exports;
//#endregion
export { page };
