# progress

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/progress.tsx`: Migrated from `@radix-ui/react-progress` to `@base-ui/react/progress`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/progress.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Manual `style={{ transform: ... }}` dropped in favor of native Base UI `ProgressPrimitive.Track` and `ProgressPrimitive.Indicator` fill calculation.

## Verify by hand

- Verify progress bars in imports or tasks.
