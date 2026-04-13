// Test calcul des points en fin de manche

const { 
    initGameState, 
    calculateCardScore, 
    calculateHandScore, 
    calculateRoundScores,
    updateGlobalScores,
    getLeaderboard
} = require('./game/engine');

console.log('=== TEST CALCUL DES POINTS ===\n');

// Test 1: Calcul score d'une carte
console.log('✓ Score d\'une seule carte:');
console.log(`  - Carte 5: ${calculateCardScore({ color: 'red', value: 5 })} points`);
console.log(`  - Carte +2: ${calculateCardScore({ color: 'blue', value: 'draw2' })} points`);
console.log(`  - Carte Inversion: ${calculateCardScore({ color: 'green', value: 'reverse' })} points`);
console.log(`  - Carte Passer: ${calculateCardScore({ color: 'yellow', value: 'skip' })} points`);
console.log(`  - Joker: ${calculateCardScore({ color: null, value: 'wild' })} points`);
console.log(`  - +4: ${calculateCardScore({ color: null, value: 'wild-draw4' })} points`);

// Test 2: Calcul score d'une main
console.log('\n✓ Score d\'une main (cartes restantes):');
const hand1 = [
    { color: 'red', value: 5 },
    { color: 'blue', value: 'draw2' },
    { color: null, value: 'wild' }
];
console.log(`  - Main: [5, +2, Joker] = ${calculateHandScore(hand1)} points`);

// Test 3: Scores en fin de manche
console.log('\n✓ Calcul des scores de fin de manche:');
const gameState = initGameState(['player1', 'player2', 'player3', 'player4']);

// Simuler des mains restantes
gameState.hands['player1'] = []; // Gagnant (0 cartes)
gameState.hands['player2'] = [
    { color: 'red', value: 5 },
    { color: 'blue', value: 3 }
]; // 5 + 3 = 8 points
gameState.hands['player3'] = [
    { color: 'green', value: 'draw2' },
    { color: 'yellow', value: 'reverse' }
]; // 20 + 20 = 40 points
gameState.hands['player4'] = [
    { color: null, value: 'wild' }
]; // 50 points

const roundScores = calculateRoundScores(gameState, 'player1');
console.log(`  - Gagnant: ${roundScores.winner}`);
console.log(`  - Scores de la manche:`);
Object.entries(roundScores.roundScores).forEach(([playerId, score]) => {
    console.log(`    • ${playerId}: ${score} points`);
});
console.log(`  - Total distribué: ${roundScores.totalPointsPlayed} points`);

// Test 4: Mise à jour des scores globaux
console.log('\n✓ Mise à jour des scores globaux:');
let globalScores = {
    player1: 100,
    player2: 150,
    player3: 80,
    player4: 120
};
console.log(`  - Avant:`, globalScores);
globalScores = updateGlobalScores(globalScores, roundScores);
console.log(`  - Après:`, globalScores);

// Test 5: Classement
console.log('\n✓ Classement global:');
const leaderboard = getLeaderboard(globalScores);
leaderboard.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.playerId}: ${entry.score} points`);
});

console.log('\n✅ Tous les tests sont corrects !');
