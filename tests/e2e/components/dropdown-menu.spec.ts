import { expect, test } from "../fixtures";

test.describe("Dropdown menu trigger", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/components/dropdown-menu");
    await expect(page).toHaveTitle(new RegExp("Dropdown Menu | Bearnie", "i"));
  });

  test("renders one native button with menu state and an accessible name", async ({ componentPreview }) => {
    const preview = componentPreview.all().first();
    const trigger = preview.locator("[data-dropdown-trigger]");

    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveRole("button", { name: "Open Menu" });
    await expect(trigger.locator("button")).toHaveCount(0);
    await expect(trigger).toHaveAttribute("type", "button");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("opens once with native keyboard activation and restores focus on close", async ({ page, componentPreview }) => {
    const preview = componentPreview.all().first();
    const trigger = preview.locator("[data-dropdown-trigger]");
    const content = preview.locator("[data-dropdown-content]");

    await trigger.press("Enter");
    await expect(content).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("opens from ArrowUp and ArrowDown at the correct item", async ({ page, componentPreview }) => {
    const preview = componentPreview.all().first();
    const trigger = preview.locator("[data-dropdown-trigger]");
    const items = preview.locator("[data-dropdown-item]");

    await trigger.press("ArrowDown");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("Escape");

    await trigger.press("ArrowUp");
    await expect(items.last()).toBeFocused();
  });

  test("does not open when disabled", async ({ componentPreview }) => {
    const preview = componentPreview.all().first();
    const trigger = preview.locator("[data-dropdown-trigger]");
    const content = preview.locator("[data-dropdown-content]");

    await trigger.evaluate((element) => element.setAttribute("disabled", ""));
    await trigger.click({ force: true });
    await expect(content).toBeHidden();
  });
});
