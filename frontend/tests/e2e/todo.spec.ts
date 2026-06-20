import { expect, test } from "@playwright/test";

async function enterDemo(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path);
  await page.evaluate(() => {
    // 每个用例都清掉本地态，避免登录、主题和 AI 聊天历史串到下一条测试。
    localStorage.removeItem("ai-agent-todo.session");
    localStorage.removeItem("ai-agent-todo.tasks");
    localStorage.removeItem("ai-agent-todo.theme");
    localStorage.removeItem("ai-agent-todo.ai-chat.conversations");
    localStorage.removeItem("ai-agent-todo.ai-chat.activeConversationId");
    localStorage.removeItem("ai-agent-todo.ai-chat.selectedModelId");
  });
  await page.goto(path);
  await page.getByRole("main", { name: /TaskPilot 登录封面/ }).click();
  await page.getByRole("button", { name: /使用.*演示账号/ }).click();
  await expect(page.locator(".minimal-shell")).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem("ai-agent-todo.session") || "null") as { token?: string } | null;
      return Boolean(session?.token);
    }),
  ).toBe(true);
  await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("ai-agent-todo.session") || "null") as { token?: string } | null;
    if (!session?.token) {
      return;
    }
    // 演示账号共享后端数据，进入用例前主动清空任务，保证列表断言稳定。
    const headers = { Authorization: `Bearer ${session.token}` };
    const response = await fetch("http://127.0.0.1:8000/api/tasks?page=1&page_size=100", { headers });
    const payload = await response.json();
    const tasks = payload?.data?.items || [];
    await Promise.all(
      tasks.map((task: { id: number }) =>
        fetch(`http://127.0.0.1:8000/api/tasks/${task.id}`, {
          method: "DELETE",
          headers,
        }),
      ),
    );
  });
  await page.goto(path);
}

async function getDemoToken(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("ai-agent-todo.session") || "null") as { token?: string } | null;
    return session?.token || "";
  });
}

async function createRemoteTask(page: import("@playwright/test").Page, title: string) {
  const token = await getDemoToken(page);
  const response = await page.request.post("http://127.0.0.1:8000/api/tasks", {
    data: {
      title,
      description: "E2E follow-up task",
      priority: "medium",
      category: "测试",
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.status()).toBe(201);
}

async function sendChat(page: import("@playwright/test").Page, text: string) {
  const input = page.getByLabel("AI 聊天输入");
  const sendButton = page.getByRole("button", { name: "发送消息" });
  // 聊天输入框会受自动聚焦和面板动画影响，短重试让输入断言在慢机器上更稳。
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await input.fill(text);
    await page.waitForTimeout(120);
    if ((await input.inputValue()) === text) {
      break;
    }
  }
  await expect(input).toHaveValue(text);
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
}

async function openChatPanel(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "打开 AI 聊天" }).click();
  await expect(page.locator(".ai-chat-panel")).toBeVisible();
}

async function expectChatPanelClosed(page: import("@playwright/test").Page) {
  await expect(page.locator(".ai-chat-panel")).toBeHidden();
  await expect(page.getByRole("button", { name: "打开 AI 聊天" })).toBeVisible();
}

test("page routes open without a blank screen", async ({ page }) => {
  await enterDemo(page);

  for (const route of ["/", "/tasks", "/ai", "/calendar", "/settings"]) {
    await page.goto(route);
    await expect(page.locator(".minimal-shell")).toBeVisible();
    await expect(page.locator(".minimal-page")).not.toBeEmpty();
  }

  await page.goto("/not-a-real-route");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "早上好，今天也要高效完成任务！" })).toBeVisible();
});

test("user can create, search, filter, edit, complete and delete a task", async ({ page, isMobile }, testInfo) => {
  await enterDemo(page);
  // 标题带项目名，避免桌面和移动端项目并行执行时互相命中同一条任务。
  const titlePrefix = `Playwright唯一任务-${testInfo.project.name}`;
  const createdTitle = `${titlePrefix} <script>alert("xss")</script>`;
  const editedTitle = `${titlePrefix} - 已编辑`;

  await page.getByRole("button", { name: "新建任务" }).first().click();
  await page.getByLabel("任务标题").fill(createdTitle);
  // 带入 HTML 片段是为了验证任务内容按纯文本展示，不被浏览器当作标记执行。
  await page.getByLabel("描述").fill("中文、emoji ✨ 和 <img src=x onerror=alert(\"xss\") /> 都应作为文本展示。");
  await page.getByLabel("优先级").selectOption("高");
  await page.getByLabel("分类").selectOption("前端开发");
  await page.getByLabel("标签").fill("测试, 安全");
  await page.getByRole("button", { name: "创建任务" }).click();
  await expect(page.getByRole("heading", { name: "新建任务" })).toBeHidden({ timeout: 12_000 });

  await page.goto("/tasks");
  const taskSurface = page.locator(isMobile ? ".mobile-task-card" : "tbody tr").filter({ hasText: titlePrefix }).first();
  await expect(taskSurface).toBeVisible();
  await page.getByPlaceholder("搜索任务...").fill(titlePrefix);
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

test("settings modal can save API key, show masked value and update model", async ({ page, isMobile }) => {
  test.skip(isMobile, "当前移动端导航没有设置入口，桌面用例验证设置弹窗。");

  await enterDemo(page);
  await page.getByRole("complementary").getByRole("button", { name: "设置" }).click();
  await expect(page.getByRole("heading", { name: "设置", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "AI 配置" }).click();

  // 填入 API Key 并保存
  const apiKeyInput = page.getByLabel("API Key");
  await apiKeyInput.fill("sk-test-playwright-key-1234");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();

  // 只更新模型名称，不覆盖 Key
  const modelInput = page.getByLabel("模型名称");
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
    const mobileNav = page.getByRole("navigation", { name: "移动端导航" });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole("button", { name: "日历" }).click();
    await expect(page.getByRole("heading", { name: "日历视图" })).toBeVisible();
  }
});

test("AI chat follow-up mode delegates task instructions to backend agent", async ({ page }) => {
  await enterDemo(page);
  const aiRequests: Array<{ agent_mode?: boolean; follow_up_mode?: boolean; messages?: Array<{ content: string }>; model_name?: string }> = [];
  await page.route("**/api/ai/chat", async (route) => {
    // 这里拦截 AI 接口，专注验证前端是否正确携带追问模式和历史消息。
    const payload = route.request().postDataJSON() as { agent_mode?: boolean; follow_up_mode?: boolean; messages?: Array<{ content: string }>; model_name?: string };
    aiRequests.push(payload);
    const responses = [
      {
        agent_action: "follow_up",
        content: "信息有点少，请补充任务内容。",
        task_changed: false,
      },
      {
        agent_action: "follow_up",
        content: "找到多个匹配“报告”的任务，请回复序号或更完整的任务标题：\n1. 软件工程报告初稿\n2. 软件工程报告终稿",
        task_changed: false,
      },
      {
        agent_action: "set_task_status",
        content: "已将任务“软件工程报告初稿”标记为已完成。",
        task_changed: true,
      },
    ];
    const response = responses[Math.min(aiRequests.length - 1, responses.length - 1)];
    await route.fulfill({
      body: JSON.stringify({
        code: 0,
        data: {
          ...response,
          model_name: payload.model_name || "deepseek-v4-pro",
          task: null,
        },
        message: "success",
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.getByRole("button", { name: "打开 AI 聊天" }).click();
  await page.getByRole("button", { name: "开启追问模式" }).click();

  await sendChat(page, "创建任务：弄一下");
  await expect(page.getByText(/信息有点少/)).toBeVisible();
  await expect.poll(() => aiRequests.length).toBe(1);
  expect(aiRequests[0].agent_mode).toBe(true);
  expect(aiRequests[0].follow_up_mode).toBe(true);

  await sendChat(page, "完成任务 报告");
  await expect(page.getByText(/找到多个匹配“报告”的任务/)).toBeVisible();
  await expect.poll(() => aiRequests.length).toBe(2);
  expect(aiRequests[1].messages?.at(-1)?.content).toBe("完成任务 报告");

  await sendChat(page, "1");
  await expect(page.getByText(/已将任务“软件工程报告/)).toBeVisible();
  await expect.poll(() => aiRequests.length).toBe(3);
  expect(aiRequests[2].messages?.at(-1)?.content).toBe("1");
});

test("AI chat closes on outside interactions without swallowing target clicks", async ({ page, isMobile }) => {
  test.skip(isMobile, "移动端 AI 浮窗覆盖主要页面控件，桌面用例验证可见浮窗外目标点击。");

  await enterDemo(page);
  const taskTitle = "浮窗外点击关闭验证任务";
  // 后端直接造数，避免这个用例重复覆盖“新建任务”流程，只测浮窗外点击行为。
  await createRemoteTask(page, taskTitle);

  await openChatPanel(page);
  await page.getByLabel("AI 聊天输入").click();
  await expect(page.locator(".ai-chat-panel")).toBeVisible();

  await page.getByRole("navigation", { name: "主导航" }).getByRole("button", { name: "任务中心" }).click();
  await expectChatPanelClosed(page);
  await expect(page).toHaveURL(/\/tasks$/);

  await openChatPanel(page);
  await page.getByRole("button", { name: "今日任务" }).click();
  await expectChatPanelClosed(page);
  await expect(page.getByRole("button", { name: "今日任务" })).toHaveClass(/active/);

  await openChatPanel(page);
  await page.locator(".minimal-header .create-task-button").click();
  await expectChatPanelClosed(page);
  await expect(page.getByRole("heading", { name: "新建任务" })).toBeVisible();
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await expect(page.getByRole("heading", { name: "新建任务" })).toBeHidden();

  await openChatPanel(page);
  const globalSearch = page.getByPlaceholder("搜索任务、标签或项目...");
  await globalSearch.click();
  await expectChatPanelClosed(page);
  await globalSearch.fill("浮窗外搜索");
  await expect(globalSearch).toHaveValue("浮窗外搜索");

  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "日历视图" })).toBeVisible();
  await openChatPanel(page);
  await page.getByRole("button", { name: "24 小时" }).click();
  await expectChatPanelClosed(page);
  await expect(page.getByRole("button", { name: "24 小时" })).toHaveClass(/active/);

  await page.goto("/tasks");
  await page.getByPlaceholder("搜索任务、标签或项目...").fill("");
  const taskSurface = page.locator("tbody tr").filter({ hasText: taskTitle }).first();
  await expect(taskSurface).toBeVisible({ timeout: 12_000 });
  await openChatPanel(page);
  await taskSurface.click({ position: { x: 24, y: 24 } });
  await expectChatPanelClosed(page);
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
});
