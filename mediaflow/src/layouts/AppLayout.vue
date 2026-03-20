<script setup>
import { useRouter, useRoute } from 'vue-router'
import { onMounted, ref, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNavigation } from '../composables/useNavigation'

const router = useRouter()
const route = useRoute()
const { user, logout, me } = useAuth()
const { navItems } = useNavigation()

const sidebarOpen = ref(window.innerWidth > 768)
const isMobile = ref(window.innerWidth <= 768)
const expanded = ref({ posts: true, media: false })

const updateLayout = () => {
    isMobile.value = window.innerWidth <= 768
    if (isMobile.value) {
        sidebarOpen.value = false
    } else {
        sidebarOpen.value = true
    }
}

onMounted(async () => {
  window.addEventListener('resize', updateLayout)
  updateLayout()
  await me()
  if (!user.value) {
    logout()
    router.replace('/auth')
  }
})

const currentPath = computed(() => route.path)

const go = (path) => {
  router.push(path)
}

const handleNavClick = (path) => {
    go(path)
    if (isMobile.value) {
        sidebarOpen.value = false
    }
}

const toggleExpand = (id) => {
  expanded.value[id] = !expanded.value[id]
}

const doLogout = () => {
  logout()
  router.replace('/')
}

const navBtnStatus = (item) => {
  const isActive = route.path === item.path || (item.children && item.children.some(c => route.path === c.path))
  return { isActive }
}

const isChildActive = (path) => route.path === path
</script>

<template>
  <div class="app-layout">
    <!-- SIDEBAR -->
    <div 
      v-if="sidebarOpen" 
      class="mobile-backdrop" 
      @click="sidebarOpen = false"
    ></div>

    <aside 
      class="sidebar" 
      :class="{ 'is-mobile-open': sidebarOpen && isMobile, 'is-collapsed': !sidebarOpen && !isMobile }"
    >
      <div class="sidebar-logo">
        <div class="logo-icon">◈</div>
        <span class="logo-text" v-if="sidebarOpen || isMobile">Mediaflow</span>
      </div>

      <nav class="nav">
        <template v-for="item in navItems" :key="item.id">
          <div class="nav-group">
            <button 
              class="nav-btn"
              :class="{ 
                'is-active': navBtnStatus(item).isActive, 
                'is-highlight': item.highlight 
              }"
              @click="item.children ? toggleExpand(item.id) : handleNavClick(item.path)"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <template v-if="sidebarOpen || isMobile">
                <span class="nav-label">{{ item.label }}</span>
                <span class="nav-arrow" v-if="item.children">{{ expanded[item.id] ? '▾' : '▸' }}</span>
              </template>
            </button>
            <div v-if="item.children && expanded[item.id] && (sidebarOpen || isMobile)" class="nav-children">
              <button 
                v-for="child in item.children" 
                :key="child.id" 
                class="nav-child-btn"
                :class="{ 'is-active': isChildActive(child.path) }"
                @click="handleNavClick(child.path)"
              >
                <span class="nav-dot"></span>
                {{ child.label }}
              </button>
            </div>
          </div>
        </template>
      </nav>

      <div class="sidebar-footer" v-if="sidebarOpen || isMobile">
        <div class="user-pill">
          <div class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}</div>
          <div class="user-info">
            <div class="username">{{ user?.name || 'User' }}</div>
            <button class="logout-link" @click="doLogout">Sign out</button>
          </div>
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <div class="main-container">
      <!-- TOP NAV -->
      <header class="topnav">
        <button class="topnav-toggle" @click="sidebarOpen = !sidebarOpen">☰</button>
        <code class="route-pill hide-mobile">{{ currentPath }}</code>
        
        <div class="spacer"></div>
        
        <div class="topnav-actions">
          <div class="avatar mini">{{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}</div>
        </div>
      </header>

      <main class="content-scroll">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-deep);
}

.mobile-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 90;
}

/* SIDEBAR */
.sidebar {
  width: 240px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  z-index: 100;
}

.sidebar.is-collapsed {
  width: 72px;
}

.sidebar-logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--brand-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.5px;
  color: var(--text-main);
  white-space: nowrap;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.nav-group {
  margin-bottom: 4px;
}

.nav-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-dim);
  text-align: left;
  cursor: pointer;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-main);
}

.nav-btn.is-active {
  background: rgba(99, 102, 241, 0.1);
  color: var(--brand-primary);
  font-weight: 500;
}

.nav-btn.is-highlight {
  background: var(--brand-gradient);
  color: #fff;
  margin-top: 8px;
  margin-bottom: 8px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.nav-label {
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
}

.nav-arrow {
  font-size: 10px;
  opacity: 0.5;
}

.nav-children {
  margin-left: 36px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-child-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-dim);
  text-align: left;
}

.nav-child-btn:hover {
  color: var(--text-main);
}

.nav-child-btn.is-active {
  color: var(--brand-secondary);
  font-weight: 600;
}

.nav-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted);
}

.nav-child-btn.is-active .nav-dot {
  background: var(--brand-secondary);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
}

.mini {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.user-info {
  overflow: hidden;
}

.username {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.logout-link {
  font-size: 11px;
  color: var(--text-muted);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.logout-link:hover {
  color: #ef4444;
}

/* MAIN CONTAINER */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topnav {
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .topnav {
    padding: 0 16px;
  }
}

.topnav-toggle {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.route-pill {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-deep);
  padding: 4px 12px;
  border-radius: 20px;
  font-family: monospace;
}

.spacer {
  flex: 1;
}

.search-bar {
  background: var(--bg-deep);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 240px;
}

.search-icon {
  color: var(--text-muted);
  font-size: 16px;
}

.search-bar input {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 13px;
  width: 100%;
  outline: none;
}

.topnav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notif-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-dim);
  position: relative;
  padding: 4px;
}

.notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
  border: 1px solid var(--bg-surface);
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

@media (max-width: 768px) {
  .content-scroll {
    padding: 20px;
  }
  
  .hide-mobile {
    display: none;
  }

  .mobile-backdrop {
    display: block;
  }

  .sidebar {
    position: fixed;
    height: 100vh;
    left: -240px;
    width: 240px !important;
  }
  
  .sidebar.is-mobile-open {
    left: 0;
    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
  }
}
</style>
