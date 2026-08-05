# navigation-menu

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/navigation-menu.tsx`: replaced the unified Radix Navigation Menu import with Base UI Root/List/Item/Trigger/Content/Portal/Positioner/Popup/Viewport/Link/Icon parts.
- `src/components/ui/navigation-menu.tsx`: rewrote viewport variables and state selectors for Base UI positioning and transitions.

Leftover scan: clean.

## Left alone

There are currently no application consumers of this wrapper. Non-Radix wrappers remain untouched.

## Behavior changes

Base UI uses a 50ms navigation hover delay and a Positioner-managed viewport; this is flagged per migration guidance.

## Verify by hand

Add/open a navigation menu fixture and check hover delay, keyboard navigation, submenu focus, viewport sizing, and activation-direction transitions.
