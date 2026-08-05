# button

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/button.tsx`: Migrated from `@radix-ui/react-slot` to `@base-ui/react/button`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/button.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

None.

## Verify by hand

- Click buttons in various states (default, destructive, outline, secondary, ghost, link).
- Verify keyboard focus ring and active state.
