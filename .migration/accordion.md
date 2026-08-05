# accordion

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/accordion.tsx`: replaced Radix Accordion with Base UI Root, Item, Header, Trigger, and Panel parts; mapped open/disabled selectors.
- `src/components/admin/error.tsx`: replaced Radix `type="multiple"` with Base UI `multiple`.

Leftover scan: clean.

## Left alone

No non-Radix wrappers were changed.

## Behavior changes

Base UI uses `multiple` instead of Radix's `type`; Base UI defaults to manual activation semantics where applicable.

## Verify by hand

Open and close error details, check keyboard focus, repeated toggles, and panel animation/layout.
