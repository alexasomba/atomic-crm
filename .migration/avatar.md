# avatar

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/avatar.tsx`: switched Root, Image, and Fallback parts to `@base-ui/react/avatar`, preserving custom fallback color logic.

Leftover scan: clean.

## Left alone

Avatar consumers and unrelated image components were not changed.

## Behavior changes

No intentional behavior change. The Base UI fallback delay prop is `delay` if a consumer needs it later.

## Verify by hand

Check loaded images, fallback initials, delayed fallback, and hashed fallback colors.
