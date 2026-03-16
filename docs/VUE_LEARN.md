# Learning Vue 3 from the Mediaflow Project

This guide teaches **Vue 3** using the Social Media Manager app in `public/index.html`. We use the **Composition API** with `setup()` and no build step (Vue loaded via CDN).

---

## 1. How Vue is loaded

In the HTML:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.21/vue.global.prod.min.js"></script>
```

The app is mounted on a single element:

```html
<div id="app">
  <!-- All Vue template markup lives here -->
</div>

<script>
  const { createApp, ref, computed, onMounted } = Vue;
  createApp({ ... }).mount('#app');
</script>
```

- **`createApp({ ... })`** creates the Vue application from one options object.
- **`.mount('#app')`** attaches that app to the DOM node with `id="app"`. Everything inside `#app` is controlled by Vue.

---

## 2. The `setup()` function

All reactive state and logic live inside **`setup()`**. Whatever you **return** from `setup()` is available in the template.

```javascript
createApp({
  setup() {
    // State and functions go here
    const active = ref('dashboard');
    function go(id) {
      active.value = id;
    }
    return {
      active,
      go,
    };
  }
}).mount('#app');
```

In the template you can then use `{{ active }}` and `@click="go('create')"`. You don’t use `.value` in the template—only in the script.

---

## 3. Reactive state with `ref()`

**`ref()`** creates a reactive value. In **JavaScript** you read and write it with **`.value`**. In the **template** you use the name without `.value`.

**In the project:**

```javascript
const accessToken = ref(localStorage.getItem(TOKEN_KEY) || '');
const sidebarOpen = ref(true);
const postText = ref('');
const showLanding = ref(false);
```

- **Reading in script:** `accessToken.value`, `sidebarOpen.value`, `postText.value`
- **Writing in script:** `accessToken.value = token;`, `sidebarOpen.value = !sidebarOpen.value;`
- **In template:** `{{ postText }}`, `v-if="sidebarOpen"`, `v-model="postText"` (no `.value`)

**Example from the app:** the sidebar width is bound to `sidebarOpen`:

```html
<aside class="sidebar" :style="{ width: sidebarOpen ? '220px' : '64px' }">
```

Toggling the menu runs `sidebarOpen = !sidebarOpen` (in the template you can use the shorthand `sidebarOpen = !sidebarOpen` in `@click`). Vue re-runs the template and updates the DOM.

---

## 4. Derived state with `computed()`

When a value is **derived from other reactive data**, use **`computed()`**. Vue caches it and only recomputes when dependencies change.

**In the project:**

```javascript
const currentPath = computed(() => paths[active.value] || '/dashboard');

const dashStats = computed(() => {
  const u = userData.value?.user;
  const s = u?.stats;
  if (!s) return [ /* defaults */ ];
  return [
    { label: 'Total Posts', value: String(s.total || 0) },
    { label: 'Scheduled', value: String(s.scheduled || 0), color: '#f59e0b' },
    // ...
  ];
});

const drafts = computed(() => (apiPosts.value || []).filter(p => p.status === 'draft'));
```

- **`currentPath`** depends on `active`; when `active` changes, `currentPath` updates.
- **`dashStats`** depends on `userData`; when the API fills `userData`, the dashboard stats update.
- **`drafts`** depends on `apiPosts`; when posts load, the drafts list updates.

In the template you use them like refs: `{{ currentPath }}`, `v-for="s in dashStats"`. Don’t assign to a computed (it’s read-only).

---

## 5. Template syntax basics

### Text: `{{ }}`

Any JavaScript expression can go inside double curly braces. It runs in a context where your `return` from `setup()` is in scope.

```html
<div class="page-title">{{ currentPath }}</div>
<div class="page-sub">Welcome back{{ userDisplayName ? ', ' + userDisplayName.split(' ')[0] : '' }}!</div>
<span>{{ postText.length }}/280</span>
```

### Conditional: `v-if` / `v-else-if` / `v-else`

Only one branch is rendered. Good for “one of several views.”

**In the project:** landing vs connect vs main app:

```html
<div v-if="showLanding" class="landing">...</div>
<div v-else-if="!accessToken" class="page">Connect X...</div>
<template v-else>
  <!-- Main app: sidebar + content -->
</template>
```

- **`v-if="showLanding"`** – show landing first.
- **`v-else-if="!accessToken"`** – if not landing and no token, show connect screen.
- **`v-else`** – otherwise show the main app. **`<template>`** is used here only to wrap multiple root elements; it doesn’t render a real DOM node.

Another example: loading vs content:

```html
<div v-if="userLoading">Loading...</div>
<template v-else>
  <div class="grid-4">...</div>
</template>
```

### List: `v-for` and `:key`

Loop over an array (or object). **Always give a stable `:key`** (e.g. id or unique value) so Vue can track items correctly.

**In the project:**

```html
<div v-for="s in dashStats" :key="s.label">...</div>
<div v-for="(p, i) in recentPosts" :key="p.id || i">...</div>
<template v-for="item in navItems" :key="item.id">
  <button ...>{{ item.icon }}</button>
  <button v-for="child in item.children" :key="child.id">...</button>
</template>
```

- **`v-for="s in dashStats"`** – one element per stat; `:key="s.label"` is unique per stat.
- **`v-for="(p, i) in recentPosts"`** – `p` is the item, `i` is the index; key prefers `p.id`, falls back to index.
- **`v-for` on `<template>`** – repeat a group of elements (e.g. nav item + its children) under one key per `item`.

---

## 6. Binding attributes and styles

### `:attr` or `v-bind:attr`

**`:`** (short for `v-bind`) sets an attribute from a JavaScript expression.

**In the project:**

```html
<aside :style="{ width: sidebarOpen ? '220px' : '64px', minWidth: sidebarOpen ? '220px' : '64px' }">
<span :style="{ color: p.status==='posted'?'#22c55e':p.status==='scheduled'?'#f59e0b':'#64748b' }">
<button :style="navBtnStyle(item)" ...>
<span :style="{ background: active===child.id ? '#a78bfa' : '#334155' }"></span>
```

- **`:style`** accepts an object of CSS properties. Values can be expressions (e.g. ternaries, or functions like `navBtnStyle(item)` returning an object).
- You can also bind other attributes: **`:href`**, **`:disabled`**, **`:title`**, etc.

**Example:** disabling a button while an action runs:

```html
<button @click="postNow" :disabled="createLoading">▶ Post Now</button>
```

---

## 7. Events: `@event` or `v-on:event`

**`@`** (short for `v-on`) attaches an event listener. The value is a statement or function call.

**In the project:**

```html
<button @click="sidebarOpen = !sidebarOpen">☰</button>
<button @click="go('create')">✦ Create Post</button>
<button @click="enterApp">Get Started</button>
<button @click="item.children ? toggleExpand(item.id) : go(item.id)">
<button @click="previewTab=p">
<button @click="postToX(d.id)" :disabled="postingId===d.id">
```

- **`@click="go('create')"`** – call `go` with a string when clicked.
- **`@click="enterApp"`** – call `enterApp()` with no arguments.
- **`@click="sidebarOpen = !sidebarOpen"`** – run a one-line statement (toggle).
- **`@click="previewTab=p"`** – set `previewTab` to the loop variable `p` (e.g. platform name).

You can also pass the DOM event: `@click="handleClick($event)"`.

---

## 8. Two-way binding: `v-model`

**`v-model`** ties an input (or other form control) to a ref: when the user types, the ref updates; when you change the ref in code, the input updates.

**In the project:**

```html
<textarea class="textarea-field" v-model="postText" placeholder="Write your caption..."></textarea>
<input type="datetime-local" v-model="scheduleAt" class="input-field" />
<input v-model="memeTop" placeholder="Top Text" class="input-field" />
<button @click="previewTab=p" ...>{{ p.slice(0,2).toUpperCase() }}</button>
```

- **`v-model="postText"`** – one ref for the whole textarea; `{{ postText.length }}/280` and “Post Now” use the same value.
- **`v-model="scheduleAt"`** – same for the datetime input used when scheduling.
- For the preview tabs we don’t use `v-model`; we use **`@click="previewTab=p"`** to set which tab is active (same idea: one ref, UI and logic stay in sync).

---

## 9. Lifecycle: `onMounted()`

**`onMounted()`** runs once after the component is mounted to the DOM. Use it for:

- Reading URL params
- Loading data (e.g. from an API)
- Setting initial state from storage

**In the project:**

```javascript
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    accessToken.value = token;
    showLanding.value = false;
    // Clean URL
    const url = new URL(window.location);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url);
  }
  flashMessage.value = params.get('message') || '';
  flashError.value = params.get('error') || '';
  if (!sessionStorage.getItem('mediaflow_entered') && !accessToken.value) {
    showLanding.value = true;
  }
  if (accessToken.value) {
    loadUser();
    loadPosts();
  }
});
```

So: read token/message/error from the URL, update refs and storage, decide whether to show landing, and if the user is logged in, load user and posts. All of this runs once when the app is ready.

---

## 10. Returning from `setup()`

Only what you **return** from `setup()` is available in the template. That includes:

- **refs** – so the template can show and update state
- **computed** – so the template can show derived data
- **functions** – so the template can call them (e.g. in `@click`)
- **constants/arrays** – e.g. `navItems`, `quickActions`, `platformColors`

**In the project:**

```javascript
return {
  accessToken, flashMessage, flashError, userData, userLoading, postsLoading,
  postingId, createLoading, showSchedule, scheduleAt, showLanding, enterApp,
  loadUser, loadPosts, saveDraft, schedulePost, postNow, postToX,
  formatDate, draftPreview,
  userDisplayName, userInitial,
  active, sidebarOpen, expanded, navItems, currentPath,
  go, toggleExpand, navBtnStyle, childBtnStyle,
  dashStats, recentPosts, quickActions, connectedPlatforms,
  postText, previewTab, platformColors, mediaEmojis,
  drafts, weekDays, selectedDay, scheduledEvents, scheduledEventsForDay,
  // ... etc
};
```

If you forget to return something, the template will not see it (and you might get “is not defined” in the console).

---

## 11. Patterns used in this project

| Pattern | Where it’s used |
|--------|------------------|
| **Single “page” state** | `active` ref: `'dashboard'`, `'create'`, `'drafts'`, etc. Only one `v-if="active==='...'"` block is shown at a time. |
| **API + refs** | `userData`, `apiPosts` refs are filled in `loadUser()` / `loadPosts()`; `dashStats`, `recentPosts`, `drafts` are computed from them. |
| **Loading flags** | `userLoading`, `postsLoading`, `createLoading`, `postingId` disable buttons and show “Loading...” or “Posting...”. |
| **Flash messages** | `flashMessage` and `flashError` refs; template shows them with `v-if="flashMessage"` / `v-if="flashError"`. |
| **Helper functions** | `formatDate()`, `draftPreview()`, `navBtnStyle()`, `childBtnStyle()` return values for the template; they’re not reactive, so they don’t need to be refs or computed. |

---

## 12. Quick reference

| Concept | Script | Template |
|--------|--------|----------|
| **ref** | `const x = ref(0);` then `x.value = 1` or `x.value++` | `{{ x }}` or `v-model="x"` |
| **computed** | `const y = computed(() => x.value * 2);` (read-only) | `{{ y }}` |
| **event** | `function go(id) { active.value = id; }` | `@click="go('create')"` |
| **conditional** | — | `v-if` / `v-else-if` / `v-else` |
| **list** | — | `v-for="item in items" :key="item.id"` |
| **attribute** | — | `:style="..."` `:disabled="loading"` |
| **lifecycle** | `onMounted(() => { ... })` | — |

---

## 13. Where to look in `public/index.html`

- **Lines ~207–240:** Landing vs connect vs main app (`v-if` / `v-else-if` / `v-else`).
- **Lines ~246–278:** Sidebar with `:style`, `v-for` on `navItems`, `@click` for `go()` and `toggleExpand()`.
- **Lines ~300–315:** Dashboard stats and recent posts: `v-for` over `dashStats` and `recentPosts` (computed).
- **Lines ~394–412:** Create post: `v-model="postText"`, `@click="saveDraft"`, `@click="postNow"`, `:disabled="createLoading"`.
- **Lines ~905–925:** Declaring refs and the start of `setup()`.
- **Lines ~1048–1062:** `computed()` examples: `dashStats`, `recentPosts`, `userDisplayName`, `userInitial`.
- **Lines ~1194–1227:** More computed: `drafts`, `scheduledEvents`, `weekDays`, `scheduledEventsForDay`.
- **Lines ~1304–1324:** `onMounted()` and the big `return { ... }`.

Use this file as a single-file Vue 3 reference: one app, Composition API, refs, computed, lifecycle, and templates—all in one place.

---

## 14. Making the project modular

Right now everything lives in one `index.html` (~1,400 lines). As the app grows, you’ll want to split it into components, composables, and a clearer structure.

### Why modularize?

- **Reusability** – Shared UI (buttons, cards, modals) used in multiple places.
- **Maintainability** – Each piece has a single responsibility.
- **Testability** – Smaller units are easier to test.
- **Collaboration** – Different people can work on different files.

### Option A: Components without a build (CDN)

You can register components while still using the CDN. Use `app.component()` and inline templates:

```javascript
const { createApp, ref } = Vue;

const StatCard = {
  props: ['label', 'value', 'color'],
  template: `
    <div class="card stat-card">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value" :style="{ color: color || '#f1f5f9' }">{{ value }}</div>
    </div>
  `,
};

const app = createApp({
  setup() {
    const dashStats = ref([
      { label: 'Total', value: '0' },
      { label: 'Scheduled', value: '0', color: '#f59e0b' },
    ]);
    return { dashStats };
  },
  template: `
    <div v-for="s in dashStats" :key="s.label">
      <stat-card :label="s.label" :value="s.value" :color="s.color" />
    </div>
  `,
});
app.component('StatCard', StatCard);
app.mount('#app');
```

This works for small apps but gets messy as you add more components. A build step with single-file components (SFCs) is usually better.

### Option B: Vite + Single-File Components (.vue)

A standard setup is **Vue + Vite** with `.vue` files.

**1. Project layout**

```
src/
├── main.js              # createApp, mount, global setup
├── App.vue              # Root component
├── views/               # Full "pages"
│   ├── LandingView.vue
│   ├── DashboardView.vue
│   ├── CreatePostView.vue
│   ├── DraftsView.vue
│   └── ...
├── components/          # Reusable UI
│   ├── AppSidebar.vue
│   ├── AppTopNav.vue
│   ├── StatCard.vue
│   ├── PostCard.vue
│   └── ...
├── composables/         # Reusable logic (not UI)
│   ├── useAuth.js
│   ├── usePosts.js
│   └── useApi.js
└── assets/
    └── styles/
```

**2. Single-File Component (.vue)**

Each `.vue` file has three blocks: `<script>`, `<template>`, and optionally `<style>`.

```vue
<!-- components/StatCard.vue -->
<script setup>
defineProps({
  label: String,
  value: [String, Number],
  color: { type: String, default: '#f1f5f9' },
});
</script>

<template>
  <div class="card stat-card">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value" :style="{ color }">{{ value }}</div>
  </div>
</template>

<style scoped>
.stat-label { font-size: 11px; color: #475569; }
.stat-value { font-size: 26px; font-weight: 700; }
</style>
```

- **`<script setup>`** – Same as `setup()`; no explicit return needed.
- **`defineProps()`** – Declares props the component receives.
- **`<style scoped>`** – Styles apply only to this component.

**3. Using a component**

```vue
<!-- views/DashboardView.vue -->
<script setup>
import StatCard from '../components/StatCard.vue';
import { computed } from 'vue';

const dashStats = computed(() => [...]);
</script>

<template>
  <div class="page">
    <div class="grid-4">
      <StatCard
        v-for="s in dashStats"
        :key="s.label"
        :label="s.label"
        :value="s.value"
        :color="s.color"
      />
    </div>
  </div>
</template>
```

**4. Emitting events**

When a child needs to tell the parent something (e.g. "Post Now" clicked):

```vue
<!-- components/PostCard.vue -->
<script setup>
const props = defineProps({ post: Object });
const emit = defineEmits(['post', 'edit', 'delete']);

function handlePost() {
  emit('post', props.post.id);
}
</script>

<template>
  <button @click="handlePost">Post</button>
</template>
```

```vue
<!-- Parent -->
<PostCard :post="d" @post="postToX" />
```

**5. Composables – reusable logic**

Extract logic (e.g. auth, API calls) into composables:

```javascript
// composables/useAuth.js
import { ref, computed } from 'vue';

const TOKEN_KEY = 'x_access_token';
const accessToken = ref(localStorage.getItem(TOKEN_KEY) || '');

export function useAuth() {
  const isAuthenticated = computed(() => !!accessToken.value);

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    accessToken.value = token;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    accessToken.value = '';
  }

  return { accessToken, isAuthenticated, setToken, logout };
}
```

```vue
<!-- In any component -->
<script setup>
import { useAuth } from '../composables/useAuth';
const { accessToken, logout } = useAuth();
</script>
```

**6. Minimal Vite setup**

```bash
npm create vite@latest my-app -- --template vue
cd my-app
npm install
npm run dev
```

This gives you Vue 3 + Vite + `.vue` SFCs. Move your existing logic into components and composables step by step.

---

## 15. Path to Vue expert – learning roadmap

### Level 1: Fundamentals (you’re here)

- [x] `ref`, `computed`, `setup()`, `onMounted`
- [x] Template syntax: `v-if`, `v-for`, `v-model`, `@click`, `:style`
- [x] One-file app with Composition API

### Level 2: Component architecture

| Topic | What to learn | Where in Mediaflow |
|-------|----------------|--------------------|
| **Props** | Pass data down; `defineProps()`, validation | StatCard gets label/value; PostCard gets post |
| **Emits** | Child notifies parent; `defineEmits()` | PostCard emits `@post` when "Post" is clicked |
| **Slots** | Let parent inject content into child | Wrapper for page layout with a slot for content |
| **Provide / Inject** | Pass data through many levels without prop drilling | `accessToken`, `userData` for deep components |

### Level 3: Routing & state

| Topic | What to learn | Why |
|-------|---------------|-----|
| **Vue Router** | Routes, `<router-view>`, `useRouter()`, `useRoute()` | Replace `active` ref with real URLs like `/dashboard`, `/create`, `/drafts` |
| **Pinia** | Store, `defineStore()`, `storeToRefs()` | Centralize `accessToken`, `userData`, `apiPosts` instead of passing through many components |

### Level 4: Advanced reactivity & performance

| Topic | What to learn |
|-------|---------------|
| **watch** | React to changes: `watch(ref, (newVal) => {...})` |
| **watchEffect** | Auto-track dependencies and run side effects |
| **shallowRef** | Non-deep reactivity for large objects (e.g. big lists) |
| **v-memo** | Skip re-renders when deps are unchanged |
| **keep-alive** | Cache component instances (e.g. tabs) |
| **Async components** | `defineAsyncComponent()` for lazy loading routes/components |

### Level 5: Build & tooling

| Topic | What to learn |
|-------|---------------|
| **Vite** | Fast dev server, HMR, production build |
| **Vue DevTools** | Inspect components, state, events |
| **TypeScript** | Typed props, emits, composables with `<script setup lang="ts">` |
| **ESLint + Prettier** | Linting and formatting for Vue |

### Level 6: Full-stack & scale

| Topic | What to learn |
|-------|---------------|
| **Testing** | Vitest (unit), Cypress/Playwright (E2E), Vue Test Utils |
| **SSR / Nuxt** | Server-side rendering, Nuxt 3 for SEO and fast first load |
| **PWA** | Offline support, installability |
| **Accessibility** | `aria-*`, focus management, `vue-announcer` |

### Level 7: Expert topics

- **Custom renderer** – Build non-DOM outputs (e.g. Canvas, WebGL)
- **Compiler macros** – `defineModel()`, `defineOptions()`, custom macros
- **Performance profiling** – `performance.mark()`, Vue DevTools profiler
- **Design systems** – Theming, tokens, component libraries (Vuetify, PrimeVue, etc.)

---

## 16. Key concepts summary for modular Mediaflow

| From current app | Becomes in modular app |
|------------------|------------------------|
| One giant template | `LandingView`, `ConnectView`, `DashboardView`, `CreatePostView`, `DraftsView`, etc. |
| `active` ref switching views | Vue Router routes: `/`, `/connect`, `/dashboard`, `/create`, `/drafts`, etc. |
| `navItems`, `paths` in root | In `AppSidebar.vue` or a config module |
| `loadUser`, `loadPosts` in root | `useAuth()` and `usePosts()` composables |
| `userData`, `apiPosts` in root | Pinia store or composables shared across components |
| Inline styles in template | Scoped styles in each `.vue` or a shared CSS/SCSS structure |
| 100+ return values from setup | Each component returns only what its template needs |

Start by extracting one component (e.g. `StatCard`) and one composable (e.g. `useAuth`), then grow from there.
