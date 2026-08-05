# toggle-group

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/toggle-group.tsx`: replaced Radix Toggle Group with Base UI Toggle Group and reused Base UI Toggle for items.
- `src/components/atomic-crm/layout/MobileNavigation.tsx`: changed the single-selection value to Base UI's array shape.

Leftover scan: clean.

## Left alone

Non-Radix wrappers remain untouched.

## Behavior changes

Base UI uses `multiple` and array values; single selection remains the default.

## Verify by hand

Switch theme choices with mouse and keyboard; confirm only one option is pressed and theme changes persist.
