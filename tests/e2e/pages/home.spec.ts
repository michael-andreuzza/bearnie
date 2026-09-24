import { expect, test } from "../fixtures";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bearnie/i);
  });

  test("content loads successfully", async ({ page }) => {
    await expect(page.getByTestId("logo")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Astro components, installed as source", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Components" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp("Copy npx bearnie init to clipboard", "i") })).toBeVisible();
    await expect(page.locator("body")).toBeVisible();
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      // @todo Theme primary colours are failing contrast ratios
      test.skip("has no automatically detectable accessibility violations", async ({ accessibility }) => {
        const accessibilityReport = await accessibility.analyze();

        expect(accessibilityReport.violations).toHaveLength(0);
      });
    });
  }
});
