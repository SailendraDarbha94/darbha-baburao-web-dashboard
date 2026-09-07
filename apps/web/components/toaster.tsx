"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * The app's single toast host, mounted once in app/layout.tsx. Everything else just calls
 * `toast.success()` / `toast.error()` from "sonner".
 *
 * sonner injects its own stylesheet when the module loads, so there is nothing to import into
 * globals.css, and it sets no font-family — the toasts inherit the body's Geist.
 *
 * Toasts are an addition, never the only signal: every form keeps its inline error text, which is
 * what a screen reader user gets if the toast has already timed out.
 */
export function Toaster() {
  return (
    <SonnerToaster
      // Bottom right: out of the way of the top nav and of the actions column on the claim detail page.
      position="bottom-right"
      // Success green vs error red — the two outcomes must not look alike at a glance.
      richColors
      closeButton
      // Long enough to read a Supabase/API error message, short enough not to pile up.
      duration={5000}
      // Nothing in this dashboard ever sets the `.dark` class, so pin the light theme instead of
      // letting sonner follow the OS and render dark toasts on a light page.
      theme="light"
    />
  );
}
