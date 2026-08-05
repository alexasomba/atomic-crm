# tooltip

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/tooltip.tsx`: replaced Radix Provider/Content with Base UI Provider/Positioner/Popup, mapped `delayDuration` to `delay`, and rewrote transition selectors.
- `src/components/ui/tooltip.tsx`: added the Base UI Positioner/Arrow composition and retained a compatibility `asChild` adapter for existing consumers.

Leftover scan: clean.

## Left alone

Non-Radix `sonner` notifications and `drawer` remain untouched.

## Behavior changes

The default tooltip side offset is now 4px per Base UI's registry guidance; `disableHoverableContent` has no Base UI equivalent and remains to be reviewed if used.

## Verify by hand

Hover and focus every tooltip family, confirm delay feel, arrow placement, side collision, Escape behavior, and keyboard accessibility.
