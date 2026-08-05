# checkbox

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/checkbox.tsx`: Migrated from `@radix-ui/react-checkbox` to `@base-ui/react/checkbox`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/checkbox.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Added `data-checked` attribute styling for Base UI compatibility alongside `data-[state=checked]`.

## Verify by hand

- Test checking and unchecking checkboxes across forms and data tables.
