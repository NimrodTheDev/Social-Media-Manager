<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { signup } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  if (!name.value.trim() || !email.value.trim() || !password.value) {
    error.value = 'Name, email and password are required.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  loading.value = true
  try {
    await signup(email.value.trim(), password.value, name.value.trim())
    router.replace('/app/dashboard')
  } catch (e) {
    error.value = e.message || 'Sign up failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <h1>Sign up</h1>
      <form @submit.prevent="onSubmit">
        <div v-if="error" class="error">{{ error }}</div>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" v-model="name" type="text" autocomplete="name" required />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">Password (min 8 characters)</label>
          <input id="password" v-model="password" type="password" autocomplete="new-password" required />
        </div>
        <button type="submit" class="btn primary" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
      <router-link to="/auth" class="back">← Back</router-link>
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
  padding: 2rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
.card h1 {
  font-size: 1.5rem;
  color: #fff;
  margin: 0 0 1rem;
}
.error {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}
.field {
  margin-bottom: 1rem;
}
.field label {
  display: block;
  color: #b1b5b9;
  font-size: 0.875rem;
  margin-bottom: 0.35rem;
}
.field input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #0f0f12;
  color: #e7e9ea;
  font-size: 1rem;
  box-sizing: border-box;
}
.field input:focus {
  outline: none;
  border-color: #1d9bf0;
}
.btn {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  margin-top: 0.5rem;
}
.btn.primary {
  background: #1d9bf0;
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  background: #1a8cd8;
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.back {
  display: inline-block;
  margin-top: 1rem;
  color: #71767b;
  font-size: 0.9rem;
}
.back:hover {
  color: #1d9bf0;
}
</style>
