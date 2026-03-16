<script setup>
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'
import { useNavigation } from '../composables/useNavigation'
import { useConnectSocial } from '../composables/useConnectSocial'
import { onMounted } from 'vue'
const router = useRouter()
const { user } = useAuth()
const { navObject } = useNavigation()
const { connectSocial, connectedAccounts } = useConnectSocial()

onMounted(()=>{
    connectedAccounts()
})

const platforms = [
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', connected: false, color: '#e7e9ea', bg: '#101014' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', connected: false, color: '#fff', bg: '#0077b5' },
  { id: 'instagram', name: 'Instagram', icon: 'ig', connected: false, color: '#fff', bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
  { id: 'tiktok', name: 'TikTok', icon: '♪', connected: false, color: '#fff', bg: '#111111', tiktok: true },
  { id: 'facebook', name: 'Facebook', icon: 'f', connected: false, color: '#fff', bg: '#1877f2' }
]

const createPost = () => {
  router.push(navObject.createPost.path)
}

const connectPlatform = (platformId) => {
  connectSocial(platformId)
}
</script>

<template>
  <div class="dashboard">
    <header class="dash-header">
      <div class="header-content">
        <h1>Dashboard</h1>
        <p class="welcome">Welcome back, <span class="highlight">{{ user?.name || 'User' }}</span> 👋</p>
      </div>
      <button class="btn primary new-post-btn" @click="createPost">+ Create Post</button>
    </header>

    <div class="grid-layout">
      <!-- Stats Sidebar -->
      <section class="stats-section">
        <h2 class="section-title">Overview</h2>
        <div class="cards">
          <div class="stat-card">
            <div class="icon-wrap badge-blue">📝</div>
            <div class="stat-info">
              <span class="value">0</span>
              <span class="label">Total Posts</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="icon-wrap badge-orange">⏱️</div>
            <div class="stat-info">
              <span class="value">0</span>
              <span class="label">Scheduled</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="icon-wrap badge-gray">📄</div>
            <div class="stat-info">
              <span class="value">0</span>
              <span class="label">Drafts</span>
            </div>
          </div>
        </div>
      </section>


      <!-- Platforms Area -->
      <section class="platforms-section">
        <h2 class="section-title">Connected Accounts</h2>
        <p class="section-desc">Link your social media profiles to start publishing and scheduling content.</p>
        
        <div class="platforms-grid">
          <div 
            v-for="platform in platforms" 
            :key="platform.id"
            class="platform-card"
          >
            <div class="platform-left">
              <div 
                class="platform-logo" 
                :class="{ 'tiktok-logo': platform.tiktok }"
                :style="{ background: platform.bg, color: platform.color }"
              >
                {{ platform.icon }}
              </div>
              <div class="platform-details">
                <h3>{{ platform.name }}</h3>
                <p class="status disconnected">Not connected</p>
              </div>
            </div>
            
            <button class="btn connect-btn" v-if="!platform.connected" @click="connectPlatform(platform.id)">
              Connect
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 3rem;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dash-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

@media (min-width: 600px) {
  .dash-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.dash-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.25rem;
  letter-spacing: -0.02em;
}

@media (min-width: 600px) {
  .dash-header h1 {
    font-size: 2rem;
  }
}

.welcome {
  color: #a0a4a8;
  font-size: 1rem;
  margin: 0;
}

@media (min-width: 600px) {
  .welcome {
    font-size: 1.1rem;
  }
}

.highlight {
  color: #fff;
  font-weight: 500;
}

.new-post-btn {
  padding: 0.8rem 1.5rem;
  border-radius: 99px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(29, 155, 240, 0.3);
  transition: all 0.2s;
  border: none;
  background: #1d9bf0;
  color: #fff;
  cursor: pointer;
  width: 100%;
}

@media (min-width: 600px) {
  .new-post-btn {
    width: auto;
  }
}

.new-post-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(29, 155, 240, 0.4);
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 900px) {
  .grid-layout {
    grid-template-columns: 320px 1fr;
    gap: 3rem;
  }
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.5rem;
}

.section-desc {
  color: #71767b;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

/* Stats Cards */
.cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 600px) and (max-width: 899px) {
  .cards {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .stat-card {
    flex: 1;
    min-width: 180px;
  }
}

.stat-card {
  background: rgba(30, 30, 36, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  transition: transform 0.2s, background 0.2s;
}

.stat-card:hover {
  background: rgba(30, 30, 36, 0.9);
  transform: translateY(-2px);
}

.icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.badge-blue { background: rgba(29, 155, 240, 0.15); }
.badge-orange { background: rgba(245, 124, 0, 0.15); }
.badge-gray { background: rgba(113, 118, 123, 0.15); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-info .value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.stat-info .label {
  color: #71767b;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Platforms Grid */
.platforms-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 600px) {
  .platforms-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

.platform-card {
  background: linear-gradient(145deg, #1a1a20, #16161a);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.platform-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.platform-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.platform-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  flex-shrink: 0;
}

.tiktok-logo {
  text-shadow: 2px 0 0 #ff0050, -2px 0 0 #00f2fe;
}

.platform-details h3 {
  color: #e7e9ea;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.2rem;
}

.platform-details .status {
  font-size: 0.8rem;
  margin: 0;
  font-weight: 500;
}

.status.disconnected {
  color: #71767b;
}

.status.connected {
  color: #00ba7c;
}

.connect-btn {
  background: #eff3f4;
  color: #0f1419;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.connect-btn:hover {
  background: #d7dbdc;
}
</style>
