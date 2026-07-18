import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as supabase } from "./supabase_kTRWeqky.mjs";
//#region src/pages/api/auth/logout.js
var logout_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ cookies }) => {
	try {
		const cookieOptions = {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			maxAge: 0
		};
		cookies.set("sb-access-token", "", cookieOptions);
		cookies.set("sb-refresh-token", "", cookieOptions);
		await supabase.auth.signOut();
		return new Response(JSON.stringify({
			success: true,
			message: "Berhasil keluar."
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error in logout API:", err);
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
//#region \0virtual:astro:page:src/pages/api/auth/logout@_@js
var page = () => logout_exports;
//#endregion
export { page };
