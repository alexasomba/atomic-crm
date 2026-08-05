# switch

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/switch.tsx`: Migrated from `@radix-ui/react-switch` to `@base-ui/react/switch`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/switch.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Added `data-checked` and `data-unchecked` styling hooks.

## Verify by hand

- Toggle switches in settings and forms.
