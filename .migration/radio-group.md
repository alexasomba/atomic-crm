# radio-group

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/radio-group.tsx`: Migrated from `@radix-ui/react-radio-group` to `@base-ui/react/radio-group` and `@base-ui/react/radio`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/radio-group.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Split primitives between `@base-ui/react/radio-group` (Root) and `@base-ui/react/radio` (Item/Indicator).

## Verify by hand

- Test selecting radio items in forms and settings.
