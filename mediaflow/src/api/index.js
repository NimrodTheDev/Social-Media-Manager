import { getAuthToken } from '../composables/useAuth'

export async function api(path, options = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Send cookies with request
  options.credentials = options.credentials || 'include';

  try {
    const res = await fetch("/api" + path, { ...options, headers })
    const data = res.headers.get('content-type')?.includes('application/json')
      ? await res.json().catch(() => ({}))
      : null

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || data?.error || `Request failed: ${res.status}`,
        data: null
      }
    }

    // Auto-normalize if backend already uses makeResponse pattern
    if (data && typeof data === 'object' && 'success' in data) {
      return data
    }

    return { success: true, message: 'Success', data }
  } catch (error) {
    return { success: false, message: error.message || 'Network error occurred', data: null }
  }
}
