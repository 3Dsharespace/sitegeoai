import { expect, test } from "@playwright/test";

const unique = Date.now();

test.describe("Critical path", () => {
  test("register → login → create project → workspace → estimate", async ({ page }) => {
    const email = `e2e-${unique}@example.com`;
    const password = "testpass123";
    const projectName = `E2E Project ${unique}`;

    await page.goto("/login");
    await page.getByRole("button", { name: /Register/i }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /^Register$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto("/projects/new");
    await page.getByLabel(/Project name/i).fill(projectName);
    await page.getByRole("button", { name: /Create project/i }).click();

    await expect(page).toHaveURL(/\/projects\/\d+\/map/, { timeout: 30_000 });

    await page.goto(page.url().replace(/\/map.*/, "/workspace"));
    await expect(page).toHaveURL(/\/projects\/\d+\/workspace/, { timeout: 30_000 });
    await expect(page.getByText(/AI Studio|Studio|Workspace/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const workspaceUrl = page.url();
    const projectBase = workspaceUrl.replace(/\/workspace.*/, "");
    await page.goto(`${projectBase}/estimate`);
    await expect(page).toHaveURL(/\/projects\/\d+\/estimate/, { timeout: 30_000 });
    await expect(
      page.getByText(/BOQ|Estimate|Bill of quantities|No estimate/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
