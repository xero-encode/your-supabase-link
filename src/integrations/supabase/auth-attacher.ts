import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Client-side function middleware: attaches the current Supabase access
// token as an `Authorization: Bearer` header on every server function call.
// Server functions guarded by `requireSupabaseAuth` rely on this.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return next();

    return next({
      headers: { Authorization: `Bearer ${token}` },
    });
  },
);
