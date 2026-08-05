# dropdown-menu

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/dropdown-menu.tsx`: Migrated from `@radix-ui/react-dropdown-menu` to `@base-ui/react/menu` (Label -> GroupLabel, Sub -> SubmenuRoot, etc.).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/dropdown-menu.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Submenu primitives renamed (SubmenuRoot, SubmenuTrigger), ItemIndicators mapped to CheckboxItemIndicator/RadioItemIndicator.

## Verify by hand

- Open user menu, action menus in data table, check item selection and submenus.
