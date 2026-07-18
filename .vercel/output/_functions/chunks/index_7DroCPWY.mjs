import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/keuangan/index.js
var keuangan_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var GET = async () => {
	try {
		const { data: txs, error: txErr } = await supabase.from("keuangan").select("*").order("tanggal", { ascending: false });
		if (txErr) throw txErr;
		let totalPemasukan = 0;
		let totalPengeluaran = 0;
		(txs || []).forEach((t) => {
			const amt = parseFloat(t.jumlah) || 0;
			if (t.tipe === "Pemasukan") totalPemasukan += amt;
			else if (t.tipe === "Pengeluaran") totalPengeluaran += amt;
		});
		const saldo = totalPemasukan - totalPengeluaran;
		const mappedTxs = (txs || []).map((t) => ({
			id: t.trans_id,
			tipe: t.tipe,
			kategori: t.kategori || "",
			jumlah: parseFloat(t.jumlah) || 0,
			tanggal: t.tanggal,
			keterangan: t.keterangan || ""
		}));
		return new Response(JSON.stringify({
			success: true,
			summary: {
				totalPemasukan,
				totalPengeluaran,
				saldo
			},
			transactions: mappedTxs
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in keuangan GET API:", err);
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
		const t = await request.json();
		if (!t.tipe || !t.jumlah || !t.tanggal) return new Response(JSON.stringify({
			success: false,
			message: "Tipe, Jumlah, dan Tanggal transaksi wajib diisi."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const txId = t.id || "TX-" + Date.now();
		const normalizedTipe = t.tipe.toLowerCase() === "pemasukan" ? "Pemasukan" : "Pengeluaran";
		const { error } = await supabase.from("keuangan").insert({
			trans_id: txId,
			tipe: normalizedTipe,
			kategori: t.kategori ? t.kategori.toUpperCase() : null,
			jumlah: parseFloat(t.jumlah),
			tanggal: t.tanggal,
			keterangan: t.keterangan ? t.keterangan.toUpperCase() : ""
		});
		if (error) throw error;
		return new Response(JSON.stringify({
			success: true,
			message: "Transaksi keuangan berhasil disimpan.",
			id: txId
		}), {
			status: 201,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in keuangan POST API:", err);
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
//#region \0virtual:astro:page:src/pages/api/keuangan/index@_@js
var page = () => keuangan_exports;
//#endregion
export { page };
