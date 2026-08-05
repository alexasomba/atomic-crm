# item

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/item.tsx`: Migrated `Item` from `@radix-ui/react-slot` to `@base-ui/react/use-render` + `mergeProps`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/item.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

None.

## Verify by hand

- Verify item rendering in lists and sidebar elements.
