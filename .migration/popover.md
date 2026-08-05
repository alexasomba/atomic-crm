# popover

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/popover.tsx`: replaced Radix Portal/Content with Base UI Portal/Positioner/Popup and mapped transform-origin variables.
- `src/components/ui/popover.tsx`: retained a compatibility `asChild` adapter on the public trigger while existing consumers are progressively swept.

Leftover scan: clean.

## Left alone

Popover Anchor is preserved as an inert span because Base UI has no equivalent anchor part; this gap is flagged rather than guessed.

## Behavior changes

Popover positioning now uses Base UI Positioner. The legacy anchor wrapper is inert and currently has no consumers.

## Verify by hand

Check autocomplete and column-picker popovers, alignment, collision handling, keyboard dismissal, and trigger focus return.
