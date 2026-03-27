"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { SessionResponse } from "@/lib/types/domain";

type SessionContextValue = {
  authenticated: boolean;
  userEmail: string | null;
  isLoading: boolean;
  setSession: (value: SessionResponse) => void;
  refreshSession: (options?: { force?: boolean }) => Promise<SessionResponse>;
  clearSession: () => void;
};

let cachedSession: SessionResponse | null = null;
let pendingSessionRequest: Promise<SessionResponse> | null = null;

async function fetchSession(force = false) {
  if (!force && cachedSession) {
    return cachedSession;
  }

  if (!force && pendingSessionRequest) {
    return pendingSessionRequest;
  }

  pendingSessionRequest = fetch("/api/session", { cache: "no-store" })
    .then(async (response) => {
      const data = (await response.json()) as SessionResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "获取登录状态失败。");
      }

      cachedSession = {
        authenticated: Boolean(data.authenticated),
        userEmail: data.userEmail ?? null,
      };

      return cachedSession;
    })
    .finally(() => {
      pendingSessionRequest = null;
    });

  return pendingSessionRequest;
}

function clearCachedSession() {
  cachedSession = { authenticated: false, userEmail: null };
  pendingSessionRequest = null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useAppSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("useAppSession 必须在 SessionShell 内使用。");
  }

  return value;
}

export function SessionShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<SessionResponse | null>(() => cachedSession);
  const [isLoading, setIsLoading] = useState(() => !cachedSession);

  function setSession(value: SessionResponse) {
    cachedSession = value;
    setSessionState(value);
  }

  async function refreshSession(options?: { force?: boolean }) {
    const next = await fetchSession(options?.force);
    setSession(next);
    return next;
  }

  function clearSession() {
    clearCachedSession();
    setSessionState(cachedSession);
  }

  useEffect(() => {
    let active = true;

    if (cachedSession) {
      setSessionState(cachedSession);
      setIsLoading(false);
      void refreshSession({ force: true }).catch(() => {
        // Keep stale session; API routes remain authoritative.
      });
      return () => {
        active = false;
      };
    }

    void fetchSession()
      .then((next) => {
        if (!active) {
          return;
        }
        setSession(next);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSession({ authenticated: false, userEmail: null });
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (session?.authenticated) {
      return;
    }

    const query = typeof window === "undefined" ? "" : window.location.search;
    const next = query ? `${pathname}${query}` : pathname;
    const redirectTarget = `/login?next=${encodeURIComponent(next || "/extract")}`;

    router.replace(redirectTarget);
  }, [isLoading, pathname, router, session?.authenticated]);

  const value = useMemo<SessionContextValue>(
    () => ({
      authenticated: Boolean(session?.authenticated),
      userEmail: session?.userEmail ?? null,
      isLoading,
      setSession,
      refreshSession,
      clearSession,
    }),
    [isLoading, session],
  );

  return (
    <SessionContext.Provider value={value}>
      <AppShell>{children}</AppShell>
    </SessionContext.Provider>
  );
}
