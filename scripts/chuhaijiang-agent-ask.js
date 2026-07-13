#!/usr/bin/env node
/**
 * 出海匠 Agent 对话：向 /app/chat 发送问题并抓取回复
 *
 * 用法:
 *   node scripts/chuhaijiang-agent-ask.js "你的问题"
 *   node scripts/chuhaijiang-agent-ask.js --file prompt.txt
 *   node scripts/chuhaijiang-agent-ask.js --file prompt.txt --timeout 600
 *   node scripts/chuhaijiang-agent-ask.js --file followup.txt --chat-url "https://www.chuhaijiang.com/app/chat/xxx" --out-suffix KTC达人名单
 *   node scripts/chuhaijiang-agent-ask.js --file followup.txt --session ktc_gumi_launch --out-suffix KTC达人名单
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output');
const STORAGE = path.join(ROOT, 'auth', 'chuhaijiang-storage.json');
const AUTH_JSON = path.join(ROOT, 'auth.json');
const WORKSPACE_URL = 'https://www.chuhaijiang.com/app/workspace?country=US';
const DATE = new Date().toISOString().slice(0, 10);

const SESSIONS_FILE = path.join(OUTPUT, 'chuhaijiang-agent-sessions.json');
const { getLoginStatus } = require('./chuhaijiang-auth-check');

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = '';
  let file = null;
  let timeoutSec = 480;
  let headless = true;
  let waitLogin = false;
  let chatUrl = '';
  let outSuffix = '';
  let sessionKey = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      file = args[++i];
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeoutSec = parseInt(args[++i], 10) || 480;
    } else if (args[i] === '--headed') {
      headless = false;
    } else if (args[i] === '--wait-login') {
      waitLogin = true;
    } else if (args[i] === '--chat-url' && args[i + 1]) {
      chatUrl = args[++i];
    } else if (args[i] === '--session' && args[i + 1]) {
      sessionKey = args[++i];
    } else if (args[i] === '--out-suffix' && args[i + 1]) {
      outSuffix = args[++i];
    } else if (!args[i].startsWith('--')) {
      prompt += (prompt ? ' ' : '') + args[i];
    }
  }

  if (sessionKey && fs.existsSync(SESSIONS_FILE)) {
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const session = sessions[sessionKey];
    if (session?.chatUrl && !chatUrl) chatUrl = session.chatUrl;
  }

  if (file) {
    prompt = fs.readFileSync(path.resolve(file), 'utf-8').trim();
  }
  if (!prompt) {
    console.error(
      '用法: node scripts/chuhaijiang-agent-ask.js "问题" 或 --file prompt.txt [--chat-url URL] [--session key] [--out-suffix 名称]'
    );
    process.exit(1);
  }
  return { prompt, timeoutSec, headless, waitLogin, chatUrl, outSuffix, sessionKey };
}

async function openAuthenticatedPage(headless) {
  const hasStorage = fs.existsSync(STORAGE);
  if (!hasStorage && !fs.existsSync(AUTH_JSON)) {
    throw new Error('未找到登录态，请先登录: node scripts/chuhaijiang-fetch.js screenshot --login');
  }

  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    storageState: hasStorage ? STORAGE : undefined,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN'
  });

  const page = await context.newPage();

  if (!hasStorage && fs.existsSync(AUTH_JSON)) {
    const auth = JSON.parse(fs.readFileSync(AUTH_JSON, 'utf-8'));
    if (auth.cookies) {
      const cookieList = Object.entries(auth.cookies).map(([name, value]) => ({
        name,
        value: String(value),
        domain: '.chuhaijiang.com',
        path: '/',
        httpOnly: name === 'auth_session',
        secure: true,
        sameSite: 'Lax'
      }));
      await page.context().addCookies(cookieList);
    }
    await page.goto('https://www.chuhaijiang.com', { waitUntil: 'domcontentloaded' });
    if (auth.localStorage) {
      await page.evaluate(items => {
        for (const [k, v] of Object.entries(items)) localStorage.setItem(k, String(v));
      }, auth.localStorage);
    }
  }

  return { browser, context, page };
}

async function openAgentComposer(page) {
  const chatUrl = 'https://www.chuhaijiang.com/app/chat?country=US';
  await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  await dismissModals(page);

  if (page.url().includes('session_ended') || page.url().includes('login=1')) {
    await page.goto(WORKSPACE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    await dismissModals(page);
  }

  const openAi = page.getByRole('button', { name: '打开 AI 助手' });
  if ((await openAi.count()) > 0 && (await openAi.first().isVisible().catch(() => false))) {
    await openAi.first().click({ force: true });
    await page.waitForTimeout(2000);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
}

async function focusComposer(page) {
  const hints = [
    page.getByText(/选择一个选项或输入你的回答/i),
    page.getByText(/输入你的回答/i),
    page.getByText(/今天想做点什么/i),
    page.locator('.ai-cursor-textarea').last(),
    page.getByRole('button', { name: '打开 AI 助手' })
  ];
  for (const hint of hints) {
    if ((await hint.count()) > 0) {
      await hint.last().click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
    }
  }
  await page.evaluate(() => {
    const edits = [...document.querySelectorAll('[contenteditable="true"], [role="textbox"]')];
    const visible = edits.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > window.innerHeight * 0.5;
    });
    const target = visible.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.focus();
    }
  });
  await page.waitForTimeout(500);
}

async function locateChatInput(page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await focusComposer(page);

  const handle = await page.evaluateHandle(() => {
    const edits = [...document.querySelectorAll('[contenteditable="true"], [role="textbox"]')];
    const visible = edits.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 80 && r.height > 8 && r.bottom > window.innerHeight * 0.45;
    });
    return visible.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0] || null;
  });
  const el = handle.asElement();
  if (el) return page.locator('[contenteditable="true"], [role="textbox"]').last();

  const selectors = [
    '.ai-cursor-textarea[contenteditable="true"]',
    'div[contenteditable="true"].ai-cursor-textarea',
    'div[contenteditable="true"]',
    '[role="textbox"]',
    'textarea'
  ];

  for (const sel of selectors) {
    const els = page.locator(sel);
    const count = await els.count();
    for (let i = count - 1; i >= 0; i--) {
      const item = els.nth(i);
      const visible = await item.isVisible().catch(() => false);
      const box = await item.boundingBox().catch(() => null);
      if (visible && box && box.height > 8) return item;
    }
  }
  return null;
}

async function ensureLoggedIn(page) {
  const login = page.getByRole('button', { name: '登录' });
  if ((await login.count()) > 0) {
    const visible = await login.first().isVisible().catch(() => false);
    if (visible) {
      throw new Error('出海匠对话页未登录，请在浏览器登录后运行: node scripts/chuhaijiang-fetch.js screenshot --login');
    }
  }
}

async function selectAgentTab(page, name = '社媒管家') {
  const tab = page.getByRole('button', { name, exact: true });
  if ((await tab.count()) > 0) {
    await tab.first().click({ force: true });
    await page.waitForTimeout(1000);
    console.log(`🤖 已选择 Agent：${name}`);
  }
}

async function fillContentEditable(page, input, text) {
  await input.scrollIntoViewIfNeeded();
  await input.click({ force: true });
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 5 });
  await input.evaluate(el => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function clickSendButton(page) {
  const methods = [
    async () => {
      const voice = page.locator('button.voice-btn').first();
      if ((await voice.count()) > 0) {
        const send = voice.locator('xpath=following-sibling::button[1]');
        if ((await send.count()) > 0 && !(await send.isDisabled().catch(() => true))) {
          await send.click({ force: true });
          return 'after-voice-btn';
        }
      }
      return null;
    },
    async () => {
      const textarea = page.locator('.ai-cursor-textarea').first();
      const container = textarea.locator(
        'xpath=ancestor::div[contains(@class,"rounded")][1]'
      );
      const send = container.locator('button').filter({ hasNot: page.locator('.voice-btn') }).last();
      if ((await send.count()) > 0 && !(await send.isDisabled().catch(() => true))) {
        await send.click({ force: true });
        return 'composer-send';
      }
      return null;
    },
    async () => {
      const btn = page.locator('button.rounded-full').filter({ has: page.locator('svg') }).last();
      if ((await btn.count()) > 0 && !(await btn.isDisabled().catch(() => true))) {
        await btn.click({ force: true });
        return 'rounded-send';
      }
      return null;
    },
    async () => {
      await page.keyboard.press('Control+Enter');
      return 'Control+Enter';
    }
  ];

  for (const method of methods) {
    const used = await method();
    if (used) {
      console.log(`   发送方式: ${used}`);
      await page.waitForTimeout(2000);
      return used;
    }
  }
  return null;
}

async function inputWasCleared(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.ai-cursor-textarea[contenteditable="true"]');
    if (!el) return false;
    return (el.innerText || el.textContent || '').trim().length < 30;
  });
}

async function isLoggedIn(page) {
  try {
    return await page.evaluate(() => {
      const href = window.location.href;
      if (!href.includes('/app')) return false;
      if (href.includes('session_ended') || href.includes('login=1')) return false;
      const loginInHeader = Array.from(document.querySelectorAll('button')).some(b => {
        const t = (b.textContent || '').trim();
        const rect = b.getBoundingClientRect();
        return t === '登录' && rect.top < 120 && rect.width > 0;
      });
      return !loginInHeader;
    });
  } catch {
    return false;
  }
}

async function waitForLoginIfNeeded(page, context, waitLogin, timeoutMs = 300000) {
  const statePath = path.join(ROOT, 'auth', 'chuhaijiang-storage.json');
  const authDir = path.dirname(statePath);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  if (await isLoggedIn(page)) {
    await context.storageState({ path: statePath });
    return;
  }

  if (!waitLogin) {
    throw new Error(
      '出海匠未登录。请使用 --headed --wait-login，在弹出浏览器中点击右上角「登录」完成授权'
    );
  }

  console.log('🔐 请在弹出浏览器中点击右上角「登录」完成授权（最多等待 5 分钟）…');
  const deadline = Date.now() + timeoutMs;
  let lastLog = 0;

  while (Date.now() < deadline) {
    if (await isLoggedIn(page)) {
      await context.storageState({ path: statePath });
      console.log('✅ 已登录，登录态已保存');
      return;
    }

    const now = Date.now();
    if (now - lastLog > 30000) {
      const left = Math.ceil((deadline - now) / 1000);
      console.log(`   …仍在等待登录，剩余约 ${left}s（当前页: ${page.url().slice(0, 80)}）`);
      lastLog = now;
    }

    await page.waitForTimeout(3000);
    try {
      if (!page.url().includes('chuhaijiang.com')) continue;
      if (!page.url().includes('/app/workspace')) {
        await page.goto(WORKSPACE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);
      }
    } catch (err) {
      if (!/destroyed|navigation|closed/i.test(String(err.message || err))) {
        // 登录跳转中页面可能短暂不可用，继续轮询
      }
    }
  }

  throw new Error('登录超时：请在弹出窗口完成登录后重试');
}

async function verifySubmission(page, prompt) {
  const snippet = prompt.slice(0, 24);
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);

    if (await inputWasCleared(page)) {
      console.log('✅ 提交校验通过: 输入框已清空');
      return { ok: true, inputCleared: true };
    }

    const status = await page.evaluate(s => {
      const text = document.body.innerText || '';
      const url = location.href;
      const onChat = url.includes('/app/chat') || url.includes('/app/workspace');
      const sidebarHit = /KTC|闺蜜机/.test(text) && /条消息|今天/.test(text);
      const hasLoading = !!document.querySelector(
        '[class*="loading"], [class*="typing"], [class*="animate-pulse"]'
      );
      return { url, onChat, sidebarHit, hasLoading };
    }, snippet);

    if (status.onChat && (status.sidebarHit || status.hasLoading)) {
      console.log('✅ 提交校验通过:', JSON.stringify(status));
      return { ok: true, ...status };
    }
  }

  const shot = path.join(OUTPUT, `chuhaijiang-agent-submit-fail-${DATE}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  return { ok: false, screenshot: shot };
}

async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  const closers = [
    page.locator('[data-slot="dialog-content"] button').first(),
    page.getByRole('button', { name: /关闭|Close|×/ }),
    page.locator('button.absolute.top-2.right-2, button[class*="close"]')
  ];
  for (const btn of closers) {
    if ((await btn.count()) > 0) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }
}

async function openChatFromWorkspace(page) {
  await page.goto('https://www.chuhaijiang.com', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.goto(WORKSPACE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  await dismissModals(page);
}

async function openExistingChat(page, chatUrl) {
  const base = chatUrl.split('?')[0];
  const url = `${base}?country=US`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  await dismissModals(page);

  const conv = page.getByText(/KTC.*闺蜜机|闺蜜机.*宣发/i).first();
  if ((await conv.count()) > 0) {
    await conv.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  console.log(`🔗 续聊对话: ${page.url()}`);
}

async function submitPrompt(page, context, prompt, capture, waitLogin, options = {}) {
  console.log('📡 进入出海匠 Agent 对话…');
  const apiChunks = [];
  page.on('response', async res => {
    try {
      const url = res.url();
      if (!/chat|message|conversation|agent|task|completion|stream/i.test(url)) return;
      const ct = res.headers()['content-type'] || '';
      if (!ct.includes('json') && !ct.includes('text')) return;
      const body = await res.text();
      if (body.length > 50) apiChunks.push({ url, body: body.slice(0, 20000) });
      if (capture) capture.apiChunks = apiChunks;
    } catch {
      // ignore
    }
  });

  await openChatFromWorkspace(page);
  await waitForLoginIfNeeded(page, context, waitLogin);
  await ensureLoggedIn(page);

  if (options.chatUrl) {
    await openExistingChat(page, options.chatUrl);
  } else {
    await openAgentComposer(page);
    const newChat = page.getByRole('button', { name: '新对话' });
    if ((await newChat.count()) > 0) {
      await newChat.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
    }
    await selectAgentTab(page, '社媒管家');
  }

  const input = await locateChatInput(page);
  if (!input) {
    const debugPath = path.join(OUTPUT, `chuhaijiang-agent-debug-${DATE}.png`);
    if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });
    await page.screenshot({ path: debugPath, fullPage: true });
    throw new Error(`未找到对话输入框，已截图: ${debugPath}`);
  }

  console.log('✍️  发送问题…');
  await dismissModals(page);
  await fillContentEditable(page, input, prompt);
  await page.waitForTimeout(800);

  let postCaptured = false;
  const postWait = page
    .waitForResponse(
      res =>
        res.request().method() === 'POST' &&
        /chat|conversation|message|task|agent/i.test(res.url()) &&
        res.status() < 400,
      { timeout: 15000 }
    )
    .then(() => {
      postCaptured = true;
    })
    .catch(() => {});

  await clickSendButton(page);
  await postWait;

  if (!(await inputWasCleared(page))) {
    console.log('   首次发送未清空输入框，重试发送…');
    await clickSendButton(page);
    await page.waitForTimeout(3000);
  }

  const verified = await verifySubmission(page, prompt);
  if (!verified.ok && !postCaptured) {
    throw new Error(
      `未能确认对话已提交（无 POST 响应、无用户消息气泡）。截图: ${verified.screenshot || '无'}`
    );
  }
  if (postCaptured) console.log('✅ 捕获到对话 POST 请求');
  return verified;
}

async function extractAssistantText(page, userPrompt) {
  return page.evaluate(p => {
    const isTemplateNoise = t =>
      /约 \d+ 贝|看案例|专家模式|今天想做点什么|选择一个任务开始/.test(t);

    const nodes = [
      ...document.querySelectorAll(
        '[data-role="assistant"], [class*="assistant"], [class*="Assistant"], [class*="markdown"], [class*="Markdown"], [class*="message-content"], article'
      )
    ];

    const chunks = nodes
      .map(el => (el.innerText || '').trim())
      .filter(t => t.length > 100 && !isTemplateNoise(t) && !t.startsWith(p.slice(0, 40)));

    if (chunks.length) return chunks.join('\n\n---\n\n');

    const all = (document.body.innerText || '').trim();
    const idx = all.indexOf(p.slice(0, 60));
    if (idx >= 0) {
      const after = all.slice(idx + p.length).trim();
      if (after.length > 200 && !isTemplateNoise(after)) return after;
    }
    return '';
  }, userPrompt);
}

async function waitForResponse(page, prompt, timeoutMs) {
  console.log(`⏳ 等待 Agent 回复（最长 ${Math.round(timeoutMs / 1000)}s）…`);

  const start = Date.now();
  let lastText = '';
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(5000);

    const text = await extractAssistantText(page, prompt);
    const cleaned = text.replace(/\s*Log in\s*/gi, '').trim();

    if (cleaned.length > 300) {
      if (cleaned === lastText) {
        stableCount++;
        if (stableCount >= 4) return cleaned;
      } else {
        stableCount = 0;
        lastText = cleaned;
        console.log(`   …已捕获 ${cleaned.length} 字`);
      }
    }

    const loading = await page
      .locator('[class*="loading"], [class*="Loading"], [class*="typing"], [class*="Typing"], [class*="animate-pulse"]')
      .count();
    if (loading > 0) stableCount = 0;
  }

  return lastText || (await page.evaluate(p => {
    const t = document.body.innerText || '';
    const i = t.indexOf('KTC');
    return i >= 0 ? t.slice(i) : t;
  }, prompt)) || '(超时：未完整捕获回复，请查看截图或手动在出海匠对话页查看)';
}

(async () => {
  const { prompt, timeoutSec, headless, waitLogin, chatUrl, outSuffix, sessionKey } = parseArgs();
  if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

  const suffix = outSuffix ? `-${outSuffix}` : '';
  const outMd = path.join(OUTPUT, `出海匠Agent回复${suffix}-${DATE}.md`);
  const outJson = path.join(OUTPUT, `出海匠Agent回复${suffix}-${DATE}.json`);
  const shotPath = path.join(OUTPUT, `chuhaijiang-agent-reply${suffix}-${DATE}.png`);

  let browser;
  const capture = { apiChunks: [] };
  try {
    const loginStatus = getLoginStatus();
    if (!loginStatus.ok) {
      const canWait = waitLogin || !headless;
      if (!canWait) {
        throw new Error(
          `出海匠未登录（无有效 auth_session）。请先执行: ${loginStatus.recommended_action}\n或加 --headed --wait-login 在弹出浏览器完成登录`
        );
      }
      console.log('⚠️  本地登录态无效，将在 headed 模式中等待用户登录…');
    }

    const session = await openAuthenticatedPage(headless);
    browser = session.browser;
    const { page, context } = session;

    const verified = await submitPrompt(page, context, prompt, capture, waitLogin || !headless, {
      chatUrl
    });
    const response = await waitForResponse(page, prompt, timeoutSec * 1000);

    // fallback: parse API responses
    let finalResponse = response;
    if (finalResponse.startsWith('(超时') && capture.apiChunks.length) {
      const merged = capture.apiChunks.map(c => c.body).join('\n');
      const tableMatch = merged.match(/"content"\s*:\s*"([^"]{200,})"/);
      if (tableMatch) {
        finalResponse = tableMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    }

    await page.screenshot({ path: shotPath, fullPage: true });

    const result = {
      date: DATE,
      prompt,
      response: finalResponse,
      screenshot: shotPath,
      chatUrl: page.url(),
      parentChatUrl: chatUrl || null,
      sessionKey: sessionKey || null,
      submitted: verified?.ok ?? true,
      apiCaptureCount: capture.apiChunks.length
    };

    if (sessionKey && fs.existsSync(SESSIONS_FILE)) {
      const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      if (sessions[sessionKey]) {
        sessions[sessionKey].lastFollowUp = {
          chatUrl: page.url(),
          replyMd: path.relative(ROOT, outMd).replace(/\\/g, '/'),
          replyJson: path.relative(ROOT, outJson).replace(/\\/g, '/'),
          screenshot: path.relative(ROOT, shotPath).replace(/\\/g, '/'),
          createdAt: DATE
        };
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
      }
    }

    const md = `# 出海匠 Agent 回复

> 抓取时间：${DATE}  
> 对话页：${page.url()}

## 用户问题

${prompt}

---

## Agent 回复

${finalResponse}

---

## 截图

![Agent回复截图](${path.relative(ROOT, shotPath).replace(/\\/g, '/')})

*数据来源：出海匠 /app/chat Agent，Playwright 自动抓取。*
`;

    fs.writeFileSync(outMd, md, 'utf-8');
    fs.writeFileSync(outJson, JSON.stringify(result, null, 2), 'utf-8');

    console.log('\n✅ 已保存:');
    console.log('   ', outMd);
    console.log('   ', outJson);
    console.log('   ', shotPath);
    console.log('\n--- Agent 回复摘要 ---\n');
    console.log(finalResponse.slice(0, 2000) + (finalResponse.length > 2000 ? '\n\n…（完整内容见 output 文件）' : ''));
  } catch (err) {
    console.error('❌ 失败:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
