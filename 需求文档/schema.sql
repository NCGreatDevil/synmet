CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户唯一标识',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱地址',
  `password` VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  `gender` TINYINT NOT NULL DEFAULT 0 COMMENT '性别：0-保密，1-男，2-女',
  `age` TINYINT NULL COMMENT '年龄',
  `bio` VARCHAR(500) NULL COMMENT '个人简介',
  `avatar` VARCHAR(255) NULL COMMENT '头像URL',
  `role` TINYINT NOT NULL DEFAULT 0 COMMENT '角色：0-普通用户，1-红娘用户',
  `is_admin` TINYINT NOT NULL DEFAULT 0 COMMENT '是否管理员：0-否，1-是（管理员可访问用户管理页面并管理所有用户）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '用户状态：0-禁用，1-正常',
  `is_online` TINYINT NOT NULL DEFAULT 0 COMMENT '在线状态：0-离线，1-在线',
  `current_partner_id` BIGINT NULL COMMENT '当前交往对象ID（普通用户专属，最多一个）',
  `main_matchmaker_id` BIGINT NULL COMMENT '牵线红娘ID（普通用户专属，最多一个）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` DATETIME NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`),
  UNIQUE KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`),
  KEY `idx_current_partner_id` (`current_partner_id`),
  KEY `idx_main_matchmaker_id` (`main_matchmaker_id`),
  CONSTRAINT `fk_users_current_partner` FOREIGN KEY (`current_partner_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_users_main_matchmaker` FOREIGN KEY (`main_matchmaker_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户主表';

CREATE TABLE IF NOT EXISTS `user_login_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志唯一标识',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `login_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  `login_ip` VARCHAR(50) NULL COMMENT '登录IP地址',
  `device_type` VARCHAR(50) NULL COMMENT '登录设备类型（如：web, ios, android）',
  `device_info` VARCHAR(255) NULL COMMENT '设备详细信息',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_login_time` (`login_time`),
  CONSTRAINT `fk_user_login_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户登录日志表';

CREATE TABLE IF NOT EXISTS `user_tags` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '标签记录唯一标识',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `tag_name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `tag_type` TINYINT NOT NULL DEFAULT 0 COMMENT '标签类型：0-官方标签，1-自定义标签',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_tag_name` (`tag_name`),
  UNIQUE KEY `idx_user_tag_unique` (`user_id`, `tag_name`),
  CONSTRAINT `fk_user_tags_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户标签表';

CREATE TABLE IF NOT EXISTS `user_stats` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '统计记录唯一标识',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `login_count` INT NOT NULL DEFAULT 0 COMMENT '累计登录次数',
  `interaction_count` INT NOT NULL DEFAULT 0 COMMENT '互动次数（点赞、评论等）',
  `popularity_score` INT NOT NULL DEFAULT 0 COMMENT '人气值',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_user_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计信息表';

CREATE TABLE IF NOT EXISTS `matchmaker_applications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '申请唯一标识',
  `matchmaker_id` BIGINT NOT NULL COMMENT '申请红娘ID',
  `user_a_id` BIGINT NOT NULL COMMENT '用户A ID',
  `user_b_id` BIGINT NOT NULL COMMENT '用户B ID',
  `user_a_status` TINYINT NOT NULL DEFAULT 0 COMMENT '用户A确认状态：0-待确认，1-同意，2-拒绝',
  `user_b_status` TINYINT NOT NULL DEFAULT 0 COMMENT '用户B确认状态：0-待确认，1-同意，2-拒绝',
  `application_status` TINYINT NOT NULL DEFAULT 0 COMMENT '申请状态：0-待确认，1-已同意，2-已拒绝，3-已过期',
  `apply_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `user_a_confirm_time` DATETIME NULL COMMENT '用户A确认时间',
  `user_b_confirm_time` DATETIME NULL COMMENT '用户B确认时间',
  `expire_time` DATETIME NULL COMMENT '过期时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_matchmaker_id` (`matchmaker_id`),
  KEY `idx_user_a_id` (`user_a_id`),
  KEY `idx_user_b_id` (`user_b_id`),
  KEY `idx_application_status` (`application_status`),
  UNIQUE KEY `idx_matchmaker_users_unique` (`matchmaker_id`, `user_a_id`, `user_b_id`),
  CONSTRAINT `fk_matchmaker_applications_matchmaker` FOREIGN KEY (`matchmaker_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_matchmaker_applications_user_a` FOREIGN KEY (`user_a_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_matchmaker_applications_user_b` FOREIGN KEY (`user_b_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='红娘牵线申请表';

CREATE TABLE IF NOT EXISTS `matchmaker_assistants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '关联记录唯一标识',
  `application_id` BIGINT NOT NULL COMMENT '牵线申请ID',
  `assistant_id` BIGINT NOT NULL COMMENT '辅助红娘ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_assistant_id` (`assistant_id`),
  UNIQUE KEY `idx_application_assistant_unique` (`application_id`, `assistant_id`),
  CONSTRAINT `fk_matchmaker_assistants_application` FOREIGN KEY (`application_id`) REFERENCES `matchmaker_applications` (`id`),
  CONSTRAINT `fk_matchmaker_assistants_assistant` FOREIGN KEY (`assistant_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='辅助红娘关联表';

CREATE TABLE IF NOT EXISTS `communication_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '会话唯一标识',
  `application_id` BIGINT NOT NULL COMMENT '关联牵线申请ID',
  `user_a_id` BIGINT NOT NULL COMMENT '用户A ID',
  `user_b_id` BIGINT NOT NULL COMMENT '用户B ID',
  `main_matchmaker_id` BIGINT NOT NULL COMMENT '主红娘ID',
  `session_status` TINYINT NOT NULL DEFAULT 1 COMMENT '会话状态：0-已结束，1-进行中',
  `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '会话开始时间',
  `end_time` DATETIME NULL COMMENT '会话结束时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_application_id` (`application_id`),
  KEY `idx_user_a_id` (`user_a_id`),
  KEY `idx_user_b_id` (`user_b_id`),
  KEY `idx_main_matchmaker_id` (`main_matchmaker_id`),
  KEY `idx_session_status` (`session_status`),
  CONSTRAINT `fk_communication_sessions_application` FOREIGN KEY (`application_id`) REFERENCES `matchmaker_applications` (`id`),
  CONSTRAINT `fk_communication_sessions_user_a` FOREIGN KEY (`user_a_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_communication_sessions_user_b` FOREIGN KEY (`user_b_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_communication_sessions_matchmaker` FOREIGN KEY (`main_matchmaker_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='沟通会话表';

CREATE TABLE IF NOT EXISTS `chat_groups` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '群组唯一标识',
  `session_id` BIGINT NOT NULL COMMENT '关联沟通会话ID',
  `group_name` VARCHAR(100) NOT NULL COMMENT '群组名称',
  `group_type` TINYINT NOT NULL COMMENT '群组类型：0-大群（红娘+双方用户），1-红娘对策群（主红娘+辅助红娘）',
  `group_status` TINYINT NOT NULL DEFAULT 1 COMMENT '群组状态：0-已解散，1-正常',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_group_type` (`group_type`),
  KEY `idx_group_status` (`group_status`),
  CONSTRAINT `fk_chat_groups_session` FOREIGN KEY (`session_id`) REFERENCES `communication_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='群组表';

CREATE TABLE IF NOT EXISTS `chat_group_members` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '成员记录唯一标识',
  `group_id` BIGINT NOT NULL COMMENT '群组ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `member_role` TINYINT NOT NULL DEFAULT 0 COMMENT '成员角色：0-普通成员，1-群主，2-管理员',
  `join_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `leave_time` DATETIME NULL COMMENT '离开时间',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '是否活跃：0-已离开，1-活跃',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_user_id` (`user_id`),
  UNIQUE KEY `idx_group_user_unique` (`group_id`, `user_id`),
  CONSTRAINT `fk_chat_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`),
  CONSTRAINT `fk_chat_group_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='群成员表';

CREATE TABLE IF NOT EXISTS `messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息唯一标识',
  `group_id` BIGINT NOT NULL COMMENT '发送群组ID',
  `sender_id` BIGINT NOT NULL COMMENT '发送者ID',
  `message_type` TINYINT NOT NULL DEFAULT 0 COMMENT '消息类型：0-文本，1-图片，2-语音，3-视频，4-文件',
  `content` TEXT NULL COMMENT '消息内容',
  `file_url` VARCHAR(255) NULL COMMENT '文件/图片URL（消息类型为1/3/4时使用）',
  `duration` INT NULL COMMENT '语音/视频时长（秒）',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  `send_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_send_time` (`send_time`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_group_send_time` (`group_id`, `send_time`),
  CONSTRAINT `fk_messages_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`),
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息记录表';

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '通知唯一标识',
  `user_id` BIGINT NOT NULL COMMENT '接收用户ID',
  `notification_type` TINYINT NOT NULL COMMENT '通知类型：0-牵线邀请，1-牵线同意，2-牵线拒绝，3-消息提醒，4-系统通知',
  `related_id` BIGINT NULL COMMENT '关联业务ID（如申请ID、消息ID）',
  `content` VARCHAR(500) NOT NULL COMMENT '通知内容',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  `read_time` DATETIME NULL COMMENT '阅读时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_user_is_read` (`user_id`, `is_read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';