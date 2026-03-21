"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ next = "/extract" }: { next?: string }) {
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
    <form
      className="panel center-card"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);

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
      <div className="hero">
        <h1>登录 AI Prompt Structurer</h1>
        <p>使用邮箱 Magic Link 登录。登录后可管理模型、模板与历史记录。</p>
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
      <div className="button-row">
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "发送中..." : "发送 Magic Link"}
        </button>
      </div>
      {message ? <p className="helper">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
