import type { ClaimStatus } from "@claims/shared";

// The one place the dashboard's chart colours are defined.
//
// Why literal colours and not the CSS variables: app/globals.css exposes --chart-1..--chart-5, but in this
// theme they are a greyscale ramp (oklch(... 0 0)) that is identical in :root and .dark, so six statuses
// drawn from it would be six shades of grey. These are fixed mid-tone hues instead, each chosen to clear
// WCAG 1.4.11's 3:1 minimum for graphical objects against BOTH card backgrounds the app can render —
// oklch(1 0 0) in light, oklch(0.205 0 0) in dark — so nothing has to change when the .dark class is on.
// That two-sided constraint is why several are a step darker than the obvious -500 shade: the -500s of
// zinc, emerald and amber are comfortable on the dark card but land near 2:1 on the white one.
//
// Agreement with components/status-badge.tsx (a status must mean the same thing everywhere): the badge
// gives approved an emerald tint, rejected the destructive red and info_requested an amber tint, and those
// three are reproduced here. The badge renders draft / submitted / under_review in neutral greys, which
// cannot separate three slices of a pie, so those get hues the badge does not use — no contradiction, just
// more information. If status-badge.tsx ever colours them, change them here to match.
export const STATUS_COLORS: Readonly<Record<ClaimStatus, string>> = {
  draft: "#71717a", // zinc-500    — the quietest status, matching the badge's outline variant
  submitted: "#3b82f6", // blue-500
  under_review: "#8b5cf6", // violet-500
  approved: "#059669", // emerald-600 — badge: emerald
  rejected: "#ef4444", // red-500     — badge: destructive
  info_requested: "#d97706", // amber-600   — badge: amber
};

// Single accent for the charts that measure one quantity (claims by type, claims created per week). Kept
// away from every hue above so a bar in these charts is never mistaken for a status.
export const ACCENT_COLOR = "#6366f1"; // indigo-500

// Axis labels, grid lines and tooltip cursors are drawn with `currentColor` so they inherit the Tailwind
// text colour of the wrapping element and follow the theme with no JavaScript. These are the opacities
// that keep them readable without competing with the data.
export const GRID_OPACITY = 0.15;
export const AXIS_OPACITY = 0.25;
export const CURSOR_OPACITY = 0.06;
