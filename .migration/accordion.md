# accordion

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/accordion.tsx`: Migrated from `@radix-ui/react-accordion` to `@base-ui/react/accordion` (Content -> Panel).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/accordion.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Accordion Content renamed to Panel per Base UI anatomy.

## Verify by hand

- Test expanding and collapsing accordion items.
