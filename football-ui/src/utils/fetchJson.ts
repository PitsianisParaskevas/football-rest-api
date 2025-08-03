import axios from "axios";

export async function fetchJson<T = any>(url: string): Promise<T> {
  try {
    const response = await axios.get<T>(url);
    return response.data;
  } catch (err: any) {
    console.error(`❌ fetchJson failed for ${url}`);
    console.error(err?.response?.data || err.message);
    throw err;
  }
}
