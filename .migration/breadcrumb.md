# breadcrumb

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/breadcrumb.tsx`: removed Radix Slot and retained BreadcrumbLink as a native anchor while preserving classes and ARIA attributes.

Leftover scan: clean.

## Left alone

No current consumers use `BreadcrumbLink asChild`; non-Radix navigation remains unchanged.

## Behavior changes

BreadcrumbLink is now always an anchor; this is safe for current consumers and documented for future polymorphic use.

## Verify by hand

Check breadcrumb links, current-page semantics, separator accessibility, and ellipsis screen-reader text.
