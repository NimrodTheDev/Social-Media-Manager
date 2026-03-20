const Dashboard = {
    getDashboardData: async (req, res) => {
        const pool = require('../db/config');

        try {
            const userId = req.user.id;

            // Get user's basic info
            const userResult = await pool.query(
                'SELECT id, email, username, created_at FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResult.rows[0];

            // Get user's post statistics across ALL connected accounts
            const statsResult = await pool.query(
                `SELECT 
        COUNT(*) FILTER (WHERE status = 'posted') as posted_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count
      FROM posts p
      JOIN social_accounts sa ON p.account_id = sa.id
      WHERE sa.user_id = $1`,
                [userId]
            );

            const stats = statsResult.rows[0] || {
                posted_count: 0,
                draft_count: 0,
                scheduled_count: 0
            };

            // Get recent posts across ALL connected accounts
            const recentPostsResult = await pool.query(
                `SELECT 
        p.id,
        p.content,
        p.status,
        p.created_at,
        p.scheduled_at,
        p.posted_at,
        sa.platform
      FROM posts p
      JOIN social_accounts sa ON p.account_id = sa.id
      WHERE sa.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 5`,
                [userId]
            );

            // Return user data with statistics and recent activity
            res.json({
                user: {
                    id: user.id,
                    name: user.username,
                    email: user.email,
                    created_at: user.created_at,
                    stats: {
                        posted: parseInt(stats.posted_count),
                        drafted: parseInt(stats.draft_count),
                        scheduled: parseInt(stats.scheduled_count)
                    },
                    recentPosts: recentPostsResult.rows
                }
            });
        } catch (error) {
            console.error('Error fetching user dashboard data:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    }
}

module.exports = { Dashboard }