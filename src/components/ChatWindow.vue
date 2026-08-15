<template>
  <n-modal
    v-model:show="showModal"
    :mask-closable="false"
    :closable="false"
    preset="card"
    :style="{ width: isFullscreen ? '100vw' : '800px', height: isFullscreen ? '100vh' : '600px' }"
    content-style="padding: 0; display: flex; flex-direction: column; overflow: hidden;"
  >
    <!-- 顶部栏 -->
    <div class="chat-window-header">
      <span class="chat-title">{{ currentGroup?.name }}</span>
      <div class="header-actions">
        <button
          class="window-btn"
          :title="isFullscreen ? '还原' : '最大化'"
          @click="toggleFullscreen"
        >
          <n-icon :size="14">
            <ExpandOutline v-if="!isFullscreen" />
            <ContractOutline v-else />
          </n-icon>
        </button>
        <button
          class="window-btn close-btn"
          title="关闭"
          @click="handleClose"
        >
          <n-icon :size="14">
            <CloseOutline />
          </n-icon>
        </button>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="chat-window-body">
      <!-- 左侧聊天区域 -->
      <div class="chat-area">
        <!-- 消息列表 -->
        <div class="message-list" ref="messageListRef" :style="{ height: messageListHeight + 'px' }">
          <template v-for="(msg, index) in currentGroup?.messages" :key="msg.id">
            <div
              v-if="shouldShowTimeSeparator(msg, index)"
              class="time-separator"
            >
              {{ formatTimeSeparator(msg.sendTime) }}
            </div>

            <div v-if="msg.messageType === 6" class="system-message">
              {{ msg.content }}
            </div>

            <div
              v-else
              class="message-item"
              :class="{ 'message-self': msg.senderId === currentUserId }"
            >
              <div class="message-avatar">
                <n-avatar :size="40" round>
                  {{ msg.senderName.charAt(0) }}
                </n-avatar>
              </div>
              <div class="message-body">
                <div class="message-sender">{{ msg.senderName }}</div>
                <div class="message-bubble" v-html="renderMessageContent(msg.content)"></div>
              </div>
            </div>
          </template>
        </div>

        <!-- 拖拽分隔条（4px） -->
        <div class="resize-handle" @mousedown="startResize"></div>

        <!-- 底部输入区域 -->
        <div class="input-area" :style="{ height: inputAreaHeight + 'px' }">
          <!-- 输入框（textarea） -->
          <textarea
            ref="inputEditorRef"
            class="message-editor"
            v-model="inputMessage"
            placeholder="输入消息..."
            @keydown.enter.exact.prevent="handleSend"
          ></textarea>

          <!-- 工具栏（固定底部） -->
          <div class="input-toolbar">
            <button
              ref="emojiTriggerRef"
              class="emoji-trigger"
              @click="toggleEmojiPicker"
              type="button"
              title="表情"
            >
              <svg viewBox="0 0 1025 1024" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                <path d="M512 1024c-137.309091 0-265.309091-53.527273-363.054545-148.945455C53.527273 777.309091 0 649.309091 0 512S53.527273 246.690909 148.945455 148.945455C246.690909 53.527273 374.690909 0 512 0s265.309091 53.527273 363.054545 148.945455c200.145455 200.145455 200.145455 523.636364 0 723.781818C777.309091 970.472727 649.309091 1024 512 1024m0-956.509091c-118.690909 0-230.4 46.545455-314.181818 130.327273-83.781818 83.781818-130.327273 195.490909-130.327273 314.181818s46.545455 230.4 130.327273 314.181818c83.781818 83.781818 195.490909 130.327273 314.181818 130.327273s230.4-46.545455 314.181818-130.327273C1000.727273 651.636364 1000.727273 370.036364 826.181818 195.490909 742.4 114.036364 630.690909 67.490909 512 67.490909M330.472727 651.636364s60.509091 95.418182 181.527273 95.418181c121.018182 0 202.472727-95.418182 202.472727-95.418181s44.218182 0 44.218182 48.872727c0 0-79.127273 111.709091-246.690909 111.709091-167.563636 0-223.418182-111.709091-223.418182-111.709091s-2.327273-48.872727 41.890909-48.872727m32.581818-304.872728c-34.909091 0-62.836364 27.927273-62.836363 62.836364 0 34.909091 27.927273 62.836364 62.836363 62.836364 34.909091 0 62.836364-27.927273 62.836364-62.836364 0-34.909091-27.927273-62.836364-62.836364-62.836364m321.163637 0c-34.909091 0-62.836364 27.927273-62.836364 62.836364 0 34.909091 27.927273 62.836364 62.836364 62.836364 34.909091 0 62.836364-27.927273 62.836363-62.836364 0-34.909091-27.927273-62.836364-62.836363-62.836364m0 0z"/>
              </svg>
            </button>
            <n-button
              type="success"
              :disabled="!inputMessage.trim()"
              @click="handleSend"
              class="send-btn"
            >
              发送
            </n-button>
          </div>
        </div>
      </div>

      <!-- 右侧信息区域 -->
      <div class="info-area">
        <div class="notice-section">
          <div class="section-header">
            <n-icon :size="16">
              <MegaphoneOutline />
            </n-icon>
            <span>群公告</span>
            <n-button
              v-if="isGroupOwner"
              text
              size="tiny"
              @click="showNoticeEdit = true"
              class="edit-btn"
            >
              编辑
            </n-button>
          </div>
          <div class="notice-content">
            {{ currentGroup?.notice || '暂无公告' }}
          </div>
        </div>

        <div class="members-section">
          <div class="section-header">
            <n-icon :size="16">
              <PeopleOutline />
            </n-icon>
            <span>群成员 ({{ sortedMembers.length }})</span>
          </div>
          <div class="members-list">
            <div
              v-for="member in sortedMembers"
              :key="member.id"
              class="member-item"
            >
              <n-avatar :size="28" round>
                {{ member.userName.charAt(0) }}
              </n-avatar>
              <div class="member-info">
                <div class="member-name">
                  {{ member.userName }}
                  <n-tag
                    v-if="member.memberRole === 1"
                    size="tiny"
                    type="warning"
                    class="role-tag"
                  >
                    群主
                  </n-tag>
                  <n-tag
                    v-else-if="member.memberRole === 2"
                    size="tiny"
                    type="success"
                    class="role-tag"
                  >
                    管理员
                  </n-tag>
                  <n-tag
                    v-else-if="member.relationTag === 'main'"
                    size="tiny"
                    type="info"
                    class="role-tag"
                  >
                    主角
                  </n-tag>
                  <n-tag
                    v-else-if="member.relationTag === 'external'"
                    size="tiny"
                    class="role-tag"
                  >
                    外部
                  </n-tag>
                </div>
              </div>
              <!-- 成员操作按钮（仅群主可见，且不显示在自己身上） -->
              <n-dropdown
                v-if="isGroupOwner && member.userId !== currentUserId && member.memberRole !== 1"
                trigger="click"
                :options="getMemberMenuOptions(member)"
                @select="(key: string) => handleMemberAction(key, member)"
              >
                <n-button text size="tiny" class="member-action-btn">
                  <n-icon :size="14">
                    <EllipsisVerticalOutline />
                  </n-icon>
                </n-button>
              </n-dropdown>
            </div>
          </div>

          <div v-if="isGroupOwner" class="owner-actions">
            <n-button block size="small" @click="handleInviteMember">
              邀请成员
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 公告编辑弹窗 -->
    <n-modal v-model:show="showNoticeEdit" preset="dialog" title="编辑群公告">
      <n-input
        v-model:value="editNoticeText"
        type="textarea"
        :rows="4"
        :autosize="{ minRows: 3, maxRows: 6 }"
        placeholder="输入公告内容（支持文字和emoji）"
      />
      <template #action>
        <n-button @click="showNoticeEdit = false">取消</n-button>
        <n-button type="primary" @click="handleSaveNotice">保存</n-button>
      </template>
    </n-modal>

    <!-- 表情选择器（Teleport 到 body，避免被父容器裁剪） -->
    <Teleport to="body">
      <div
        v-if="showEmojiPicker"
        class="emoji-picker-overlay"
        @click.self="showEmojiPicker = false"
      >
        <div class="emoji-picker-panel" :style="emojiPickerStyle">
          <div class="emoji-grid">
            <button
              v-for="emoji in emojiList"
              :key="emoji"
              class="emoji-item"
              @click="insertEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  NModal, NButton, NIcon, NAvatar, NTag, NInput, NDropdown, useMessage
} from 'naive-ui'
import {
  ExpandOutline,
  ContractOutline,
  CloseOutline,
  MegaphoneOutline,
  PeopleOutline,
  EllipsisVerticalOutline
} from '@vicons/ionicons5'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const chatStore = useChatStore()
const authStore = useAuthStore()
const message = useMessage()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const currentGroup = computed(() => chatStore.currentGroup)
const sortedMembers = computed(() => chatStore.sortedMembers)
const isGroupOwner = computed(() => chatStore.isGroupOwner)
const currentUserId = computed(() => authStore.currentUser?.id || '')

const inputMessage = ref('')
const isFullscreen = ref(false)
const showNoticeEdit = ref(false)
const editNoticeText = ref('')
const messageListRef = ref<HTMLElement>()
const inputEditorRef = ref<HTMLTextAreaElement>()
const emojiTriggerRef = ref<HTMLElement>()
const showEmojiPicker = ref(false)
const emojiPickerStyle = ref({ top: '0px', left: '0px' })

// 高度控制
const messageListHeight = ref(380)
const inputAreaHeight = ref(170)
const RESIZE_HANDLE_HEIGHT = 4
const MIN_INPUT_HEIGHT = 80
const MIN_MSG_HEIGHT = 100
const isResizing = ref(false)

// 黄脸表情列表
const emojiList = [
  '😊', '😄', '', '😆', '', '🤣', '', '🙂',
  '', '😉', '😌', '', '🥰', '', '', '😙',
  '', '', '😛', '😜', '', '', '🤑', '🤗',
  '🤭', '🤫', '🤔', '', '🤨', '', '😑', '😶',
  '', '', '🙄', '😬', '', '😌', '', '',
  '🤤', '😴', '', '', '', '🤢', '🤮', '🥵',
  '🥶', '', '😵', '', '', '', '😎', '',
  '', '', '😟', '', '☹️', '😮', '😯', '',
  '😳', '', '😦', '', '', '😰', '😥', '',
  '😭', '', '😖', '', '😞', '😓', '', '',
  '🥱', '', '', '😠', '🤬', '', '👎', '👏',
  '🙏', '🤝', '💪', '❤️', '', '💛', '', '💙',
]

// emoji 正则（用于已发送消息渲染）
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{FE0F}]/gu

// 将已发送消息中的 emoji 用 span 包裹，使其显示 18px
const renderMessageContent = (content: string) => {
  return content.replace(emojiRegex, (match) => {
    return `<span class="emoji-text">${match}</span>`
  })
}

// 时间分隔线
const shouldShowTimeSeparator = (msg: any, index: number) => {
  const messages = currentGroup.value?.messages || []
  if (index === 0) return true
  const prev = messages[index - 1]
  const diff = msg.sendTime.getTime() - prev.sendTime.getTime()
  return diff > 5 * 60 * 1000
}

const formatTimeSeparator = (date: Date) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (msgDate.getTime() === today.getTime()) return timeStr
  if (msgDate.getTime() === yesterday.getTime()) return `昨天 ${timeStr}`
  return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`
}

const handleClose = () => {
  chatStore.closeChat()
  showModal.value = false
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 发送消息
const handleSend = () => {
  if (!inputMessage.value.trim()) return
  chatStore.sendMessage(inputMessage.value)
  inputMessage.value = ''
  scrollToBottom()
}

// 表情选择器
const toggleEmojiPicker = () => {
  if (showEmojiPicker.value) {
    showEmojiPicker.value = false
    return
  }

  // 计算弹出位置（基于表情按钮的位置）
  nextTick(() => {
    if (emojiTriggerRef.value) {
      const rect = emojiTriggerRef.value.getBoundingClientRect()
      emojiPickerStyle.value = {
        top: (rect.top - 220) + 'px',  // 弹出在按钮上方
        left: rect.left + 'px'
      }
    }
    showEmojiPicker.value = true
  })
}

// 插入表情到 textarea 光标位置
const insertEmoji = (emoji: string) => {
  showEmojiPicker.value = false

  if (!inputEditorRef.value) return

  const textarea = inputEditorRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = textarea.value

  // 在光标位置插入 emoji
  textarea.value = text.substring(0, start) + emoji + text.substring(end)
  inputMessage.value = textarea.value

  // 移动光标到 emoji 后面
  const newPos = start + emoji.length
  textarea.setSelectionRange(newPos, newPos)
  textarea.focus()
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const handleSaveNotice = () => {
  chatStore.updateNotice(editNoticeText.value)
  showNoticeEdit.value = false
}

const handleInviteMember = () => {
  console.log('邀请成员')
}

// 获取成员操作菜单选项
const getMemberMenuOptions = (member: any) => {
  const options = []
  
  // 设置管理员（仅对普通成员）
  if (member.memberRole === 0) {
    options.push({
      label: '设为管理员',
      key: 'setAdmin'
    })
  }
  
  // 取消管理员（仅对管理员）
  if (member.memberRole === 2) {
    options.push({
      label: '取消管理员',
      key: 'removeAdmin'
    })
  }
  
  // 更换群主
  options.push({
    label: '转让群主',
    key: 'transferOwner'
  })
  
  // 删除成员
  options.push({
    label: '删除成员',
    key: 'removeMember',
    props: {
      style: 'color: #d03050;'
    }
  })
  
  return options
}

// 处理成员操作
const handleMemberAction = (action: string, member: any) => {
  switch (action) {
    case 'setAdmin':
      console.log('设为管理员:', member.userName)
      // TODO: 调用后端 API
      message.success(`已将 ${member.userName} 设为管理员`)
      break
    case 'removeAdmin':
      console.log('取消管理员:', member.userName)
      // TODO: 调用后端 API
      message.success(`已取消 ${member.userName} 的管理员权限`)
      break
    case 'transferOwner':
      if (confirm(`确定要将群主转让给 ${member.userName} 吗？\n转让后您将不再是群主。`)) {
        console.log('转让群主给:', member.userName)
        // TODO: 调用后端 API
        message.success(`已将群主转让给 ${member.userName}`)
      }
      break
    case 'removeMember':
      if (confirm(`确定要将 ${member.userName} 从群聊中删除吗？`)) {
        console.log('删除成员:', member.userName)
        // TODO: 调用后端 API
        message.success(`已将 ${member.userName} 从群聊中删除`)
      }
      break
  }
}

// 拖拽调整
const startResize = (e: MouseEvent) => {
  showEmojiPicker.value = false

  isResizing.value = true
  const startY = e.clientY
  const startMsgHeight = messageListHeight.value
  const startInputHeight = inputAreaHeight.value

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const delta = e.clientY - startY
    const newMsgHeight = startMsgHeight + delta
    const newInputHeight = startInputHeight - delta

    if (newMsgHeight >= MIN_MSG_HEIGHT && newInputHeight >= MIN_INPUT_HEIGHT) {
      messageListHeight.value = newMsgHeight
      inputAreaHeight.value = newInputHeight
    }
  }

  const onMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 点击外部关闭表情选择器
const handleOutsideClick = (e: MouseEvent) => {
  if (showEmojiPicker.value && emojiTriggerRef.value) {
    const target = e.target as HTMLElement
    if (!emojiTriggerRef.value.contains(target) && !target.closest('.emoji-picker-panel')) {
      showEmojiPicker.value = false
    }
  }
}

watch(
  () => currentGroup.value?.messages.length,
  () => { scrollToBottom() }
)

watch(showModal, (show) => {
  if (show) {
    nextTick(() => scrollToBottom())
  }
})

watch(isFullscreen, () => {
  nextTick(() => {
    if (messageListRef.value?.parentElement) {
      const container = messageListRef.value.parentElement
      const totalHeight = container.clientHeight
      messageListHeight.value = totalHeight - inputAreaHeight.value - RESIZE_HANDLE_HEIGHT
    }
  })
})

onMounted(() => {
  if (messageListRef.value?.parentElement) {
    const container = messageListRef.value.parentElement
    const totalHeight = container.clientHeight
    messageListHeight.value = totalHeight - inputAreaHeight.value - RESIZE_HANDLE_HEIGHT
  }
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.chat-window-header {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #f7f7f7;
}

.chat-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 0;
}

.window-btn {
  width: 40px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 0;
  cursor: pointer;
  color: #333;
  transition: background 0.1s;
}

.window-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.close-btn:hover {
  background: #e81123;
  color: #fff;
}

.chat-window-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f5f5f5;
}

.message-list {
  overflow-y: auto;
  padding: 16px;
  flex-shrink: 0;
}

.time-separator {
  text-align: center;
  color: #b0b0b0;
  font-size: 12px;
  margin: 16px 0;
}

.system-message {
  text-align: center;
  color: #999;
  font-size: 13px;
  margin: 12px 0;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}

.message-self {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-self .message-avatar {
  margin-left: 8px;
}

.message-body {
  max-width: 65%;
  display: flex;
  flex-direction: column;
}

.message-self .message-body {
  align-items: flex-end;
}

.message-sender {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  padding: 0 4px;
}

.message-bubble {
  background: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  display: inline;
}

.message-self .message-bubble {
  background: #95EC69;
}

.message-bubble :deep(.emoji-text) {
  display: inline-block;
  font-size: 18px;
  vertical-align: middle;
  line-height: 1;
}

/* 拖拽分隔条（始终 4px，hover 时颜色加深） */
.resize-handle {
  height: 4px;
  background: #e8e8e8;
  cursor: ns-resize;
  flex-shrink: 0;
  transition: background 0.15s;
}

.resize-handle:hover {
  background: #ccc;
}

/* 输入区域 */
.input-area {
  background: #f7f7f7;
  border-top: 1px solid #e8e8e8;
  padding: 0 12px;
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* textarea 输入框 */
.message-editor {
  flex: 1;
  min-height: 0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  background: #fff;
  resize: none;
  word-break: break-word;
  margin-top: 8px;
  margin-bottom: 6px;
  font-family: inherit;
}

.message-editor:focus {
  border-color: #18a058;
}

.message-editor::placeholder {
  color: #bbb;
}

/* 工具栏（固定底部） */
.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  flex-shrink: 0;
  padding-bottom: 4px;
}

.emoji-trigger {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  color: #666;
}

.emoji-trigger:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #333;
}

.emoji-trigger svg {
  display: block;
}

.send-btn {
  min-width: 72px;
  height: 32px;
}

/* 右侧信息区域 */
.info-area {
  width: 220px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  overflow-y: auto;
  flex-shrink: 0;
}

.notice-section,
.members-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #333;
}

.edit-btn {
  margin-left: auto;
  font-size: 12px;
}

.notice-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.member-action-btn {
  margin-left: auto;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.member-action-btn:hover {
  opacity: 1;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 13px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.role-tag {
  font-size: 10px;
  transform: scale(0.9);
  transform-origin: left center;
}

.owner-actions {
  padding: 12px 16px;
}
</style>

<!-- 表情选择器全局样式（不 scoped，因为 Teleport 到 body） -->
<style>
.emoji-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.emoji-picker-panel {
  position: fixed;
  width: 360px;
  max-height: 200px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 10000;
  overflow-y: auto;
}

.emoji-picker-panel .emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 2px;
}

.emoji-picker-panel .emoji-item {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  line-height: 1;
  transition: background 0.15s;
}

.emoji-picker-panel .emoji-item:hover {
  background: #f0f0f0;
}
</style>
