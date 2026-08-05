# dropdown-menu

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/dropdown-menu.tsx`: mapped Radix Dropdown Menu to Base UI Menu, including Positioner/Popup, GroupLabel, submenu parts, and checkbox/radio indicators.
- `src/components/ui/dropdown-menu.tsx`: rewrote open-state and transform-origin styling to Base UI attributes and variables.

Leftover scan: clean.

## Left alone

Context menus are not present in this project; non-Radix command/drawer/sonner wrappers remain untouched.

## Behavior changes

Base UI checkbox/radio menu items do not close on click by default; this is flagged per migration guidance and was not silently overridden.

## Verify by hand

Open user, locale, sort, task, and tag menus; test keyboard navigation/typeahead, nested submenus, checkbox/radio selection, Escape, and focus return.
