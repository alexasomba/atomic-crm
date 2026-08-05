# select

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/select.tsx`: mapped Root, Trigger, Value, Icon, Portal, Positioner, Popup, List, arrows, GroupLabel, Item, and Indicator to Base UI.
- `src/components/ui/select.tsx`: mapped `position="popper"` to `alignItemWithTrigger={false}` and rewrote Radix CSS variables/state hooks.

Leftover scan: clean.

## Left alone

Select call sites retain wrapper names and existing string values; unrelated form controls remain unchanged.

## Behavior changes

Base UI select values support wider types and its Value renders raw values unless item mapping is supplied. Current consumers use matching values/labels.

## Verify by hand

Test task/status/category/team selectors, placeholder display, keyboard typeahead, scrolling arrows, collision placement, and disabled options.
