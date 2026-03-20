import { createRouter, createWebHistory } from 'vue-router'
import { getAuthToken } from '../composables/useAuth'

const routes = [
  { path: '/', name: 'Landing', component: () => import('../views/Landing.vue'), meta: { guest: true } },
  { path: '/auth', name: 'AuthChoice', component: () => import('../views/AuthChoice.vue'), meta: { guest: true } },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { guest: true } },
  { path: '/signup', name: 'Signup', component: () => import('../views/Signup.vue'), meta: { guest: true } },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('../views/ForgotPassword.vue'), meta: { guest: true } },
  { path: '/reset-password', name: 'ResetPassword', component: () => import('../views/ResetPassword.vue'), meta: { guest: true } },
  {
    path: '/app',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/app/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'posts/create', name: 'CreatePost', component: () => import('../views/CreatePost.vue') },
      { path: 'posts/drafts', name: 'Drafts', component: () => import('../views/Drafts.vue') },
      { path: 'posts/scheduled', name: 'Scheduled', component: () => import('../views/Scheduled.vue') },
      { path: 'media/library', name: 'MediaLibrary', component: () => import('../views/MediaLibrary.vue') },
      { path: 'media/image-editor', name: 'ImageEditor', component: () => import('../views/ImageEditor.vue') },
      { path: 'media/video-editor', name: 'VideoEditor', component: () => import('../views/VideoEditor.vue') },
      { path: 'media/audio', name: 'AudioStudio', component: () => import('../views/AudioStudio.vue') },
      { path: 'media/meme', name: 'MemeGenerator', component: () => import('../views/MemeGenerator.vue') },
      { path: 'media/voice-over', name: 'VoiceOver', component: () => import('../views/VoiceOver.vue') },
      { path: 'platforms', name: 'Platforms', component: () => import('../views/Platforms.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/Settings.vue') },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = getAuthToken()
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Landing' })
    return
  }
  if (to.meta.guest && token && (to.name === 'Landing' || to.name === 'AuthChoice')) {
    next({ path: '/app/dashboard' })
    return
  }
  next()
})

export default router
