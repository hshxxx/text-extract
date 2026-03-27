"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppSession } from "@/components/session-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { clearSession } = useAppSession();

  return (
    <button
      type="button"
      className="ghost-button"
      onClick={() =>
        startTransition(async () => {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.signOut();
          clearSession();
          router.replace("/login");
        })
      }
      disabled={isPending}
    >
      {isPending ? "退出中..." : "退出登录"}
    </button>
  );
}
