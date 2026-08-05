# toggle

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/toggle.tsx`: Migrated from `@radix-ui/react-toggle` to `@base-ui/react/toggle`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/toggle.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Added `data-pressed` attribute styling.

## Verify by hand

- Test toggling states on toggle buttons.
