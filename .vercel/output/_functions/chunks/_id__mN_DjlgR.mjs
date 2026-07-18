import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/keuangan/[id].js
var _id__exports = /* @__PURE__ */ __exportAll({ DELETE: () => DELETE });
var DELETE = async ({ params }) => {
	try {
		const { id } = params;
		if (!id) return new Response(JSON.stringify({
			success: false,
			message: "ID transaksi wajib disertakan."
		}), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const { error } = await supabase.from("keuangan").delete().eq("trans_id", id);
		if (error) throw error;
		return new Response(JSON.stringify({
			success: true,
			message: "Transaksi keuangan berhasil dihapus."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error deleting transaction:", err);
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
//#region \0virtual:astro:page:src/pages/api/keuangan/[id]@_@js
var page = () => _id__exports;
//#endregion
export { page };
