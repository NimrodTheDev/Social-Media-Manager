const pool = require('../db/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { makeResponse } = require('../utils/responder');
const { sendHtml, isConfigured } = require('../services/emailService');

function escapeHtml(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const Auth = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(404).json(makeResponse(false, 'Email not found'));
            }

            const user = result.rows[0];

            const isValidPassword = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!isValidPassword) {
                return res.status(401).json(makeResponse(false, 'Invalid password'));
            }

            const payload = {
                id: user.id,
                email: user.email,
                name: user.username,
            };

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            await pool.query(
                'UPDATE users SET refresh_token = $1 WHERE id = $2',
                [refreshToken, user.id]
            );

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: false, // true in production
                sameSite: 'strict'
            });

            return res.status(200).json(
                makeResponse(true, 'Login successful', {
                    token: accessToken,
                    ...payload
                })
            );

        } catch (error) {
            console.error('Error logging in:', error);
            return res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    signUp: async (req, res) => {
        try {
            let { email, password, name } = req.body;

            // Basic validation
            if (!email || !password || !name) {
                return res.status(400).json(
                    makeResponse(false, 'All fields are required')
                );
            }

            // Normalize email
            email = email.toLowerCase().trim();

            // Password strength check
            if (password.length < 8) {
                return res.status(400).json(
                    makeResponse(false, 'Password must be at least 8 characters')
                );
            }

            // Check if user already exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            const existingName = await pool.query(
                'SELECT id FROM users WHERE username = $1',
                [name]
            );

            if (existingName.rows.length > 0) {
                return res.status(409).json(
                    makeResponse(false, 'name already registered')
                );
            }

            if (existingUser.rows.length > 0) {
                return res.status(409).json(
                    makeResponse(false, 'Email already registered')
                );
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);



            // Send welcome email (non-blocking; signup succeeds even if email fails)
            if (isConfigured) {
                try {
                    await sendHtml(
                        email,
                        'Welcome to Social Media Manager',
                        `<p>Hi ${escapeHtml(name)},</p><p>Your account is set up. You can log in and start managing your posts.</p><p>— The team</p>`
                    );

                    // Insert user
                    const result = await pool.query(
                        `INSERT INTO users (email, password_hash, username)
                        VALUES ($1, $2, $3)
                        RETURNING id, email, username, created_at`,
                        [email, hashedPassword, name]
                    )
                    const user = result.rows[0];
                    // Auto-login after signup - generate tokens
                    const payload = {
                        id: user.id,
                        email: user.email,
                        name: user.username,
                    };
                    const accessToken = jwt.sign(
                        payload,
                        process.env.JWT_SECRET,
                        { expiresIn: '15m' }
                    );
                    const refreshToken = jwt.sign(
                        { id: user.id },
                        process.env.JWT_REFRESH_SECRET,
                        { expiresIn: '7d' }
                    );

                    await pool.query(
                        'UPDATE users SET refresh_token = $1 WHERE id = $2',
                        [refreshToken, user.id]
                    );
                    res.cookie('refreshToken', refreshToken, {
                        httpOnly: true,
                        secure: false,
                        sameSite: 'strict'
                    });
                    return res.status(201).json(
                        makeResponse(true, 'User created successfully', {
                            token: accessToken,
                            ...payload
                        })
                    );
                } catch (error) {
                    console.error('Error sending welcome email:', error);
                    return res.status(500).json(
                        makeResponse(false, 'Failed to send welcome email')
                    );
                }
            }
        } catch (error) {
            console.error('Error signing up:', error);
            return res.status(500).json(
                makeResponse(false, 'Internal server error')
            );
        }
    },
    logout: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json(
                    makeResponse(false, 'No refresh token found')
                );
            }
            await pool.query(
                'UPDATE users SET refresh_token = NULL WHERE refresh_token = $1',
                [refreshToken]
            );
            res.clearCookie('refreshToken');
            return res.status(200).json(
                makeResponse(true, 'Logout successful')
            );
        } catch (error) {
            console.error('Error logging out:', error);
            return res.status(500).json(
                makeResponse(false, 'Internal server error')
            );
        }
    },
    refresh: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json(
                    makeResponse(false, 'No refresh token found')
                );
            }
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await pool.query(
                'SELECT * FROM users WHERE id = $1',
                [decoded.id]
            );
            if (user.rows.length === 0) {
                return res.status(404).json(
                    makeResponse(false, 'User not found')
                );
            }
            const payload = {
                id: user.rows[0].id,
                email: user.rows[0].email,
                name: user.rows[0].username,
            };
            const accessToken = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            return res.status(200).json(
                makeResponse(true, 'Refresh successful', {
                    token: accessToken,
                    ...payload
                })
            );
        } catch (error) {
            console.error('Error refreshing token:', error);
            return res.status(500).json(
                makeResponse(false, 'Internal server error')
            );
        }
    },
    requestResetPassword: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json(
                    makeResponse(false, 'Email is required')
                );
            }
            const user = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (user.rows.length === 0) {
                return res.status(404).json(
                    makeResponse(false, 'User not found')
                );
            }
            try {
                const resetToken = jwt.sign(
                    { id: user.rows[0].id },
                    process.env.JWT_RESET_SECRET,
                    { expiresIn: '15m' }
                );
                await sendHtml(email, 'Reset Password', `<p>Hi ${escapeHtml(user.rows[0].username)},</p><p>Click the link below to reset your password.</p><p><a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a></p><p>— The team</p>`);
                await pool.query(
                    'UPDATE users SET reset_token = $1 WHERE id = $2',
                    [resetToken, user.rows[0].id]
                );
                return res.status(200).json(
                    makeResponse(true, 'Reset password email sent successfully')
                );
            } catch (error) {
                console.error('Error sending reset password email:', error);
                return res.status(500).json(
                    makeResponse(false, 'Failed to send reset password email')
                );
            }
        } catch (error) {
            console.error('Error requesting reset password:', error);
            return res.status(500).json(
                makeResponse(false, 'Internal server error')
            );
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                return res.status(400).json(
                    makeResponse(false, 'Token and password are required')
                );
            }
            const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
            const user = await pool.query(
                'SELECT * FROM users WHERE id = $1',
                [decoded.id]
            );
            if (user.rows.length === 0) {
                return res.status(404).json(
                    makeResponse(false, 'User not found')
                );
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET password_hash = $1, reset_token = NULL WHERE id = $2',
                [hashedPassword, user.rows[0].id]
            );
            return res.status(200).json(
                makeResponse(true, 'Password reset successful')
            );
        } catch (error) {
            console.error('Error resetting password:', error);
            return res.status(500).json(
                makeResponse(false, 'Internal server error')
            );
        }
    },
    me: async (req, res) => {
        try {
            const user = await pool.query(
                'SELECT id, email, username FROM users WHERE id = $1',
                [req.user.id]
            );
            if (user.rows.length === 0) {
                return res.status(404).json(
                    makeResponse(false, 'User not found')
                );
            }
            return res.status(200).json(
                makeResponse(true, 'User found', {
                    id: user.rows[0].id,
                    email: user.rows[0].email,
                    name: user.rows[0].username
                })
            );
        } catch (error) {
            console.error('Error getting user:', error);
            return res.status(500).json(
                makeResponse(false, 'Internal server error')
            );
        }
    }
}

module.exports = Auth;