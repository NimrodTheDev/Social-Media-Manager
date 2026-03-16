<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { resetPassword } = useAuth()

const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const successMessage = ref('')
const loading = ref(false)

onMounted(() => {
  // Extract token from URL query string
  if (route.query.token) {
    token.value = route.query.token
  } else {
    error.value = 'Invalid password reset link. No token provided.'
  }
})

async function onSubmit() {
  error.value = ''
  successMessage.value = ''
  
  if (!token.value) {
    error.value = 'Missing reset token.'
    return
  }
  if (!password.value || password.value.length < 8) {
    error.value = 'Password must be at least 8 characters long.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  
  loading.value = true
  try {
    await resetPassword(token.value, password.value)
    successMessage.value = 'Your password has been successfully reset. You can now log in.'
    password.value = ''
    confirmPassword.value = ''
  } catch (e) {
    error.value = e.message || 'Failed to reset password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <h1>Set New Password</h1>
      
      <div v-if="successMessage" class="success-alert">
        {{ successMessage }}
        <div class="login-action">
          <router-link to="/login" class="btn primary small-btn">Go to Login</router-link>
        </div>
      </div>

      <form v-else @submit.prevent="onSubmit">
        <div v-if="error" class="error">{{ error }}</div>
        
        <div class="field">
          <label for="password">New Password</label>
          <input id="password" v-model="password" type="password" required placeholder="Minimum 8 characters" :disabled="!token" />
        </div>
        
        <div class="field">
          <label for="confirmPassword">Confirm New Password</label>
          <input id="confirmPassword" v-model="confirmPassword" type="password" required placeholder="Retype new password" :disabled="!token" />
        </div>

        <button type="submit" class="btn primary" :disabled="loading || !token">
          {{ loading ? 'Resetting...' : 'Reset Password' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0f0f12 0%, #1a1a20 100%);
}
.card {
  background: #1e1e24;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.card h1 {
  font-size: 1.75rem;
  color: #fff;
  margin: 0 0 1.5rem;
  text-align: center;
}
.error {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border: 1px solid rgba(244, 67, 54, 0.3);
}
.success-alert {
  background: rgba(0, 186, 124, 0.15);
  color: #00ba7c;
  padding: 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  border: 1px solid rgba(0, 186, 124, 0.3);
  text-align: center;
  line-height: 1.5;
}
.login-action {
  margin-top: 1.5rem;
}
.small-btn {
  display: inline-block;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
}
.field {
  margin-bottom: 1.25rem;
}
.field label {
  display: block;
  color: #b1b5b9;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
.field input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #0f0f12;
  color: #e7e9ea;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.field input:focus {
  outline: none;
  border-color: #1d9bf0;
}
.field input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.field input::placeholder {
  color: #555;
}
.btn {
  width: 100%;
  padding: 0.875rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.2s;
}
.btn.primary {
  background: #1d9bf0;
  color: #fff;
  box-shadow: 0 4px 14px rgba(29, 155, 240, 0.3);
}
.btn.primary:hover:not(:disabled) {
  background: #1a8cd8;
  transform: translateY(-1px);
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: translateY(0);
}
</style>
