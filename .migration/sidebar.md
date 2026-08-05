# sidebar

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/sidebar.tsx`: Migrated polymorphic `Slot` usages to `@base-ui/react/use-render` + `mergeProps`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/sidebar.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Sidebar buttons, actions, and labels accept `render` prop instead of `asChild`.

## Verify by hand

- Toggle sidebar open/collapse, test navigation links in sidebar.
