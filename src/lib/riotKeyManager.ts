import fs from "fs";
import path from "path";

export interface RiotKeyConfig {
  apiKey: string;
  updatedAt: number; // timestamp ms
  expiresAt: number; // updatedAt + 24h for development keys
  storageSource?: "SUPABASE" | "CACHE_FILE" | "ENV";
}

const CACHE_FILE = path.join(process.cwd(), ".riot-key-cache.json");
const ENV_LOCAL_FILE = path.join(process.cwd(), ".env.local");
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const SUPABASE_SETTING_KEY = "riot_api_key";

const DEFAULT_SUPABASE_URL = "https://udlhudfxwuwbecjqvvhv.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_2gwij9IgZu_VYTBP2lmAMw_jujJX3mN";

function getSupabaseCredentials() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  )
    .trim()
    .replace(/\/+$/, "");

  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    DEFAULT_SUPABASE_KEY
  ).trim();

  return { url, key };
}

let memoryKeyConfig: RiotKeyConfig | null = null;

/**
 * Fetches Riot API Key from Supabase `app_settings` table (where key = "riot_api_key")
 */
async function fetchRiotKeyFromSupabase(): Promise<RiotKeyConfig | null> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  try {
    const endpoint = `${url}/rest/v1/app_settings?key=eq.${encodeURIComponent(
      SUPABASE_SETTING_KEY
    )}&select=key,value,updated_at&limit=1`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: key,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const row = rows[0];
    const value = typeof row?.value === "string" ? row.value.trim() : "";
    if (!value) return null;

    const updatedAtMs = row?.updated_at
      ? new Date(row.updated_at).getTime()
      : Date.now();
    const safeUpdatedAt = Number.isNaN(updatedAtMs) ? Date.now() : updatedAtMs;

    return {
      apiKey: value,
      updatedAt: safeUpdatedAt,
      expiresAt: safeUpdatedAt + TWENTY_FOUR_HOURS_MS,
      storageSource: "SUPABASE",
    };
  } catch {
    return null;
  }
}

/**
 * Upserts Riot API Key into Supabase `app_settings` table (key = "riot_api_key")
 */
async function upsertRiotKeyToSupabase(
  cleanedKey: string
): Promise<RiotKeyConfig | null> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  try {
    const endpoint = `${url}/rest/v1/app_settings?on_conflict=key`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        key: SUPABASE_SETTING_KEY,
        value: cleanedKey,
        updated_at: nowIso,
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    const updatedAtMs = row?.updated_at
      ? new Date(row.updated_at).getTime()
      : nowMs;
    const safeUpdatedAt = Number.isNaN(updatedAtMs) ? nowMs : updatedAtMs;

    return {
      apiKey: cleanedKey,
      updatedAt: safeUpdatedAt,
      expiresAt: safeUpdatedAt + TWENTY_FOUR_HOURS_MS,
      storageSource: "SUPABASE",
    };
  } catch {
    return null;
  }
}

export async function getStoredRiotKeyConfig(): Promise<RiotKeyConfig> {
  // 1. Primary source: Supabase table `app_settings` (key = "riot_api_key")
  const supabaseConfig = await fetchRiotKeyFromSupabase();
  if (supabaseConfig && supabaseConfig.apiKey) {
    memoryKeyConfig = supabaseConfig;
    return supabaseConfig;
  }

  // 2. Check local file cache (.riot-key-cache.json)
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      if (raw && typeof raw.apiKey === "string" && raw.apiKey.trim()) {
        const fileCfg: RiotKeyConfig = {
          ...raw,
          storageSource: "CACHE_FILE",
        };
        memoryKeyConfig = fileCfg;
        return fileCfg;
      }
    }
  } catch {
    // ignore read error
  }

  // 3. Check memory cache
  if (memoryKeyConfig && memoryKeyConfig.apiKey) {
    return memoryKeyConfig;
  }

  // 4. Fallback to process.env.RIOT_API_KEY and seed Supabase if present
  const envKey = process.env.RIOT_API_KEY?.trim() || "";
  const now = Date.now();
  const initial: RiotKeyConfig = {
    apiKey: envKey,
    updatedAt: now,
    expiresAt: now + TWENTY_FOUR_HOURS_MS,
    storageSource: "ENV",
  };

  if (envKey) {
    memoryKeyConfig = initial;
    await upsertRiotKeyToSupabase(envKey);
  }

  return initial;
}

export async function setStoredRiotKeyConfig(
  newKey: string
): Promise<RiotKeyConfig> {
  const cleaned = newKey.trim();
  const now = Date.now();

  // 1. Upsert into Supabase `app_settings` (key = "riot_api_key")
  const supabaseSaved = await upsertRiotKeyToSupabase(cleaned);

  const config: RiotKeyConfig = supabaseSaved || {
    apiKey: cleaned,
    updatedAt: now,
    expiresAt: now + TWENTY_FOUR_HOURS_MS,
    storageSource: "CACHE_FILE",
  };

  memoryKeyConfig = config;
  process.env.RIOT_API_KEY = cleaned;

  // 2. Also keep local cache & .env.local in sync for local dev
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    // ignore on read-only serverless fs
  }

  try {
    if (fs.existsSync(ENV_LOCAL_FILE)) {
      const content = fs.readFileSync(ENV_LOCAL_FILE, "utf-8");
      const lines = content.split("\n");
      let found = false;
      const updated = lines.map((line) => {
        if (line.trim().startsWith("RIOT_API_KEY=")) {
          found = true;
          return `RIOT_API_KEY=${cleaned}`;
        }
        return line;
      });
      if (!found) {
        updated.unshift(`RIOT_API_KEY=${cleaned}`);
      }
      fs.writeFileSync(ENV_LOCAL_FILE, updated.join("\n"), "utf-8");
    }
  } catch {
    // ignore
  }

  return config;
}

export function maskRiotKey(key: string): string {
  if (!key || key.length < 14) return key ? "RGAPI-***" : "Chưa cấu hình";
  return `${key.slice(0, 11)}...${key.slice(-6)}`;
}

export async function verifyRiotApiKey(
  apiKey: string
): Promise<{ valid: boolean; status: number; message: string }> {
  if (!apiKey || !apiKey.trim()) {
    return {
      valid: false,
      status: 400,
      message: "Chưa có Riot API Key.",
    };
  }

  try {
    const res = await fetch(
      "https://vn2.api.riotgames.com/lol/status/v4/platform-data",
      {
        headers: { "X-Riot-Token": apiKey.trim() },
        cache: "no-store",
      }
    );

    if (res.ok) {
      return {
        valid: true,
        status: 200,
        message: "Riot API Key hợp lệ và đang hoạt động tốt!",
      };
    }

    if (res.status === 401 || res.status === 403) {
      let riotMsg = "";
      try {
        const errJson = await res.json();
        riotMsg = errJson?.status?.message || "";
      } catch {
        // ignore
      }
      return {
        valid: false,
        status: res.status,
        message:
          riotMsg === "Unknown apikey"
            ? `Riot trả về "Unknown apikey" (HTTP 401): Key này không tồn tại hoặc đã bị vô hiệu hóa khi bấm Regenerate. Hãy tích Captcha rồi bấm "Regenerate API Key" trên developer.riotgames.com và copy lại key mới!`
            : `Riot API Key đã hết hạn hoặc bị từ chối (HTTP ${res.status}${
                riotMsg ? `: ${riotMsg}` : ""
              }). Hãy lấy key mới trên developer.riotgames.com!`,
      };
    }

    return {
      valid: false,
      status: res.status,
      message: `Riot API phản hồi mã HTTP ${res.status}.`,
    };
  } catch (err) {
    return {
      valid: false,
      status: 500,
      message:
        err instanceof Error
          ? err.message
          : "Không thể kết nối tới máy chủ Riot Games.",
    };
  }
}
