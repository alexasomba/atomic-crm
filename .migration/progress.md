# progress

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/progress.tsx`: replaced Radix Progress with Base UI Root, Track, and Indicator; removed manual transform math because Base UI computes the indicator fill.

Leftover scan: clean.

## Left alone

Progress consumers were unchanged; non-Radix wrappers remain untouched.

## Behavior changes

Indicator sizing is now computed by Base UI rather than an inline translate transform.

## Verify by hand

Check zero, partial, and complete progress states on the dashboard and empty-state flows.
