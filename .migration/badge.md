# badge

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/badge.tsx`: removed the Radix Slot dependency and preserved the badge as a native span with unchanged variants.

Leftover scan: clean.

## Left alone

No current consumers use the removed `asChild` prop; unrelated links and buttons remain unchanged.

## Behavior changes

Badge is now always a span. If polymorphic badge rendering is needed later, use an explicit Base UI render wrapper.

## Verify by hand

Check default, secondary, destructive, outline, icon, and long-text badge layouts.
