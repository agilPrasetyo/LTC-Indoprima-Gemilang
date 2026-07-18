import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/cron/cleanup.js
var cleanup_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ request }) => {
	try {
		const authHeader = request.headers.get("Authorization") || "";
		const apiKeyHeader = request.headers.get("x-api-key") || "";
		const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
		const secretKey = "IndoprimaCronSecret2026";
		if (token !== secretKey && apiKeyHeader !== secretKey) return new Response(JSON.stringify({
			success: false,
			message: "Unauthorized. API Key salah atau tidak disertakan."
		}), {
			status: 401,
			headers: { "Content-Type": "application/json" }
		});
		const { data, error } = await supabase.rpc("cleanup_old_turnover_logs");
		if (error) {
			console.error("Error running RPC cleanup_old_turnover_logs:", error);
			throw error;
		}
		return new Response(JSON.stringify({
			success: true,
			message: "Pembersihan terjadwal data turnover LTC berhasil dijalankan.",
			result: data
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in cron cleanup API:", err);
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
//#region \0virtual:astro:page:src/pages/api/cron/cleanup@_@js
var page = () => cleanup_exports;
//#endregion
export { page };
