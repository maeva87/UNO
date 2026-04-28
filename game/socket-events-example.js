// Exemple d'intégration des événements Socket avec le moteur de jeu
// Ce fichier montre comment utiliser les fonctions d'émission

const engine = require('./game/engine');

// ============ EXEMPLE DE FLUX DE JEU AVEC ÉMISSION D'ÉVÉNEMENTS ============

/**
 * EXEMPLE D'UTILISATION DANS server.js
 * 
 * 1. Lorsque 4 joueurs rejoignent un lobby:
 */

function startGameExample(io, roomId, players) {
    console.log('Démarrage de la partie...');
    
    // Initialiser l'état du jeu
    const gameState = engine.initGameState(players);
    
    // Émettre le démarrage
    engine.emitGameStart(io, roomId, gameState);
    
    // Émettre la distribution des cartes
    engine.emitHandDealt(io, roomId, gameState, gameState.hands);
    
    // Émettre le tour du premier joueur
    engine.emitTurnChanged(io, roomId, gameState);
}

/**
 * 2. Lorsqu'un joueur joue une carte:
 */

function playerPlaysCardExample(io, roomId, gameState, playerId, cardIndex, chosenColor = null) {
    // Jouer la carte
    const result = engine.playCard(playerId, cardIndex, gameState, chosenColor);
    
    if (!result.success) {
        // Coup invalide
        engine.emitInvalidMove(io, playerId, result.error);
        return;
    }
    
    // Coup valide - émettre aux clients
    engine.emitCardPlayed(io, roomId, gameState, playerId, result.cardPlayed, result.effect);
    
    // Si la carte a un effet spécial
    if (result.effect.directionChanged) {
        engine.changeDirection(gameState);
        engine.emitDirectionChanged(io, roomId, gameState);
    }
    
    // Passer au tour suivant
    engine.nextTurn(gameState);
    
    // Si quelqu'un doit piocher des cartes (+2, +4)
    if (result.effect.pendingDraws > 0) {
        const nextPlayer = engine.getCurrentPlayer(gameState);
        engine.drawCards(nextPlayer, result.effect.pendingDraws, gameState);
        engine.emitCardDrawn(io, roomId, nextPlayer, result.effect.pendingDraws);
    }
    
    // Émettre le changement de tour
    engine.emitTurnChanged(io, roomId, gameState);
    
    // Vérifier UNO
    if (gameState.hands[playerId].length === 1 && !gameState.unoCalled[playerId]) {
        // Auto-appel UNO pour éviter la pénalité
        gameState.unoCalled[playerId] = true;
        engine.emitUnoWarning(io, roomId, playerId);
    }
}

/**
 * 3. Lorsqu'un joueur appelle UNO:
 */

function playerCallsUnoExample(io, roomId, gameState, playerId) {
    const result = engine.callUNO(gameState, playerId);
    
    if (result.success) {
        engine.emitUnoCalled(io, roomId, playerId);
    }
}

/**
 * 4. Quand un joueur qui a oublié "UNO" est pénalisé:
 */

function checkMissedUnoExample(io, roomId, gameState, playerId) {
    const penalty = engine.missedUNOPenalty(gameState, playerId);
    
    if (penalty.success) {
        io.to(roomId).emit('game:unoMissedPenalty', {
            timestamp: Date.now(),
            playerId,
            message: penalty.message
        });
        engine.emitCardDrawn(io, roomId, playerId, 2);
    }
}

/**
 * 5. À la fin d'une manche (quand un joueur a 0 cartes):
 */

function endRoundExample(io, roomId, gameState, globalScores, winnerId) {
    // Calculer les scores de fin de manche
    const roundScores = engine.calculateRoundScores(gameState, winnerId);
    
    // Mettre à jour les scores globaux
    engine.updateGlobalScores(globalScores, roundScores);
    
    // Obtenir le classement
    const leaderboard = engine.getLeaderboard(globalScores);
    
    // Émettre la fin de manche
    engine.emitRoundEnded(io, roomId, roundScores, leaderboard);
    
    // Vérifier si la partie est terminée (500+ points)
    if (leaderboard[0].score >= 500) {
        engine.emitGameEnded(io, roomId, leaderboard, leaderboard[0]);
        return true; // Partie terminée
    }
    
    return false; // Continuer avec une nouvelle manche
}

// ============ ÉVÉNEMENTS À ÉCOUTER CÔTÉ CLIENT ============

/**
 * RÉSUMÉ DES ÉVÉNEMENTS ÉMIS:
 * 
 * game:start - La partie commence
 *   Data: { gameState, message }
 * 
 * game:handDealt - Les cartes sont distribuées
 *   Data: { message, topCard }
 *   Private: game:yourHand:{playerId} avec { hand }
 * 
 * game:cardPlayed - Une carte a été jouée
 *   Data: { playerId, cardPlayed, topCard, gameState, effect }
 * 
 * game:cardDrawn - Un joueur a pioché
 *   Data: { playerId, numberOfCards, message }
 * 
 * game:turnChanged - C'est le tour du joueur suivant
 *   Data: { currentPlayer, currentPlayerIndex, gameState, message }
 * 
 * game:directionChanged - Inversion du sens de jeu
 *   Data: { direction, directionText, message }
 * 
 * game:playerSkipped - Un joueur passe
 *   Data: { playerId, message }
 * 
 * game:unoWarning - Alerte UNO (attention 1 carte!)
 *   Data: { playerId, message }
 * 
 * game:unoCalled - UNO a été annoncé
 *   Data: { playerId, message }
 * 
 * game:roundEnded - Fin de manche
 *   Data: { roundScores, winner, leaderboard, message }
 * 
 * game:gameEnded - Fin de partie
 *   Data: { winner, leaderboard, message }
 * 
 * error:invalidMove - Coup invalide
 *   Data: { error, message } (envoyé au joueur uniquement)
 * 
 * game:update - Mise à jour générale du jeu
 *   Data: { gameState }
 */

module.exports = {
    startGameExample,
    playerPlaysCardExample,
    playerCallsUnoExample,
    checkMissedUnoExample,
    endRoundExample
};
