import { expect, test } from "../fixtures";

test.describe("Accordion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/components/accordion");
    await expect(page).toHaveTitle(new RegExp("Accordion | Bearnie", "i"));
    await expect(page.getByRole("heading", { name: "Accordion", level: 1 })).toBeVisible();
  });

  test("renders accordion triggers as buttons", async ({ componentPreview }) => {
      const accordion = componentPreview.get("single").locator("[data-accordion]");
      const triggers = accordion.locator("[data-accordion-trigger]");

      await expect(triggers).toHaveCount(3);
      await expect(accordion.getByRole("button")).toHaveCount(3);
  });

  test("sets aria-expanded to false on closed triggers", async ({ componentPreview }) => {
    const accordion = componentPreview.get("single").locator("[data-accordion]");
    const triggers = accordion.locator("[data-accordion-trigger]");

    for (const trigger of await triggers.all()) {
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
  });

  test("associates each trigger with its panel using aria-controls", async ({ componentPreview }) => {
    const accordion = componentPreview.get("single").locator("[data-accordion]");
    const triggers = accordion.locator("[data-accordion-trigger]");

    for (const trigger of await triggers.all()) {
      const panelId = await trigger.getAttribute("aria-controls");
      const panel = accordion.locator(`#${panelId}`);

      await trigger.press("Enter");
      await expect(panel).toBeVisible();
    }
  });

  test("associates each panel with its trigger using aria-labelledby", async ({ componentPreview }) => {
    const accordion = componentPreview.get("single").locator("[data-accordion]");
    const panels = accordion.locator("[data-accordion-panel]");

    for (const panel of await panels.all()) {
      const triggerId = await panel.getAttribute("aria-labelledby");
      const trigger = accordion.locator(`#${triggerId}`);

      await expect(trigger).toBeVisible();
    }
  });

  for (const key of ["Enter", " "]) {
    test(`opens an item with the ${key} key`, async ({ componentPreview }) => {
      const accordion = componentPreview.get("single").locator("[data-accordion]");
      const triggers = accordion.locator("[data-accordion-trigger]");

      const firstTrigger = triggers.first();
      const panelId = await firstTrigger.getAttribute("aria-controls");
      const panel = accordion.locator(`#${panelId}`);

      await firstTrigger.press(key);
      await expect(panel).toBeVisible();
    });
  }

  test("keeps only one item open in single mode", async ({ componentPreview}) => {
    const accordion = componentPreview.get("single").locator("[data-accordion]");
    const triggers = accordion.locator("[data-accordion-trigger]");

    const firstTrigger = triggers.first();
    const secondTrigger = triggers.nth(1);

    const firstPanelId = await firstTrigger.getAttribute("aria-controls");
    const firstPanel = accordion.locator(`#${firstPanelId}`);

    const secondPanelId = await secondTrigger.getAttribute("aria-controls");
    const secondPanel = accordion.locator(`#${secondPanelId}`);

    await firstTrigger.press("Enter");
    await expect(firstPanel).toBeVisible();

    await secondTrigger.press("Enter");
    await expect(secondPanel).toBeVisible();
    await expect(firstPanel).toBeHidden();
  });

  test("allows multiple items to remain open in multiple mode", async ({ componentPreview }) => {
    const accordion = componentPreview.get("multiple").locator("[data-accordion]");
    const triggers = accordion.locator("[data-accordion-trigger]");

    const firstTrigger = triggers.first();
    const secondTrigger = triggers.nth(1);

    const firstPanelId = await firstTrigger.getAttribute("aria-controls");
    const firstPanel = accordion.locator(`#${firstPanelId}`);

    const secondPanelId = await secondTrigger.getAttribute("aria-controls");
    const secondPanel = accordion.locator(`#${secondPanelId}`);

    await firstTrigger.press("Enter");
    await expect(firstPanel).toBeVisible();

    await secondTrigger.press("Enter");
    await expect(secondPanel).toBeVisible();
    await expect(firstPanel).toBeVisible();
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      test("has no automatically detectable accessibility violations", async ({ accessibility, componentPreview }) => {
        const accessibilityReport = await accessibility.analyzeSelector(
          componentPreview.selector(),
        );

        expect(accessibilityReport.violations).toHaveLength(0);
      });
    });
  }
});
