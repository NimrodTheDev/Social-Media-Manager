const { makeResponse } = require("../utils/responder");
const pool = require('../db/config');
const { postToPlatform } = require("../services/generalPostService");

const Posts = {
    postToSocial: async (req, res) => {
        try {
            const userId = req.user.id;
            const { platform, content } = req.body;

            if (!userId) {
                return res.status(400).json(makeResponse(false, 'User not found.'));
            }
            if (!content || content.length === 0 || content.some((ele) => ele.text.trim() === '')) {
                return res.status(400).json(makeResponse(false, 'Content cannot be empty.'));
            }
            if (platform !== "ALL") {
                const account = await pool.query(
                    'SELECT id, access_token, platform FROM social_accounts WHERE user_id = $1 AND platform = $2',
                    [userId, platform]
                );

                if (account.rows.length === 0) {
                    return res.status(404).json(makeResponse(false, 'Account not found.'));
                }
                const postResult = await postToPlatform(platform, content, account.rows[0].access_token);
                if (!postResult.success) {
                    return res.status(400).json(makeResponse(false, postResult.error));
                }
                const result = await pool.query(
                    'INSERT INTO posts (user_id, account_id, content, status, media, mode, thread) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                    [userId, account.rows[0].id, '', 'posted', JSON.stringify(content.map((ele) => ele.media) || []), content.length > 1 ? 'thread' : 'single', JSON.stringify(content.map((ele) => ele.text) || [])]
                );

                res.status(200).json(makeResponse(true, 'Posted to ' + platform + ' successfully', result.rows[0]));
            } else {
                const accounts = await pool.query(
                    'SELECT id, access_token, platform FROM social_accounts WHERE user_id = $1',
                    [userId]
                );
                if (accounts.rows.length === 0) {
                    return res.status(404).json(makeResponse(false, 'User not connected to any social media platform.'));
                }
                const results = [];
                for (const account of accounts.rows) {
                    const postResult = await postToPlatform(account.platform, content, account.access_token);
                    if (!postResult.success) {
                        return res.status(400).json(makeResponse(false, postResult.error));
                    }
                    const result = await pool.query(
                        'INSERT INTO posts (user_id, account_id, content, status, media, mode, thread) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                        [userId, account.id, '', 'posted', JSON.stringify(content.map((ele) => ele.media) || []), content.length > 1 ? 'thread' : 'single', JSON.stringify(content.map((ele) => ele.text) || [])]
                    );
                    results.push(result.rows[0]);
                }
                res.status(200).json(makeResponse(true, 'Posted to all platforms successfully', results));
            }
        } catch (error) {
            console.error('Error posting to social:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    saveToDraft: async (req, res) => {
        try {
            const userId = req.user.id;
            const { content } = req.body;

            if (!userId) {
                return res.status(400).json(makeResponse(false, 'User not found.'));
            }
            if (!content || content.length === 0 || content.some((ele) => ele.text.trim() === '')) {
                return res.status(400).json(makeResponse(false, 'Content cannot be empty.'));
            }

            // Map content array to database columns
            const result = await pool.query(
                'INSERT INTO posts (user_id, account_id, content, status, media, mode, thread) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [
                    userId,
                    null,
                    '',
                    'draft',
                    JSON.stringify(content.map((ele) => ele.media) || []),
                    content.length > 1 ? 'thread' : 'single',
                    JSON.stringify(content.map((ele) => ele.text) || [])
                ]
            );

            res.status(200).json(makeResponse(true, 'Draft saved successfully', result.rows[0]));
        } catch (error) {
            console.error('Error saving draft:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    getPosts: async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await pool.query(
                'SELECT id, content, status, media, mode, thread, created_at, updated_at FROM posts WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.status(200).json(makeResponse(true, 'Posts fetched successfully', result.rows));
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    }
};

module.exports = Posts;
