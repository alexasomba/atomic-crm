# popover

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/popover.tsx`: Migrated from `@radix-ui/react-popover` to `@base-ui/react/popover` using `Portal > Positioner > Popup`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/popover.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Popover positioning moved to `Positioner`; `PopoverAnchor` acts as an inert `div` container.

## Verify by hand

- Click popover triggers (e.g. column selector, date pickers, filters), test alignment and positioning.
