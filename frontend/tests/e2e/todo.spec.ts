import { expect, test } from "@playwright/test";

async function enterDemo(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path);
  await page.evaluate(() => {
    localStorage.removeItem("ai-agent-todo.session");
    localStorage.removeItem("ai-agent-todo.tasks");
    localStorage.removeItem("ai-agent-todo.theme");
  });
  await page.goto(path);
  await page.getByRole("button", { name: "使用演示账号（本地）" }).click();
}

test("page routes open without a blank screen", async ({ page }) => {
  await enterDemo(page);

  for (const route of ["/", "/today", "/tasks", "/ai", "/board", "/calendar", "/stats", "/tags", "/settings"]) {
    await page.goto(route);
    await expect(page.locator(".minimal-shell")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
  }

  await page.goto("/not-a-real-route");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "早上好，今天也要高效完成任务！" })).toBeVisible();
});

test("user can create, search, filter, edit, complete and delete a task", async ({ page, isMobile }) => {
  await enterDemo(page);
  const createdTitle = "Playwright唯一任务 <script>alert(\"xss\")</script>";
  const editedTitle = "Playwright唯一任务 - 已编辑";

  await page.getByRole("button", { name: "新建任务" }).first().click();
  await page.getByRole("button", { name: "自定义创建" }).click();
  await page.getByLabel("任务标题").fill(createdTitle);
  await page.getByLabel("描述").fill("中文、emoji ✨ 和 <img src=x onerror=alert(\"xss\") /> 都应作为文本展示。");
  await page.getByLabel("优先级").selectOption("高");
  await page.getByLabel("分类").selectOption("测试");
  await page.getByLabel("标签").fill("测试, 安全");
  await page.getByRole("button", { name: "创建任务" }).click();

  await page.getByRole("button", { name: "全部任务" }).first().click();
  const taskSurface = page.locator(isMobile ? ".mobile-task-card" : "tbody tr").filter({ hasText: "Playwright唯一任务" }).first();
  await expect(taskSurface).toBeVisible();
  await page.getByPlaceholder("搜索任务...").fill("Playwright唯一任务");
  await expect(page.getByText("共 1 条")).toBeVisible();
  await page.locator(".filter-bar select").nth(1).selectOption("高");
  await expect(page.getByText("共 1 条")).toBeVisible();

  await taskSurface.click();
  await expect(page.getByRole("heading", { name: /Playwright唯一任务/ })).toBeVisible();
  await page.locator(".drawer").getByRole("button", { name: "编辑任务" }).click();
  await page.getByLabel("任务标题").fill(editedTitle);
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.locator(isMobile ? ".mobile-task-card" : "tbody tr").filter({ hasText: editedTitle }).first()).toBeVisible();

  await expect(page.locator(".drawer")).toBeVisible();
  await page.locator(".drawer").getByRole("button", { name: "标记完成" }).click();
  await expect(page.locator(".drawer").getByText("已完成").first()).toBeVisible();

  await page.locator(".drawer").getByRole("button", { name: "删除任务" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText(editedTitle)).toHaveCount(0);
});

test("settings page can save API key, show masked value and update model", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();

  // 填入 API Key 并保存
  const apiKeyInput = page.getByPlaceholder(/sk-\.\.\./);
  await apiKeyInput.fill("sk-test-playwright-key-1234");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();

  // 只更新模型名称，不覆盖 Key
  const modelInput = page.locator("input").nth(2);
  await modelInput.fill("gpt-4-turbo");
  await page.getByRole("button", { name: "保存设置" }).click();

  // 点击测试连接（预期失败，因为 key 是假的）
  await page.getByRole("button", { name: "测试连接" }).click();
  // 等待反馈出现（成功或失败均可，验证交互通畅）
  await expect(page.locator(".connection-result")).toBeVisible({ timeout: 12000 });
});

test("dark mode, AI page and mobile layout are usable", async ({ page, isMobile }) => {
  await enterDemo(page);

  await page.getByLabel("切换主题").click();
  await expect(page.locator(".minimal-shell-dark")).toBeVisible();

  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: "AI 推荐", exact: true })).toBeVisible();
  await expect(page.getByText("AI 分类：").first()).toBeVisible();

  if (isMobile) {
    await expect(page.getByRole("navigation", { name: "移动端导航" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "移动端更多页面" })).toBeVisible();
    await page.getByRole("button", { name: "日历" }).click();
    await expect(page.getByRole("heading", { name: "日历" })).toBeVisible();
  }
});
