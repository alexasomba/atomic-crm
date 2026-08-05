# separator

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/separator.tsx`: replaced Radix Separator with Base UI's callable Separator and removed unsupported `decorative` forwarding.

Leftover scan: clean.

## Left alone

All consumers and non-Radix wrappers were left alone.

## Behavior changes

Base UI Separator is semantic; purely decorative usages should use a hidden plain divider if that distinction becomes necessary.

## Verify by hand

Check horizontal and vertical separators in contact, deal, activity, and form layouts.
