const express = require('express');
const router  = express.Router();
const db      = require('../db');

// Générer un code unique pour le lobby (ex: "XK92F")
function generateCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Lister tous les lobbies en attente
router.get('/', (req, res) => {
    db.all(`
    SELECT lobbies.*, users.username as owner_name,
    COUNT(lobby_players.id) as player_count
    FROM lobbies
    LEFT JOIN users ON lobbies.owner_id = users.id
    LEFT JOIN lobby_players ON lobbies.id = lobby_players.lobby_id
    WHERE lobbies.status = 'waiting'
    GROUP BY lobbies.id
    `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json(rows);
    });
});

// Créer un lobby
router.post('/create', (req, res) => {
    const { name, max_players = 4 } = req.body;
    const owner_id = req.user.id;
    const code = generateCode();

    db.run(
    'INSERT INTO lobbies (name, code, owner_id, max_players) VALUES (?, ?, ?, ?)',
    [name, code, owner_id, max_players],
    function (err) {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });

      // Le créateur rejoint automatiquement son lobby
        db.run(
        'INSERT INTO lobby_players (lobby_id, player_id) VALUES (?, ?)',
        [this.lastID, owner_id]
        );

        res.status(201).json({ id: this.lastID, name, code, owner_id, max_players });
    }
    );
});

// Rejoindre un lobby via son code
router.post('/join', (req, res) => {
    const { code } = req.body;
    const player_id = req.user.id;

  db.get('SELECT * FROM lobbies WHERE code = ?', [code], (err, lobby) => {
    if (!lobby) return res.status(404).json({ error: 'Lobby introuvable' });
    if (lobby.status !== 'waiting') return res.status(400).json({ error: 'Partie déjà commencée' });

    // Vérifier si le joueur est déjà dans le lobby
    db.get(
      'SELECT * FROM lobby_players WHERE lobby_id = ? AND player_id = ?',
        [lobby.id, player_id],
        (err, existing) => {
        if (existing) return res.status(400).json({ error: 'Déjà dans ce lobby' });

        // Vérifier si le lobby est plein
        db.get(
            'SELECT COUNT(*) as count FROM lobby_players WHERE lobby_id = ?',
            [lobby.id],
            (err, result) => {
            if (result.count >= lobby.max_players)
                return res.status(400).json({ error: 'Lobby plein' });

            db.run(
                'INSERT INTO lobby_players (lobby_id, player_id) VALUES (?, ?)',
                [lobby.id, player_id],
                () => res.json({ message: 'Rejoint', lobby })
            );
            }
        );
        }
    );
    });
});

module.exports = router;