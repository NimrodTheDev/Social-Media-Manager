import { ref } from 'vue'
import { api } from '../api'

export function usePosts() {
    const posts = ref([])
    const loading = ref(false)
    const error = ref(null)

    async function fetchPosts() {
        loading.value = true
        error.value = null
        try {
            const res = await api('/posts', { method: 'GET' })
            if (res.success) {
                posts.value = res.data
            } else {
                error.value = res.message
            }
            return res
        } finally {
            loading.value = false
        }
    }

    async function createDraft(content) {
        loading.value = true
        error.value = null
        try {
            // Content is expected to be an array of { text, media } for threads
            const res = await api('/save-draft', {
                method: 'POST',
                body: JSON.stringify({ content })
            })
            return res
        } finally {
            loading.value = false
        }
    }

    async function postToSocial(platform, content) {
        loading.value = true
        error.value = null
        try {
            const res = await api('/post-to-social', {
                method: 'POST',
                body: JSON.stringify({ platform, content })
            })
            return res
        } finally {
            loading.value = false
        }
    }

    return {
        posts,
        loading,
        error,
        fetchPosts,
        createDraft,
        postToSocial
    }
}
