# toggle-group

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/toggle-group.tsx`: Migrated from `@radix-ui/react-toggle-group` to `@base-ui/react/toggle-group` and `@base-ui/react/toggle`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/toggle-group.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- ToggleGroup items delegate to `@base-ui/react/toggle`.

## Verify by hand

- Test selecting single/multiple items in toggle groups.
