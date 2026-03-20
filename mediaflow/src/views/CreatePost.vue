<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const postText = ref('')
const previewTab = ref('x')
const mediaEmojis = ['🌅', '🎬', '🎵', '🖼', '📸', '🎨', '📱', '✨']

const platformColors = {
  x: '#e7e9ea',
  linkedin: '#0a66c2',
  instagram: '#e1306c',
  facebook: '#1877f2',
}

const previewIcon = computed(() => {
  if (previewTab.value === 'x') return '𝕏'
  if (previewTab.value === 'linkedin') return 'in'
  return previewTab.value.charAt(0).toUpperCase()
})
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
        <textarea 
          class="textarea-field" 
          v-model="postText" 
          placeholder="Write your caption... Use #hashtags and @mentions"
        ></textarea>
        
        <div class="editor-toolbar">
          <div class="tool-group">
            <button class="tool-btn">AI Assistant</button>
          </div>
          <div class="char-count" :class="{ 'warning': postText.length > 250 }">
            {{ postText.length }}/280
          </div>
        </div>

        <div class="drop-zone">
          <div class="drop-icon">☁</div>
          <p>Drop media here or click to attach</p>
        </div>

        <div class="editor-footer">
          <button class="btn btn-ghost">Save Draft</button>
          <button class="btn btn-secondary">📅 Schedule</button>
          <button class="btn btn-primary">▶ Post Now</button>
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="card preview-panel">
        <div class="preview-header">
          <h2 class="sub-title">Preview</h2>
          <div class="platform-tabs">
            <button 
              v-for="(color, p) in platformColors" 
              :key="p"
              class="tab-btn"
              :class="{ 'active': previewTab === p }"
              :style="{ color: previewTab === p ? color : '', background: previewTab === p ? color + '15' : '' }"
              @click="previewTab = p"
            >
              {{ p.toUpperCase() }}
            </button>
          </div>
        </div>

        <div class="preview-content">
          <div class="mock-post">
            <div class="mock-header">
              <div class="mock-avatar" :style="{ background: platformColors[previewTab] }">
                {{ previewIcon }}
              </div>
              <div class="mock-user">
                <div class="mock-name">Your Account</div>
                <div class="mock-handle">@username</div>
              </div>
            </div>
            
            <div class="mock-body">
              <p v-if="postText" class="post-content">{{ postText }}</p>
              <p v-else class="placeholder-content">Your caption will appear here...</p>
              <div class="mock-media-placeholder">
                ◈
              </div>
            </div>

            <div class="mock-footer">
              <span v-for="i in 3" :key="i">♡ 0</span>
            </div>
          </div>
          <p class="preview-label">{{ previewTab.charAt(0).toUpperCase() + previewTab.slice(1) }} preview</p>
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

.page-title { font-size: 24px; font-weight: 700; color: var(--text-main); }
.page-sub { color: var(--text-muted); font-size: 14px; margin-top: 4px; }

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

@media (max-width: 1200px) {
  .editor-layout { grid-template-columns: 1fr 300px; }
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

.media-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
  overflow-y: auto;
}

.media-slot {
  aspect-ratio: 1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
}

.textarea-field {
  flex: 1;
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
  margin-top: 20px;
  border: 2px dashed var(--border-active);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
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

.mock-post {
  background: var(--bg-deep);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.mock-header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
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

.mock-name { font-size: 13px; font-weight: 600; color: var(--text-main); }
.mock-handle { font-size: 11px; color: var(--text-muted); }

.mock-body { padding: 0 12px 12px; }
.post-content { font-size: 14px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; }
.placeholder-content { font-size: 13px; color: var(--text-dark); font-style: italic; }

.mock-media-placeholder {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--text-dark);
}

.mock-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-muted);
}

.preview-label {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
