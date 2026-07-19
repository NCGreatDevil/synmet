/**
 * 修复 PocketBase 表结构
 * 将状态字段的 required 改为 false
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

async function fixSchema() {
  console.log('开始修复表结构...\n');

  // 1. 修复 matchmaker_applications 表
  console.log('1. 修复 matchmaker_applications 表...');

  // 获取当前集合定义
  const response = await fetch(`${BASE_URL}/api/collections/matchmaker_applications`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const collection = await response.json();

  // 修改字段定义
  const updatedFields = collection.fields.map(field => {
    if (['user_a_status', 'user_b_status', 'application_status'].includes(field.name)) {
      console.log(`   - ${field.name}: required ${field.required} -> false`);
      return { ...field, required: false };
    }
    return field;
  });

  // 更新集合
  const updateResponse = await fetch(`${BASE_URL}/api/collections/matchmaker_applications`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: updatedFields })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`更新失败: ${error}`);
  }

  console.log('   ✓ matchmaker_applications 表修复完成\n');

  // 2. 修复 notifications 表
  console.log('2. 修复 notifications 表...');

  const notifResponse = await fetch(`${BASE_URL}/api/collections/notifications`, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  const notifCollection = await notifResponse.json();

  const updatedNotifFields = notifCollection.fields.map(field => {
    if (field.name === 'notification_type') {
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
    throw new Error(`更新失败: ${error}`);
  }

  console.log('   ✓ notifications 表修复完成\n');

  console.log('✓ 所有表结构修复完成！');
}

fixSchema().catch(err => {
  console.error('✗ 修复失败:', err.message);
  process.exit(1);
});
