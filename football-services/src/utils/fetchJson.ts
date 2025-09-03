import axios from "axios";

/** Map Sofascore URLs to our local proxy (/api/sofa/...) */
function toProxyUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.hostname.includes("sofascore.com")) {
      // keep what comes after /api/v1/
      const after = url.pathname.replace(/^\/+/, "").replace(/^api\/v1\//, "");
      return `/api/sofa/${after}${url.search || ""}`;
    }
    return u; // not sofascore
  } catch {
    // relative inputs
    if (u.startsWith("/api/v1/"))
      return `/api/sofa/${u.slice("/api/v1/".length)}`;
    if (u.startsWith("event/")) return `/api/sofa/${u}`;
    return u;
  }
}

export async function fetchJson<T = any>(url: string): Promise<T> {
  const finalUrl = toProxyUrl(url);
  try {
    const res = await axios.get<T>(finalUrl, { timeout: 15000 });
    return res.data;
  } catch (err: any) {
    console.error(`❌ fetchJson failed for ${finalUrl}`);
    console.error(err?.response?.data || err.message);
    throw err;
  }
}
