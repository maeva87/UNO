
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error('[AUTH MIDDLEWARE] JWT_SECRET missing from .env — server shutdown.');
}
 
module.exports = (req, res, next) => {
    try {
        console.log('[SERVER DEBUG] Header Authorization received:', req.headers.authorization);
 
        const token = req.headers.authorization?.split(' ')[1];
 
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }

        const decodedToken = jwt.verify(token, SECRET_KEY);
        req.auth = {
            userId: decodedToken.userId,
            username: decodedToken.username
        };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
