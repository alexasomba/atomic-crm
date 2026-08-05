# tabs

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/tabs.tsx`: Migrated from `@radix-ui/react-tabs` to `@base-ui/react/tabs` (Trigger -> Tab, Content -> Panel).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/tabs.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Base UI defaults to manual tab activation; Tab list `activateOnFocus` can be added if automatic activation is required.

## Verify by hand

- Test tab switching across contact, deal, company, and dashboard pages.
