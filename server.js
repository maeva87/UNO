// Imports
const http    = require('http');
const express = require('express');
const socket = require('./socket');

// Express
const app = express();
app.use(express.json());
app.use(express.static('./public'));

// Serveur HTTP avec Express
const server = http.createServer(app);

// Socket.IO greffé sur le serveur HTTP
const io = socket.init(server);

// Routes auth (publiques)
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Routes lobby (protégées)
const authMiddleware = require('./middleware/auth');
const lobbyRoutes = require('./routes/lobby');
app.use('/api', authMiddleware, lobbyRoutes);

// Socket.IO — événements de jeu (personne B)
io.on('connection', (socket) => {
    console.log('Joueur connecté :', socket.id);

    socket.on('disconnect', () => {
        console.log('Joueur déconnecté :', socket.id);
    });
});

// Lancement
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
