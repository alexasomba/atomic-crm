# Project Radix UI -> Base UI Migration Summary

Date: 2026-08-05

## Dependency Swap

- Added: `@base-ui/react@1.7.0`
- Removed:
  - `@radix-ui/react-accordion`
  - `@radix-ui/react-avatar`
  - `@radix-ui/react-checkbox`
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-label`
  - `@radix-ui/react-navigation-menu`
  - `@radix-ui/react-popover`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-radio-group`
  - `@radix-ui/react-select`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-slot`
  - `@radix-ui/react-switch`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-toggle`
  - `@radix-ui/react-toggle-group`
  - `@radix-ui/react-tooltip`
  - `radix-ui`

## Component Migration Summary

The following 20 UI component wrappers and admin utilities were converted from Radix UI primitives to `@base-ui/react`:

1. `button.tsx`: `@radix-ui/react-slot` -> `@base-ui/react/button`
2. `badge.tsx`: `@radix-ui/react-slot` -> `@base-ui/react/use-render` + `mergeProps`
3. `breadcrumb.tsx`: `@radix-ui/react-slot` -> `@base-ui/react/use-render` + `mergeProps`
4. `item.tsx`: `@radix-ui/react-slot` -> `@base-ui/react/use-render` + `mergeProps`
5. `separator.tsx`: `@radix-ui/react-separator` -> `@base-ui/react/separator`
6. `label.tsx`: `@radix-ui/react-label` -> native `<label>`
7. `avatar.tsx`: `@radix-ui/react-avatar` -> `@base-ui/react/avatar`
8. `checkbox.tsx`: `@radix-ui/react-checkbox` -> `@base-ui/react/checkbox`
9. `switch.tsx`: `@radix-ui/react-switch` -> `@base-ui/react/switch`
10. `progress.tsx`: `@radix-ui/react-progress` -> `@base-ui/react/progress`
11. `toggle.tsx`: `@radix-ui/react-toggle` -> `@base-ui/react/toggle`
12. `toggle-group.tsx`: `@radix-ui/react-toggle-group` -> `@base-ui/react/toggle-group` + `@base-ui/react/toggle`
13. `radio-group.tsx`: `@radix-ui/react-radio-group` -> `@base-ui/react/radio-group` + `@base-ui/react/radio`
14. `accordion.tsx`: `@radix-ui/react-accordion` -> `@base-ui/react/accordion`
15. `tabs.tsx`: `@radix-ui/react-tabs` -> `@base-ui/react/tabs`
16. `dialog.tsx`: `@radix-ui/react-dialog` -> `@base-ui/react/dialog`
17. `sheet.tsx`: `@radix-ui/react-dialog` -> `@base-ui/react/dialog`
18. `popover.tsx`: `@radix-ui/react-popover` -> `@base-ui/react/popover`
19. `tooltip.tsx`: `@radix-ui/react-tooltip` -> `@base-ui/react/tooltip`
20. `dropdown-menu.tsx`: `@radix-ui/react-dropdown-menu` -> `@base-ui/react/menu`
21. `select.tsx`: `@radix-ui/react-select` -> `@base-ui/react/select`
22. `navigation-menu.tsx`: `radix-ui` -> `@base-ui/react/navigation-menu`
23. `sidebar.tsx`: `@radix-ui/react-slot` -> `@base-ui/react/use-render` + `mergeProps`
24. `src/components/admin/form.tsx`: Radix Label/Slot -> native `<label>` + Base UI `useRender`
25. `src/components/admin/columns-button.tsx`: Removed Radix Popover primitive
26. `src/components/admin/autocomplete-input.tsx`: Removed Radix Popover primitive

## Verification Results

- `bun run typecheck`: Passed (0 errors)
- `bun run test --run`: Passed (170/170 tests passing across 17 test files)
- `bun run build`: Passed (Production Vite bundle compiled in 4.66s)

0 wrappers remain on Radix.
