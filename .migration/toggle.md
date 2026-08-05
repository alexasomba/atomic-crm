# toggle

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/toggle.tsx`: switched to Base UI's callable Toggle and mapped `data-state=on` styling to `data-pressed`.

Leftover scan: clean.

## Left alone

Toggle group remains on Radix until its paired migration; unrelated controls are untouched.

## Behavior changes

Base UI uses `pressed`/`defaultPressed` terminology internally; the wrapper preserves its public rendering contract.

## Verify by hand

Check pressed, unpressed, disabled, focus, and variant styling wherever toggle controls appear.
