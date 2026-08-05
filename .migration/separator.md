# separator

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/separator.tsx`: Migrated from `@radix-ui/react-separator` to `@base-ui/react/separator`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/separator.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- `decorative` prop dropped from Base UI Separator primitive (prop accepted on wrapper for backward compatibility, unused internally).

## Verify by hand

- Check horizontal and vertical separator lines in layout and menus.
