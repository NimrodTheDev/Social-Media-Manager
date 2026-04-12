import { ref, computed } from 'vue'
import { api } from '../api'

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'

function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const token = ref(localStorage.getItem(AUTH_TOKEN_KEY) || '')
const user = ref(getStoredUser())

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value)

  function setAuth(data) {
    if (data?.token) {
      token.value = data.token
      localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    }
    if (data?.id !== undefined && data?.email !== undefined) {
      const u = { id: data.id, email: data.email, name: data.name ?? data.username, notify_on_post_failure: data.notify_on_post_failure, notify_on_post_success: data.notify_on_post_failure }
      user.value = u
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u))
    }
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  async function login(email, password) {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (res.success && res.data) {
      setAuth(res.data)
    }
    return res
  }

  async function signup(email, password, name, code) {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, code }),
    })

    if (res.success && res.data) {
      setAuth(res.data)
    }
    return res
  }

  async function requestVerificationCode(email) {
    return await api('/auth/request-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async function resetPassword(token, password) {
    return await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }
  async function requestResetPassword(email) {
    return await api('/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }
  async function me() {
    const res = await api('/auth/me', {
      method: 'GET',
    })
    if (res.success && res.data) {
      setAuth(res.data)
    } else {
      // hit refresh token api
      const refreshTokenRes = await api('/auth/refresh', {
        method: 'POST',
      })
      if (refreshTokenRes.success && refreshTokenRes.data) {
        setAuth(refreshTokenRes.data)
      } else {
        clearAuth()
      }
    }
    return res
  }

  async function setMe(payload) {
    const res = await api("/auth/setUser", {
      method: "PUT",
      body: JSON.stringify(payload)
    })
    if (res.success) {
      me()
    }
  }
  async function logout() {
    const res = await api('/auth/logout', {
      method: 'POST',
    })
    clearAuth()
    return res
  }

  return {
    token,
    user,
    isLoggedIn,
    setAuth,
    clearAuth,
    login,
    signup,
    logout,
    requestVerificationCode,
    requestResetPassword,
    resetPassword,
    me,
    setMe
  }
}
