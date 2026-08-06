import { describe, it } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { MobileNavigation } from "@/components/atomic-crm/layout/MobileNavigation";
import {
  createCrmScenario,
  CrmTestProvider,
} from "@/test/browser/atomic-crm/crmUiHarness";

describe("MobileNavigation create menu", () => {
  it.each([
    ["Contact", "Create Contact"],
    ["Note", "Create Note"],
    ["Task", "Create Task"],
  ])("opens the %s sheet", async (menuItem, title) => {
    const screen = await render(
      <CrmTestProvider scenario={createCrmScenario()}>
        <MobileNavigation />
      </CrmTestProvider>,
    );

    await screen.getByRole("button", { name: "Create" }).click();
    await screen.getByRole("menuitem", { name: menuItem }).click();
    await (expect as any).element(screen.getByText(title)).toBeInTheDocument();
  });
});
