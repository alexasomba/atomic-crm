# sheet

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/sheet.tsx`: Migrated from `@radix-ui/react-dialog` to `@base-ui/react/dialog` (Overlay -> Backdrop, Content -> Popup).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/sheet.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- SheetOverlay migrated to Backdrop and SheetContent migrated to Popup.

## Verify by hand

- Open slide-out sheet menus and filters, test dismiss actions and side animations.
