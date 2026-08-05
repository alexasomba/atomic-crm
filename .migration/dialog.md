# dialog

2026-08-05, strategy: classification + transformation engine, success

## Changed

- `src/components/ui/dialog.tsx`: Migrated from `@radix-ui/react-dialog` to `@base-ui/react/dialog` (Overlay -> Backdrop, Content -> Popup).
Leftover check:
`grep -n "radix-ui\|@radix-ui" src/components/ui/dialog.tsx` -> clean (0 matches).

## Left alone

None.

## Behavior changes

- Overlay renamed to Backdrop and Content renamed to Popup per Base UI dialog anatomy.

## Verify by hand

- Open dialogs across the application, verify backdrop click dismissal, escape key behavior, and focus trap.
