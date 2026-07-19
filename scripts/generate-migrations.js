/**
 * PocketBase 沟通管理模块 - 迁移文件生成脚本
 * 
 * 使用方法：
 *   node scripts/generate-migrations.js
 * 
 * 生成的迁移文件将保存在 pb_migrations/ 目录中
 * 然后通过 PocketBase 执行迁移
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 迁移文件输出目录
const MIGRATIONS_DIR = path.join(__dirname, '..', 'pb_migrations');

// 确保目录存在
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

// 生成时间戳（用于文件名）
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);

/**
 * 生成创建集合的迁移代码
 */
function generateCreateCollectionMigration(collectionName, fields, indexes = [], rules = {}) {
  const fieldsCode = fields.map(f => {
    const props = [`Name: "${f.name}"`, `Required: ${f.required || false}`];
    
    if (f.type === 'relation') {
      props.push(`CollectionId: "${f.collectionId}"`);
      if (f.maxSelect !== undefined) props.push(`MaxSelect: ${f.maxSelect}`);
      if (f.cascadeDelete !== undefined) props.push(`CascadeDelete: ${f.cascadeDelete}`);
    } else if (f.type === 'number') {
      if (f.min !== undefined) props.push(`Min: ${f.min}`);
      if (f.max !== undefined) props.push(`Max: ${f.max}`);
      if (f.onlyIntegers !== undefined) props.push(`OnlyIntegers: ${f.onlyIntegers}`);
    } else if (f.type === 'text') {
      if (f.min !== undefined) props.push(`Min: ${f.min}`);
      if (f.max !== undefined) props.push(`Max: ${f.max}`);
    }
    
    return `    &core.RelationField{${props.join(', ')}}`;
  }).join(',\n');

  const indexesCode = indexes.length > 0 
    ? indexes.map(idx => `    "${idx}"`).join(',\n')
    : '';

  return `// PocketBase migration file
// Generated at: ${new Date().toISOString()}

package migrations

import (
    "github.com/pocketbase/pocketbase/core"
)

func init() {
    core.AppRegisterMigration(&core.Migration{
        Name: "${timestamp}_create_${collectionName}.go",
        Up: func(app core.App) error {
            collection := &core.Collection{
                Name: "${collectionName}",
                Type: "base",
                ListRule: ${rules.listRule || '""'},
                ViewRule: ${rules.viewRule || '""'},
                CreateRule: ${rules.createRule || '""'},
                UpdateRule: ${rules.updateRule || '""'},
                DeleteRule: ${rules.deleteRule || '""'},
                Fields: core.Fields{
${fieldsCode}
                },
                Indexes: []string{
${indexesCode}
                },
            }
            
            return app.Dao().SaveCollection(collection)
        },
        Down: func(app core.App) error {
            collection, err := app.Dao().FindCollectionByNameOrId("${collectionName}")
            if err != nil {
                return err
            }
            return app.Dao().DeleteCollection(collection)
        },
    })
}
`;
}

// ======================== 集合定义 ========================

const COLLECTIONS = [
  {
    name: 'matchmaker_applications',
    fields: [
      { name: 'matchmaker_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: true },
      { name: 'user_a_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'user_b_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'user_a_status', type: 'number', required: true, min: 0, max: 2, onlyIntegers: true },
      { name: 'user_b_status', type: 'number', required: true, min: 0, max: 2, onlyIntegers: true },
      { name: 'application_status', type: 'number', required: true, min: 0, max: 3, onlyIntegers: true },
      { name: 'apply_time', type: 'date', required: true },
      { name: 'user_a_confirm_time', type: 'date', required: false },
      { name: 'user_b_confirm_time', type: 'date', required: false },
      { name: 'expire_time', type: 'date', required: false },
    ],
    indexes: [
      'CREATE INDEX idx_matchmaker_id ON matchmaker_applications (matchmaker_id)',
      'CREATE INDEX idx_user_a_id ON matchmaker_applications (user_a_id)',
      'CREATE INDEX idx_user_b_id ON matchmaker_applications (user_b_id)',
      'CREATE INDEX idx_application_status ON matchmaker_applications (application_status)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '"@request.auth.id != \\"\\""',
      updateRule: '"@request.auth.id != \\"\\""',
      deleteRule: '""',
    },
  },
  {
    name: 'matchmaker_assistants',
    fields: [
      { name: 'application_id', type: 'relation', required: true, collectionId: 'matchmaker_applications', maxSelect: 1, cascadeDelete: true },
      { name: 'assistant_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: true },
    ],
    indexes: [
      'CREATE INDEX idx_ma_application_id ON matchmaker_assistants (application_id)',
      'CREATE INDEX idx_ma_assistant_id ON matchmaker_assistants (assistant_id)',
      'CREATE UNIQUE INDEX idx_ma_app_assistant_unique ON matchmaker_assistants (application_id, assistant_id)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '"@request.auth.id != \\"\\""',
      updateRule: '""',
      deleteRule: '""',
    },
  },
  {
    name: 'communication_sessions',
    fields: [
      { name: 'application_id', type: 'relation', required: true, collectionId: 'matchmaker_applications', maxSelect: 1, cascadeDelete: true },
      { name: 'user_a_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'user_b_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'main_matchmaker_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'session_status', type: 'number', required: true, min: 0, max: 1, onlyIntegers: true },
      { name: 'start_time', type: 'date', required: true },
      { name: 'end_time', type: 'date', required: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_cs_application_id ON communication_sessions (application_id)',
      'CREATE INDEX idx_cs_user_a_id ON communication_sessions (user_a_id)',
      'CREATE INDEX idx_cs_user_b_id ON communication_sessions (user_b_id)',
      'CREATE INDEX idx_cs_main_matchmaker_id ON communication_sessions (main_matchmaker_id)',
      'CREATE INDEX idx_cs_session_status ON communication_sessions (session_status)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '""',
      updateRule: '"@request.auth.id != \\"\\""',
      deleteRule: '""',
    },
  },
  {
    name: 'chat_groups',
    fields: [
      { name: 'session_id', type: 'relation', required: true, collectionId: 'communication_sessions', maxSelect: 1, cascadeDelete: true },
      { name: 'group_name', type: 'text', required: true, min: 1, max: 100 },
      { name: 'group_type', type: 'number', required: true, min: 0, max: 1, onlyIntegers: true },
      { name: 'group_status', type: 'number', required: true, min: 0, max: 1, onlyIntegers: true },
    ],
    indexes: [
      'CREATE INDEX idx_cg_session_id ON chat_groups (session_id)',
      'CREATE INDEX idx_cg_group_type ON chat_groups (group_type)',
      'CREATE INDEX idx_cg_group_status ON chat_groups (group_status)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '""',
      updateRule: '"@request.auth.id != \\"\\""',
      deleteRule: '""',
    },
  },
  {
    name: 'chat_group_members',
    fields: [
      { name: 'group_id', type: 'relation', required: true, collectionId: 'chat_groups', maxSelect: 1, cascadeDelete: true },
      { name: 'user_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'member_role', type: 'number', required: true, min: 0, max: 2, onlyIntegers: true },
      { name: 'join_time', type: 'date', required: true },
      { name: 'leave_time', type: 'date', required: false },
      { name: 'is_active', type: 'bool', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_cgm_group_id ON chat_group_members (group_id)',
      'CREATE INDEX idx_cgm_user_id ON chat_group_members (user_id)',
      'CREATE UNIQUE INDEX idx_cgm_group_user_unique ON chat_group_members (group_id, user_id)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '""',
      updateRule: '"@request.auth.id != \\"\\""',
      deleteRule: '""',
    },
  },
  {
    name: 'messages',
    fields: [
      { name: 'group_id', type: 'relation', required: true, collectionId: 'chat_groups', maxSelect: 1, cascadeDelete: false },
      { name: 'sender_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'message_type', type: 'number', required: true, min: 0, max: 4, onlyIntegers: true },
      { name: 'content', type: 'editor', required: false },
      { name: 'file_url', type: 'url', required: false },
      { name: 'duration', type: 'number', required: false, min: 0, onlyIntegers: true },
      { name: 'is_read', type: 'bool', required: true },
      { name: 'send_time', type: 'date', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_msg_group_id ON messages (group_id)',
      'CREATE INDEX idx_msg_sender_id ON messages (sender_id)',
      'CREATE INDEX idx_msg_send_time ON messages (send_time)',
      'CREATE INDEX idx_msg_is_read ON messages (is_read)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '"@request.auth.id != \\"\\""',
      updateRule: '""',
      deleteRule: '""',
    },
  },
  {
    name: 'notifications',
    fields: [
      { name: 'sender_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'user_id', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'notification_type', type: 'number', required: true, min: 0, max: 4, onlyIntegers: true },
      { name: 'related_id', type: 'text', required: false, min: 0, max: 50 },
      { name: 'content', type: 'text', required: true, min: 1, max: 500 },
      { name: 'is_read', type: 'bool', required: true },
      { name: 'read_time', type: 'date', required: false },
    ],
    indexes: [
      'CREATE INDEX idx_ntf_sender_id ON notifications (sender_id)',
      'CREATE INDEX idx_ntf_user_id ON notifications (user_id)',
      'CREATE INDEX idx_ntf_notification_type ON notifications (notification_type)',
      'CREATE INDEX idx_ntf_is_read ON notifications (is_read)',
    ],
    rules: {
      listRule: '"@request.auth.id != \\"\\""',
      viewRule: '"@request.auth.id != \\"\\""',
      createRule: '""',
      updateRule: '"@request.auth.id != \\"\\""',
      deleteRule: '""',
    },
  },
];

// ======================== 生成迁移文件 ========================

console.log('🔨 生成 PocketBase 迁移文件...\n');

for (const collection of COLLECTIONS) {
  const migrationCode = generateCreateCollectionMigration(
    collection.name,
    collection.fields,
    collection.indexes,
    collection.rules
  );

  const fileName = `${timestamp}_create_${collection.name}.go`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  fs.writeFileSync(filePath, migrationCode, 'utf-8');
  console.log(`✅ 生成迁移文件：${fileName}`);
}

console.log('\n🎉 迁移文件生成完成！');
console.log(`📁 输出目录：${MIGRATIONS_DIR}`);
console.log('\n💡 下一步：');
console.log('   1. 将 pb_migrations/ 目录复制到你的 PocketBase 服务器');
console.log('   2. 运行 PocketBase 执行迁移：./pocketbase migrate');
console.log('   3. 验证集合是否正确创建');
