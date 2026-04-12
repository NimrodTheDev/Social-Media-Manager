<script setup>
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'
import { useNavigation } from '../composables/useNavigation'
import { useConnectSocial } from '../composables/useConnectSocial'
import { onMounted, ref } from 'vue'
import { api } from '../api'

const router = useRouter()
const { user } = useAuth()
const { navObject } = useNavigation()
const { connectSocial, connectedAccounts, disconnectSocial } = useConnectSocial()

const accounts = ref([])
const stats = ref({ posted: 0, drafted: 0, scheduled: 0 })
const dashboardPosts = ref([])
const loading = ref(true)

const fetchAccounts = async () => {
    accounts.value = await connectedAccounts() || []
}

const fetchDashboardData = async () => {
    loading.value = true
    try {
        const res = await api('/user')
        if (res.success && res.user) {
            stats.value = res.user.stats || { posted: 0, drafted: 0, scheduled: 0 }
            dashboardPosts.value = res.user.recentPosts || []
        }
    } catch (e) {
        console.error('Error fetching dashboard data:', e)
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await Promise.all([
        fetchAccounts(),
        fetchDashboardData()
    ])
})

const platforms = [
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', color: '#e7e9ea', bg: '#101014' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0a66c2', bg: '#004182' },
]

const findConnected = (platformId) => {
    return accounts.value.find(account => account.platform === platformId)
}

const connectPlatform = (platformId) => {
    connectSocial(platformId)
}

const disconnectPlatform = async (id) => {
    await disconnectSocial(id)
    await fetchAccounts()
}

const formatDate = (dateString) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getStatusClass = (status) => {
    if (status === 'posted') return 'published'
    return status // scheduled, draft, etc.
}

const getPlatformColor = (platformId) => {
    const p = platforms.find(pl => pl.id === platformId)
    return p ? p.color : '#fff'
}
</script>

<template>
  <div class="dashboard">
    <div class="dash-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">Welcome back, {{ user?.name || 'User' }}! Here's your overview.</p>
      </div>
      <button class="btn btn-primary" @click="router.push('/app/posts/create')">
        ✦ Create Post
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-label">Posted</div>
        <div class="stat-value" style="color: #22c55e">{{ stats.posted }}</div>
        <div class="stat-delta">Lifetime published</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Scheduled</div>
        <div class="stat-value" style="color: #f59e0b">{{ stats.scheduled }}</div>
        <div class="stat-delta">To be published soon</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Drafted</div>
        <div class="stat-value" style="color: var(--brand-primary)">{{ stats.drafted }}</div>
        <div class="stat-delta">Awaiting completion</div>
      </div>
    </div>

    <div class="main-grid">
      <!-- Left Column: Recent Activity -->
      <div class="card activity-card">
        <div class="card-header-flex">
          <h2 class="section-title">Recent Activity</h2>
          <button class="text-btn" @click="router.push('/app/posts')">View all</button>
        </div>
        
        <div class="activity-list">
          <div v-for="post in dashboardPosts" :key="post.id" class="activity-item">
            <div class="item-icon">
              {{ post.status === 'posted' ? '📸' : '📅' }}
            </div>
            <div class="item-info">
              <div class="item-title">{{ post.content.substring(0, 50) }}{{ post.content.length > 50 ? '...' : '' }}</div>
              <div class="item-platforms">
                <span class="p-badge" :style="{ borderColor: getPlatformColor(post.platform) + '44', color: getPlatformColor(post.platform) }">
                  {{ post.platform === 'x' ? 'X' : post.platform.charAt(0).toUpperCase() + post.platform.slice(1) }}
                </span>
              </div>
            </div>
            <div class="item-status">
              <div class="status-tag" :class="getStatusClass(post.status)">{{ post.status === 'posted' ? 'published' : post.status }}</div>
              <div class="status-time">{{ formatDate(post.posted_at || post.scheduled_at || post.created_at) }}</div>
            </div>
          </div>
          <div v-if="dashboardPosts.length === 0" class="empty-state">
            No recent activity to show.
          </div>
        </div>
      </div>

      <!-- Right Column: Studio & Platforms -->
      <div class="side-panel">
        <div class="card tools-card">
          <h2 class="sub-title">Quick Studio</h2>
          <div class="studio-buttons">
            <button @click="router.push('/app/media/image-editor')" class="studio-btn">
              <span class="icon">🖼</span> Image Editor
            </button>
            <button @click="router.push('/app/media/video-editor')" class="studio-btn">
              <span class="icon">▶</span> Video Editor
            </button>
            <button @click="router.push('/app/media/meme')" class="studio-btn">
              <span class="icon">😂</span> Meme Generator
            </button>
          </div>
        </div>

        <div class="card platforms-card">
          <h2 class="sub-title">Connected Platforms</h2>
          <div class="platform-list">
            <div v-for="p in platforms" :key="p.id" class="platform-item">
              <div class="p-info">
                <div class="p-icon" :style="{ background: p.bg, color: p.color }">{{ p.icon }}</div>
                <div class="p-name">
                  <div>{{ p.name }}</div>
                  <div v-if="findConnected(p.id)" class="p-user">@{{ findConnected(p.id).platform_username }}</div>
                </div>
              </div>
              <div class="p-actions">
                <div v-if="findConnected(p.id)" class="p-connected">
                  <span class="status-dot connected"></span>
                  <button class="disconnect-btn" @click="disconnectPlatform(findConnected(p.id).id)">✕</button>
                </div>
                <button 
                  v-else
                  class="connect-btn" 
                  @click="connectPlatform(p.id)"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.page-sub {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 4px;
}

.btn-primary {
  background: var(--brand-gradient);
  color: #fff;
  padding: 10px 22px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  cursor: pointer;
}

/* Stats */
.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-card {
  flex: 1 1 200px;
  padding: 20px;
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 16px;
}

.stat-card {
  padding: 20px;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -1px;
}

.stat-delta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.stat-delta.up { color: #22c55e; }

/* Main Grid */
.main-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.activity-card {
  flex: 1 1 500px;
  padding: 24px;
}

.side-panel {
  flex: 0 0 340px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 1024px) {
  .side-panel {
    flex: 1 1 100%;
  }
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.text-btn {
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.activity-card {
  padding: 24px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.activity-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.item-icon {
  width: 44px;
  height: 44px;
  background: var(--bg-deep);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.item-info { flex: 1; }

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 6px;
}

.p-badge {
  font-size: 10px;
  font-weight: 600;
  border: 1px solid;
  padding: 2px 8px;
  border-radius: 6px;
  margin-right: 6px;
}

.item-status { text-align: right; }

.status-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-tag.published { color: #22c55e; }
.status-tag.scheduled { color: #f59e0b; }

.status-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Side Panel */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tools-card, .platforms-card {
  padding: 20px;
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-main);
}

.studio-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.studio-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  color: var(--text-dim);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.studio-btn:hover {
  border-color: var(--brand-primary);
  color: var(--text-main);
  background: rgba(99, 102, 241, 0.05);
}

.platform-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.platform-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.p-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.p-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.p-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}

.p-user {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.p-actions {
  display: flex;
  align-items: center;
}

.p-connected {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dark);
}

.status-dot.connected { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

.disconnect-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
}

.disconnect-btn:hover { color: #ef4444; }

.connect-btn {
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn:hover {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
</style>
