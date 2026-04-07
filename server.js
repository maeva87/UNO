// 1. Imports
const http    = require('http');
const express = require('express');
const socket = require('./socket');

// 2. Express
const app = express();
app.use(express.json());
app.use(express.static('./public'));

// 3. Serveur HTTP avec Express
const server = http.createServer(app);

// 4. Socket.IO greffé sur le serveur HTTP
const io = socket.init(server);

// 5. Routes auth (publiques)
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// 6. Routes lobby (protégées)
const authMiddleware = require('./middleware/auth');
const lobbyRoutes = require('./routes/lobby');
app.use('/api', authMiddleware, lobbyRoutes);

// 7. Socket.IO — événements de jeu (personne B)
io.on('connection', (socket) => {
    console.log('Joueur connecté :', socket.id);

    socket.on('disconnect', () => {
        console.log('Joueur déconnecté :', socket.id);
    });
});

// 8. Lancement
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
