import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "./supabase";

/**
 * undefined = the stored session has not been read yet (render a spinner, do not evaluate route guards);
 * null      = signed out;
 * Session   = signed in.
 */
export type SessionState = Session | null | undefined;

const SessionContext = createContext<SessionState>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Without a client there is nothing to load, so start as "signed out" rather than "loading" forever.
  // Unreachable in practice: the root layout renders the configuration-error screen instead of
  // mounting this provider when the environment is missing.
  const [session, setSession] = useState<SessionState>(() =>
    getSupabase() ? undefined : null,
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }

    let cancelled = false;

    // Read the persisted session from AsyncStorage once. onAuthStateChange also emits INITIAL_SESSION
    // after the client finishes initialising, so both paths settle on the same value; the explicit call
    // is kept so the loading state cannot depend on event-ordering details of the auth library.
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
      }
    });

    // Every later change (sign in, sign out, token refresh, password reset exchange) lands here.
    // The callback must not call other auth methods synchronously (auth-js documents a deadlock), so it
    // only stores the value.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
