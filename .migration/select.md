# select

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/select.tsx`: Migrated from `@radix-ui/react-select` to `@base-ui/react/select` (Viewport -> List, ScrollUp/DownButton -> ScrollUp/DownArrow).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/select.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Position maps to `alignItemWithTrigger` boolean on Positioner.

## Verify by hand

- Test selecting options in all select menus (e.g. status, sector, filter dropdowns).
