<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goLogin() {
  router.push('/login')
}
function goSignup() {
  router.push('/signup')
}
</script>

<template>
  <div class="auth-choice">
    <div class="card">
      <h1>Welcome</h1>
      <p>Sign in or create an account to continue.</p>
      <div class="actions">
        <button class="btn primary" @click="goLogin">Log in</button>
        <button class="btn secondary" @click="goSignup">Sign up</button>
      </div>
      <router-link to="/" class="back">← Back</router-link>
    </div>
  </div>
</template>

<style scoped>
.auth-choice {
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
  margin: 0 0 0.5rem;
}
.card p {
  color: #888;
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.btn {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.btn.primary {
  background: #1d9bf0;
  color: #fff;
}
.btn.primary:hover {
  background: #1a8cd8;
}
.btn.secondary {
  background: #2f2f36;
  color: #e7e9ea;
  border: 1px solid #3f3f46;
}
.btn.secondary:hover {
  background: #3f3f46;
}
.back {
  display: inline-block;
  margin-top: 1.25rem;
  color: #71767b;
  font-size: 0.9rem;
}
.back:hover {
  color: #1d9bf0;
}
</style>
