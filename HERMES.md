# Hermes / Vidau Agent 斜杠技能安装

让聊天里出现 **`/vidau-market-agent`**（输入 `/` 可搜索到）。

官方机制：[Hermes Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) — 每个安装到 `~/.hermes/skills/<name>/` 的 skill 会自动变成斜杠命令，命令名 = skill 的 `name` 字段（本仓库为 `vidau-market-agent`）。

---

## 方式 A：一键安装脚本（推荐）

在**已克隆**的仓库根目录执行：

| 系统 | 命令 |
|------|------|
| Windows | `install-hermes-skill.bat` |
| Mac/Linux | `bash scripts/install-hermes-skill.sh` |

脚本会：

1. 复制 `skills/vidau-market-agent/` → `%USERPROFILE%\.hermes\skills\vidau-market-agent\`（或 `~/.hermes/skills/`）
2. 提示在 Hermes 中 **Open Workspace** 指向本仓库根目录
3. 提示执行 `/reload-skills` 或重启 Hermes

---

## 方式 B：Hermes Tap（团队分发）

```bash
hermes skills tap add vidaudeveloper/market-agent
hermes skills install vidaudeveloper/market-agent/vidau-market-agent
```

说明：Tap 默认扫描仓库内 `skills/` 目录；只安装 `vidau-market-agent` 这一条，避免 `/market-audit` 等 20+ 子 skill 占满斜杠列表。

安装后同样要把 **工作区** 设为本仓库根目录（脚本与 `AGENT.md` 在根目录）。

---

## 方式 C：手动复制

```bash
# Mac/Linux
mkdir -p ~/.hermes/skills
cp -r skills/vidau-market-agent ~/.hermes/skills/vidau-market-agent

# Windows PowerShell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.hermes\skills"
Copy-Item -Recurse -Force skills\vidau-market-agent "$env:USERPROFILE\.hermes\skills\vidau-market-agent"
```

然后：

```bash
/reload-skills
```

---

## 验证

1. Hermes 聊天输入 `/`，应出现 **`vidau-market-agent`**
2. 执行 `/vidau-market-agent`，Agent 应读取工作区 `AGENT.md` 并询问营销任务
3. 可选：`node scripts/feishu-auth.js --status`

---

## MCP 接入（推荐）

安装本仓库 MCP 后，Hermes 可直接调用出海匠 pipeline、飞书导出等工具，无需手写 shell。

```bash
# 仓库根目录
install-mcp.bat                    # Windows
bash install-mcp.sh                # Mac/Linux

hermes mcp add vidau-market \
  --command node \
  --args <仓库绝对路径>/mcp-server/index.js \
  --env VIDAU_MARKET_ROOT=<仓库绝对路径>

/reload-mcp
```

完整说明见 [`MCP-USER-GUIDE.md`](MCP-USER-GUIDE.md)。

**超时建议**：出海匠 pipeline 约 1–3 分钟，可在 `~/.hermes/config.yaml` 为 `vidau-market` 设置 `timeout: 300`。

---

## 为何不能只「打开文件夹」就有斜杠？

| 机制 | 作用 |
|------|------|
| **打开仓库作 workspace** | Agent 能读 `AGENT.md`、`skills/`、跑 `scripts/` |
| **安装到 `~/.hermes/skills/`** | 注册 **`/vidau-market-agent`** 斜杠命令 |

两者需要同时做：斜杠 skill 是「入口」；完整能力依赖仓库工作区。

---

## 可选：external_dirs（不推荐默认开启）

若在 `~/.hermes/config.yaml` 把 `skills.external_dirs` 指向本仓库整个 `skills/` 文件夹，会出现 **20+ 个斜杠命令**（`feishu-export`、`tts-growth-plan`…）。  
若你只想一个 `/vidau-market-agent`，**不要**把整个 `skills/` 加进 `external_dirs`，只用方式 A/B/C 安装单一 skill 即可。

---

## Vidau Agent

若 Vidau Agent 与 Hermes 共用 skills 目录，步骤相同。若 Vidau 使用独立配置路径，把 `vidau-market-agent` 目录复制到其 skills 目录，并保证 `name: vidau-market-agent` 在 frontmatter 中不变。

**Vidau 专用配置文档链接**：待补充（有官方路径后可写入本文件）。
