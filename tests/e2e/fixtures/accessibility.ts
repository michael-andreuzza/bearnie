import AxeBuilder from "@axe-core/playwright";
import type { SerialFrameSelector } from "axe-core";
import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

type AxeRule = string;

export class Accessibility {
  constructor(private readonly page: Page) {}

  private get axe() {
    return new AxeBuilder({ page: this.page });
  }

  analyze() {
    return this.axe.analyze();
  }

  analyzeSelector(selector: SerialFrameSelector) {
    return this.axe.include(selector).analyze();
  }

  analyzeWithout(selector: SerialFrameSelector) {
    return this.axe.exclude(selector).analyze();
  }

  analyzeRules(rules: AxeRule | AxeRule[]) {
    return this.axe.withRules(rules).analyze();
  }
}

type AccessibilityFixtures = { accessibility: Accessibility };

export const test = base.extend<AccessibilityFixtures>({
  accessibility: async ({ page }, use) => {
    await use(new Accessibility(page));
  },
});

export { expect };
