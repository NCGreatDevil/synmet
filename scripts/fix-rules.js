/**
 * 修复 PocketBase 集合的 API 规则
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 .env 文件
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
}

const BASE_URL = env.PB_URL;
const ADMIN_TOKEN = env.PB_ADMIN_TOKEN;

async function fixRules() {
  console.log('开始修复集合规则...\n');

  // 1. 修复 notifications 表的 createRule
  console.log('1. 修复 notifications 表的 createRule...');
  const notifResponse = await fetch(`${BASE_URL}/api/collections/notifications`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const notifCollection = await notifResponse.json();

  console.log(`   当前 createRule: ${notifCollection.createRule}`);

  const notifUpdateResponse = await fetch(`${BASE_URL}/api/collections/notifications`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      createRule: '@request.auth.id != ""'
    })
  });

  if (!notifUpdateResponse.ok) {
    const error = await notifUpdateResponse.text();
    throw new Error(`更新失败: ${error}`);
  }

  const updated = await notifUpdateResponse.json();
  console.log(`   ✓ createRule 已更新为: ${updated.createRule}\n`);

  // 2. 修复 matchmaker_applications 表的 createRule
  console.log('2. 修复 matchmaker_applications 表的 createRule...');
  const appsResponse = await fetch(`${BASE_URL}/api/collections/matchmaker_applications`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const appsCollection = await appsResponse.json();

  console.log(`   当前 createRule: ${appsCollection.createRule}`);

  const appsUpdateResponse = await fetch(`${BASE_URL}/api/collections/matchmaker_applications`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      createRule: '@request.auth.id != ""'
    })
  });

  if (!appsUpdateResponse.ok) {
    const error = await appsUpdateResponse.text();
    throw new Error(`更新失败: ${error}`);
  }

  const appsUpdated = await appsUpdateResponse.json();
  console.log(`   ✓ createRule 已更新为: ${appsUpdated.createRule}\n`);

  console.log('✓ 所有集合规则修复完成！');
}

fixRules().catch(err => {
  console.error('✗ 修复失败:', err.message);
  process.exit(1);
});
