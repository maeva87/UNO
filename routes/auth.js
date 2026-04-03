const express = require('express');
const router = express.Router();

// Route de test
router.get('/test', (req, res) => {
    res.json({ message: 'API auth fonctionnelle' });
});

// Route login (à compléter)
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Pour maintenant, accepter tout
    res.json({ token: 'fake-token', username });
});

module.exports = router;
