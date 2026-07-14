#!/usr/bin/env node
/**
 * 通过 SkillHub 安装出海匠官方 skill（含 MCP 配置指引 setup.md）
 *
 * 用法:
 *   node scripts/install-chuhaijiang-skillhub.js
 *   node scripts/install-chuhaijiang-skillhub.js --hermes-only
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_SLUG = 'chuhaijiang';
const SKILLHUB_INSTALL_URL =
  'https://skillhub-1388575217.cos.ap-guangzhou.myqcloud.com/install/install.sh';

function hasCommand(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    stdio: 'ignore'
  });
  return r.status === 0;
}

function ensureSkillhubCli() {
  if (hasCommand('skillhub')) {
    try {
      const v = execSync('skillhub --version', { encoding: 'utf-8' }).trim();
      console.log(`   ✓ skillhub 已安装: ${v}`);
      return;
    } catch {
      // continue install
    }
  }
  console.log('   正在安装 SkillHub CLI…');
  if (process.platform === 'win32') {
    console.log('   Windows 请确保已安装 Git Bash 或 WSL，或手动执行:');
    console.log(`   curl -fsSL ${SKILLHUB_INSTALL_URL} | bash -s -- --cli-only`);
    try {
      execSync(`curl -fsSL "${SKILLHUB_INSTALL_URL}" | bash -s -- --cli-only`, {
        stdio: 'inherit',
        shell: true
      });
    } catch (e) {
      throw new Error(
        'SkillHub CLI 安装失败。请手动运行同事安装指南.md 中的 curl 命令后重试。'
      );
    }
  } else {
    execSync(`curl -fsSL "${SKILLHUB_INSTALL_URL}" | bash -s -- --cli-only`, {
      stdio: 'inherit'
    });
  }
}

function installSkillToDir(targetDir) {
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  console.log(`   安装 ${SKILL_SLUG} → ${targetDir}`);
  execSync(`skillhub install ${SKILL_SLUG} --dir "${targetDir}"`, {
    stdio: 'inherit',
    shell: true
  });
  const skillMd = path.join(targetDir, SKILL_SLUG, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    throw new Error(`安装后未找到 ${skillMd}`);
  }
  console.log(`   ✓ ${skillMd}`);
}

function main() {
  const hermesOnly = process.argv.includes('--hermes-only');
  const home = os.homedir();

  console.log('📦 SkillHub 安装出海匠 skill…');
  ensureSkillhubCli();

  const targets = [];
  if (!hermesOnly) {
    targets.push(path.join(home, '.cursor', 'skills'));
  }
  targets.push(path.join(home, '.hermes', 'skills'));

  for (const dir of targets) {
    installSkillToDir(dir);
  }

  console.log('\n✅ 出海匠 skill 安装完成');
  console.log('   配置 MCP 与 API Key：读取已安装 skill 的 references/setup.md');
  console.log('   或运行: node scripts/install-chuhaijiang-open-mcp.js --api-key sk_live_xxx');
}

try {
  main();
} catch (err) {
  console.error('❌', err.message);
  process.exit(1);
}
