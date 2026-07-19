/**
 * PocketBase 沟通管理模块 - 集合初始化脚本
 * 
 * 使用方法：
 *   node scripts/init-pb-collections.js
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

// ======================== 集合定义（使用集合名称，脚本中会替换为 ID） ========================
const COLLECTIONS = [
  {
    name: 'matchmaker_applications',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'matchmaker_id', required: true, collectionId: 'users', cascadeDelete: true, maxSelect: 1 },
      { type: 'relation', name: 'user_a_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'relation', name: 'user_b_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'number', name: 'user_a_status', required: true, min: 0, max: 2, onlyIntegers: true, defaultValue: '0' },
      { type: 'number', name: 'user_b_status', required: true, min: 0, max: 2, onlyIntegers: true, defaultValue: '0' },
      { type: 'number', name: 'application_status', required: true, min: 0, max: 3, onlyIntegers: true, defaultValue: '0' },
      { type: 'date', name: 'apply_time', required: true },
      { type: 'date', name: 'user_a_confirm_time', required: false },
      { type: 'date', name: 'user_b_confirm_time', required: false },
      { type: 'date', name: 'expire_time', required: false },
    ],
    indexes: [
      'CREATE INDEX idx_matchmaker_id ON matchmaker_applications (matchmaker_id)',
      'CREATE INDEX idx_user_a_id ON matchmaker_applications (user_a_id)',
      'CREATE INDEX idx_user_b_id ON matchmaker_applications (user_b_id)',
      'CREATE INDEX idx_application_status ON matchmaker_applications (application_status)',
    ],
  },
  {
    name: 'matchmaker_assistants',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'application_id', required: true, collectionId: 'matchmaker_applications', cascadeDelete: true, maxSelect: 1 },
      { type: 'relation', name: 'assistant_id', required: true, collectionId: 'users', cascadeDelete: true, maxSelect: 1 },
    ],
    indexes: [
      'CREATE INDEX idx_ma_application_id ON matchmaker_assistants (application_id)',
      'CREATE INDEX idx_ma_assistant_id ON matchmaker_assistants (assistant_id)',
      'CREATE UNIQUE INDEX idx_ma_app_assistant_unique ON matchmaker_assistants (application_id, assistant_id)',
    ],
  },
  {
    name: 'communication_sessions',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'application_id', required: true, unique: true, collectionId: 'matchmaker_applications', cascadeDelete: true, maxSelect: 1 },
      { type: 'relation', name: 'user_a_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'relation', name: 'user_b_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'relation', name: 'main_matchmaker_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'number', name: 'session_status', required: true, min: 0, max: 1, onlyIntegers: true, defaultValue: '1' },
      { type: 'date', name: 'start_time', required: true },
      { type: 'date', name: 'end_time', required: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_cs_application_id ON communication_sessions (application_id)',
      'CREATE INDEX idx_cs_user_a_id ON communication_sessions (user_a_id)',
      'CREATE INDEX idx_cs_user_b_id ON communication_sessions (user_b_id)',
      'CREATE INDEX idx_cs_main_matchmaker_id ON communication_sessions (main_matchmaker_id)',
      'CREATE INDEX idx_cs_session_status ON communication_sessions (session_status)',
    ],
  },
  {
    name: 'chat_groups',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'session_id', required: true, collectionId: 'communication_sessions', cascadeDelete: true, maxSelect: 1 },
      { type: 'text', name: 'group_name', required: true, min: 1, max: 100 },
      { type: 'number', name: 'group_type', required: true, min: 0, max: 1, onlyIntegers: true },
      { type: 'number', name: 'group_status', required: true, min: 0, max: 1, onlyIntegers: true, defaultValue: '1' },
    ],
    indexes: [
      'CREATE INDEX idx_cg_session_id ON chat_groups (session_id)',
      'CREATE INDEX idx_cg_group_type ON chat_groups (group_type)',
      'CREATE INDEX idx_cg_group_status ON chat_groups (group_status)',
    ],
  },
  {
    name: 'chat_group_members',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'group_id', required: true, collectionId: 'chat_groups', cascadeDelete: true, maxSelect: 1 },
      { type: 'relation', name: 'user_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'number', name: 'member_role', required: true, min: 0, max: 2, onlyIntegers: true, defaultValue: '0' },
      { type: 'date', name: 'join_time', required: true },
      { type: 'date', name: 'leave_time', required: false },
      { type: 'number', name: 'is_active', required: true, min: 0, max: 1, onlyIntegers: true, defaultValue: '1' },
    ],
    indexes: [
      'CREATE INDEX idx_cgm_group_id ON chat_group_members (group_id)',
      'CREATE INDEX idx_cgm_user_id ON chat_group_members (user_id)',
      'CREATE UNIQUE INDEX idx_cgm_group_user_unique ON chat_group_members (group_id, user_id)',
    ],
  },
  {
    name: 'messages',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'group_id', required: true, collectionId: 'chat_groups', cascadeDelete: false, maxSelect: 1 },
      { type: 'relation', name: 'sender_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'number', name: 'message_type', required: true, min: 0, max: 4, onlyIntegers: true, defaultValue: '0' },
      { type: 'editor', name: 'content', required: false },
      { type: 'url', name: 'file_url', required: false },
      { type: 'number', name: 'duration', required: false, min: 0, onlyIntegers: true },
      { type: 'bool', name: 'is_read', required: true, defaultValue: 'false' },
      { type: 'date', name: 'send_time', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_msg_group_id ON messages (group_id)',
      'CREATE INDEX idx_msg_sender_id ON messages (sender_id)',
      'CREATE INDEX idx_msg_send_time ON messages (send_time)',
      'CREATE INDEX idx_msg_is_read ON messages (is_read)',
    ],
  },
  {
    name: 'notifications',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: null,
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'sender_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'relation', name: 'user_id', required: true, collectionId: 'users', cascadeDelete: false, maxSelect: 1 },
      { type: 'number', name: 'notification_type', required: true, min: 0, max: 4, onlyIntegers: true },
      { type: 'text', name: 'related_id', required: false, min: 0, max: 50 },
      { type: 'text', name: 'content', required: true, min: 1, max: 500 },
      { type: 'bool', name: 'is_read', required: true, defaultValue: 'false' },
      { type: 'date', name: 'read_time', required: false },
    ],
    indexes: [
      'CREATE INDEX idx_ntf_sender_id ON notifications (sender_id)',
      'CREATE INDEX idx_ntf_user_id ON notifications (user_id)',
      'CREATE INDEX idx_ntf_notification_type ON notifications (notification_type)',
      'CREATE INDEX idx_ntf_is_read ON notifications (is_read)',
    ],
  },
];

// ======================== 主逻辑 ========================
async function main() {
  const baseUrl = CONFIG.url.replace(/\/$/, '');

  console.log(' 连接 PocketBase:', baseUrl);
  console.log('  待创建集合数量:', COLLECTIONS.length);
  console.log('');

  let adminToken = CONFIG.adminToken;

  if (adminToken) {
    console.log('✅ 使用提供的 Admin Token');
  } else {
    if (!CONFIG.adminEmail || !CONFIG.adminPassword) {
      console.error('❌ 错误：请设置 PB_ADMIN_TOKEN 或 PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD');
      process.exit(1);
    }

    try {
      const loginRes = await fetch(`${baseUrl}/api/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: CONFIG.adminEmail,
          password: CONFIG.adminPassword,
        }),
      });

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
  }

  // 2. 获取现有集合列表，建立 name -> id 映射
  let existingCollections = new Set();
  let nameToId = {};

  try {
    const collectionsRes = await fetch(`${baseUrl}/api/collections?perPage=100`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    if (collectionsRes.ok) {
      const data = await collectionsRes.json();
      for (const c of data.items) {
        existingCollections.add(c.name);
        nameToId[c.name] = c.id;
      }
      console.log(` 现有集合: ${[...existingCollections].join(', ')}`);
    }
  } catch (err) {
    console.warn('⚠️ 无法获取现有集合列表:', err.message);
  }

  // 3. 逐个创建集合（按依赖顺序）
  for (const collectionDef of COLLECTIONS) {
    const name = collectionDef.name;

    if (existingCollections.has(name)) {
      console.log(`⏭️  集合 "${name}" 已存在，跳过`);
      // 即使已存在，也记录其 ID 供后续引用
      const existingRes = await fetch(`${baseUrl}/api/collections/${name}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        nameToId[name] = existingData.id;
      }
      continue;
    }

    console.log(`🔨 创建集合 "${name}"...`);

    // 深拷贝并替换 collectionId 为实际 ID
    const payload = JSON.parse(JSON.stringify(collectionDef));
    for (const field of payload.fields) {
      if (field.type === 'relation' && field.collectionId) {
        const refName = field.collectionId;
        const refId = nameToId[refName];
        if (refId) {
          field.collectionId = refId;
        } else {
          console.error(`   ❌ 找不到集合 "${refName}" 的 ID，跳过`);
          break;
        }
      }
    }

    try {
      const res = await fetch(`${baseUrl}/api/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`  ❌ 创建失败 (${res.status}): ${errText}`);
        continue;
      }

      const created = await res.json();
      nameToId[name] = created.id;
      existingCollections.add(name);
      console.log(`  ✅ 集合 "${name}" 创建成功 (ID: ${created.id})`);

      // 创建索引
      if (collectionDef.indexes && collectionDef.indexes.length > 0) {
        console.log(`  📝 创建索引...`);
        const updateRes = await fetch(`${baseUrl}/api/collections/${name}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ indexes: collectionDef.indexes }),
        });

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          console.error(`  ️ 索引创建失败 (${updateRes.status}): ${errText}`);
        } else {
          console.log(`  ✅ 索引创建成功 (${collectionDef.indexes.length} 个)`);
        }
      }
    } catch (err) {
      console.error(`   异常: ${err.message}`);
    }
  }

  console.log('');
  console.log('🎉 集合初始化完成！');
  console.log('');
  console.log('💡 提示：');
  console.log('   - 请在 PocketBase Admin UI 中验证集合是否正确创建');
  console.log('   - 如需重新创建，请先在 Admin UI 中删除对应集合');
  console.log('   - 关系字段的 cascadeDelete 可根据业务需求调整');
}

main().catch(err => {
  console.error('💥 脚本执行失败:', err);
  process.exit(1);
});
