// Middleware d'authentification
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

module.exports = (req, res, next) => {
    try {
        // Récupère le token du header Authorization
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        // Vérifie et décode le token
        const decodedToken = jwt.verify(token, SECRET_KEY);
        req.auth = {
            userId: decodedToken.userId,
            username: decodedToken.username
        };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};
