'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getIO } = require('../socket');

const MIN_PLAYERS = 1;

function generateLobbyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getLobbyPlayers(lobbyId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.username
       FROM lobby_players lp
       JOIN users u ON u.id = lp.player_id
       WHERE lp.lobby_id = ?`,
      [lobbyId],
      (err, rows) => {
        if (err) reject(err);
        else     resolve(rows);
      }
    );
  });
}

router.post('/lobby/create', (req, res) => {
  const { name, maxPlayers = 4 } = req.body;
  const ownerId = req.auth.userId;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Room name must be at least 2 characters.' });
  }

  const max = Math.min(Math.max(parseInt(maxPlayers, 10) || 4, 2), 8);

  const tryInsert = (attempt = 0) => {
    if (attempt > 5) {
      return res.status(500).json({ error: 'Could not generate a unique code. Try again.' });
    }

    const code = generateLobbyCode();

    db.run(
      `INSERT INTO lobbies (name, code, owner_id, max_players) VALUES (?, ?, ?, ?)`,
      [name.trim(), code, ownerId, max],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return tryInsert(attempt + 1);
          console.error('[lobby/create] DB error:', err.message);
          return res.status(500).json({ error: 'Internal server error.' });
        }

        const lobbyId = this.lastID;

        db.run(
          `INSERT INTO lobby_players (lobby_id, player_id) VALUES (?, ?)`,
          [lobbyId, ownerId],
          (err2) => {
            if (err2) {
              console.error('[lobby/create] Player insert error:', err2.message);
              return res.status(500).json({ error: 'Internal server error.' });
            }

            console.log(`[lobby/create] Lobby "${name}" (${code}) created by userId=${ownerId}`);

            return res.status(201).json({
              lobby: {
                id:          lobbyId,
                name:        name.trim(),
                code,
                owner_id:    ownerId,
                max_players: max,
                status:      'waiting',
              },
            });
          }
        );
      }
    );
  };

  tryInsert();
});

router.post('/lobby/join', async (req, res) => {
  const { code } = req.body;
  const playerId = req.auth.userId;

  if (!code || code.trim().length !== 6) {
    return res.status(400).json({ error: 'Invalid lobby code.' });
  }

  db.get(
    `SELECT * FROM lobbies WHERE code = ?`,
    [code.trim().toUpperCase()],
    async (err, lobby) => {
      if (err) {
        console.error('[lobby/join] DB error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
      }
      if (!lobby) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      if (lobby.status !== 'waiting') {
        return res.status(409).json({ error: 'This game has already started.' });
      }

      try {
        const players = await getLobbyPlayers(lobby.id);

        if (players.find(p => p.id === playerId)) {
          return res.status(200).json({ lobby });
        }

        if (players.length >= lobby.max_players) {
          return res.status(409).json({ error: 'This room is full.' });
        }

        db.run(
          `INSERT INTO lobby_players (lobby_id, player_id) VALUES (?, ?)`,
          [lobby.id, playerId],
          async (err2) => {
            if (err2) {
              console.error('[lobby/join] Insert error:', err2.message);
              return res.status(500).json({ error: 'Internal server error.' });
            }

            const io = getIO();
            if (io) {
              const updatedPlayers = await getLobbyPlayers(lobby.id);
              io.to(`lobby_${lobby.id}`).emit('lobby:players', {
                players:    updatedPlayers,
                maxPlayers: lobby.max_players,
              });
              io.to(`lobby_${lobby.id}`).emit('lobby:player-joined', {
                username: req.auth.username,
              });
            }

            console.log(`[lobby/join] userId=${playerId} joined lobby ${lobby.id}`);
            return res.status(200).json({ lobby });
          }
        );
      } catch (dbErr) {
        console.error('[lobby/join] Unexpected error:', dbErr);
        return res.status(500).json({ error: 'Internal server error.' });
      }
    }
  );
});

router.post('/lobby/start', async (req, res) => {
  const { lobbyId } = req.body;
  const requesterId = req.auth.userId;

  if (!lobbyId) {
    return res.status(400).json({ error: 'lobbyId is required.' });
  }

  db.get(`SELECT * FROM lobbies WHERE id = ?`, [lobbyId], async (err, lobby) => {
    if (err) {
      console.error('[lobby/start] DB error:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    if (!lobby) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (lobby.owner_id !== requesterId) {
      return res.status(403).json({ error: 'Only the room owner can start the game.' });
    }

    if (lobby.status !== 'waiting') {
      return res.status(409).json({ error: 'The game has already started.' });
    }

    try {
      const players = await getLobbyPlayers(lobbyId);

      if (players.length < MIN_PLAYERS) {
        return res.status(400).json({
          error: `At least ${MIN_PLAYERS} player(s) required to start.`,
        });
      }

      db.run(
        `UPDATE lobbies SET status = 'playing' WHERE id = ?`,
        [lobbyId],
        (err2) => {
          if (err2) {
            console.error('[lobby/start] Update error:', err2.message);
            return res.status(500).json({ error: 'Internal server error.' });
          }
          const io = getIO();
          if (io) {
            io.to(`lobby_${lobbyId}`).emit('lobby:game-started', { lobbyId });
          }

          console.log(`[lobby/start] Lobby ${lobbyId} started with ${players.length} player(s).`);
          return res.status(200).json({ started: true, lobbyId });
        }
      );
    } catch (dbErr) {
      console.error('[lobby/start] Unexpected error:', dbErr);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

router.get('/lobby/:id', async (req, res) => {
  const lobbyId = parseInt(req.params.id, 10);

  if (isNaN(lobbyId)) {
    return res.status(400).json({ error: 'Invalid lobby id.' });
  }

  db.get(`SELECT * FROM lobbies WHERE id = ?`, [lobbyId], async (err, lobby) => {
    if (err) {
      console.error('[lobby/get] DB error:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    if (!lobby) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    try {
      const players = await getLobbyPlayers(lobbyId);
      return res.status(200).json({ lobby, players });
    } catch (dbErr) {
      return res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

module.exports = router;
