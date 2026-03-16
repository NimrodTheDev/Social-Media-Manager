<script setup>
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNavigation } from '../composables/useNavigation'

const router = useRouter()
const { user, logout, me } = useAuth()
const { navItems } = useNavigation()
const isSidebarOpen = ref(false)

onMounted(async () => {
  await me()
  if (!user.value) {
    logout()
    router.replace('/auth')
  }
})

function go(path) {
  router.push(path)
  isSidebarOpen.value = false // Close sidebar on mobile after navigation
}

function doLogout() {
  logout()
  router.replace('/')
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}
</script>

<template>
  <div class="app-layout">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="brand">Mediaflow</div>
      <button class="menu-toggle" @click="toggleSidebar">
        ☰
      </button>
    </header>

    <!-- Sidebar Backdrop for Mobile -->
    <div 
      class="sidebar-backdrop" 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
    ></div>

    <aside class="sidebar" :class="{ 'is-open': isSidebarOpen }">
      <div class="brand desktop-brand">Mediaflow</div>
      <nav>
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
          @click="go(item.path)"
        >
          <span class="icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="user">
        <span class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() || '?' }}</span>
        <span class="name">{{ user?.name || 'User' }}</span>
        <button class="logout" @click="doLogout">Log out</button>
      </div>
    </aside>
    
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #0f0f12;
  flex-direction: column;
}

/* Mobile Header */
.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #1a1a20;
  border-bottom: 1px solid #2f2f36;
  position: sticky;
  top: 0;
  z-index: 40;
}

.mobile-header .brand {
  font-weight: 700;
  font-size: 1.25rem;
  color: #fff;
  margin: 0;
  padding: 0;
  border: none;
}

.menu-toggle {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
}

/* Sidebar structure */
.sidebar {
  width: 280px;
  background: #1a1a20;
  border-right: 1px solid #2f2f36;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
  
  /* Mobile default: hidden off-screen */
  position: fixed;
  top: 0;
  left: -100%;
  height: 100vh;
  z-index: 50;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.is-open {
  left: 0;
  box-shadow: 4px 0 24px rgba(0,0,0,0.5);
}

.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 45;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.desktop-brand {
  display: none;
}

.brand {
  font-weight: 700;
  font-size: 1.25rem;
  color: #fff;
  padding: 0 1.25rem 1rem;
  border-bottom: 1px solid #2f2f36;
  margin-bottom: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem 1.5rem;
  border: none;
  background: none;
  color: #b1b5b9;
  font-size: 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: #2f2f36;
  color: #e7e9ea;
}
.nav-item.active {
  color: #1d9bf0;
  font-weight: 500;
  background: rgba(29, 155, 240, 0.1);
  border-right: 3px solid #1d9bf0;
}
.nav-item .icon {
  opacity: 0.8;
}

.user {
  margin-top: auto;
  padding: 1rem 1.5rem;
  border-top: 1px solid #2f2f36;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1d9bf0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
}

.name {
  color: #e7e9ea;
  font-size: 0.95rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  color: #71767b;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
.logout:hover {
  color: #f4212e;
  background: rgba(244, 33, 46, 0.1);
}

.main {
  flex: 1;
  padding: 1.5rem;
  overflow-x: hidden;
}

/* Desktop Breakpoint */
@media (min-width: 768px) {
  .app-layout {
    flex-direction: row;
  }
  
  .mobile-header {
    display: none;
  }
  
  .desktop-brand {
    display: block;
  }
  
  .sidebar {
    position: sticky;
    left: 0;
    width: 240px;
    height: 100vh;
    border-right: 1px solid #2f2f36;
  }
  
  .sidebar-backdrop {
    display: none;
  }
  
  .main {
    padding: 2rem 2.5rem;
  }
}
</style>
