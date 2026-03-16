<script setup>
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const router = useRouter()

function goAuth() {
  router.push('/auth')
}
</script>

<template>
  <div class="landing-page">
    <!-- Navbar -->
    <nav class="navbar">
      <div class="logo">
        <span class="icon">🌊</span>
        <span class="brand">Mediaflow</span>
      </div>
      <div class="nav-links">
        <button class="btn secondary" @click="goAuth">Log in</button>
        <button class="btn primary" @click="goAuth">Get Started</button>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="badge">✨ The new standard for social publishing</div>
        <h1 class="headline">
          Master your social presence in <span class="gradient-text">one flow</span>
        </h1>
        <p class="subtitle">
          Create, schedule, and publish to X, Instagram, and TikTok from a single, beautiful dashboard.
        </p>
        <div class="cta-group">
          <button class="btn primary large pulse" @click="goAuth">Start for free</button>
          <a href="#features" class="btn text">See how it works &rarr;</a>
        </div>
        
        <!-- Animated floating elements (Abstract representing platforms) -->
        <div class="floating-elements">
          <div class="float-item float-1"></div>
          <div class="float-item float-2"></div>
          <div class="float-item float-3"></div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <h2 class="section-title">Everything you need, nothing you don't.</h2>
      
      <div class="features-grid">
        <!-- Feature 1 -->
        <div class="feature-card glass">
          <div class="feature-icon icon-publish">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
          </div>
          <h3>Publish Everywhere</h3>
          <p>Post simultaneously to X, Instagram, and TikTok with perfectly tailored formats for each platform.</p>
        </div>

        <!-- Feature 2 -->
        <div class="feature-card glass">
          <div class="feature-icon icon-schedule">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h3>Plan Ahead</h3>
          <p>Visually schedule your content calendar. Set it, forget it, and let Mediaflow handle the publishing.</p>
        </div>

        <!-- Feature 3 -->
        <div class="feature-card glass">
          <div class="feature-icon icon-store">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M10 4v4"></path><path d="M14 4v4"></path><path d="M2 8h20"></path><path d="M2 16h20"></path></svg>
          </div>
          <h3>Store & Organize</h3>
          <p>Keep all your ideas, drafts, and media assets in an organized, searchable vault for easy access.</p>
        </div>

        <!-- Feature 4 -->
        <div class="feature-card glass">
          <div class="feature-icon icon-create">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </div>
          <h3>Create Media</h3>
          <p>Built-in tools to edit images, trim clips, and craft the perfect visual story directly on the platform.</p>
        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="bottom-cta">
      <div class="glass-banner">
        <h2>Ready to upgrade your workflow?</h2>
        <p>Join thousands of creators who are already using Mediaflow.</p>
        <button class="btn primary large" @click="goAuth">Get Started Now</button>
      </div>
    </section>
    
    <!-- Footer -->
    <footer class="footer">
      <div class="logo">
        <span class="icon">🌊</span>
        <span class="brand">Mediaflow</span>
      </div>
      <p class="copyright">© 2026 Mediaflow. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped>
/* Keyframes */
@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}

@keyframes floatReverse {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(20px) rotate(-5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(29, 155, 240, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(29, 155, 240, 0); }
  100% { box-shadow: 0 0 0 0 rgba(29, 155, 240, 0); }
}

@keyframes revealUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Base layout */
.landing-page {
  min-height: 100vh;
  background: #0f0f12;
  color: #fff;
  overflow-x: hidden;
  position: relative;
}

/* Background elements */
.landing-page::before {
  content: '';
  position: absolute;
  top: -20vh;
  left: -10vw;
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, rgba(29,155,240,0.15) 0%, rgba(15,15,18,0) 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.landing-page::after {
  content: '';
  position: absolute;
  top: 30vh;
  right: -20vw;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, rgba(138,43,226,0.1) 0%, rgba(15,15,18,0) 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

/* Typography & Utilities */
h1, h2, h3 {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.03em;
  margin: 0;
}

.gradient-text {
  background: linear-gradient(135deg, #1d9bf0 0%, #8a2be2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
}

/* Buttons */
.btn {
  font-family: 'Inter', sans-serif;
  padding: 0.6rem 1.25rem;
  border-radius: 100px; /* Pill shape */
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn.primary {
  background: #1d9bf0;
  color: #fff;
  box-shadow: 0 4px 14px rgba(29, 155, 240, 0.3);
}

.btn.primary:hover {
  background: #1a8cd8;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(29, 155, 240, 0.4);
}

.btn.secondary {
  background: transparent;
  color: #e7e9ea;
}

.btn.secondary:hover {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.btn.text {
  background: transparent;
  color: #888;
  padding: 0.6rem;
}

.btn.text:hover {
  color: #fff;
  transform: translateX(4px);
}

.btn.large {
  padding: 0.875rem 2rem;
  font-size: 1.1rem;
}

.pulse {
  animation: pulse-glow 2s infinite;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 5%;
  position: relative;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

/* Hero Section */
.hero-section {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 4rem 5% 6rem;
  position: relative;
  z-index: 10;
}

.hero-content {
  max-width: 800px;
  animation: revealUp 0.8s ease-out forwards;
}

.badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(29, 155, 240, 0.1);
  color: #1d9bf0;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 2rem;
  border: 1px solid rgba(29, 155, 240, 0.2);
}

.headline {
  font-size: clamp(3rem, 5vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: #ffffff;
}

.subtitle {
  font-size: clamp(1.1rem, 2vw, 1.25rem);
  color: #a0a0a0;
  max-width: 600px;
  margin: 0 auto 3rem;
  line-height: 1.6;
}

.cta-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

/* Floating Elements (Abstract visual interest) */
.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

.float-item {
  position: absolute;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.float-1 {
  width: 80px;
  height: 80px;
  top: 15%;
  left: 15%;
  animation: float 6s ease-in-out infinite;
  background: linear-gradient(135deg, rgba(29,155,240,0.2), rgba(0,0,0,0));
}

.float-2 {
  width: 120px;
  height: 120px;
  bottom: 20%;
  right: 15%;
  animation: floatReverse 8s ease-in-out infinite;
  background: linear-gradient(135deg, rgba(138,43,226,0.2), rgba(0,0,0,0));
  border-radius: 50%;
}

.float-3 {
  width: 60px;
  height: 60px;
  top: 40%;
  right: 25%;
  animation: float 5s ease-in-out infinite 2s;
}

/* Features Section */
.features-section {
  padding: 5rem 5%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 4rem;
  color: #fff;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.feature-card {
  padding: 2.5rem 2rem;
  transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

.feature-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.icon-publish { background: rgba(29, 155, 240, 0.15); color: #1d9bf0; }
.icon-schedule { background: rgba(138, 43, 226, 0.15); color: #a464e8; }
.icon-store { background: rgba(0, 186, 124, 0.15); color: #00ba7c; }
.icon-create { background: rgba(249, 24, 128, 0.15); color: #f91880; }

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #fff;
}

.feature-card p {
  color: #a0a0a0;
  line-height: 1.6;
  font-size: 0.95rem;
  margin: 0;
}

/* Bottom CTA */
.bottom-cta {
  padding: 6rem 5%;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 10;
}

.glass-banner {
  background: rgba(29, 155, 240, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(29, 155, 240, 0.2);
  border-radius: 24px;
  padding: 4rem 2rem;
  text-align: center;
  max-width: 800px;
  width: 100%;
}

.glass-banner h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.glass-banner p {
  color: #a0a0a0;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

/* Footer */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 5%;
  border-top: 1px solid rgba(255,255,255,0.05);
  margin-top: 2rem;
}

.copyright {
  color: #666;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .headline { font-size: 2.5rem; }
  .cta-group { flex-direction: column; gap: 1rem; }
  .glass-banner h2 { font-size: 2rem; }
  .footer { flex-direction: column; gap: 1rem; text-align: center; }
}
</style>
