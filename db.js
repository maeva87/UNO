const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./uno.sqlite');

    // Tables users
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    `);

    // Tables lobbies
    db.run(`
    CREATE TABLE IF NOT EXISTS lobbies (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        code        TEXT UNIQUE NOT NULL,
        owner_id    INTEGER NOT NULL,
        max_players INTEGER DEFAULT 4,
        status      TEXT DEFAULT 'waiting',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
    )
    `);

    // Table lobby_players
    db.run(`
    CREATE TABLE IF NOT EXISTS lobby_players (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        lobby_id  INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lobby_id) REFERENCES lobbies(id),
        FOREIGN KEY(player_id) REFERENCES users(id)
    )
    `);

    // Table scores
    db.run(`
    CREATE TABLE IF NOT EXISTS scores (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        lobby_id  INTEGER NOT NULL,
        score     INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(player_id) REFERENCES users(id),
        FOREIGN KEY(lobby_id) REFERENCES lobbies(id)
    )
    `);
});

module.exports = db;