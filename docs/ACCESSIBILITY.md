# Accessibility posture (Alpha)

- **Landmarks & headings**: All pages use semantic `<header>`, `<nav>`, `<main>`, and `<footer>` landmarks with skip-to-content. Primary navigation is labeled. Headings follow a logical outline.
- **Keyboard**: Global `:focus-visible` outline is enabled in `apps/web/styles/globals.css`. Skip link is focusable and visible, and controls are reachable by keyboard.
- **Live regions**: Student dashboard announces DB load state, Braille fallback, and support ticket submission status via polite/error alerts.
- **Braille**: Fallback Grade 1 mapper with optional liblouis/Nemeth; status surfaced in UI. See `docs/M4.md` for configuration.
- **Testing**: Manual checks in Chrome/Edge with keyboard-only navigation and VoiceOver/NVDA; run `npm run build --workspace @raven-dev-ops/accessible-education-web` to catch lint/a11y hints. CI runs lint/build on PRs.
- **Known gaps (Alpha)**: No end-to-end screen reader scripts yet; OCR/DB paths still mocked in some flows; color contrast may need a full WCAG pass on custom components; media prefers reduced motion not yet wired.
