#!/usr/bin/env node
/**
 * 将本地图片导出到飞书云文档
 *
 * 用法:
 *   node scripts/feishu-export-image.js output/chuhaijiang-homepage.png "出海匠首页截图"
 */

const fs = require('fs');
const path = require('path');
const {
  loadEnv,
  ensureUserAuth,
  feishuJson,
  ensureDocumentEditable,
  insertLocalImageIntoDocument
} = require('./feishu-lib');

const ROOT = path.join(__dirname, '..');

async function createDocument(userToken, title, env) {
  const body = { title };
  if (env.FEISHU_DEFAULT_FOLDER_TOKEN) {
    body.folder_token = env.FEISHU_DEFAULT_FOLDER_TOKEN;
  }
  const created = await feishuJson(userToken, '/docx/v1/documents', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return created.document.document_id;
}

(async () => {
  const imagePath = path.resolve(ROOT, process.argv[2] || '');
  const title = process.argv[3] || `图片导出 ${new Date().toISOString().slice(0, 10)}`;

  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('用法: node scripts/feishu-export-image.js <图片路径> [文档标题]');
    process.exit(1);
  }

  const env = loadEnv();
  try {
    const { accessToken, auth } = await ensureUserAuth(env);
    console.log('📤 正在创建飞书文档并上传图片…');

    const documentId = await createDocument(accessToken, title, env);
    await insertLocalImageIntoDocument(accessToken, documentId, imagePath, {
      title: path.basename(imagePath)
    });

    const ownership = await ensureDocumentEditable(env, documentId, {
      openId: auth?.open_id,
      userAccessToken: accessToken
    });

    const url = `https://feishu.cn/docx/${documentId}`;
    console.log('\n✅ 导出成功!');
    console.log('标题:', title);
    console.log('图片:', imagePath);
    console.log('链接:', url);
    if (ownership?.transferred) {
      console.log('权限: 文档所有权已转移给你');
    } else if (ownership?.granted) {
      console.log('权限: 已授予你可编辑权限');
    } else if (ownership?.warning) {
      console.log('权限: 未能自动确认编辑权限');
    }
  } catch (err) {
    console.error('\n❌ 导出失败:', err.message);
    process.exit(1);
  }
})();
