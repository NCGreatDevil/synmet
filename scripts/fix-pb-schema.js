/**
 * 修复 PocketBase 表结构
 * 将状态字段的 required 改为 false，因为 0 会被视为空值
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pb = new PocketBase(process.env.PB_URL);

async function fixSchema() {
  try {
    console.log('开始修复表结构...\n');

    // 使用管理员token登录
    pb.authStore.loadFromCookie(`pb_admin_token=${process.env.PB_ADMIN_TOKEN}`);

    // 1. 修复 matchmaker_applications 表
    console.log('1. 修复 matchmaker_applications 表...');
    const matchmakerApps = await pb.collections.getOne('matchmaker_applications');

    const updatedFields = matchmakerApps.fields.map(field => {
      // 将状态字段的 required 改为 false
      if (['user_a_status', 'user_b_status', 'application_status'].includes(field.name)) {
        console.log(`   - ${field.name}: required ${field.required} -> false`);
        return { ...field, required: false };
      }
      return field;
    });

    await pb.collections.update('matchmaker_applications', {
      fields: updatedFields
    });
    console.log('   ✓ matchmaker_applications 表修复完成\n');

    // 2. 修复 notifications 表
    console.log('2. 修复 notifications 表...');
    const notifications = await pb.collections.getOne('notifications');

    const updatedNotificationFields = notifications.fields.map(field => {
      // 将 notification_type 字段的 required 改为 false
      if (field.name === 'notification_type') {
        console.log(`   - ${field.name}: required ${field.required} -> false`);
        return { ...field, required: false };
      }
      return field;
    });

    await pb.collections.update('notifications', {
      fields: updatedNotificationFields
    });
    console.log('   ✓ notifications 表修复完成\n');

    console.log('✓ 所有表结构修复完成！');
  } catch (error) {
    console.error('✗ 修复失败:', error.message);
    console.error(error.data || error);
    process.exit(1);
  }
}

fixSchema();
