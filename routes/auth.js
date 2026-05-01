'use strict';
 
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-fallback';

const TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';

const BCRYPT_ROUNDS = 10;

function generateToken(user) {
    return jwt.sign(
        { userId: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: TOKEN_EXPIRES }
    );
}

router.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (username.trim().length < 3 || username.trim().length > 20) {
        return res.status(400).json({ error: 'Username must be between 3 and 20 characters.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
 
    try {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username.trim(), hashedPassword],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Username already taken.' });
                    }
                    console.error('[Register] DB error:', err.message);
                    return res.status(500).json({ error: 'Internal server error.' });
                }

                const newUser = { id: this.lastID, username: username.trim() };
                const token   = generateToken(newUser);
 
                console.log(`[Register] New user: ${newUser.username} (id=${newUser.id})`);
 
                return res.status(201).json({
                    token,
                    userId:   newUser.id,
                    username: newUser.username,
                });
            }
        );
    } catch (err) {
        console.error('[Register] Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
 
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
 
    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username.trim()],
        async (err, user) => {
            if (err) {
                console.error('[Login] DB error:', err.message);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Incorrect username or password.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Incorrect username or password.' });
            }
 
            const token = generateToken(user);
 
            console.log(`[Login] User authenticated: ${user.username} (id=${user.id})`);
 
            return res.status(200).json({
                token,
                userId:   user.id,
                username: user.username,
            });
        }
    );
});
 
module.exports = router;
