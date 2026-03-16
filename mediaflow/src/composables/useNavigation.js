// We don't even need Vue's ref() since this array is static!
export const navItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: '◉' },
    { path: '/app/posts/create', label: 'Create post', icon: '+' },
    { path: '/app/posts/drafts', label: 'Drafts', icon: '◇' },
    { path: '/app/posts/scheduled', label: 'Scheduled', icon: '◷' },
]

export const navObject = {
    dashboard: { path: '/app/dashboard', label: 'Dashboard', icon: '◉' },
    createPost: { path: '/app/posts/create', label: 'Create post', icon: '+' },
    drafts: { path: '/app/posts/drafts', label: 'Drafts', icon: '◇' },
    scheduled: { path: '/app/posts/scheduled', label: 'Scheduled', icon: '◷' },
}

export function useNavigation() {
    return {
        navItems,
        navObject
    }
}
