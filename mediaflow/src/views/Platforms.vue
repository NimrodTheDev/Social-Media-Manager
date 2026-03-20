<script setup>
  import { ref, onMounted } from 'vue';
  import { useConnectSocial } from '../composables/useConnectSocial';
  const { getSupportedPlatforms, connectSocial, disconnectSocial } = useConnectSocial();
  const platforms = ref([]);
  const loading = ref(true);

  const fetchPlatforms = async () => {
    loading.value = true;
    try {
      const response = await getSupportedPlatforms();
      platforms.value = response;
    } finally {
      loading.value = false;
    }
  };

  const handleConnect = (platformId) => {
    connectSocial(platformId);
  };

  const handleDisconnect = async (accountId) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      await disconnectSocial(accountId);
      await fetchPlatforms();
    }
  };

  onMounted(fetchPlatforms);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Platforms</h1>
      <p class="page-sub">Connect and manage your social media accounts.</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading platforms...</p>
    </div>

    <div v-else class="platforms-grid">
      <div 
        v-for="platform in platforms" 
        :key="platform.id" 
        class="platform-card"
        :class="{ 'disabled': !platform.enabled }"
      >
        <div class="platform-header">
          <div class="platform-icon" :style="{ backgroundColor: platform.color }">
            {{ platform.icon }}
          </div>
          <div class="platform-info">
            <h2 class="platform-name">{{ platform.name }}</h2>
            <div v-if="platform.connected" class="status-badge connected">Connected</div>
            <div v-else-if="!platform.enabled" class="status-badge coming-soon">Coming Soon</div>
            <div v-else class="status-badge disconnected">Disconnected</div>
          </div>
        </div>

        <p class="platform-desc">{{ platform.description }}</p>

        <div v-if="platform.connected" class="account-details">
          <div class="handle">@{{ platform.handle }}</div>
        </div>

        <div class="platform-footer">
          <button 
            v-if="platform.connected" 
            @click="handleDisconnect(platform.accountId)" 
            class="btn btn-danger"
          >
            Disconnect
          </button>
          <button 
            v-else-if="platform.enabled" 
            @click="handleConnect(platform.id)" 
            class="btn btn-primary"
          >
            Connect Account
          </button>
          <button 
            v-else 
            disabled 
            class="btn btn-disabled"
          >
            Stay Tuned
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header { margin-bottom: 2.5rem; }
.page-title { font-size: 1.8rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
.page-sub { color: var(--text-muted); font-size: 1rem; margin-top: 0.4rem; }

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.platform-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 24px;
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.platform-card:hover {
  transform: translateY(-4px);
  border-color: var(--brand-primary);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.platform-card.disabled {
  opacity: 0.8;
  filter: grayscale(0.5);
}

.platform-header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}

.platform-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.platform-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.platform-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.6rem;
  border-radius: 100px;
  width: fit-content;
}

.status-badge.connected { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-badge.disconnected { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.status-badge.coming-soon { background: var(--bg-deep); color: var(--text-dim); }

.platform-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 1.8rem;
  flex-grow: 1;
}

.account-details {
  background: var(--bg-deep);
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.handle {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.95rem;
}

.platform-footer {
  display: flex;
  gap: 1rem;
}

.btn {
  flex: 1;
  padding: 0.85rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-align: center;
}

.btn-primary {
  background: var(--brand-gradient);
  color: white;
  box-shadow: var(--brand-shadow);
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: scale(1.02);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.15);
}

.btn-danger:hover {
  background: #ef4444;
  color: white;
}

.btn-disabled {
  background: var(--bg-deep);
  color: var(--text-dim);
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 6rem;
  color: var(--text-muted);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-deep);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
