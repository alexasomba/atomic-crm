# sidebar

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/sidebar.tsx`: removed Radix Slot and added a local Base UI-compatible polymorphic renderer for sidebar labels, actions, menu buttons, and submenu buttons.
- `src/components/ui/sidebar.tsx`: retained the existing Sheet/Tooltip public composition, both already migrated to Base UI.

Leftover scan: clean.

## Left alone

The Vaul-based drawer remains intentionally untouched. Sidebar layout classes and state management were preserved.

## Behavior changes

Polymorphic sidebar rendering now uses the local renderer; tooltip delay and sheet transition changes are inherited from their component migrations.

## Verify by hand

Check desktop/mobile sidebar, collapse shortcut, active links, `asChild` links, tooltips in collapsed mode, menu actions, and submenu buttons.
