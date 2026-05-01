const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http      = require('http');
const express   = require('express');
const jwt       = require('jsonwebtoken');
const db        = require('./db');
const socketLib = require('./socket');
const engine    = require('./game/engine');

const app = express();
app.use(express.json());
app.use(express.static('./public'));

const authRoutes     = require('./routes/auth');
const lobbyRoutes    = require('./routes/lobby');
const authMiddleware = require('./middleware/auth');

app.use('/api', authRoutes);
app.use('/api', authMiddleware, lobbyRoutes);

const server = http.createServer(app);
const io     = socketLib.init(server);

const SECRET_KEY  = process.env.JWT_SECRET || 'dev-secret-fallback';
const MIN_PLAYERS = 1;

const gameStates = {};

io.on('connection', function(socket) {

    const token = socket.handshake.auth.token;

    if (!token) {
        socket.disconnect();
        return;
    }

    let userId;
    let username;

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        userId   = parseInt(decoded.userId, 10);
        username = decoded.username;
    } catch (err) {
        console.log('Invalid token, disconnecting socket');
        socket.disconnect();
        return;
    }

    console.log(username + ' connected (id=' + userId + ')');

    socket.on('lobby:join', function(data) {
        const lobbyId = data.lobbyId;
        const room    = 'lobby_' + lobbyId;

        socket.join(room);

        db.get('SELECT * FROM lobbies WHERE id = ?', [lobbyId], function(err, lobby) {
            db.all(
                'SELECT u.id, u.username FROM lobby_players lp JOIN users u ON u.id = lp.player_id WHERE lp.lobby_id = ?',
                [lobbyId],
                function(err2, players) {
                    const maxPlayers = lobby ? lobby.max_players : 4;
                    io.to(room).emit('lobby:players', { players: players, maxPlayers: maxPlayers });
                    socket.to(room).emit('lobby:player-joined', { username: username });
                }
            );
        });
    });

    socket.on('lobby:leave', function(data) {
        const lobbyId = data.lobbyId;
        const room    = 'lobby_' + lobbyId;

        socket.leave(room);

        db.get('SELECT * FROM lobbies WHERE id = ?', [lobbyId], function(err, lobby) {
            db.all(
                'SELECT u.id, u.username FROM lobby_players lp JOIN users u ON u.id = lp.player_id WHERE lp.lobby_id = ?',
                [lobbyId],
                function(err2, players) {
                    const maxPlayers = lobby ? lobby.max_players : 4;
                    io.to(room).emit('lobby:players', { players: players, maxPlayers: maxPlayers });
                    io.to(room).emit('lobby:player-left', { username: username });
                }
            );
        });
    });

    socket.on('lobby:start', function(data) {
        const lobbyId = data.lobbyId;
        console.log('[lobby:start] userId=' + userId + ' lobbyId=' + lobbyId);

        db.get('SELECT * FROM lobbies WHERE id = ?', [lobbyId], function(err, lobby) {
            if (!lobby) {
                socket.emit('lobby:error', { message: 'Room not found.' });
                return;
            }

            if (parseInt(lobby.owner_id, 10) !== userId) {
                console.log('[lobby:start] Refused - not the owner');
                socket.emit('lobby:error', { message: 'Only the owner can start.' });
                return;
            }

            if (lobby.status !== 'waiting') {
                socket.emit('lobby:error', { message: 'Game already started.' });
                return;
            }

            db.all('SELECT * FROM lobby_players WHERE lobby_id = ?', [lobbyId], function(err2, rows) {
                if (!rows || rows.length < MIN_PLAYERS) {
                    console.log('[lobby:start] Refused - not enough players');
                    socket.emit('lobby:error', { message: 'Need at least ' + MIN_PLAYERS + ' player(s).' });
                    return;
                }

                db.run("UPDATE lobbies SET status = 'playing' WHERE id = ?", [lobbyId], function() {
                    io.to('lobby_' + lobbyId).emit('lobby:game-started', { lobbyId: lobbyId });
                    console.log('[lobby:start] Game ' + lobbyId + ' started');
                });
            });
        });
    });

    socket.on('lobby:chat', function(data) {
        const message = data.message;
        const lobbyId = data.lobbyId;

        if (!message || message.trim() === '') {
            return;
        }

        io.to('lobby_' + lobbyId).emit('lobby:chat', {
            username: username,
            message:  message.trim().slice(0, 120),
        });
    });

    socket.on('game:ready', function(data) {
        const lobbyId = data.lobbyId;

        socket.join('game_' + lobbyId);
        socket.join('user_' + userId);
        console.log('[game:ready] userId=' + userId + ' joined game_' + lobbyId);

        if (!gameStates[lobbyId]) {
            db.all(
                'SELECT u.id, u.username FROM lobby_players lp JOIN users u ON u.id = lp.player_id WHERE lp.lobby_id = ?',
                [lobbyId],
                function(err, rows) {
                    if (err || !rows || rows.length === 0) {
                        socket.emit('game:error', { message: 'No players found.' });
                        return;
                    }

                    gameStates[lobbyId] = engine.initGame(rows);
                    console.log('[game:ready] Game initialized with ' + rows.length + ' player(s)');

                    socket.emit('game:state', engine.getPlayerState(gameStates[lobbyId], userId));
                }
            );
        } else {
            socket.emit('game:state', engine.getPlayerState(gameStates[lobbyId], userId));
        }
    });

    socket.on('game:play-card', function(data) {
        const lobbyId     = data.lobbyId;
        const cardId      = data.cardId;
        const chosenColor = data.chosenColor;
        const game        = gameStates[lobbyId];

        if (!game) {
            socket.emit('game:error', { message: 'Game not found.' });
            return;
        }

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id !== userId) {
            socket.emit('game:error', { message: 'Not your turn.' });
            return;
        }

        const hand    = game.hands[userId];
        let cardIndex = -1;
        for (let i = 0; i < hand.length; i++) {
            if (hand[i].id === cardId) {
                cardIndex = i;
                break;
            }
        }

        if (cardIndex === -1) {
            socket.emit('game:error', { message: 'Card not found in your hand.' });
            return;
        }

        const card = hand[cardIndex];

        if (!engine.canPlayCard(card, game.topCard, game.activeColor)) {
            socket.emit('game:error', { message: 'You cannot play this card.' });
            return;
        }

        hand.splice(cardIndex, 1);
        game.topCard = card;
        if (card.color !== 'wild') {
            game.activeColor = card.color;
        }

        engine.applyCardEffect(game, card.value, chosenColor);
        engine.ensureDeck(game);

        console.log('[game:play-card] ' + username + ' played ' + card.color + '-' + card.value);

        if (engine.checkWinner(game, userId)) {
            const scores = engine.computeScores(game);
            delete gameStates[lobbyId];

            for (let i = 0; i < scores.length; i++) {
                const s      = scores[i];
                const player = game.players.find(function(p) { return p.username === s.username; });
                if (player) {
                    db.run('INSERT INTO scores (player_id, lobby_id, score) VALUES (?, ?, ?)', [player.id, lobbyId, s.score]);
                }
            }

            io.to('game_' + lobbyId).emit('game:over', { winnerName: username, scores: scores });
            return;
        }

        for (let i = 0; i < game.players.length; i++) {
            const p     = game.players[i];
            const state = engine.getPlayerState(game, p.id);
            io.to('user_' + p.id).emit('game:state', state);
        }
    });

    socket.on('game:draw-card', function(data) {
        const lobbyId = data.lobbyId;
        const game    = gameStates[lobbyId];

        if (!game) {
            socket.emit('game:error', { message: 'Game not found.' });
            return;
        }

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id !== userId) {
            socket.emit('game:error', { message: 'Not your turn.' });
            return;
        }

        engine.ensureDeck(game);
        const drawnCard = game.deck.shift();
        game.hands[userId].push(drawnCard);

        const total = game.players.length;
        game.currentPlayerIndex = ((game.currentPlayerIndex + game.direction) % total + total) % total;

        for (let i = 0; i < game.players.length; i++) {
            const p     = game.players[i];
            const state = engine.getPlayerState(game, p.id);
            io.to('user_' + p.id).emit('game:state', state);
        }
    });

    socket.on('game:uno', function(data) {
        const lobbyId = data.lobbyId;
        io.to('game_' + lobbyId).emit('game:uno', { playerId: userId, username: username });
    });

    socket.on('disconnect', function() {
        console.log(username + ' disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log('Server running on http://localhost:' + PORT);
});
