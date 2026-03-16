<script setup>
import { ref } from 'vue'

const postText = ref('')
</script>

<template>
  <div class="create-post">
    <h1>Create post</h1>
    <div class="editor">
      <textarea
        v-model="postText"
        placeholder="What's on your mind?"
        rows="4"
        maxlength="280"
      />
      <div class="meta">
        <span class="count">{{ postText.length }}/280</span>
      </div>
      <p class="hint">Connect X in settings to post. Drafts can be saved here later.</p>
    </div>
  </div>
</template>

<style scoped>
.create-post h1 {
  font-size: 1.5rem;
  color: #fff;
  margin: 0 0 1rem;
}
.editor {
  background: #1e1e24;
  border: 1px solid #2f2f36;
  border-radius: 12px;
  padding: 1rem;
  max-width: 560px;
}
.editor textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #2f2f36;
  border-radius: 8px;
  background: #0f0f12;
  color: #e7e9ea;
  font-size: 1rem;
  resize: vertical;
  box-sizing: border-box;
}
.editor textarea:focus {
  outline: none;
  border-color: #1d9bf0;
}
.meta {
  margin-top: 0.5rem;
  text-align: right;
}
.count {
  color: #71767b;
  font-size: 0.875rem;
}
.hint {
  margin: 1rem 0 0;
  color: #71767b;
  font-size: 0.875rem;
}
</style>
