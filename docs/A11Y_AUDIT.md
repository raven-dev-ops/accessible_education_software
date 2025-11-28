# WCAG 2.1 AA audit notes (Alpha/Beta)

What’s in place
- Landmarks: `<header>`, `<nav aria-label="Primary">`, `<main id="main-content">`, `<footer role="contentinfo">`; skip link to main.
- Keyboard: global `:focus-visible` outline; all nav/buttons reachable; skip link visible on focus.
- Reduced motion: `prefers-reduced-motion` CSS disables animations/transitions.
- Live regions: student dashboard announces DB loads, Braille fallback, and ticket submission results.
- Braille: liblouis/fallback with status messaging; `.brf` download provided.
- Auth/login flows: buttons and inputs use accessible labels and consistent contrast from Tailwind defaults.

Checks to run (manual)
- Keyboard-only navigation through nav, forms, dialogs; verify visible focus and skip link.
- Screen reader sanity (VoiceOver/NVDA): page titles, landmark quick nav, headings in logical order, Braille status messaging.
- Contrast spot-check: ensure body text vs background ≥ 4.5:1; buttons/links vs backgrounds ≥ 3:1. (Run AXE/Deque for automated scan.)
- Motion: verify no autoplaying animation; reduced-motion preference respected.

Known gaps / next steps
- No automated AXE/Pa11y job yet; add to CI for regression checks.
- Full WCAG 2.1 AA pass pending (forms error validation, focus trapping on any future modals).
- Color/contrast of custom cards/badges should be revalidated against your brand palette.

How to extend
- Add `@axe-core/react` or Cypress + AXE for automated checks in CI.
- For modals/drawers, enforce focus trapping and `aria-modal="true"`; restore focus on close.
- Consider `prefers-color-scheme` contrast variants if brand colors change.久在线
