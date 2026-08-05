# checkbox

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/checkbox.tsx`: switched to Base UI Checkbox and rewrote Radix state selectors to `data-checked`/`data-disabled`.

Leftover scan: clean.

## Left alone

Checkbox consumers were unchanged because checked/value props remain compatible in current usage.

## Behavior changes

Base UI renders a non-native control root; disabled styling now uses data attributes.

## Verify by hand

Check contact selection, task completion, keyboard toggling, focus ring, and disabled state.
