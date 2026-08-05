# badge

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/badge.tsx`: Migrated from `@radix-ui/react-slot` to `@base-ui/react/use-render` + `mergeProps`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/badge.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

None.

## Verify by hand

- Verify badge rendering across all variants (default, secondary, destructive, outline).
