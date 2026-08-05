# tooltip

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/tooltip.tsx`: Migrated from `@radix-ui/react-tooltip` to `@base-ui/react/tooltip` using `Portal > Positioner > Popup`.
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/tooltip.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- TooltipProvider maps `delayDuration` to Base UI `delay`. Positioner wraps Popup.

## Verify by hand

- Hover over icons and buttons with tooltips, verify delay and positioning.
