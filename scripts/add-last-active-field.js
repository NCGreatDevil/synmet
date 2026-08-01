/**
 * 给 users 集合添加 last_active_at 字段
 * 
 * 使用方法：
 *   node scripts/add-last-active-field.js
 * 
 * 环境变量（或在 .env 中配置）：
 *   PB_URL            - PocketBase 服务器地址
 *   PB_ADMIN_TOKEN    - 管理员 Token（优先使用）
 *   PB_ADMIN_EMAIL    - 管理员邮箱（token 未设置时使用）
 *   PB_ADMIN_PASSWORD - 管理员密码（token 未设置时使用）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================== 配置区 ========================
const CONFIG = {
  url: process.env.PB_URL || 'https://synmet.ma.cloud-ip.cc',
  adminEmail: process.env.PB_ADMIN_EMAIL || '',
  adminPassword: process.env.PB_ADMIN_PASSWORD || '',
  adminToken: process.env.PB_ADMIN_TOKEN || '',
};

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    if (key === 'PB_ADMIN_EMAIL' && !CONFIG.adminEmail) CONFIG.adminEmail = value;
    if (key === 'PB_ADMIN_PASSWORD' && !CONFIG.adminPassword) CONFIG.adminPassword = value;
    if (key === 'PB_ADMIN_TOKEN' && !CONFIG.adminToken) CONFIG.adminToken = value;
    if (key === 'PB_URL' && CONFIG.url === 'https://synmet.ma.cloud-ip.cc') CONFIG.url = value;
  }
}

async function main() {
  const baseUrl = CONFIG.url.replace(/\/$/, '');

  console.log('连接 PocketBase:', baseUrl);

  // 始终使用邮箱密码登录获取 superuser token
  if (!CONFIG.adminEmail || !CONFIG.adminPassword) {
    console.error('❌ 错误：请设置 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD');
    process.exit(1);
  }

  try {
    // 尝试 superuser 端点
    let loginRes = await fetch(`${baseUrl}/api/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: CONFIG.adminEmail,
        password: CONFIG.adminPassword,
      }),
    });

    // 如果 superuser 端点不存在，尝试普通 admin 端点
    if (loginRes.status === 404) {
      console.log('   superuser 端点不可用，尝试 admin 端点...');
      loginRes = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: CONFIG.adminEmail,
          password: CONFIG.adminPassword,
        }),
      });
    }

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`管理员登录失败 (${loginRes.status}): ${errText}`);
    }

    const loginData = await loginRes.json();
    adminToken = loginData.token;
    console.log('✅ 管理员登录成功');
  } catch (err) {
    console.error('❌ 登录失败:', err.message);
    process.exit(1);
  }

  // 1. 获取 users 集合的当前 schema
  console.log('\n📋 获取 users 集合 schema...');
  const getRes = await fetch(`${baseUrl}/api/collections/_pb_users_auth_`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });

  if (!getRes.ok) {
    console.error(`❌ 获取 users 集合失败 (${getRes.status}):`, await getRes.text());
    process.exit(1);
  }

  const collection = await getRes.json();
  console.log(`   集合名称: ${collection.name}`);
  console.log(`   现有字段数: ${collection.schema.length}`);

  // 检查 last_active_at 是否已存在
  const existingField = collection.schema.find(f => f.name === 'last_active_at');
  if (existingField) {
    console.log('✅ last_active_at 字段已存在，无需添加');
    console.log('   字段信息:', JSON.stringify(existingField, null, 2));
    process.exit(0);
  }

  // 2. 添加 last_active_at 字段
  console.log('\n 添加 last_active_at 字段...');
  const newField = {
    type: 'date',
    name: 'last_active_at',
    required: false,
    system: false,
  };

  const updateRes = await fetch(`${baseUrl}/api/collections/_pb_users_auth_`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      schema: [...collection.schema, newField],
    }),
  });

  if (!updateRes.ok) {
    console.error(`❌ 添加字段失败 (${updateRes.status}):`, await updateRes.text());
    process.exit(1);
  }

  const updated = await updateRes.json();
  console.log('✅ last_active_at 字段添加成功');
  console.log(`   更新后字段数: ${updated.schema.length}`);

  // 3. 验证：读取一个用户记录，确认字段可用
  console.log('\n🔍 验证字段是否可用...');
  const usersRes = await fetch(`${baseUrl}/api/collections/_pb_users_auth_/records?perPage=1`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });

  if (usersRes.ok) {
    const usersData = await usersRes.json();
    if (usersData.items.length > 0) {
      const user = usersData.items[0];
      console.log(`   用户 ${user.username || user.email}:`);
      console.log(`   last_active_at = ${user.last_active_at}`);
    }
  }

  console.log('\n🎉 完成！last_active_at 字段已添加到 users 集合');
}

main().catch(err => {
  console.error('💥 脚本执行失败:', err);
  process.exit(1);
});
