# button

2026-08-05, transformation engine on the legacy `new-york` wrapper, migrated successfully.

## Changed

- `src/components/ui/button.tsx`: replaced Radix Slot with the real `@base-ui/react/button` primitive and mapped `asChild` behavior to Base UI's `render` prop while preserving variants and classes.
- `src/components/atomic-crm/companies/CompanyShow.tsx`: converted the button link call site to `render`.
- `src/components/atomic-crm/dashboard/DashboardStepper.tsx`: converted the button link call site to `render`.
- `src/components/atomic-crm/contacts/ContactImportButton.tsx`: converted the download link call site to `render`.
- `src/components/atomic-crm/deals/DealEdit.tsx`: converted the back-link call site to `render`.
- `src/components/admin/authentication.tsx`: converted the sign-in link call site to `render`.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: added `@base-ui/react` alongside Radix for progressive migration.

Leftover scan: `grep -n "radix-ui\\|@radix-ui"` on the component files is clean.

## Left alone

All other UI wrappers and consumers remain unchanged until their dependency-order migrations. Non-Radix wrappers such as `command`, `drawer`, and `sonner` are intentionally untouched.

## Behavior changes

Base UI's button primitive is used directly. Link rendering now uses `render`; no intentional interaction behavior change is expected.

## Verify by hand

- Open pages containing each converted link button.
- Confirm keyboard focus, disabled styling, navigation, and download behavior.
- Confirm icon-only and variant/size combinations still match the existing styling.
