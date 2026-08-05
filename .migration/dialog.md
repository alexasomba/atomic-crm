# dialog

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/dialog.tsx`: replaced Radix Root/Overlay/Content with Base UI Root/Backdrop/Popup/Portal and rewrote open/close transitions using starting/ending styles.

Leftover scan: clean.

## Left alone

Dialog consumers retain the public wrapper names; command and form consumers were not otherwise changed.

## Behavior changes

Base UI uses `initialFocus`/`finalFocus` instead of Radix auto-focus callbacks; no current consumer used those callbacks.

## Verify by hand

Open every dialog family, confirm backdrop dismissal, Escape close, focus return, title/description announcements, and responsive sizing.
