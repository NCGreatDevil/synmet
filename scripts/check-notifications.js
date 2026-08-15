/**
 * 检查 notifications 表的数据
 */
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc');

async function checkNotifications() {
  console.log('=== 检查 notifications 表 ===\n');

  // 使用红娘账号登录
  await pb.collection('users').authWithPassword('472757683@qq.com', '12345678');
  const matchmakerId = pb.authStore.model.id;
  console.log(`红娘 ID: ${matchmakerId}`);
  console.log(`红娘 Email: ${pb.authStore.model.email}\n`);

  // 获取所有通知
  const notifications = await pb.collection('notifications').getFullList({
    sort: '-created'
  });

  console.log(`总共有 ${notifications.length} 条通知\n`);

  notifications.forEach((n, i) => {
    console.log(`通知 ${i + 1}:`);
    console.log(`  ID: ${n.id}`);
    console.log(`  sender_id: ${n.sender_id} (类型: ${typeof n.sender_id})`);
    console.log(`  user_id: ${n.user_id}`);
    console.log(`  content: ${n.content}`);
    console.log(`  created: ${n.created}`);
    console.log(`  updated: ${n.updated}`);
    console.log('');
  });

  // 检查发件箱查询
  console.log(`使用红娘 ID (${matchmakerId}) 查询发件箱:`);
  const sentById = await pb.collection('notifications').getFullList({
    filter: `sender_id = "${matchmakerId}"`
  });
  console.log(`  找到 ${sentById.length} 条通知\n`);

  // 检查是否用邮箱查询
  console.log(`使用红娘邮箱 (${pb.authStore.model.email}) 查询发件箱:`);
  const sentByEmail = await pb.collection('notifications').getFullList({
    filter: `sender_id = "${pb.authStore.model.email}"`
  });
  console.log(`  找到 ${sentByEmail.length} 条通知\n`);
}

checkNotifications().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
