# avatar

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/avatar.tsx`: Migrated from `@radix-ui/react-avatar` to `@base-ui/react/avatar`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/avatar.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

None.

## Verify by hand

- Verify user and company avatar rendering with images and fallback text/initials.
