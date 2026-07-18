import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/absensi/index.js
var absensi_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var GET = async ({ url }) => {
	try {
		const bulanParam = url.searchParams.get("bulan");
		const tahunParam = url.searchParams.get("tahun");
		if (!bulanParam || !tahunParam) return new Response(JSON.stringify({
			success: false,
			message: "Parameter bulan dan tahun wajib disertakan."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const bulan = parseInt(bulanParam);
		const tahun = parseInt(tahunParam);
		const { data: students, error: studentErr } = await supabase.from("v_siswa_aktif").select("noreg, nama_lengkap");
		if (studentErr) throw studentErr;
		const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
		const lastDay = new Date(tahun, bulan, 0).getDate();
		const endDate = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
		const { data: attendanceLogs, error: absensiErr } = await supabase.from("absensi").select("*").gte("tanggal", startDate).lte("tanggal", endDate);
		if (absensiErr) throw absensiErr;
		const absensiMap = {};
		(attendanceLogs || []).forEach((log) => {
			if (!absensiMap[log.noreg]) absensiMap[log.noreg] = {};
			const dayNum = new Date(log.tanggal).getDate();
			absensiMap[log.noreg][dayNum] = {
				status: log.status,
				keterangan: log.keterangan || ""
			};
		});
		const gridRows = (students || []).map((s) => {
			const row = {
				noreg: s.noreg,
				nama_lengkap: s.nama_lengkap
			};
			const sAbs = absensiMap[s.noreg] || {};
			for (let day = 1; day <= 31; day++) if (day <= lastDay) {
				const record = sAbs[day];
				if (record) {
					row[`D${day}`] = record.status || "-";
					row[`K${day}`] = record.keterangan || "";
				} else {
					row[`D${day}`] = "-";
					row[`K${day}`] = "";
				}
			} else {
				row[`D${day}`] = "N/A";
				row[`K${day}`] = "";
			}
			return row;
		});
		return new Response(JSON.stringify({
			success: true,
			grid: gridRows,
			daysInMonth: lastDay
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in absensi GET API:", err);
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
		const { noreg, tanggal, status, keterangan } = await request.json();
		if (!noreg || !tanggal || !status) return new Response(JSON.stringify({
			success: false,
			message: "NoReg, Tanggal, dan Status wajib diisi."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		let targetDate = tanggal;
		if (targetDate.includes("/")) {
			const p = targetDate.split("/");
			targetDate = `${p[2]}-${p[1]}-${p[0]}`;
		}
		const toProperStatus = (st) => {
			if (!st) return "Hadir";
			const sLower = st.trim().toLowerCase();
			if (sLower === "alpha") return "Alpha";
			if (sLower === "ijin") return "Ijin";
			if (sLower === "sakit") return "Sakit";
			return "Hadir";
		};
		const { error } = await supabase.from("absensi").upsert({
			noreg,
			tanggal: targetDate,
			status: toProperStatus(status),
			keterangan: keterangan ? keterangan.toUpperCase() : ""
		}, { onConflict: "noreg,tanggal" });
		if (error) throw error;
		return new Response(JSON.stringify({
			success: true,
			message: "Absensi berhasil disimpan."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in absensi POST API:", err);
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
//#region \0virtual:astro:page:src/pages/api/absensi/index@_@js
var page = () => absensi_exports;
//#endregion
export { page };
