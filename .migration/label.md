# label

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/label.tsx`: Migrated from `@radix-ui/react-label` to native `<label>`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/label.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

None.

## Verify by hand

- Verify form input labels click to focus target fields.
