// game/engine.js

const COLORS = ['red', 'green', 'blue', 'yellow'];
const SPECIALS = ['draw2', 'reverse', 'skip'];

function createDeck() {
    const deck = [];

    COLORS.forEach(color => {
        // Le 0 une seule fois par couleur
        deck.push({ color, value: 0 });

        // Les 1-9 deux fois par couleur
        for (let i = 1; i <= 9; i++) {
            deck.push({ color, value: i });
            deck.push({ color, value: i });
        }

        // Les cartes spéciales deux fois par couleur
        SPECIALS.forEach(special => {
            deck.push({ color, value: special });
            deck.push({ color, value: special });
        });
    });

    // Les jokers et +4 (4 de chaque, sans couleur)
    for (let i = 0; i < 4; i++) {
        deck.push({ color: null, value: 'wild' });
        deck.push({ color: null, value: 'wild-draw4' });
    }

    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCards(players) {
    // Crée et mélange le deck
    let deck = createDeck();
    deck = shuffleDeck(deck);

    // Initialise les mains de chaque joueur
    const hands = {};
    players.forEach(playerId => {
        hands[playerId] = [];
    });

    // Distribue 7 cartes à chaque joueur
    for (let i = 0; i < 7; i++) {
        players.forEach(playerId => {
            hands[playerId].push(deck.pop());
        });
    }

    // La première carte du talon (ne pas en prendre une spéciale en début)
    let discardPile = [];
    let topCard = deck.pop();
    
    // Relancer une carte si c'est une carte spéciale (Wild ou Wild+4)
    while (topCard.color === null) {
        deck.push(topCard);
        deck = shuffleDeck(deck);
        topCard = deck.pop();
    }
    
    discardPile.push(topCard);

    return {
        hands,           // { playerId: [card, card, ...] }
        drawPile: deck,  // Cartes restantes à piocher
        discardPile,     // Défausse (talon)
        topCard,         // Dernière carte de la défausse
    };
}

function isValidMove(cardToPlay, topCard) {
    // Les Wild et Wild+4 peuvent être jouées sur n'importe quelle carte
    if (cardToPlay.value === 'wild' || cardToPlay.value === 'wild-draw4') {
        return true;
    }

    // Si la topCard n'a pas de couleur (Wild jouée), il faut attendre que la couleur soit choisie
    // Dans ce cas, la couleur est stockée différemment ou pas encore définie
    // Pour l'instant, on suppose que topCard a toujours une couleur valide
    
    // Règle 1 : Même couleur
    if (cardToPlay.color === topCard.color) {
        return true;
    }

    // Règle 2 : Même valeur/symbole (chiffre ou carte spéciale)
    if (cardToPlay.value === topCard.value) {
        return true;
    }

    // Coup invalide
    return false;
}

function applyCardEffect(card, gameState) {
    // gameState contient : { currentPlayer, players, direction, pendingDraws, hands, drawPile }
    // Retourne les modifications à appliquer
    
    const effect = {
        skipNextTurn: false,
        directionChanged: false,
        pendingDraws: 0,
        colorChosen: null,
    };

    switch (card.value) {
        case 'draw2':
            // +2 : Le joueur suivant pioche 2 cartes et passe
            effect.pendingDraws = 2;
            effect.skipNextTurn = true;
            break;

        case 'wild-draw4':
            // +4 : Le joueur suivant pioche 4 cartes, passe, et on choisit une couleur
            effect.pendingDraws = 4;
            effect.skipNextTurn = true;
            // La couleur sera choisie par le joueur en cours
            break;

        case 'reverse':
            // Inversion : Change la direction
            effect.directionChanged = true;
            break;

        case 'skip':
            // Passer : Le joueur suivant passe son tour
            effect.skipNextTurn = true;
            break;

        case 'wild':
            // Joker : Le joueur choisit une couleur (à faire côté client)
            // Ici on marque juste qu'il faut choisir une couleur
            break;

        default:
            // Cartes normales : pas d'effet
            break;
    }

    return effect;
}

function drawCards(playerId, numberOfCards, gameState) {
    // Pioche numberOfCards cartes pour le joueur
    const cardsDrawn = [];

    for (let i = 0; i < numberOfCards; i++) {
        if (gameState.drawPile.length === 0) {
            // Réinitialiser la pioche avec la défausse (sauf la première carte)
            if (gameState.discardPile.length > 1) {
                const topCard = gameState.discardPile[gameState.discardPile.length - 1];
                gameState.drawPile = gameState.discardPile.slice(0, -1);
                gameState.drawPile = shuffleDeck(gameState.drawPile);
                gameState.discardPile = [topCard];
            } else {
                // Pas assez de cartes (cas extrême)
                break;
            }
        }
        const card = gameState.drawPile.pop();
        gameState.hands[playerId].push(card);
        cardsDrawn.push(card);
    }

    return cardsDrawn;
}

function playCard(playerId, cardIndex, gameState, chosenColor = null) {
    // Joue une carte de la main d'un joueur
    // Retourne l'état mis à jour et les effets

    const card = gameState.hands[playerId][cardIndex];

    if (!isValidMove(card, gameState.topCard)) {
        return { success: false, error: 'Coup invalide' };
    }

    // Retirer la carte de la main
    gameState.hands[playerId].splice(cardIndex, 1);

    // Ajouter à la défausse
    gameState.discardPile.push(card);

    // Mettre à jour la carte visible
    let topCardToDisplay = card;
    if (card.value === 'wild' && chosenColor) {
        topCardToDisplay = { ...card, color: chosenColor };
    } else if (card.value === 'wild-draw4' && chosenColor) {
        topCardToDisplay = { ...card, color: chosenColor };
    }
    gameState.topCard = topCardToDisplay;

    // Appliquer l'effet de la carte
    const effect = applyCardEffect(card, gameState);

    return { success: true, effect, cardPlayed: card };
}

function initGameState(players) {
    // Initialise l'état du jeu avec tous les paramètres nécessaires
    const gameData = dealCards(players);

    return {
        players,                    // Array de IDs: [player1, player2, player3, player4]
        hands: gameData.hands,      // Mains de chaque joueur
        drawPile: gameData.drawPile,
        discardPile: gameData.discardPile,
        topCard: gameData.topCard,
        
        currentPlayerIndex: 0,      // Index du joueur actuel
        direction: 1,               // 1 = horaire, -1 = anti-horaire
        
        pendingDraws: 0,            // Cartes à piocher en attente (+2, +4)
        skipNextTurn: false,        // Le prochain joueur passe-t-il ?
        
        unoCalled: {},              // { playerId: true/false } - UNO annoncé ?
    };
}

function getCurrentPlayer(gameState) {
    // Retourne l'ID du joueur actuel
    return gameState.players[gameState.currentPlayerIndex];
}

function getNextPlayerIndex(gameState) {
    // Calcule l'index du prochain joueur selon la direction
    let nextIndex = gameState.currentPlayerIndex + gameState.direction;
    
    // Boucler autour du tableau
    if (nextIndex >= gameState.players.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = gameState.players.length - 1;
    }
    
    return nextIndex;
}

function changeDirection(gameState) {
    // Inverse la direction du jeu
    gameState.direction = gameState.direction * -1;
}

function nextTurn(gameState) {
    // Passe au tour suivant en tenant compte des skips et des effets
    
    // Si le joueur actuel avait UNO mais a joué, réinitialiser
    gameState.unoCalled[getCurrentPlayer(gameState)] = false;
    
    // Appliquer les skips en attente
    let skipsRemaining = gameState.skipNextTurn ? 1 : 0;
    gameState.skipNextTurn = false;
    
    // Passer les tours à sauter
    while (skipsRemaining > 0) {
        gameState.currentPlayerIndex = getNextPlayerIndex(gameState);
        skipsRemaining--;
    }
    
    // Aller au joueur suivant
    gameState.currentPlayerIndex = getNextPlayerIndex(gameState);
    
    // Appliquer les pioches en attente
    if (gameState.pendingDraws > 0) {
        const nextPlayer = getCurrentPlayer(gameState);
        drawCards(nextPlayer, gameState.pendingDraws, gameState);
        gameState.pendingDraws = 0;
        
        // Ce joueur passe son tour après avoir pioché des cartes +2/+4
        gameState.currentPlayerIndex = getNextPlayerIndex(gameState);
    }
}

function checkUNO(gameState, playerId) {
    // Vérifie si un joueur a exactement 1 carte en main (doit dire UNO!)
    const playerHandSize = gameState.hands[playerId].length;
    return playerHandSize === 1;
}

function callUNO(gameState, playerId) {
    // Le joueur appelle UNO
    if (gameState.hands[playerId].length === 1) {
        gameState.unoCalled[playerId] = true;
        return { success: true, message: 'UNO!' };
    }
    return { success: false, message: 'Ce joueur n\'a pas 1 seule carte' };
}

function missedUNOPenalty(gameState, playerId) {
    // Pénalité : le joueur a oublié de dire UNO, il pioche 2 cartes
    if (gameState.hands[playerId].length === 1 && !gameState.unoCalled[playerId]) {
        drawCards(playerId, 2, gameState);
        return { success: true, message: 'Pénalité : 2 cartes piochées pour UNO manué' };
    }
    return { success: false, message: 'Pas de pénalité applicable' };
}

function calculateCardScore(card) {
    // Calcule les points d'une seule carte selon les règles UNO
    
    if (typeof card.value === 'number') {
        // Cartes numérotées (0-9) : valeurexacte
        return card.value;
    }
    
    switch (card.value) {
        case 'draw2':
            // +2 : 20 points
            return 20;
        case 'reverse':
            // Inversion : 20 points
            return 20;
        case 'skip':
            // Passer : 20 points
            return 20;
        case 'wild':
            // Joker : 50 points
            return 50;
        case 'wild-draw4':
            // +4 : 50 points
            return 50;
        default:
            return 0;
    }
}

function calculateHandScore(hand) {
    // Calcule le score total d'une main (cartes restantes)
    return hand.reduce((total, card) => total + calculateCardScore(card), 0);
}

function calculateRoundScores(gameState, winnerId) {
    // Calcule les scores pour la fin d'une manche
    // Le gagnant accumule les points de tous les autres joueurs
    
    const roundScores = {};
    let totalPoints = 0;

    // Initialiser les scores
    gameState.players.forEach(playerId => {
        roundScores[playerId] = 0;
    });

    // Calculer les points de chaque joueur (sauf le gagnant)
    gameState.players.forEach(playerId => {
        if (playerId !== winnerId) {
            const handScore = calculateHandScore(gameState.hands[playerId]);
            roundScores[playerId] = handScore;
            totalPoints += handScore;
        }
    });

    // Le gagnant reçoit tous les points
    roundScores[winnerId] = totalPoints;

    return {
        roundScores,      // { playerId: points dans cette manche }
        winner: winnerId,
        totalPointsPlayed: totalPoints
    };
}

function updateGlobalScores(globalScores, roundScores) {
    // Met à jour les scores globaux avec les points de la manche
    Object.keys(roundScores.roundScores).forEach(playerId => {
        if (!globalScores[playerId]) {
            globalScores[playerId] = 0;
        }
        globalScores[playerId] += roundScores.roundScores[playerId];
    });
    
    return globalScores;
}

function getLeaderboard(globalScores) {
    // Retourne l'ordre des joueurs par scores (du plus bas au plus haut)
    // En UNO, le but est d'atteindre 500 points, plus haut score gagne
    return Object.entries(globalScores)
        .sort((a, b) => b[1] - a[1])
        .map(([playerId, score]) => ({ playerId, score }));
}

// ============ ÉMISSION DES ÉVÉNEMENTS SOCKET ============

function getPublicGameState(gameState) {
    // Retourne un état du jeu adapté pour la transmission aux clients
    // (ne pas révéler les cartes des autres joueurs)
    
    return {
        players: gameState.players,
        currentPlayerIndex: gameState.currentPlayerIndex,
        currentPlayer: getCurrentPlayer(gameState),
        direction: gameState.direction,
        topCard: gameState.topCard,
        drawPileSize: gameState.drawPile.length,
        discardPileSize: gameState.discardPile.length,
        playerHandSizes: Object.keys(gameState.hands).reduce((acc, playerId) => {
            acc[playerId] = gameState.hands[playerId].length;
            return acc;
        }, {}),
        unoCalled: gameState.unoCalled,
    };
}

function emitGameStart(io, roomId, gameState) {
    // Émettre le démarrage du jeu
    io.to(roomId).emit('game:start', {
        timesamp: Date.now(),
        gameState: getPublicGameState(gameState),
        message: `La partie commence! ${getCurrentPlayer(gameState)} commence.`
    });
}

function emitHandDealt(io, roomId, gameState, hands) {
    // Émettre la distribution des cartes
    // "hands" est un objet { playerId: [cartes du joueur] }
    
    io.to(roomId).emit('game:handDealt', {
        timestamp: Date.now(),
        message: 'Les cartes ont été distribuées!',
        topCard: gameState.topCard
    });
    
    // Envoyer les cartes en main à chaque joueur (privé)
    Object.entries(hands).forEach(([playerId, playerHand]) => {
        io.to(roomId).emit(`game:yourHand:${playerId}`, {
            hand: playerHand
        });
    });
}

function emitCardPlayed(io, roomId, gameState, playerId, cardPlayed, effect) {
    // Émettre qu'une carte a été jouée
    
    io.to(roomId).emit('game:cardPlayed', {
        timestamp: Date.now(),
        playerId,
        cardPlayed,
        topCard: gameState.topCard,
        gameState: getPublicGameState(gameState),
        effect: {
            pendingDraws: effect.pendingDraws,
            skipNextTurn: effect.skipNextTurn,
            directionChanged: effect.directionChanged
        }
    });
}

function emitCardDrawn(io, roomId, playerId, numberOfCards) {
    // Émettre qu'un joueur a pioché des cartes
    
    io.to(roomId).emit('game:cardDrawn', {
        timestamp: Date.now(),
        playerId,
        numberOfCards,
        message: `${playerId} a pioché ${numberOfCards} carte(s)`
    });
}

function emitTurnChanged(io, roomId, gameState) {
    // Émettre que c'est le tour du joueur suivant
    
    io.to(roomId).emit('game:turnChanged', {
        timestamp: Date.now(),
        currentPlayer: getCurrentPlayer(gameState),
        currentPlayerIndex: gameState.currentPlayerIndex,
        gameState: getPublicGameState(gameState),
        message: `C'est au tour de ${getCurrentPlayer(gameState)}`
    });
}

function emitDirectionChanged(io, roomId, gameState) {
    // Émettre que la direction a changé
    
    const directionText = gameState.direction === 1 ? 'Horaire' : 'Anti-horaire';
    io.to(roomId).emit('game:directionChanged', {
        timestamp: Date.now(),
        direction: gameState.direction,
        directionText,
        message: `La direction a changé! Maintenant ${directionText}`
    });
}

function emitPlayerSkipped(io, roomId, skippedPlayerId) {
    // Émettre qu'un joueur a été sauté
    
    io.to(roomId).emit('game:playerSkipped', {
        timestamp: Date.now(),
        playerId: skippedPlayerId,
        message: `${skippedPlayerId} passe son tour!`
    });
}

function emitUnoWarning(io, roomId, playerId) {
    // Émettre une alerte UNO (un joueur a 1 seule carte)
    
    io.to(roomId).emit('game:unoWarning', {
        timestamp: Date.now(),
        playerId,
        message: `Attention! ${playerId} n'a plus qu'une carte!`
    });
}

function emitUnoCalled(io, roomId, playerId) {
    // Émettre qu'un joueur a appelé UNO
    
    io.to(roomId).emit('game:unoCalled', {
        timestamp: Date.now(),
        playerId,
        message: `${playerId} a crié UNO!`
    });
}

function emitRoundEnded(io, roomId, roundScores, leaderboard) {
    // Émettre la fin de la manche
    
    io.to(roomId).emit('game:roundEnded', {
        timestamp: Date.now(),
        roundScores: roundScores.roundScores,
        winner: roundScores.winner,
        leaderboard,
        message: `La manche est terminée! ${roundScores.winner} a remporté ${roundScores.roundScores[roundScores.winner]} points!`
    });
}

function emitGameEnded(io, roomId, leaderboard, winner) {
    // Émettre la fin du jeu
    
    io.to(roomId).emit('game:gameEnded', {
        timestamp: Date.now(),
        winner,
        leaderboard,
        message: `La partie est terminée! Gagnant: ${winner.playerId} avec ${winner.score} points!`
    });
}

function emitInvalidMove(io, playerId, error) {
    // Émettre une erreur de coup invalide (privé au joueur)
    
    io.to(playerId).emit('error:invalidMove', {
        timestamp: Date.now(),
        error,
        message: 'Coup invalide! ' + error
    });
}

function emitGameUpdate(io, roomId, gameState) {
    // Émettre une mise à jour générale de l'état du jeu
    
    io.to(roomId).emit('game:update', {
        timestamp: Date.now(),
        gameState: getPublicGameState(gameState)
    });
}

module.exports = { 
    createDeck, 
    shuffleDeck, 
    dealCards, 
    isValidMove, 
    applyCardEffect, 
    drawCards, 
    playCard,
    initGameState,
    getCurrentPlayer,
    getNextPlayerIndex,
    changeDirection,
    nextTurn,
    checkUNO,
    callUNO,
    missedUNOPenalty,
    calculateCardScore,
    calculateHandScore,
    calculateRoundScores,
    updateGlobalScores,
    getLeaderboard,
    getPublicGameState,
    emitGameStart,
    emitHandDealt,
    emitCardPlayed,
    emitCardDrawn,
    emitTurnChanged,
    emitDirectionChanged,
    emitPlayerSkipped,
    emitUnoWarning,
    emitUnoCalled,
    emitRoundEnded,
    emitGameEnded,
    emitInvalidMove,
    emitGameUpdate
};
