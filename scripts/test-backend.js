/**
 * 后端功能测试脚本
 * 测试通知中心和邀请管理功能
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc');

// 测试账号信息
const accounts = {
  matchmaker: {
    email: '472757683@qq.com',
    password: '12345678',
    id: 'k32pxtta1iudu4y',
    username: '冯南昌'
  },
  userA: {
    email: 'test6@example.com',
    password: '12345678',
    id: '8tqvbqtpnffe7dd',
    username: '西施'
  },
  userB: {
    email: 'test1@example.com',
    password: '12345678',
    id: 'tevp97aiux3l68i',
    username: '晓晓'
  }
};

async function testNotifications() {
  console.log('\n=== 测试通知中心功能 ===\n');
  
  // 1. 登录红娘账号
  console.log('1. 登录红娘账号...');
  await pb.collection('users').authWithPassword(accounts.matchmaker.email, accounts.matchmaker.password);
  console.log('✓ 红娘登录成功:', pb.authStore.model.username);
  
  // 2. 发送匹配邀请通知
  console.log('\n2. 发送匹配邀请通知...');
  
  // 创建牵线申请（不传递状态字段，使用默认值）
  const application = await pb.collection('matchmaker_applications').create({
    matchmaker_id: accounts.matchmaker.id,
    user_a_id: accounts.userA.id,
    user_b_id: accounts.userB.id,
    apply_time: new Date().toISOString()
  });
  console.log('✓ 牵线申请创建成功, ID:', application.id);
  console.log('  状态:', {
    user_a_status: application.user_a_status,
    user_b_status: application.user_b_status,
    application_status: application.application_status
  });
  
  // 给用户A发送通知
  const notificationA = await pb.collection('notifications').create({
    sender_id: accounts.matchmaker.id,
    user_id: accounts.userA.id,
    notification_type: 0,
    related_id: application.id,
    content: `${accounts.matchmaker.username}邀请您参加匹配,点击进入匹配列表。`,
    is_read: false
  });
  console.log('✓ 用户A通知发送成功, ID:', notificationA.id);
  
  // 给用户B发送通知
  const notificationB = await pb.collection('notifications').create({
    sender_id: accounts.matchmaker.id,
    user_id: accounts.userB.id,
    notification_type: 0,
    related_id: application.id,
    content: `${accounts.matchmaker.username}邀请您参加匹配,点击进入匹配列表。`,
    is_read: false
  });
  console.log('✓ 用户B通知发送成功, ID:', notificationB.id);
  
  // 红娘发件箱:发给A的记录
  const sentA = await pb.collection('notifications').create({
    sender_id: accounts.matchmaker.id,
    user_id: accounts.userA.id,
    notification_type: 0,
    related_id: application.id,
    content: `你邀请${accounts.userA.username}参加匹配,点击进入匹配列表。`,
    is_read: false
  });
  console.log('✓ 红娘发件箱(A)记录创建成功, ID:', sentA.id);
  
  // 红娘发件箱:发给B的记录
  const sentB = await pb.collection('notifications').create({
    sender_id: accounts.matchmaker.id,
    user_id: accounts.userB.id,
    notification_type: 0,
    related_id: application.id,
    content: `你邀请${accounts.userB.username}参加匹配,点击进入匹配列表。`,
    is_read: false
  });
  console.log('✓ 红娘发件箱(B)记录创建成功, ID:', sentB.id);
  
  // 3. 查询用户A的收件箱
  console.log('\n3. 查询用户A的收件箱...');
  await pb.collection('users').authWithPassword(accounts.userA.email, accounts.userA.password);
  console.log('  当前用户:', pb.authStore.record?.email);
  
  try {
    const inboxA = await pb.collection('notifications').getList(1, 10, {
      filter: `user_id = "${accounts.userA.id}"`
    });
    console.log('✓ 用户A收件箱通知数量:', inboxA.totalItems);
    inboxA.items.forEach(n => {
      console.log(`  - [${n.is_read ? '已读' : '未读'}] ${n.content}`);
    });
  } catch (error) {
    console.error('✗ 查询用户A收件箱失败:', error.message);
    console.error('错误详情:', error.data);
    throw error;
  }
  
  // 4. 查询红娘的发件箱
  console.log('\n4. 查询红娘的发件箱...');
  await pb.collection('users').authWithPassword(accounts.matchmaker.email, accounts.matchmaker.password);
  const sentBox = await pb.collection('notifications').getList(1, 10, {
    filter: `sender_id = "${accounts.matchmaker.id}"`
  });
  console.log('✓ 红娘发件箱通知数量:', sentBox.totalItems);
  sentBox.items.forEach(n => {
    console.log(`  - ${n.content}`);
  });
  
  return application.id;
}

async function testInvitationManagement(applicationId) {
  console.log('\n=== 测试邀请管理功能 ===\n');
  
  // 1. 红娘查询自己发起的邀请
      console.log('1. 红娘查询自己发起的邀请...');
      await pb.collection('users').authWithPassword(accounts.matchmaker.email, accounts.matchmaker.password);
      const matchmakerApps = await pb.collection('matchmaker_applications').getList(1, 10, {
        filter: `matchmaker_id = "${accounts.matchmaker.id}"`,
        expand: 'user_a_id,user_b_id'
      });
      console.log('✓ 红娘发起的邀请数量:', matchmakerApps.totalItems);
      matchmakerApps.items.forEach(app => {
        console.log(`  - 申请ID: ${app.id}`);
        const userA = app.expand?.user_a_id || {};
        const userB = app.expand?.user_b_id || {};
        console.log(`    用户A: ${userA.username || '未知'} (状态: ${app.user_a_status})`);
        console.log(`    用户B: ${userB.username || '未知'} (状态: ${app.user_b_status})`);
        console.log(`    申请状态: ${app.application_status}`);
      });
      
      // 2. 用户A查询自己被邀请的记录
      console.log('\n2. 用户A查询自己被邀请的记录...');
      await pb.collection('users').authWithPassword(accounts.userA.email, accounts.userA.password);
      const userAApps = await pb.collection('matchmaker_applications').getList(1, 10, {
        filter: `user_a_id = "${accounts.userA.id}"`
      });
      console.log('✓ 用户A被邀请的记录数量:', userAApps.totalItems);
      for (const app of userAApps.items) {
        console.log(`  - 申请ID: ${app.id}`);
        try {
          const matchmaker = await pb.collection('users').getOne(app.matchmaker_id);
          const userB = await pb.collection('users').getOne(app.user_b_id);
          console.log(`    红娘: ${matchmaker.username || '未知'}`);
          console.log(`    用户B: ${userB.username || '未知'}`);
        } catch (e) {
          console.log(`    (无法获取关联用户信息)`);
        }
        console.log(`    我的状态: ${app.user_a_status}`);
      }
  
  // 3. 用户A接受邀请
  console.log('\n3. 用户A接受邀请...');
  await pb.collection('matchmaker_applications').update(applicationId, {
    user_a_status: 1,
    user_a_confirm_time: new Date().toISOString()
  });
  console.log('✓ 用户A已接受邀请');
  
  // 4. 发送接受通知给红娘
  console.log('\n4. 发送接受通知给红娘...');
  await pb.collection('notifications').create({
    sender_id: accounts.userA.id,
    user_id: accounts.matchmaker.id,
    notification_type: 1,
    related_id: applicationId,
    content: `${accounts.userA.username}已接收匹配邀请`,
    is_read: false
  });
  console.log('✓ 接受通知已发送给红娘');
  
  // 5. 用户B拒绝邀请
  console.log('\n5. 用户B拒绝邀请...');
  await pb.collection('users').authWithPassword(accounts.userB.email, accounts.userB.password);
  await pb.collection('matchmaker_applications').update(applicationId, {
    user_b_status: 2,
    user_b_confirm_time: new Date().toISOString(),
    application_status: 2
  });
  console.log('✓ 用户B已拒绝邀请');
  
  // 6. 发送拒绝通知给红娘
  console.log('\n6. 发送拒绝通知给红娘...');
  await pb.collection('notifications').create({
    sender_id: accounts.userB.id,
    user_id: accounts.matchmaker.id,
    notification_type: 2,
    related_id: applicationId,
    content: `${accounts.userB.username}拒绝匹配邀请`,
    is_read: false
  });
  console.log('✓ 拒绝通知已发送给红娘');
  
  // 7. 红娘查看最终状态
  console.log('\n7. 红娘查看最终状态...');
  await pb.collection('users').authWithPassword(accounts.matchmaker.email, accounts.matchmaker.password);
  const finalApp = await pb.collection('matchmaker_applications').getOne(applicationId, {
    expand: 'user_a_id,user_b_id'
  });
  console.log('✓ 最终申请状态:');
  console.log(`  - 用户A (${finalApp.expand.user_a_id.username}): ${finalApp.user_a_status === 1 ? '已接受' : '未接受'}`);
  console.log(`  - 用户B (${finalApp.expand.user_b_id.username}): ${finalApp.user_b_status === 2 ? '已拒绝' : '未拒绝'}`);
  console.log(`  - 申请状态: ${finalApp.application_status === 2 ? '已拒绝' : '其他'}`);
  
  // 8. 红娘查看收到的通知
  console.log('\n8. 红娘查看收到的通知...');
  const receivedNotifications = await pb.collection('notifications').getList(1, 10, {
    filter: `user_id = "${accounts.matchmaker.id}"`,
    expand: 'sender_id'
  });
  console.log('✓ 红娘收到的通知数量:', receivedNotifications.totalItems);
  receivedNotifications.items.forEach(n => {
    const senderName = n.expand?.sender_id?.username || '未知';
    console.log(`  - [${senderName}] ${n.content}`);
  });
}

async function main() {
  try {
    console.log('========================================');
    console.log('开始后端功能测试');
    console.log('========================================');
    
    const applicationId = await testNotifications();
    await testInvitationManagement(applicationId);
    
    console.log('\n========================================');
    console.log('✓ 所有测试通过!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error(error.data || error);
    process.exit(1);
  }
}

main();
