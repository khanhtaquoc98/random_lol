import { NextRequest, NextResponse } from "next/server";
import {
  getStoredRiotKeyConfig,
  maskRiotKey,
  setStoredRiotKeyConfig,
  verifyRiotApiKey,
} from "@/lib/riotKeyManager";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkLive = searchParams.get("verify") === "1";

  const config = getStoredRiotKeyConfig();
  const remainingMs = Math.max(0, config.expiresAt - Date.now());

  let verification = null;
  if (checkLive && config.apiKey) {
    verification = await verifyRiotApiKey(config.apiKey);
  }

  return NextResponse.json({
    hasKey: Boolean(config.apiKey),
    maskedKey: maskRiotKey(config.apiKey),
    updatedAt: config.updatedAt,
    expiresAt: config.expiresAt,
    remainingHours: Number((remainingMs / (1000 * 60 * 60)).toFixed(1)),
    verification,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newKey: string = (body.apiKey || "").trim();
    const adminSecretInput: string = (body.adminSecret || "").trim();
    const requiredAdminSecret = process.env.ADMIN_SECRET?.trim() || "";

    if (requiredAdminSecret && adminSecretInput !== requiredAdminSecret) {
      return NextResponse.json(
        {
          error: "Sai mật khẩu quản trị (ADMIN_SECRET). Không được phép đổi Key.",
        },
        { status: 403 }
      );
    }

    if (!newKey || !newKey.startsWith("RGAPI-")) {
      return NextResponse.json(
        {
          error:
            "Key không đúng định dạng. Riot API Key phải bắt đầu bằng 'RGAPI-' (ví dụ: RGAPI-8a096a38-...).",
        },
        { status: 400 }
      );
    }

    // Verify with Riot API first
    const check = await verifyRiotApiKey(newKey);
    const saved = setStoredRiotKeyConfig(newKey);

    return NextResponse.json({
      status: "success",
      maskedKey: maskRiotKey(saved.apiKey),
      updatedAt: saved.updatedAt,
      expiresAt: saved.expiresAt,
      remainingHours: 24.0,
      verification: check,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Không thể cập nhật Riot API Key.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
