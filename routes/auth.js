const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Route de test
router.get('/test', (req, res) => {
    res.json({ message: 'API auth fonctionnelle' });
});

// Route REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Vérifications basiques
        if (!username || !password) {
            return res.status(400).json({ error: 'Username et password requis' });
        }

        // Hash le password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insère l'utilisateur en DB
        db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ error: 'Username déjà utilisé' });
                    }
                    return res.status(500).json({ error: 'Erreur serveur' });
                }

                // Crée un JWT
                const token = jwt.sign({ userId: this.lastID, username }, SECRET_KEY, { expiresIn: '24h' });
                res.status(201).json({ message: 'Utilisateur créé', token, userId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route LOGIN
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username et password requis' });
        }

        // Cherche l'utilisateur
        db.get(
            'SELECT id, username, password FROM users WHERE username = ?',
            [username],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Erreur serveur' });
                }

                if (!user) {
                    return res.status(401).json({ error: 'Utilisateur non trouvé' });
                }

                // Compare les passwords
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (!passwordMatch) {
                    return res.status(401).json({ error: 'Password incorrect' });
                }

                // Crée un JWT
                const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
                res.json({ message: 'Connecté', token, userId: user.id, username: user.username });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
