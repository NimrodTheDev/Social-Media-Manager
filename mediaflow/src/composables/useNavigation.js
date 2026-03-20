export const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/app/dashboard' },
    { id: 'create', label: 'Create Post', icon: '✦', path: '/app/posts/create', highlight: true },
    {
        id: 'posts',
        label: 'Posts',
        icon: '◧',
        children: [
            { id: 'drafts', label: 'Drafts', path: '/app/posts/drafts' },
            { id: 'scheduled', label: 'Scheduled', path: '/app/posts/scheduled' },
        ]
    },
    {
        id: 'media',
        label: 'Media Studio',
        icon: '◈',
        children: [
            { id: 'library', label: 'Library', path: '/app/media/library' },
            { id: 'image-editor', label: 'Image Editor', path: '/app/media/image-editor' },
            { id: 'video-editor', label: 'Video Editor', path: '/app/media/video-editor' },
            { id: 'audio', label: 'Audio Studio', path: '/app/media/audio' },
            { id: 'meme', label: 'Meme Generator', path: '/app/media/meme' },
            { id: 'voice-over', label: 'Voice Over', path: '/app/media/voice-over' },
        ]
    },
    { id: 'platforms', label: 'Platforms', icon: '⬡', path: '/app/platforms' },
    { id: 'settings', label: 'Settings', icon: '⚙', path: '/app/settings' },
];

export const navObject = {
    dashboard: { id: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/app/dashboard' },
    createPost: { id: 'create', label: 'Create Post', icon: '✦', path: '/app/posts/create' },
    drafts: { id: 'drafts', label: 'Drafts', path: '/app/posts/drafts' },
    scheduled: { id: 'scheduled', label: 'Scheduled', path: '/app/posts/scheduled' },
};

export function useNavigation() {
    return {
        navItems,
        navObject
    }
}
