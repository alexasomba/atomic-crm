# navigation-menu

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/navigation-menu.tsx`: Migrated from `radix-ui` to `@base-ui/react/navigation-menu` (Indicator -> Icon, viewport height/width vars -> popup height/width vars).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/navigation-menu.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Indicator primitive mapped to Icon, viewport height/width CSS variables mapped to `--popup-height` and `--popup-width`.

## Verify by hand

- Hover navigation menu items and links.
