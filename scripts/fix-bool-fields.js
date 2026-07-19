/**
 * 修复 PocketBase 布尔字段的 required 属性
 * 将 is_read 等布尔字段的 required 改为 false
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

async function fixBoolFields() {
  console.log('开始修复布尔字段的 required 属性...\n');

  // 1. 修复 notifications 表的 is_read 字段
  console.log('1. 修复 notifications 表的 is_read 字段...');
  const notifResponse = await fetch(`${BASE_URL}/api/collections/notifications`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const notifCollection = await notifResponse.json();

  const updatedNotifFields = notifCollection.fields.map(field => {
    if (field.name === 'is_read') {
      console.log(`   - ${field.name}: required ${field.required} -> false`);
      return { ...field, required: false };
    }
    return field;
  });

  const notifUpdateResponse = await fetch(`${BASE_URL}/api/collections/notifications`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: updatedNotifFields })
  });

  if (!notifUpdateResponse.ok) {
    const error = await notifUpdateResponse.text();
    throw new Error(`更新 notifications 表失败: ${error}`);
  }

  console.log('   ✓ notifications 表 is_read 字段修复完成\n');

  // 2. 修复 messages 表的 is_read 字段
  console.log('2. 修复 messages 表的 is_read 字段...');
  const msgResponse = await fetch(`${BASE_URL}/api/collections/messages`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const msgCollection = await msgResponse.json();

  const updatedMsgFields = msgCollection.fields.map(field => {
    if (field.name === 'is_read') {
      console.log(`   - ${field.name}: required ${field.required} -> false`);
      return { ...field, required: false };
    }
    return field;
  });

  const msgUpdateResponse = await fetch(`${BASE_URL}/api/collections/messages`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: updatedMsgFields })
  });

  if (!msgUpdateResponse.ok) {
    const error = await msgUpdateResponse.text();
    throw new Error(`更新 messages 表失败: ${error}`);
  }

  console.log('   ✓ messages 表 is_read 字段修复完成\n');

  console.log('✓ 所有布尔字段修复完成！');
}

fixBoolFields().catch(err => {
  console.error('✗ 修复失败:', err.message);
  process.exit(1);
});
