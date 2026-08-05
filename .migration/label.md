# label

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/label.tsx`: replaced Radix Label with native `<label>` and preserved styling.

Leftover scan: clean.

## Left alone

Consumers remain unchanged because the public `Label` API is preserved. Non-Radix wrappers are untouched.

## Behavior changes

No primitive-specific behavior; native label semantics are intentional.

## Verify by hand

Confirm labels focus their associated controls and disabled form groups retain visual treatment.
