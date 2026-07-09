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
    export_feishu: z.boolean().optional().describe('是否同时导出飞书文档，默认 false')
  },
  async ({ keyword = 'beauty', export_feishu = false }) => {
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

    const result = await runNodeScript('scripts/chuhaijiang-pipeline-test.js', args, {
      timeout: 300000
    });

    if (result.code !== 0) {
      return textResult(
        { ok: false, message: 'pipeline 失败', stderr: result.stderr, stdout: result.stdout },
        { isError: true }
      );
    }

    const meta = findLatestMeta(root);
    const feishuUrl = meta?.feishuUrl || extractFeishuUrl(result.stdout);
    const reportPath = meta?.reportPath
      ? toPosix(path.relative(root, meta.reportPath))
      : extractReportPath(result.stdout, root)
        ? toPosix(path.relative(root, extractReportPath(result.stdout, root)))
        : null;

    return textResult({
      ok: true,
      keyword,
      report_path: reportPath,
      feishu_url: feishuUrl || undefined,
      summary: meta
        ? {
            creators: meta.creators?.length ?? 0,
            shops: meta.shops?.length ?? 0,
            products: meta.products?.length ?? 0
          }
        : undefined,
      screenshots: meta?.screenshots
        ? Object.values(meta.screenshots).map(p => toPosix(path.relative(root, p)))
        : undefined
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
          message: '飞书未就绪',
          missing_steps: status.missing_steps,
          hint: '先配置 .env 并调用 auth_feishu_connect'
        },
        { isError: true }
      );
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
