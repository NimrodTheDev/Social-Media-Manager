<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { usePosts } from '../composables/usePosts'
import { useConnectSocial } from '../composables/useConnectSocial'

const router = useRouter()
const postText = ref('')
const multiPostTextandMedia = ref([])
const previewTab = ref('x')
const mediaEmojis = ['🌅', '🎬', '🎵', '🖼', '📸', '🎨', '📱', '✨']

const platformColors = {
  x: '#e7e9ea',
  linkedin: '#0a66c2',
  instagram: '#e1306c',
  facebook: '#1877f2',
}

const { user } = useAuth()

const previewIcon = computed(() => {
  if (previewTab.value === 'x') return '𝕏'
  if (previewTab.value === 'linkedin') return 'in'
  return previewTab.value.charAt(0).toUpperCase()
})

const selectedMedia = ref([])

const currentUploadIndex = ref(-1)

const handleMediaUpload = (event) => {
  const files = event.target.files
  if (files) {
    const fileArray = Array.from(files)
    fileArray.forEach(file => {
      const fileReader = new FileReader()
      fileReader.onload = (e) => {
        const item = { url: e.target.result, file: file }
        if (currentUploadIndex.value === -1) {
          selectedMedia.value.push(item)
        } else {
          multiPostTextandMedia.value[currentUploadIndex.value].media.push(item)
        }
      }
      fileReader.readAsDataURL(file)
    })
    event.target.value = ''
  }
}

const removeMedia = (index, postIndex = -1) => {
  if (postIndex === -1) {
    selectedMedia.value.splice(index, 1)
  } else {
    multiPostTextandMedia.value[postIndex].media.splice(index, 1)
  }
}

const addMedia = (index = -1) => {
  currentUploadIndex.value = index
  document.getElementById('media-upload').click()
}

const addMultiPostTextandMedia = () => {
  multiPostTextandMedia.value.push({ text: '', media: [] })
}

const removeThreadPost = (index) => {
  multiPostTextandMedia.value.splice(index, 1)
}

const { createDraft, loading: saveLoading } = usePosts()

const handleSaveDraft = async () => {
  // Construct content array: [{text: '', media: []}, ...]
  // We need to merge the primary post with the thread posts
  const content = [
    { 
      text: postText.value, 
      media: selectedMedia.value.map(m => m.url) 
    },
    ...multiPostTextandMedia.value.map(p => ({
      text: p.text,
      media: p.media.map(m => m.url)
    }))
  ]

  const res = await createDraft(content)
  if (res.success) {
    // Maybe show a toast or simplified notification
    console.log('Draft saved:', res.data)
  } else {
    console.error('Failed to save draft:', res.message)
  }
}

const isEditorEmpty = computed(() => {
  const hasPrimaryText = postText.value.trim().length > 0;
  const hasPrimaryMedia = selectedMedia.value.length > 0;
  
  const hasThreadContent = multiPostTextandMedia.value.some(post => 
    post.text.trim().length > 0 || post.media.length > 0
  );
  
  return !hasPrimaryText && !hasPrimaryMedia && !hasThreadContent;
});

const { getSupportedPlatforms } = useConnectSocial()
const { postToSocial, loading: postLoading } = usePosts()

const isPlatformModalOpen = ref(false)
const availablePlatforms = ref([])
const selectedPlatformId = ref(null)

const openPostModal = async () => {
  const platforms = await getSupportedPlatforms()
  availablePlatforms.value = platforms.filter(p => p.connected)
  if (availablePlatforms.value.length > 0) {
    selectedPlatformId.value = availablePlatforms.value[0].id
    isPlatformModalOpen.value = true
  } else {
    alert('Please connect a social account first!')
  }
}

const handleConfirmPost = async () => {
  if (!selectedPlatformId.value) return

  const content = [
    { 
      text: postText.value, 
      media: selectedMedia.value.map(m => m.url) 
    },
    ...multiPostTextandMedia.value.map(p => ({
      text: p.text,
      media: p.media.map(m => m.url)
    }))
  ]

  const res = await postToSocial(
    selectedPlatformId.value,
    content
  )

  if (res.success) {
    alert('Posted successfully!')
    isPlatformModalOpen.value = false
  } else {
    alert('Error: ' + res.message)
  }
}
</script>

<template>
  <div class="create-post-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Create Post</h1>
        <p class="page-sub">Compose and schedule your content across platforms.</p>
      </div>
    </div>

    <div class="editor-layout">
      <!-- Main Editor -->
      <div class="card editor-card">
        <h2 class="sub-title">Post Editor</h2>
        <div class="thread-container">
          <!-- Main Post -->
          <div class="post-item primary-post">
            <textarea 
              class="textarea-field" 
              v-model="postText" 
              placeholder="Start your thread..."
            ></textarea>
            
            <div class="editor-toolbar">
              <div class="tool-group">
                <button class="tool-btn">AI Assistant</button>
              </div>
              <div class="char-count" :class="{ 'warning': postText.length > 250 }">
                {{ postText.length }}/280
              </div>
            </div>

            <label class="drop-zone" v-if="selectedMedia.length === 0" @click="addMedia(-1)">
              <div class="drop-icon">☁</div>
              <p>Attach media</p>
            </label>

            <div class="media-container" v-if="selectedMedia.length > 0">
              <div class="media-row">
                <div class="media-slot" v-for="(media, index) in selectedMedia" :key="index">
                  <img :src="media.url" alt="" class="media-preview" v-if="media.file.type.startsWith('image')">
                  <video :src="media.url" class="media-preview" v-else-if="media.file.type.startsWith('video')" controls></video>
                  <button class="remove-btn" @click="removeMedia(index, -1)">×</button>
                  <div class="media-type-badge">{{ media.file.type.startsWith('video') ? '🎥' : '🖼️' }}</div>
                </div>
                <button class="add-more-btn" @click="addMedia(-1)">
                  <span class="add-icon">+</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Subsequent Thread Posts -->
          <div v-for="(post, pIndex) in multiPostTextandMedia" :key="pIndex" class="post-item thread-post">
            <div class="thread-line"></div>
            <div class="post-content-wrap">
              <div class="post-header-row">
                <span class="thread-number">{{ pIndex + 2 }}</span>
                <button class="remove-thread-btn" @click="removeThreadPost(pIndex)">×</button>
              </div>
              <textarea 
                class="textarea-field" 
                v-model="post.text" 
                placeholder="What else?"
              ></textarea>
              
              <div class="post-actions-row">
                <button class="tool-btn-sm" @click="addMedia(pIndex)">🖼 Add Media</button>
                <div class="char-count">{{ post.text.length }}/280</div>
              </div>

              <div class="media-container mt-2" v-if="post.media.length > 0">
                <div class="media-row">
                  <div class="media-slot-sm" v-for="(m, mIndex) in post.media" :key="mIndex">
                    <img :src="m.url" alt="" class="media-preview" v-if="m.file.type.startsWith('image')">
                    <video :src="m.url" class="media-preview" v-else-if="m.file.type.startsWith('video')" controls></video>
                    <button class="remove-btn-sm" @click="removeMedia(mIndex, pIndex)">×</button>
                  </div>
                  <button class="add-more-btn-sm" @click="addMedia(pIndex)">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <input type="file" class="hidden" id="media-upload" accept="image/*,video/*" multiple @change="handleMediaUpload"/>

        <div class="editor-footer">
          <button class="btn btn-primary post-btn" @click="addMultiPostTextandMedia">Add Thread</button>
          <button class="btn btn-ghost" @click="handleSaveDraft" :disabled="saveLoading || isEditorEmpty">
            {{ saveLoading ? 'Saving...' : 'Save Draft' }}
          </button>
          <button class="btn btn-secondary" :disabled="isEditorEmpty">📅 Schedule</button>
          <button class="btn btn-primary" @click="openPostModal" :disabled="isEditorEmpty">▶ Post Now</button>
        </div>
      </div>

      <!-- Platform Selection Modal -->
      <div v-if="isPlatformModalOpen" class="modal-overlay" @click.self="isPlatformModalOpen = false">
        <div class="card modal-card">
          <div class="modal-header">
            <h2 class="sub-title">Select Platform</h2>
            <button class="close-btn" @click="isPlatformModalOpen = false">×</button>
          </div>
          <p class="modal-sub">Where should we publish this post?</p>
          
          <div class="platform-list">
            <div 
              v-for="p in [{id: 'ALL', name: 'All Platforms', handle: '', color: '#000000', icon: '🌍'}, ...availablePlatforms]" 
              :key="p.id" 
              class="platform-item"
              :class="{ 'selected': selectedPlatformId === p.id }"
              @click="selectedPlatformId = p.id"
            >
              <div class="platform-icon" :style="{ background: p.color }">{{ p.icon }}</div>
              <div class="platform-info">
                <div class="platform-name">{{ p.name }}</div>
                <div class="platform-handle">@{{ p.handle }}</div>
              </div>
              <div class="selection-indicator"></div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" @click="isPlatformModalOpen = false">Cancel</button>
            <button class="btn btn-primary" @click="handleConfirmPost" :disabled="postLoading">
              {{ postLoading ? 'Posting...' : 'Confirm & Post' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="card preview-panel">
        <div class="preview-header">
          <h2 class="sub-title">Preview</h2>
        </div>

        <div class="preview-content">
          <div class="mock-post-thread">
            <!-- First Post Preview -->
            <div class="mock-post">
              <div class="mock-header">
                <div class="user-pill">
                  <div class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}</div>
                </div>
                <div class="mock-user">
                  <div class="mock-name">Your Account</div>
                  <div class="mock-handle">@username</div>
                </div>
              </div>
              <div class="mock-body">
                <p v-if="postText" class="post-content">{{ postText }}</p>
                <p v-else class="placeholder-content">Your caption will appear here...</p>
                <div v-if="selectedMedia.length > 0" class="mock-media-grid">
                   <div v-for="(m, i) in selectedMedia" :key="i" class="mock-media-item">
                     <img :src="m.url" v-if="m.file.type.startsWith('image')">
                     <video :src="m.url" v-else controls></video>
                   </div>
                </div>
              </div>
            </div>

            <!-- Thread Posts Preview -->
            <div v-for="(post, pIdx) in multiPostTextandMedia" :key="pIdx" class="mock-post-reply">
              <div class="mock-body">
                <p v-if="post.text" class="post-content">{{ post.text }}</p>
                <div v-if="post.media.length > 0" class="mock-media-grid">
                   <div v-for="(m, i) in post.media" :key="i" class="mock-media-item">
                     <img :src="m.url" v-if="m.file.type.startsWith('image')">
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-post-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.hidden{
  display: none;
}

.page-title { font-size: 24px; font-weight: 700; color: var(--text-main); }
.page-sub { color: var(--text-muted); font-size: 14px; margin-top: 4px; }

.editor-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}
.post-btn{
  margin-right: auto;
}
@media (max-width: 1200px) {
  .editor-layout { grid-template-columns: 2fr 1fr; }
  .media-panel { display: none; }
}

@media (max-width: 900px) {
  .editor-layout { grid-template-columns: 1fr; }
  .preview-panel { display: none; }
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.editor-card {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.sub-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 16px;
}

.full-width { width: 100%; margin-bottom: 8px; }

.btn {
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary { background: var(--brand-gradient); color: #fff; }
.btn-secondary { background: var(--bg-deep); color: var(--text-main); border: 1px solid var(--border-light); }
.btn-ghost { background: transparent; color: var(--text-dim); border: 1px solid var(--border-light); }

.media-container {
  margin-top: 20px;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-light) transparent;
}

.media-container::-webkit-scrollbar {
  height: 6px;
}

.media-container::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 10px;
}

.media-row {
  display: flex;
  gap: 12px;
  min-width: min-content;
  max-width: 100%;
}

.media-slot {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.media-slot:hover {
  transform: translateY(-2px);
  border-color: var(--brand-primary);
}

.media-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 2;
}

.remove-btn:hover {
  background: #ef4444;
  transform: scale(1.1);
}

.media-type-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  backdrop-filter: blur(2px);
}

.add-more-btn {
  width: 140px;
  height: 140px;
  border-radius: 12px;
  background: var(--bg-deep);
  border: 2px dashed var(--border-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.add-more-btn:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: rgba(99, 102, 241, 0.05);
}

.add-icon {
  font-size: 24px;
  font-weight: 300;
}

.add-more-btn span:last-child {
  font-size: 11px;
  font-weight: 600;
}

.textarea-field {
  flex: 1;
  width: 100%;
  max-width: 100%;
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.textarea-field:focus { border-color: var(--brand-primary); }

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.tool-btn {
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 6px 12px;
  color: var(--text-dim);
  margin-right: 6px;
  cursor: pointer;
}

.char-count { font-size: 12px; color: var(--text-muted); }
.char-count.warning { color: #f59e0b; }

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: var(--text-dim);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
}

.drop-zone:hover {
  border-color: var(--brand-primary);
  background: rgba(99, 102, 241, 0.05);
  color: var(--text-main);
}

.drop-icon { font-size: 32px; margin-bottom: 8px; }

.editor-footer {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  justify-content: flex-end;
}

.preview-header { margin-bottom: 20px; }

.platform-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.tab-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  font-size: 10px;
  font-weight: 700;
  background: var(--bg-deep);
  color: var(--text-muted);
  cursor: pointer;
}

.tab-btn.active { color: var(--brand-primary); background: rgba(99, 102, 241, 0.1); }

.thread-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
  padding-right: 8px;
}

.post-item {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  padding: 24px;
}

.primary-post {
  border-left: 4px solid var(--brand-primary);
}

.thread-post {
  margin-left: 20px;
}

.thread-line {
  position: absolute;
  left: -22px;
  top: -32px;
  bottom: 50%;
  width: 2px;
  background: var(--border-light);
}

.thread-line::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 20px;
  height: 2px;
  background: var(--border-light);
}

.post-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.thread-number {
  background: var(--bg-deep);
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-light);
}

.remove-thread-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.remove-thread-btn:hover { color: #ef4444; }

.post-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.tool-btn-sm {
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 6px 12px;
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.media-slot-sm {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-light);
}

.remove-btn-sm {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  font-size: 12px;
  cursor: pointer;
}

.add-more-btn-sm {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  background: var(--bg-deep);
  border: 1px dashed var(--border-light);
  color: var(--text-dim);
  font-size: 20px;
  cursor: pointer;
}

/* Preview Thread Styles */
.mock-post-thread {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--border-light);
  border-radius: 14px;
  overflow: hidden;
}

.mock-post, .mock-post-reply {
  background: var(--bg-deep);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.mock-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mock-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}

.mock-avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 10px;
}

.mock-name { font-size: 13px; font-weight: 600; color: var(--text-main); line-height: 1.2; }
.mock-handle { font-size: 11px; color: var(--text-muted); }

.mock-body { flex: 1; }
.post-content { font-size: 14px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; }
.placeholder-content { font-size: 13px; color: var(--text-dark); font-style: italic; }

.reply-badge {
  font-size: 10px;
  color: var(--brand-primary);
  margin-left: 8px;
  font-weight: 400;
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.mock-media-grid {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.mock-media-item {
  flex: 1 1 45%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.mock-media-item img, .mock-media-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mt-2 { margin-top: 8px; }

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-card {
  width: 90%;
  max-width: 440px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.modal-header .sub-title {
  margin-bottom: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
}

.modal-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.platform-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.platform-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--brand-primary);
}

.platform-item.selected {
  border-color: var(--brand-primary);
  background: rgba(99, 102, 241, 0.05);
}

.platform-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}

.platform-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.platform-handle {
  font-size: 12px;
  color: var(--text-muted);
}

.selection-indicator {
  margin-left: auto;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-radius: 50%;
  transition: all 0.2s;
}

.platform-item.selected .selection-indicator {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  box-shadow: inset 0 0 0 3px var(--bg-surface);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
