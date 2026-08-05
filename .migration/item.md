# item

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/item.tsx`: removed Radix Slot and retained Item as a native div while preserving all variants and separator composition.

Leftover scan: clean.

## Left alone

No current consumers use `Item asChild`; `ItemSeparator` continues using the migrated Separator wrapper.

## Behavior changes

Item is now always a div for the current consumer set.

## Verify by hand

Check item groups, media/content/actions, responsive wrapping, and item separators in pagination/empty states.
