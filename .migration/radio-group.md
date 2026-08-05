# radio-group

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/radio-group.tsx`: replaced Radix group/items with Base UI Radio Group and Radio Root/Indicator parts; updated disabled state selectors.

Leftover scan: clean.

## Left alone

The admin form consumer keeps its public wrapper API and was typechecked unchanged.

## Behavior changes

Base UI uses a separate Radio primitive for each item; callback details are available but existing single-argument handlers remain compatible.

## Verify by hand

Check row and column layouts, selection, labels, required/disabled state, and keyboard navigation.
