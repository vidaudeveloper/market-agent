#!/usr/bin/env node
/**
 * Vidau Market MCP Server — stdio transport
 * 供 Cursor / Hermes / Claude Desktop 等客户端调用本仓库脚本能力
 */

const fs = require('fs');
const path = require('path');
const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const { getRoot, toPosix } = require('./lib/root');
const { getAuthStatus } = require('./lib/auth');
const { runNodeScript, extractFeishuUrl, extractReportPath } = require('./lib/run-script');
const {
  createFactsFromIntake,
  mergeFacts,
  readJson,
  runGate,
  validateFacts,
  writeJson
} = require('../scripts/project-facts-lib');

function textResult(data, { isError = false } = {}) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

function listSkillIds(root) {
  const skillsDir = path.join(root, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
    .map(d => d.name)
    .sort();
}

function listReports(root, limit = 20) {
  const outputDir = path.join(root, 'output');
  if (!fs.existsSync(outputDir)) return [];
  return fs
    .readdirSync(outputDir)
    .filter(f => f.endsWith('.md') || f.endsWith('.json'))
    .map(f => {
      const full = path.join(outputDir, f);
      const stat = fs.statSync(full);
      return {
        name: f,
        path: toPosix(path.relative(root, full)),
        size: stat.size,
        modified: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, limit);
}

function readReportFile(root, reportPath, maxChars = 12000) {
  const resolved = path.isAbsolute(reportPath)
    ? reportPath
    : path.join(root, reportPath.replace(/^[/\\]/, ''));
  if (!fs.existsSync(resolved)) {
    throw new Error(`报告不存在: ${reportPath}`);
  }
  const rel = toPosix(path.relative(root, resolved));
  if (!rel.startsWith('output/')) {
    throw new Error('仅允许读取 output/ 目录下的报告');
  }
  const text = fs.readFileSync(resolved, 'utf-8');
  const truncated = text.length > maxChars;
  return {
    path: rel,
    size: text.length,
    truncated,
    content: truncated ? text.slice(0, maxChars) + '\n\n…（已截断，完整内容请用本地文件）' : text
  };
}

function resolveOutputJson(root, filePath) {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(root, filePath.replace(/^[/\\]/, ''));
  const relative = toPosix(path.relative(root, resolved));
  if (!relative.startsWith('output/') || !relative.endsWith('.json')) {
    throw new Error('Project Facts 仅允许读写 output/*.json');
  }
  return { resolved, relative };
}

function resolveInputJson(root, filePath) {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(root, filePath.replace(/^[/\\]/, ''));
  const relative = toPosix(path.relative(root, resolved));
  if (
    !relative.endsWith('.json') ||
    (!relative.startsWith('output/') && !relative.startsWith('templates/'))
  ) {
    throw new Error('intake 仅允许读取 output/*.json 或 templates/*.json');
  }
  return resolved;
}

function findLatestMeta(root) {
  const outputDir = path.join(root, 'output');
  if (!fs.existsSync(outputDir)) return null;
  const files = fs
    .readdirSync(outputDir)
    .filter(f => f.startsWith('出海匠链路测试-') && f.endsWith('.json'))
    .sort()
    .reverse();
  if (!files.length) return null;
  const full = path.join(outputDir, files[0]);
  return JSON.parse(fs.readFileSync(full, 'utf-8'));
}

const server = new McpServer({
  name: 'vidau-market',
  version: '0.1.0'
});

// ── P0 Tools ────────────────────────────────────────────────────────────────

server.tool(
  'auth_status',
  '检查飞书/出海匠授权与环境是否就绪。执行任何数据采集或飞书导出前应先调用此工具。',
  {},
  async () => textResult(getAuthStatus())
);

server.tool(
  'project_facts_init',
  '创建项目唯一事实数据包。营销分析、内容、提案与 TTS/Amazon 全案在采集数据前调用。',
  {
    output_file: z.string().describe('必须位于 output/，如 output/acme-project-facts.json'),
    intake_file: z.string().optional().describe('可选 intake JSON 路径'),
    project_id: z.string().optional(),
    project_name: z.string().optional(),
    brand_name: z.string().optional(),
    product_name: z.string().optional()
  },
  async ({ output_file, intake_file, project_id, project_name, brand_name, product_name }) => {
    const root = getRoot();
    const output = resolveOutputJson(root, output_file);
    const intake = intake_file ? readJson(resolveInputJson(root, intake_file)) : {};
    const facts = createFactsFromIntake(intake, {
      id: project_id,
      name: project_name,
      brand_name,
      product_name
    });
    const validation = validateFacts(facts);
    if (!validation.ok) return textResult({ ok: false, errors: validation.errors }, { isError: true });
    writeJson(output.resolved, validation.data);
    return textResult({ ok: true, project_facts_path: output.relative, facts: validation.data });
  }
);

server.tool(
  'project_facts_merge',
  '把出海匠/API/网页/用户资料的结构化补丁合并到事实包。带 id 的实体、evidence、facts 按 id 更新；合并失败不覆盖原文件。',
  {
    file: z.string().describe('output/ 下的 Project Facts JSON'),
    patch_json: z.string().describe('JSON 字符串；可只包含要更新的 project/entities/evidence/facts/screenshots/gaps 等字段')
  },
  async ({ file, patch_json }) => {
    const root = getRoot();
    const target = resolveOutputJson(root, file);
    let patch;
    try {
      patch = JSON.parse(patch_json);
    } catch (error) {
      return textResult({ ok: false, message: `patch_json 解析失败: ${error.message}` }, { isError: true });
    }
    const merged = mergeFacts(readJson(target.resolved), patch);
    const validation = validateFacts(merged);
    if (!validation.ok) return textResult({ ok: false, errors: validation.errors }, { isError: true });
    writeJson(target.resolved, validation.data);
    return textResult({
      ok: true,
      project_facts_path: target.relative,
      counts: {
        evidence: validation.data.evidence.length,
        facts: validation.data.facts.length,
        screenshots: validation.data.screenshots.length
      }
    });
  }
);

server.tool(
  'project_facts_validate',
  '校验 Project Facts 结构、重复 ID、证据引用和 verified fact 的可追溯性。',
  {
    file: z.string().describe('output/ 下的 Project Facts JSON')
  },
  async ({ file }) => {
    const root = getRoot();
    const target = resolveOutputJson(root, file);
    const validation = validateFacts(readJson(target.resolved));
    return textResult(
      { ok: validation.ok, project_facts_path: target.relative, errors: validation.errors },
      { isError: !validation.ok }
    );
  }
);

server.tool(
  'project_facts_gate',
  '在进入目标 skill 最终分析前执行质量门禁。BLOCKER 未清零时必须先补数据，不能写最终稿。',
  {
    file: z.string().describe('output/ 下的 Project Facts JSON'),
    skill: z.string().describe('目标 skill，如 market-seo、market-competitors、tts-full-case')
  },
  async ({ file, skill }) => {
    const root = getRoot();
    const target = resolveOutputJson(root, file);
    const facts = readJson(target.resolved);
    const validation = validateFacts(facts);
    if (!validation.ok) return textResult({ ok: false, errors: validation.errors }, { isError: true });
    const gates = readJson(path.join(root, 'templates', 'config', 'fact-gates.json'));
    const gate = runGate(validation.data, skill, gates);
    validation.data.workflow.last_gate = {
      skill,
      passed: gate.passed,
      checked_at: gate.checked_at
    };
    validation.data.updated_at = gate.checked_at;
    writeJson(target.resolved, validation.data);
    return textResult({ ok: gate.passed, project_facts_path: target.relative, ...gate }, { isError: !gate.passed });
  }
);

server.tool(
  'auth_feishu_connect',
  '发起飞书 OAuth 授权（自动打开浏览器）。用户需在浏览器点击「同意授权」。',
  {},
  async () => {
    const result = await runNodeScript('scripts/feishu-auth.js', [], { timeout: 180000 });
    if (result.code !== 0) {
      return textResult(
        { ok: false, message: '飞书授权失败', stderr: result.stderr, stdout: result.stdout },
        { isError: true }
      );
    }
    return textResult({ ok: true, message: '飞书授权成功', status: getAuthStatus().feishu });
  }
);

server.tool(
  'auth_chuhaijiang_login',
  '打开浏览器手动登录出海匠，保存登录态到 auth/chuhaijiang-storage.json。需图形界面，耗时约 1–3 分钟。',
  {},
  async () => {
    const result = await runNodeScript(
      'scripts/chuhaijiang-fetch.js',
      ['screenshot', '--login'],
      { timeout: 300000 }
    );
    if (result.code !== 0) {
      return textResult(
        { ok: false, message: '出海匠登录失败', stderr: result.stderr, stdout: result.stdout },
        { isError: true }
      );
    }
    return textResult({
      ok: true,
      message: '出海匠登录态已保存',
      status: getAuthStatus().chuhaijiang
    });
  }
);

server.tool(
  'chuhaijiang_pipeline',
  '出海匠全链路：达人筛选 + 竞品店铺 + 商品 + 截图 + Markdown 报告。可选同时导出飞书。耗时 1–3 分钟。',
  {
    keyword: z.string().optional().describe('搜索关键词，默认 beauty'),
    export_feishu: z.boolean().optional().describe('是否同时导出飞书文档，默认 false'),
    project_facts_file: z
      .string()
      .optional()
      .describe('可选 output/ 下的 Project Facts JSON；提供则自动把结果合并进事实包')
  },
  async ({ keyword = 'beauty', export_feishu = false, project_facts_file }) => {
    const root = getRoot();
    const status = getAuthStatus();
    if (!status.ready_for_pipeline) {
      return textResult(
        {
          ok: false,
          message: '出海匠未就绪',
          missing_steps: status.missing_steps,
          hint: '先调用 auth_chuhaijiang_login'
        },
        { isError: true }
      );
    }

    const args = ['--keyword', keyword];
    if (export_feishu) args.push('--export-feishu');
    if (project_facts_file) {
      const factsTarget = resolveOutputJson(root, project_facts_file);
      args.push('--facts', factsTarget.resolved);
    }

    const result = await runNodeScript('scripts/chuhaijiang-pipeline-test.js', args, {
      timeout: 300000
    });

    if (result.code !== 0) {
      return textResult(
        { ok: false, message: 'pipeline 失败', stderr: result.stderr, stdout: result.stdout },
        { isError: true }
      );
    }

    // pipeline 现在把 meta 内路径写成仓库相对 POSIX；兼容旧的绝对路径
    const toRelIfNeeded = p => {
      if (!p) return null;
      return path.isAbsolute(p) ? toPosix(path.relative(root, p)) : toPosix(p);
    };

    const meta = findLatestMeta(root);
    const feishuUrl = meta?.feishuUrl || extractFeishuUrl(result.stdout);
    const reportPath = meta?.reportPath
      ? toRelIfNeeded(meta.reportPath)
      : extractReportPath(result.stdout, root)
        ? toPosix(path.relative(root, extractReportPath(result.stdout, root)))
        : null;

    return textResult({
      ok: true,
      keyword,
      report_path: reportPath,
      feishu_url: feishuUrl || undefined,
      project_facts_file: project_facts_file || undefined,
      facts_patch_path: meta?.factsPatchPath || undefined,
      summary: meta
        ? {
            creators: meta.creators?.length ?? 0,
            shops: meta.shops?.length ?? 0,
            products: meta.products?.length ?? 0
          }
        : undefined,
      screenshots: meta?.screenshots
        ? Object.values(meta.screenshots).map(toRelIfNeeded)
        : undefined
    });
  }
);

server.tool(
  'chuhaijiang_agent_ask',
  '出海匠 Agent 对话：提问并抓取回复。支持续聊 session、达人名单追问。需登录态；未登录时先 auth_chuhaijiang_login。',
  {
    prompt_file: z
      .string()
      .describe('prompt 文件路径，如 output/ktc-followup-creators-prompt.txt'),
    session_key: z.string().optional().describe('续聊会话 key，见 output/chuhaijiang-agent-sessions.json'),
    out_suffix: z.string().optional().describe('输出文件名后缀，如 KTC达人名单'),
    timeout_sec: z.number().int().min(60).max(1800).optional().describe('等待回复秒数，默认 900'),
    headed: z.boolean().optional().describe('有界面模式，默认 true（便于登录）')
  },
  async ({ prompt_file, session_key, out_suffix, timeout_sec = 900, headed = true }) => {
    const root = getRoot();
    const status = getAuthStatus();
    if (!status.ready_for_pipeline) {
      return textResult(
        {
          ok: false,
          message: '环境未就绪（Playwright/登录）',
          missing_steps: status.missing_steps,
          hint: '先 auth_chuhaijiang_login'
        },
        { isError: true }
      );
    }

    const args = ['--file', prompt_file, '--timeout', String(timeout_sec)];
    if (headed) args.push('--headed', '--wait-login');
    if (session_key) args.push('--session', session_key);
    if (out_suffix) args.push('--out-suffix', out_suffix);

    const result = await runNodeScript('scripts/chuhaijiang-agent-ask.js', args, {
      timeout: (timeout_sec + 120) * 1000
    });

    if (result.code !== 0) {
      return textResult(
        { ok: false, message: 'agent-ask 失败', stderr: result.stderr, stdout: result.stdout },
        { isError: true }
      );
    }

    const suffix = out_suffix ? `-${out_suffix}` : '';
    const date = new Date().toISOString().slice(0, 10);
    const replyMd = `output/出海匠Agent回复${suffix}-${date}.md`;
    const replyJson = `output/出海匠Agent回复${suffix}-${date}.json`;

    return textResult({
      ok: true,
      reply_md: replyMd,
      reply_json: replyJson,
      stdout_tail: result.stdout.split('\n').slice(-12).join('\n')
    });
  }
);

server.tool(
  'feishu_export',
  '将 output/ 下的 Markdown 报告导出到当前用户飞书云文档（含 QuickChart 图表）。',
  {
    report_path: z.string().describe('报告路径，如 output/报告.md'),
    title: z.string().describe('飞书文档标题'),
    charts: z.boolean().optional().describe('插入图表，默认 true')
  },
  async ({ report_path, title, charts = true }) => {
    const root = getRoot();
    const status = getAuthStatus();
    if (!status.ready_for_feishu_export) {
      return textResult(
        {
          ok: false,
          message: '飞书未就绪（缺少 .env 应用凭证）',
          missing_steps: status.missing_steps,
          hint: '在 .env 配置 FEISHU_APP_ID / FEISHU_APP_SECRET'
        },
        { isError: true }
      );
    }

    if (status.feishu_needs_oauth) {
      // 导出脚本会自动打开浏览器完成 OAuth，此处不阻断
    }

    const abs = path.isAbsolute(report_path) ? report_path : path.join(root, report_path);
    if (!fs.existsSync(abs)) {
      return textResult({ ok: false, message: `报告不存在: ${report_path}` }, { isError: true });
    }

    const args = [toPosix(path.relative(root, abs)), title];
    if (charts) args.push('--charts');

    const result = await runNodeScript('scripts/feishu-export.js', args, { timeout: 180000 });
    if (result.code !== 0) {
      return textResult(
        { ok: false, message: '飞书导出失败', stderr: result.stderr, stdout: result.stdout },
        { isError: true }
      );
    }

    const url = extractFeishuUrl(result.stdout);
    return textResult({
      ok: true,
      title,
      report_path: toPosix(path.relative(root, abs)),
      feishu_url: url,
      stdout_tail: result.stdout.split('\n').slice(-8).join('\n')
    });
  }
);

server.tool(
  'list_reports',
  '列出 output/ 目录下最近生成的报告（.md / .json）。',
  {
    limit: z.number().int().min(1).max(50).optional().describe('返回条数，默认 20')
  },
  async ({ limit = 20 }) => textResult({ reports: listReports(getRoot(), limit) })
);

server.tool(
  'read_report',
  '读取 output/ 下指定报告内容（默认截断至 12000 字符）。',
  {
    report_path: z.string().describe('相对路径，如 output/出海匠链路测试-2026-07-09.md'),
    max_chars: z.number().int().min(500).max(50000).optional()
  },
  async ({ report_path, max_chars = 12000 }) => {
    try {
      return textResult(readReportFile(getRoot(), report_path, max_chars));
    } catch (err) {
      return textResult({ ok: false, message: err.message }, { isError: true });
    }
  }
);

// ── Resources ───────────────────────────────────────────────────────────────

server.resource(
  'skills-index',
  'vidau://skills/index',
  { mimeType: 'application/json', description: '全部 skill 列表与触发说明' },
  async () => {
    const root = getRoot();
    const ids = listSkillIds(root);
    const items = ids.map(id => {
      const skillPath = path.join(root, 'skills', id, 'SKILL.md');
      const head = fs.readFileSync(skillPath, 'utf-8').split('\n').slice(0, 15).join('\n');
      return { id, path: `skills/${id}/SKILL.md`, preview: head };
    });
    return {
      contents: [
        {
          uri: 'vidau://skills/index',
          mimeType: 'application/json',
          text: JSON.stringify({ skills: items, routing: '详见 AGENT.md' }, null, 2)
        }
      ]
    };
  }
);

server.resource(
  'auth-status',
  'vidau://auth/status',
  { mimeType: 'application/json', description: '飞书/出海匠连接状态（不含密钥）' },
  async () => ({
    contents: [
      {
        uri: 'vidau://auth/status',
        mimeType: 'application/json',
        text: JSON.stringify(getAuthStatus(), null, 2)
      }
    ]
  })
);

server.resource(
  'pricing-logic',
  'vidau://config/pricing-logic',
  { mimeType: 'application/json', description: 'TTS 代运营 GMV 倒推报价逻辑' },
  async () => {
    const root = getRoot();
    const file = path.join(root, 'templates', 'config', 'pricing-logic.json');
    return {
      contents: [
        {
          uri: 'vidau://config/pricing-logic',
          mimeType: 'application/json',
          text: fs.readFileSync(file, 'utf-8')
        }
      ]
    };
  }
);

server.resource(
  'agency-defaults',
  'vidau://config/agency-defaults',
  { mimeType: 'application/json', description: 'Vidau 署名与交付默认配置' },
  async () => {
    const root = getRoot();
    const file = path.join(root, 'templates', 'config', 'agency-defaults.json');
    return {
      contents: [
        {
          uri: 'vidau://config/agency-defaults',
          mimeType: 'application/json',
          text: fs.readFileSync(file, 'utf-8')
        }
      ]
    };
  }
);

server.resource(
  'skill-doc',
  new ResourceTemplate('vidau://skills/{id}', { list: undefined }),
  { mimeType: 'text/markdown', description: '单个 SKILL.md 全文' },
  async (uri, { id }) => {
    const root = getRoot();
    const file = path.join(root, 'skills', id, 'SKILL.md');
    if (!fs.existsSync(file)) {
      throw new Error(`Skill 不存在: ${id}`);
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: fs.readFileSync(file, 'utf-8')
        }
      ]
    };
  }
);

// ── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('vidau-market-mcp 启动失败:', err);
  process.exit(1);
});
