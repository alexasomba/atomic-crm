# switch

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/switch.tsx`: switched Root and Thumb to Base UI and rewrote checked/unchecked selectors.

Leftover scan: clean.

## Left alone

No current consumers required call-site changes.

## Behavior changes

Base UI renders a non-native switch root; disabled styling uses `data-disabled`.

## Verify by hand

Toggle theme/settings switches with mouse, keyboard, and disabled states.
