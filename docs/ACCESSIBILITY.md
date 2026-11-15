# Accessibility verification

2026-11-15: focused review of Library, capture and dashboard controls. Native modal dialogs provide focus containment and Escape dismissal. Bookmark and organization editors explicitly restore their trigger focus after React unmounts. Library provides a keyboard skip control and a named filter group; filter buttons wrap on narrow screens.

`e2e/accessibility.spec.ts` checks accessible dialog/button names, keyboard containment, Escape/focus return, required-field focus and 320-pixel Library overflow. Existing focused flows cover capture validation, widget editing, command-palette selection, theme contrast and Home focus transitions. These checks are a regression baseline, not a WCAG conformance claim.

Before public release, evaluate with NVDA on Windows in Chrome and Edge: heading/landmark navigation, form labels and error announcements, dialog entry/exit, search result announcements, selection/bulk actions and widget timers. Verify 200%/400% zoom, high contrast and OS text scaling. Record browser/assistive-technology versions and findings. These interactions cannot be established by headless Chromium checks.
