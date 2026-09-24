import { mergeTests } from "@playwright/test";
import { test as accessibilityTest } from "./accessibility";
import { test as componentPreviewTest } from "./component-preview";

export const test = mergeTests(accessibilityTest, componentPreviewTest);

export { expect } from "@playwright/test";
