// ==================== IMPORTS ====================
const http    = require('http');
const express = require('express');
const socket  = require('./socket');

// ==================== EXPRESS ====================
const app = express();
app.use(express.json());
app.use(express.static('./public'));

// ==================== SERVEUR HTTP ====================
const server = http.createServer(app);

// ==================== SOCKET.IO ====================
const io = socket.init(server);

// ==================== ROUTES AUTH (publiques) ====================
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ==================== ROUTES LOBBY (protégées) ====================
const authMiddleware = require('./middleware/auth');
const lobbyRoutes    = require('./routes/lobby');
app.use('/api/lobbies', authMiddleware, lobbyRoutes);

// ==================== LANCEMENT ====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
