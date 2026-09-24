import type { Locator, Page } from "@playwright/test";
import { test as base } from "@playwright/test";

export class ComponentPreview {
  constructor(private readonly page: Page) {}

  selector(): string {
    return '[data-component-preview] [data-preview-panel="preview"]';
  }

  get(id: string): Locator {
    return this.page.locator(`[data-component-preview="preview-${id}"]`);
  }

  all(id?: string): Locator {
    return id
      ? this.get(id)
      : this.page.locator(this.selector());
  }
}

type ComponentPreviewFixtures = {
  componentPreview: ComponentPreview;
};

export const test = base.extend<ComponentPreviewFixtures>({
  componentPreview: async ({ page }, use) => {
    await use(new ComponentPreview(page));
  },
});
