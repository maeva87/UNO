const jwt = require('jsonwebtoken');
const { createDeck, shuffleDeck } = require('./game/engine');

let io;
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Stockage des jeux actifs {code: {players, deck, discard, currentPlayer, ...}}
const games = {};
const playerSockets = {}; // {userId: socketId}

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
      console.log('✓ Joueur connecté:', socket.id);

      // Authentifier le joueur
      socket.on('authenticate', (data) => {
        try {
          const decoded = jwt.verify(data.token, SECRET_KEY);
          socket.userId = decoded.userId;
          socket.username = decoded.username;
          playerSockets[decoded.userId] = socket.id;
          console.log(`✓ Authentifié: ${decoded.username}`);
        } catch (err) {
          socket.emit('error', 'Authentification échouée');
          socket.disconnect();
        }
      });

      // Rejoindre une partie
      socket.on('join_game', (data) => {
        const { code } = data;
        
        if (!socket.userId) {
          return socket.emit('error', 'Non authentifié');
        }

        socket.join(code);

        if (!games[code]) {
          // Créer une nouvelle partie
          games[code] = {
            code,
            players: [],
            deck: shuffleDeck(createDeck()),
            discard: [],
            currentPlayerIndex: 0,
            gameStarted: false
          };
        }

        // Ajouter le joueur
        const game = games[code];
        if (!game.players.find(p => p.userId === socket.userId)) {
          game.players.push({
            userId: socket.userId,
            username: socket.username,
            cards: [],
            socketId: socket.id
          });
        }

        // Distribuer les cartes si c'est le début
        if (!game.gameStarted && game.players.length >= 2) {
          startGame(code);
        }

        // Envoyer l'état du jeu au joueur
        socket.emit('game_state', {
          myCards: game.players.find(p => p.userId === socket.userId)?.cards || [],
          currentCard: game.discard[game.discard.length - 1] || null,
          players: game.players.map(p => ({
            username: p.username,
            cardCount: p.cards.length
          })),
          currentPlayer: game.players[game.currentPlayerIndex]?.username,
          isYourTurn: game.players[game.currentPlayerIndex]?.userId === socket.userId
        });

        io.to(code).emit('player_joined', {
          players: game.players.map(p => ({
            username: p.username,
            cardCount: p.cards.length
          }))
        });
      });

      // Jouer une carte
      socket.on('play_card', (data) => {
        const { lobbyId, cardIndex, chosenColor } = data;
        const game = games[lobbyId];
        
        if (!game) return;

        const player = game.players.find(p => p.userId === socket.userId);
        if (!player || game.players[game.currentPlayerIndex].userId !== socket.userId) {
          return socket.emit('error', 'Ce n\'est pas votre tour');
        }

        const card = player.cards[cardIndex];
        if (!card) return;

        // Retirer la carte
        player.cards.splice(cardIndex, 1);
        game.discard.push(card);

        // Passer au joueur suivant
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

        // Envoyer la mise à jour à tous
        io.to(lobbyId).emit('card_played', {
          card: card,
          chosenColor: chosenColor,
          players: game.players.map(p => ({
            username: p.username,
            cardCount: p.cards.length
          }))
        });

        io.to(lobbyId).emit('turn_changed', {
          currentPlayer: game.players[game.currentPlayerIndex].username,
          isYourTurn: game.players[game.currentPlayerIndex].userId === socket.userId
        });

        // Vérifier si quelqu'un a gagné
        if (player.cards.length === 0) {
          io.to(lobbyId).emit('game_ended', {
            winner: player.username,
            scores: game.players.map(p => `${p.username}: ${p.cards.length}`)
          });
          delete games[lobbyId];
        }
      });

      // Piocher une carte
      socket.on('draw_card', (data) => {
        const { lobbyId } = data;
        const game = games[lobbyId];
        
        if (!game) return;

        const player = game.players.find(p => p.userId === socket.userId);
        if (!player || game.players[game.currentPlayerIndex].userId !== socket.userId) {
          return;
        }

        if (game.deck.length === 0) {
          // Mélanger la défausse si le deck est vide
          game.deck = shuffleDeck([...game.discard.slice(0, -1)]);
          game.discard = [game.discard[game.discard.length - 1]];
        }

        const newCard = game.deck.pop();
        player.cards.push(newCard);

        socket.emit('hand_updated', {
          cards: player.cards
        });

        // Passer au tour suivant
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        io.to(lobbyId).emit('turn_changed', {
          currentPlayer: game.players[game.currentPlayerIndex].username,
          isYourTurn: game.players[game.currentPlayerIndex].userId === socket.userId
        });
      });

      // Quitter la partie
      socket.on('leave_game', (data) => {
        const game = Object.values(games).find(g => 
          g.players.find(p => p.userId === socket.userId)
        );
        
        if (game) {
          game.players = game.players.filter(p => p.userId !== socket.userId);
          if (game.players.length === 0) {
            delete games[game.code];
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('✗ Joueur déconnecté:', socket.id);
        delete playerSockets[socket.userId];
      });
    });

    return io;
  },
  getIO: () => io
};

// Distribuer les cartes et commencer la partie
function startGame(code) {
  const game = games[code];
  if (!game || game.gameStarted) return;

  game.gameStarted = true;

  // Distribuer 7 cartes à chaque joueur
  game.players.forEach(player => {
    player.cards = [];
    for (let i = 0; i < 7; i++) {
      if (game.deck.length === 0) {
        game.deck = shuffleDeck(createDeck());
      }
      player.cards.push(game.deck.pop());
    }
  });

  // Première carte de la défausse
  if (game.deck.length === 0) {
    game.deck = shuffleDeck(createDeck());
  }
  game.discard.push(game.deck.pop());

  // Envoyer l'état initial à tous les joueurs
  game.players.forEach(player => {
    io.to(player.socketId).emit('game_state', {
      myCards: player.cards,
      currentCard: game.discard[game.discard.length - 1],
      players: game.players.map(p => ({
        username: p.username,
        cardCount: p.cards.length
      })),
      currentPlayer: game.players[game.currentPlayerIndex].username,
      isYourTurn: game.players[game.currentPlayerIndex].userId === player.userId
    });
  });
}
