<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user } = useAuth()
const activeTab = ref('general')

const profileForm = ref({
  username: '',
  email: '',
  bio: 'Social Media Enthusiast & Content Creator'
})

const preferences = ref({
  timezone: 'UTC +01:00 (Europe/Paris)',
  theme: 'dark',
  language: 'English'
})

const notifications = ref({
  failedPost: true,
  scheduledPost: true,
  weeklyDigest: false,
  newFollower: true
})

const timezones = [
  'UTC -08:00 (Pacific Time)',
  'UTC -05:00 (Eastern Time)',
  'UTC +00:00 (London/Lisbon)',
  'UTC +01:00 (Europe/Paris)',
  'UTC +05:30 (India Standard)',
  'UTC +08:00 (Singapore/Beijing)',
  'UTC +09:00 (Tokyo/Seoul)'
]

onMounted(() => {
  if (user.value) {
    profileForm.value.username = user.value.name || user.value.username || ''
    profileForm.value.email = user.value.email || ''
  }
})

const handleSave = () => {
  alert('Settings saved successfully!')
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-sub">Manage your account preferences and application settings.</p>
    </div>

    <div class="settings-layout">
      <!-- Sidebar Navigation -->
      <aside class="settings-sidebar">
        <button 
          v-for="tab in ['general', 'preferences', 'notifications', 'security']" 
          :key="tab"
          class="nav-item"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          <span class="nav-icon">
            <template v-if="tab === 'general'">👤</template>
            <template v-if="tab === 'preferences'">⚙️</template>
            <template v-if="tab === 'notifications'">🔔</template>
            <template v-if="tab === 'security'">🔒</template>
          </span>
          <span class="nav-label">{{ tab.charAt(0).toUpperCase() + tab.slice(1) }}</span>
        </button>
      </aside>

      <!-- Main Content Area -->
      <main class="settings-content card">
        <!-- General / Profile -->
        <section v-if="activeTab === 'general'" class="settings-section">
          <h2 class="section-title">General Settings</h2>
          <div class="profile-preview">
            <div class="avatar-placeholder">{{ profileForm.username.charAt(0) }}</div>
            <div class="avatar-actions">
              <button class="btn btn-secondary btn-sm">Change Avatar</button>
              <p class="help-text">JPG, GIF or PNG. Max size of 800K</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Display Name</label>
              <input v-model="profileForm.username" type="text" class="input-field" placeholder="Your name">
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input v-model="profileForm.email" type="email" class="input-field" placeholder="your@email.com">
            </div>
            <div class="form-group full-width">
              <label>Bio</label>
              <textarea v-model="profileForm.bio" class="input-field textarea" placeholder="A short bio..."></textarea>
            </div>
          </div>
        </section>

        <!-- Preferences -->
        <section v-if="activeTab === 'preferences'" class="settings-section">
          <h2 class="section-title">App Preferences</h2>
          <div class="form-grid">
            <div class="form-group">
              <label>Timezone</label>
              <select v-model="preferences.timezone" class="input-field">
                <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
              </select>
              <p class="help-text">Used for all scheduled posts and analytics.</p>
            </div>
            <div class="form-group">
              <label>Language</label>
              <select v-model="preferences.language" class="input-field">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>Appearance</label>
              <div class="theme-selector">
                <div 
                  class="theme-option" 
                  :class="{ active: preferences.theme === 'light' }"
                  @click="preferences.theme = 'light'"
                >
                  <div class="theme-preview light"></div>
                  <span>Light</span>
                </div>
                <div 
                  class="theme-option" 
                  :class="{ active: preferences.theme === 'dark' }"
                  @click="preferences.theme = 'dark'"
                >
                  <div class="theme-preview dark"></div>
                  <span>Dark</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Notifications -->
        <section v-if="activeTab === 'notifications'" class="settings-section">
          <h2 class="section-title">Notification Settings</h2>
          <div class="notification-list">
            <div class="notification-item">
              <div class="notif-info">
                <div class="notif-title">Post Failures</div>
                <div class="notif-desc">Get an email if a scheduled post fails to publish.</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="notifications.failedPost">
                <span class="slider"></span>
              </label>
            </div>
            <div class="notification-item">
              <div class="notif-info">
                <div class="notif-title">Successful Posts</div>
                <div class="notif-desc">Receive a confirmation when a post is successfully published.</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="notifications.scheduledPost">
                <span class="slider"></span>
              </label>
            </div>
            <div class="notification-item">
              <div class="notif-info">
                <div class="notif-title">Weekly Digest</div>
                <div class="notif-desc">A summary of your weekly social media performance.</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="notifications.weeklyDigest">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Security -->
        <section v-if="activeTab === 'security'" class="settings-section">
          <h2 class="section-title">Security & Privacy</h2>
          <div class="form-grid">
            <div class="form-group full-width">
              <label>Change Password</label>
              <div class="password-fields">
                <input type="password" class="input-field" placeholder="Current password">
                <input type="password" class="input-field" placeholder="New password">
              </div>
              <button class="btn btn-secondary mt-2">Update Password</button>
            </div>
            <div class="form-group full-width border-top pt-4">
              <label>Active Sessions</label>
              <div class="session-item">
                <div class="session-icon">💻</div>
                <div class="session-info">
                  <div class="session-device">MacBook Pro (Chrome) - Current Session</div>
                  <div class="session-meta">Paris, France • 192.168.1.1</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm mt-3">Log out of all other devices</button>
            </div>
          </div>
        </section>

        <div class="settings-footer">
          <button @click="handleSave" class="btn btn-primary">Save Changes</button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 2.5rem; }
.page-title { font-size: 1.8rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
.page-sub { color: var(--text-muted); font-size: 1rem; margin-top: 0.4rem; }

.settings-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
  align-items: flex-start;
}

@media (max-width: 900px) {
  .settings-layout { grid-template-columns: 1fr; }
  .settings-sidebar { display: flex; overflow-x: auto; gap: 0.5rem; padding-bottom: 1rem; }
}

.settings-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-deep);
  color: var(--text-main);
}

.nav-item.active {
  background: var(--brand-primary-light);
  color: var(--brand-primary);
}

.settings-content {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 24px;
  padding: 2.5rem;
}

.settings-section {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 2rem;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: var(--brand-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.form-group.full-width { grid-column: span 2; }

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
}

.input-field {
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  color: var(--text-main);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.input-field:focus {
  border-color: var(--brand-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--brand-primary-soft);
}

.input-field.textarea {
  min-height: 100px;
  resize: vertical;
}

.help-text {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.theme-selector {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.theme-option {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.theme-preview {
  height: 80px;
  border-radius: 12px;
  border: 2px solid var(--border-light);
  transition: all 0.2s;
}

.theme-preview.light { background: #f8fafc; }
.theme-preview.dark { background: #0f172a; }

.theme-option.active .theme-preview {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px var(--brand-primary-soft);
}

.theme-option span {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.theme-option.active span { color: var(--text-main); }

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem;
  background: var(--bg-deep);
  border-radius: 16px;
  border: 1px solid var(--border-light);
}

.notif-title {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
}

.notif-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.password-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-deep);
  border-radius: 12px;
  margin-top: 0.5rem;
}

.session-icon { font-size: 1.5rem; }
.session-device { font-weight: 600; color: var(--text-main); font-size: 0.95rem; }
.session-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }

.settings-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.8rem 1.8rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary { background: var(--brand-gradient); color: white; box-shadow: var(--brand-shadow); }
.btn-secondary { background: var(--bg-deep); color: var(--text-main); border: 1px solid var(--border-light); }
.btn-ghost { background: transparent; color: var(--text-dim); }
.btn-sm { padding: 0.5rem 1rem; font-size: 0.85rem; }

.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.pt-4 { padding-top: 1rem; }
.border-top { border-top: 1px solid var(--border-light); }

/* Switch Style */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--border-light);
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px; width: 18px;
  left: 3px; bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider { background: var(--brand-primary); }
input:checked + .slider:before { transform: translateX(20px); }

</style>
