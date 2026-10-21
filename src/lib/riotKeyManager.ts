import fs from "fs";
import path from "path";

export interface RiotKeyConfig {
  apiKey: string;
  updatedAt: number; // timestamp ms
  expiresAt: number; // updatedAt + 24h for development keys
}

const CACHE_FILE = path.join(process.cwd(), ".riot-key-cache.json");
const ENV_LOCAL_FILE = path.join(process.cwd(), ".env.local");
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let memoryKeyConfig: RiotKeyConfig | null = null;

export function getStoredRiotKeyConfig(): RiotKeyConfig {
  // 1. Check file cache first
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      if (raw && typeof raw.apiKey === "string" && raw.apiKey.trim()) {
        memoryKeyConfig = raw;
        return raw;
      }
    }
  } catch {
    // ignore read error
  }

  // 2. Check memory cache
  if (memoryKeyConfig && memoryKeyConfig.apiKey) {
    return memoryKeyConfig;
  }

  // 3. Fallback to process.env.RIOT_API_KEY
  const envKey = process.env.RIOT_API_KEY?.trim() || "";
  const now = Date.now();
  const initial: RiotKeyConfig = {
    apiKey: envKey,
    updatedAt: now,
    expiresAt: now + TWENTY_FOUR_HOURS_MS,
  };

  if (envKey) {
    memoryKeyConfig = initial;
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch {
      // ignore on read-only fs
    }
  }

  return initial;
}

export function setStoredRiotKeyConfig(newKey: string): RiotKeyConfig {
  const cleaned = newKey.trim();
  const now = Date.now();
  const config: RiotKeyConfig = {
    apiKey: cleaned,
    updatedAt: now,
    expiresAt: now + TWENTY_FOUR_HOURS_MS,
  };

  memoryKeyConfig = config;
  process.env.RIOT_API_KEY = cleaned;

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    // ignore on read-only serverless fs
  }

  // Also update .env.local if writable
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
      return {
        valid: false,
        status: res.status,
        message:
          "Riot API Key đã hết hạn (24h) hoặc không hợp lệ (HTTP " +
          res.status +
          "). Hãy dán key mới từ developer.riotgames.com!",
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
