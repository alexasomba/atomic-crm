# tabs

2026-08-05, transformation engine on legacy `new-york`, migrated successfully.

## Changed

- `src/components/ui/tabs.tsx`: replaced Radix Trigger/Content with Base UI Tab/Panel and mapped active/disabled selectors.

Leftover scan: clean.

## Left alone

Tabs consumers remain on the stable wrapper names; unrelated navigation wrappers were untouched.

## Behavior changes

Base UI defaults to manual activation. This is flagged per migration guidance and was not silently changed.

## Verify by hand

Check dashboard, company, and contact tabs with mouse and arrow keys; confirm active panel visibility and focus rings.
