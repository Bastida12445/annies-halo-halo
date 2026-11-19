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
  const menuResult = page
    .getByRole("status")
    .or(page.getByRole("article").first())
    .or(page.locator(".empty-state"));
  await expect(menuResult.first()).toBeVisible();

  for (const image of [
    "halo-halo-hero.jpg",
    "purple-smoothie.jpg",
    "leche-flan.jpg",
    "mango-graham-dessert.jpg",
  ]) {
    const response = await page.request.get(`/images/customer-dashboard/${image}`);
    expect(response.ok(), `${image} should be served successfully`).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image/");
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);

  for (const route of [
    "/admin/products",
    "/admin/products/new",
    "/admin/products/categories",
    "/admin/products/categories/new",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  }
});
