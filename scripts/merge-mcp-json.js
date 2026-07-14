#!/usr/bin/env node
/**
 * 合并 MCP 配置到 JSON 文件（不覆盖已有其他服务）
 */
const fs = require('fs');
const path = require('path');

function mergeMcpJson(filePath, serverName, serverConfig) {
  let data = { mcpServers: {} };
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      console.warn(`   ⚠ 无法解析 ${filePath}，将重建`);
    }
  }
  if (!data.mcpServers || typeof data.mcpServers !== 'object') {
    data.mcpServers = {};
  }
  data.mcpServers[serverName] = serverConfig;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return filePath;
}

module.exports = { mergeMcpJson };
