<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { requestResetPassword } = useAuth()

const email = ref('')
const error = ref('')
const successMessage = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  successMessage.value = ''
  
  if (!email.value.trim()) {
    error.value = 'Email is required.'
    return
  }
  
  loading.value = true
  try {
    await requestResetPassword(email.value.trim())
    successMessage.value = 'If an account exists with that email, a password reset link has been sent.'
    email.value = '' // Clear input
  } catch (e) {
    error.value = e.message || 'Failed to request reset.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <h1>Reset Password</h1>
      <p class="subtitle">Enter your email address and we'll send you a link to reset your password.</p>
      
      <div v-if="successMessage" class="success-alert">
        {{ successMessage }}
      </div>

      <form v-else @submit.prevent="onSubmit">
        <div v-if="error" class="error">{{ error }}</div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required placeholder="you@example.com" />
        </div>
        <button type="submit" class="btn primary" :disabled="loading">
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>
      <div class="navigation-links">
        <router-link to="/login" class="back">← Back to Login</router-link>
      </div>
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
  margin: 0 0 0.5rem;
}
.subtitle {
  color: #a0a0a0;
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
  line-height: 1.5;
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
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  border: 1px solid rgba(0, 186, 124, 0.3);
  text-align: center;
  line-height: 1.5;
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
.navigation-links {
  margin-top: 1.5rem;
  text-align: center;
}
.back {
  display: inline-block;
  color: #71767b;
  font-size: 0.95rem;
  transition: color 0.2s;
}
.back:hover {
  color: #fff;
}
</style>
