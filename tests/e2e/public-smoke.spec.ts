import { expect, test } from "@playwright/test";

test("home, menu, and account entry points render without business credentials", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /make room for a little sweetness/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /explore the menu/i }),
  ).toBeVisible();

  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "The menu" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/being set up/i);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
