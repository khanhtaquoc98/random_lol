"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Server,
} from "lucide-react";

interface KeyStatusData {
  hasKey: boolean;
  maskedKey: string;
  updatedAt: number;
  expiresAt: number;
  remainingHours: number;
  storageSource?: string;
  settingKey?: string;
  verification?: {
    valid: boolean;
    status: number;
    message: string;
  } | null;
}

export default function AdminConfigPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [keyStatus, setKeyStatus] = useState<KeyStatusData | null>(null);
  const [newRiotKey, setNewRiotKey] = useState("");
  const [updateMsg, setUpdateMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchKeyStatus = async (secretToUse: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/lol/riot-key?verify=1", {
        headers: {
          "x-admin-secret": secretToUse.trim(),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setIsAuthenticated(false);
        setAuthError(data.error || "Sai mật khẩu quản trị (ADMIN_SECRET).");
        return;
      }
      setKeyStatus(data);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Lỗi kết nối tới server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) return;
    fetchKeyStatus(adminSecret);
  };

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiotKey.trim()) return;

    setIsLoading(true);
    setUpdateMsg(null);
    try {
      const res = await fetch("/api/lol/riot-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: newRiotKey.trim(),
          adminSecret: adminSecret.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpdateMsg({
          type: "error",
          text: data.error || "Cập nhật key thất bại.",
        });
      } else {
        setNewRiotKey("");
        setKeyStatus({
          hasKey: true,
          maskedKey: data.maskedKey,
          updatedAt: data.updatedAt,
          expiresAt: data.expiresAt,
          remainingHours: data.remainingHours,
          verification: data.verification,
        });
        setUpdateMsg({
          type: data.verification?.valid ? "success" : "error",
          text:
            data.verification?.message ||
            "Đã lưu Riot API Key mới lên server!",
        });
      }
    } catch (err) {
      setUpdateMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi khi lưu key.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-3 sm:px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-lg p-5 sm:p-8">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black uppercase tracking-wider text-slate-900">
              Trang Quản Trị Cấu Hình API (/admin)
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý &amp; Hot-Reload Riot Games API Key trên Server (Ẩn hoàn
              toàn với người dùng thường)
            </p>
          </div>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Nhập mật khẩu quản trị (ADMIN_SECRET)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Nhập ADMIN_SECRET để mở khóa..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs cursor-pointer"
                >
                  {isLoading ? "Đang kiểm tra..." : "Mở Khóa"}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-6">
            {/* Current Riot API Key Status Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-teal-600" />
                  <span>Trạng Thái Riot API Key Hiện Tại</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchKeyStatus(adminSecret)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:border-teal-500 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-teal-600 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  <span>Kiểm tra lại với Riot</span>
                </button>
              </div>

              {keyStatus && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">
                      Key lưu trong Supabase (<code>app_settings.{keyStatus.settingKey || "riot_api_key"}</code>):
                    </span>
                    <strong className="font-mono text-sm text-slate-900">
                      {keyStatus.maskedKey}
                    </strong>
                    <span className="block text-[11px] text-teal-700 font-semibold mt-0.5">
                      Nguồn: {keyStatus.storageSource || "SUPABASE"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">
                      Trạng thái kết nối Riot API:
                    </span>
                    {keyStatus.verification?.valid ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                        Đang hoạt động (~{keyStatus.remainingHours}h)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                        <AlertTriangle className="w-4 h-4 text-rose-600" /> Hết
                        hạn / Không hợp lệ
                      </span>
                    )}
                  </div>
                </div>
              )}

              {keyStatus?.verification?.message && (
                <p
                  className={`text-xs p-2.5 rounded-lg ${
                    keyStatus.verification.valid
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  {keyStatus.verification.message}
                </p>
              )}
            </div>

            {/* Form to Update Riot API Key */}
            <form onSubmit={handleUpdateKey} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Cập Nhật Riot Games API Key Mới (Hot-Reload)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newRiotKey}
                  onChange={(e) => setNewRiotKey(e.target.value)}
                  placeholder="Dán RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx mới vào đây..."
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-600 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isLoading || !newRiotKey.trim()}
                  className="px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? "Đang lưu..." : "Lưu & Kích Hoạt Key"}
                </button>
              </div>

              {updateMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    updateMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  {updateMsg.text}
                </div>
              )}
            </form>

            {/* Info about connected AI Endpoint */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-700 uppercase">
                <Server className="w-4 h-4" />
                <span>Endpoint Phân Tích AI Đang Kết Nối</span>
              </div>
              <p className="font-mono text-slate-900 break-all">
                https://summary-bot-sepia.vercel.app/api/analyze-lol-match
              </p>
              <p className="text-slate-600">
                Mọi yêu cầu phân tích từ trang <code>/match-analyzer</code> sẽ
                tự động gửi sang API <code>bot-summary</code> trên Vercel.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
