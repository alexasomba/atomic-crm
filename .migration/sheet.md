# sheet

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/sheet.tsx`: moved the dialog-backed sheet to Base UI Backdrop/Popup parts and preserved side-specific layout classes.
- `src/components/atomic-crm/misc/ResponsiveFilters.tsx`: converted SheetTrigger/SheetClose `asChild` call sites to `render`.
- `src/components/atomic-crm/misc/CreateSheet.tsx`: converted SheetClose `asChild` to `render`.

Leftover scan: clean.

## Left alone

`drawer.tsx` remains on Vaul by design; it is not a Radix migration target.

## Behavior changes

Sheet transitions now use Base UI starting/ending styles. Exact swipe/drawer behavior remains intentionally Vaul-only in `drawer.tsx`.

## Verify by hand

Open mobile filters, create, and edit sheets from each side; confirm focus trap, Escape/backdrop close, buttons, and scrolling.
