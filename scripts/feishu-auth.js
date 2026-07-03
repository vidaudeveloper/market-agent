#!/usr/bin/env node
/**
 * 飞书用户 OAuth 授权（本地回调，自动打开浏览器）
 *
 * 用法:
 *   node scripts/feishu-auth.js           # 连接/重新授权
 *   node scripts/feishu-auth.js --status  # 查看连接状态
 *   node scripts/feishu-auth.js --logout  # 断开连接
 */

const {
  loadEnv,
  getUserAuthStatus,
  deleteUserAuth,
  runOAuthFlow,
  USER_AUTH_FILE
} = require('./feishu-lib');

(async () => {
  const arg = process.argv[2];
  const env = loadEnv();

  if (arg === '--status') {
    const status = getUserAuthStatus();
    if (!status.connected) {
      console.log('❌ 未连接飞书');
      console.log('   运行 node scripts/feishu-auth.js 完成授权');
      process.exit(1);
    }
    console.log('✅ 已连接飞书');
    if (status.name) console.log('   用户:', status.name);
    if (status.expires_at) console.log('   access_token 过期时间:', status.expires_at);
    if (status.updated_at) console.log('   最近更新:', status.updated_at);
    console.log('   凭证文件:', USER_AUTH_FILE);
    process.exit(0);
  }

  if (arg === '--logout') {
    deleteUserAuth();
    console.log('✅ 已断开飞书连接');
    process.exit(0);
  }

  if (arg === '--help' || arg === '-h') {
    console.log('用法:');
    console.log('  node scripts/feishu-auth.js');
    console.log('  node scripts/feishu-auth.js --status');
    console.log('  node scripts/feishu-auth.js --logout');
    process.exit(0);
  }

  try {
    console.log('🚀 启动飞书 OAuth 授权…');
    console.log('   请在浏览器中点击「同意授权」');
    const saved = await runOAuthFlow(env);
    console.log('\n✅ 飞书授权成功!');
    if (saved.name) console.log('   用户:', saved.name);
    console.log('   凭证已保存到:', USER_AUTH_FILE);
  } catch (err) {
    console.error('\n❌ 授权失败:', err.message);
    process.exit(1);
  }
})();
