"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({
  next = "/extract",
  supabaseConfigured = true,
  configurationMessage,
}: {
  next?: string;
  supabaseConfigured?: boolean;
  configurationMessage?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    void supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        window.history.replaceState({}, document.title, `/login?next=${encodeURIComponent(next)}`);
        router.replace(next);
        router.refresh();
      });
  }, [next, router]);

  return (
    <div className="auth-shell center-card">
      <div className="auth-grid">
        <div className="auth-copy">
          <span className="eyebrow">Private workspace access</span>
          <h1>登录后进入结构化工作流。</h1>
          <p>
            使用邮箱 Magic Link 登录。登录后可以直接管理模型模板、执行文本解析、查看图片与文案历史，并导出到 Google Sheets。
          </p>
          <div className="auth-notes">
            <div className="soft-card">
              <strong>登录后可用</strong>
              <p>文本解析、图片生成、图片编辑、文案生成、导出与历史追溯。</p>
            </div>
            <div className="soft-card">
              <strong>默认跳转</strong>
              <p>登录成功后进入你请求的工作页，没有指定时进入文本解析。</p>
            </div>
          </div>
        </div>

        <form
          className="panel auth-panel"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            setError(null);

            if (!supabaseConfigured) {
              setError(
                configurationMessage ?? "本地环境未初始化，请先运行 `npm run env:link` 并重启 dev server。",
              );
              return;
            }

            startTransition(async () => {
              try {
                const supabase = getSupabaseBrowserClient();
                const redirectTo = new URL("/api/auth/callback", window.location.origin);
                redirectTo.searchParams.set("next", next);

                const { error: signInError } = await supabase.auth.signInWithOtp({
                  email,
                  options: {
                    emailRedirectTo: redirectTo.toString(),
                  },
                });

                if (signInError) {
                  throw signInError;
                }

                setMessage("Magic Link 已发送，请从邮箱打开登录链接。");
              } catch (submitError) {
                setError(
                  submitError instanceof Error ? submitError.message : "发送登录链接失败，请稍后重试。",
                );
              }
            });
          }}
        >
          <div className="section-header">
            <div>
              <h2>邮箱登录</h2>
              <p className="lead">输入邮箱后系统会发送一次性登录链接。</p>
            </div>
            <span className="status-pill">Magic Link</span>
          </div>
          <div className="field">
            <label htmlFor="email">邮箱地址</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="button-row primary-group">
            <button type="submit" className="primary-button" disabled={isPending || !supabaseConfigured}>
              {isPending ? "发送中..." : "发送 Magic Link"}
            </button>
          </div>
          {!supabaseConfigured ? (
            <p className="error-text">
              {configurationMessage ?? "本地环境未初始化，请先运行 `npm run env:link`。"}
            </p>
          ) : null}
          {message ? <p className="helper">{message}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
