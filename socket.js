// ==================== SOCKET.IO SERVEUR ====================

const db     = require('./db');
const engine = require('./game/engine');

let io;

// Parties en cours en mémoire
const activeGames = {};

module.exports = {
    init: (server) => {
        const { Server } = require('socket.io');
        io = new Server(server, { cors: { origin: '*' } });

        io.on('connection', (socket) => {
            console.log('Joueur connecté :', socket.id);

            // Authentification socket
            socket.on('authenticate', ({ token }) => {
                try {
                    const jwt    = require('jsonwebtoken');
                    const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
                    const decoded = jwt.verify(token, SECRET);
                    socket.currentUserId   = decoded.userId;
                    socket.currentUsername = decoded.username;
                    console.log('Socket authentifié :', decoded.username);
                    socket.emit('authenticated'); // ✅ confirmer au client
                } catch (e) {
                    console.error('Token socket invalide');
                }
            });

            // Rejoindre la game via le code du lobby
            socket.on('join_game', ({ code }) => {
                console.log(`${socket.currentUsername} rejoint la game ${code}`);
                socket.join(code);
                socket.currentLobbyCode = code;

                db.get('SELECT * FROM lobbies WHERE code = ?', [code], (err, lobby) => {
                    if (!lobby) return;

                    db.all(`
                        SELECT users.id as userId, users.username
                        FROM lobby_players
                        JOIN users ON lobby_players.player_id = users.id
                        WHERE lobby_players.lobby_id = ?
                    `, [lobby.id], (err, players) => {
                        if (err || !players.length) return;

                        console.log(`Joueurs dans le lobby : ${players.map(p => p.username).join(', ')}`);

                        // Informer les autres qu'un joueur a rejoint
                        io.to(code).emit('player_joined', {
                            players: players.map(p => ({
                                username:  p.username,
                                cardCount: 0
                            }))
                        });

                        // Démarrer si 2 joueurs minimum
                        if (players.length >= 2 && !activeGames[code]) {
                            startGame(code, lobby.id, players);
                        } else if (activeGames[code]) {
                            // Partie déjà en cours — renvoyer l'état
                            sendGameState(socket, code);
                        } else {
                            // En attente d'autres joueurs
                            socket.emit('waiting', {
                                message: `En attente de joueurs... (${players.length}/2 minimum)`
                            });
                        }
                    });
                });
            });

            // Jouer une carte
            socket.on('play_card', ({ lobbyId, cardIndex, chosenColor }) => {
                const code = socket.currentLobbyCode;
                const game = activeGames[code];
                if (!game) return;

                const currentPlayer = game.state.players[game.state.currentIndex];
                if (currentPlayer.userId !== socket.currentUserId) {
                    socket.emit('error', 'Ce n\'est pas ton tour !');
                    return;
                }

                const result = engine.playCard(game.state, socket.currentUserId, cardIndex, chosenColor);

                if (!result.success) {
                    socket.emit('error', result.error);
                    return;
                }

                // Carte jouée
                io.to(code).emit('card_played', {
                    card:    result.card,
                    players: game.state.players.map(p => ({
                        username:  p.username,
                        cardCount: game.state.hands[p.userId].length
                    }))
                });

                // Partie gagnée
                if (result.won) {
                    const scores = engine.calculateScores(game.state, socket.currentUserId);
                    io.to(code).emit('game_ended', {
                        winner: socket.currentUsername,
                        scores: Object.entries(scores).map(([name, pts]) => `${name}: ${pts} pts`)
                    });
                    delete activeGames[code];
                    return;
                }

                broadcastGameState(code);
            });

            // Piocher une carte
            socket.on('draw_card', ({ lobbyId }) => {
                const code = socket.currentLobbyCode;
                const game = activeGames[code];
                if (!game) return;

                const currentPlayer = game.state.players[game.state.currentIndex];
                if (currentPlayer.userId !== socket.currentUserId) return;

                engine.drawCards(game.state, socket.currentUserId, 1);

                // Passer au joueur suivant
                game.state.currentIndex = (
                    game.state.currentIndex + game.state.direction + game.state.players.length
                ) % game.state.players.length;

                broadcastGameState(code);
            });

            // Quitter la game
            socket.on('leave_game', ({ lobbyId }) => {
                socket.leave(socket.currentLobbyCode);
            });

            // Déconnexion
            socket.on('disconnect', () => {
                console.log('Joueur déconnecté :', socket.id);
                if (socket.currentUserId) {
                    db.run('DELETE FROM lobby_players WHERE player_id = ?', [socket.currentUserId]);
                }
            });
        });

        return io;
    },
    getIO: () => io
};

// ==================== FONCTIONS INTERNES ====================

// Démarrer une partie
function startGame(code, lobbyId, players) {
    const state = engine.createGameState(players);
    activeGames[code] = { state, lobbyId };
    console.log(`✅ Partie démarrée : ${code} avec ${players.length} joueurs`);
    db.run('UPDATE lobbies SET status = ? WHERE code = ?', ['playing', code]);
    broadcastGameState(code);
}

// Envoyer l'état personnalisé à chaque joueur
function broadcastGameState(code) {
    const game = activeGames[code];
    if (!game) return;

    const { state } = game;
    const currentPlayer = state.players[state.currentIndex];

    state.players.forEach(player => {
        const socketId = getSocketByUserId(player.userId);
        if (!socketId) return;

        io.to(socketId).emit('game_state', {
            myCards:       state.hands[player.userId],
            currentCard:   state.discard[state.discard.length - 1],
            currentColor:  state.currentColor,
            currentPlayer: currentPlayer.username,
            isYourTurn:    currentPlayer.userId === player.userId,
            players:       state.players.map(p => ({
                username:  p.username,
                cardCount: state.hands[p.userId].length
            })),
            deckCount: state.deck.length
        });
    });
}

// Envoyer l'état à un seul joueur
function sendGameState(socket, code) {
    const game = activeGames[code];
    if (!game) return;

    const { state } = game;
    const currentPlayer = state.players[state.currentIndex];
    const player = state.players.find(p => p.userId === socket.currentUserId);
    if (!player) return;

    socket.emit('game_state', {
        myCards:       state.hands[player.userId],
        currentCard:   state.discard[state.discard.length - 1],
        currentColor:  state.currentColor,
        currentPlayer: currentPlayer.username,
        isYourTurn:    currentPlayer.userId === player.userId,
        players:       state.players.map(p => ({
            username:  p.username,
            cardCount: state.hands[p.userId].length
        })),
        deckCount: state.deck.length
    });
}

// Trouver le socketId par userId
function getSocketByUserId(userId) {
    for (const [id, s] of io.sockets.sockets) {
        if (s.currentUserId === userId) return id;
    }
    return null;
}