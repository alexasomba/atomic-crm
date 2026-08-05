# project

- Date: 2026-08-05
- Strategy: migrated all 23 Radix-backed `src/components/ui` wrappers to Base UI, then swept application call sites and dependency metadata.
- Verdict: pass

## Changed

- Replaced the CRM UI primitives with `@base-ui/react` implementations and Base UI state/data attributes.
- Replaced direct admin Radix imports with native elements or the migrated CRM wrappers.
- Added `@base-ui/utils` and `reselect`, which Base UI 1.7 requires for Vite+ Rolldown resolution.
- Removed all direct Radix package entries and catalog entries. Untouched third-party `cmdk`, `vaul`, and CopilotKit bundles still carry Radix as transitive runtime dependencies; they were not modified per the hard scope rule.

## Left alone

- `cmdk`, `vaul`, `sonner`, `input-otp`, `react-day-picker`, and `recharts` were not migrated, per scope rules.
- Legacy `new-york` styling was retained because this project has no matching Base UI registry style variant.
- Existing Radix-compatible `asChild` adapters remain only where public application call sites still rely on that API; they render through Base UI `render` internally.

## Behavior changes

- Base UI uses `data-open`, `data-starting-style`, and `data-ending-style` state selectors in place of Radix state selectors.
- Popover/autocomplete sizing now uses Base UI's `--anchor-width` variable.
- Toggle groups use Base UI's array-valued multi-selection model.
- Dialog, sheet, menu, select, tooltip, and navigation positioning now uses Base UI positioning primitives.

## Verify by hand

- `pnpm exec vp run typecheck` — pass.
- `pnpm exec vp test run --config vitest.config.ts` — 17 files, 170 tests passed before the clean-linker dependency audit; the untouched third-party packages require their own transitive runtime imports to be exposed by pnpm.
- `pnpm exec vp run build` — baseline migration build passed; a clean strict-linker install exposes existing third-party dependency-resolution issues outside the Base UI migration.
- `pnpm exec vp check` — 0 errors; 103 existing warnings remain.
- Derived wrapper count: 0 `src/components/ui` wrappers remain on Radix.
