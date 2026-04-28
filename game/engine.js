// ==================== MOTEUR DE JEU UNO ====================

const COLORS   = ['red', 'green', 'blue', 'yellow'];
const SPECIALS = ['draw2', 'reverse', 'skip'];

// Créer un deck complet de 108 cartes
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

        // Cartes spéciales deux fois par couleur
        SPECIALS.forEach(special => {
            deck.push({ color, value: special });
            deck.push({ color, value: special });
        });
    });

    // Jokers et +4 (4 de chaque, sans couleur)
    for (let i = 0; i < 4; i++) {
        deck.push({ color: null, value: 'wild' });
        deck.push({ color: null, value: 'wild-draw4' });
    }

    return deck;
}

// Mélanger le deck
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Créer l'état initial d'une partie
function createGameState(players) {
    const deck = shuffleDeck(createDeck());

    // Distribuer 7 cartes à chaque joueur
    const hands = {};
    players.forEach(p => {
        hands[p.userId] = deck.splice(0, 7);
    });

    // Première carte du talon (pas de wild ni +4)
    let firstCard;
    do {
        firstCard = deck.splice(0, 1)[0];
        if (firstCard.value === 'wild' || firstCard.value === 'wild-draw4') {
            deck.push(firstCard); // remettre en bas
        } else {
            break;
        }
    } while (true);

    return {
        deck,
        discard:       [firstCard],
        hands,
        players,
        currentIndex:  0,
        direction:     1, // 1 = sens horaire, -1 = inverse
        currentColor:  firstCard.color,
    };
}

// Vérifier si une carte est jouable
function isPlayable(card, topCard, currentColor) {
    if (card.value === 'wild' || card.value === 'wild-draw4') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
}

// Passer au joueur suivant
function nextPlayer(state, skip = false) {
    let steps = skip ? 2 : 1;
    state.currentIndex = (state.currentIndex + state.direction * steps + state.players.length) % state.players.length;
}

// Jouer une carte
function playCard(state, userId, cardIndex, chosenColor = null) {
    const hand    = state.hands[userId];
    const card    = hand[cardIndex];
    const topCard = state.discard[state.discard.length - 1];

    if (!card) return { success: false, error: 'Carte invalide' };
    if (!isPlayable(card, topCard, state.currentColor)) return { success: false, error: 'Carte non jouable' };

    // Jouer la carte
    hand.splice(cardIndex, 1);
    state.discard.push(card);

    // Appliquer les effets
    if (card.value === 'wild' || card.value === 'wild-draw4') {
        state.currentColor = chosenColor || 'red';
    } else {
        state.currentColor = card.color;
    }

    if (card.value === 'reverse') {
        state.direction *= -1;
        if (state.players.length === 2) nextPlayer(state); // en 2 joueurs = skip
    }

    if (card.value === 'skip') {
        nextPlayer(state, true);
    } else if (card.value === 'draw2') {
        const nextIdx = (state.currentIndex + state.direction + state.players.length) % state.players.length;
        const nextPlayerId = state.players[nextIdx].userId;
        drawCards(state, nextPlayerId, 2);
        nextPlayer(state, true);
    } else if (card.value === 'wild-draw4') {
        const nextIdx = (state.currentIndex + state.direction + state.players.length) % state.players.length;
        const nextPlayerId = state.players[nextIdx].userId;
        drawCards(state, nextPlayerId, 4);
        nextPlayer(state, true);
    } else {
        nextPlayer(state);
    }

    // Vérifier si le joueur a gagné
    const won = hand.length === 0;

    return { success: true, card, won };
}

// Piocher des cartes
function drawCards(state, userId, count = 1) {
    for (let i = 0; i < count; i++) {
        if (state.deck.length === 0) {
            // Recycler la défausse
            const top = state.discard.pop();
            state.deck = shuffleDeck(state.discard);
            state.discard = [top];
        }
        if (state.deck.length > 0) {
            state.hands[userId].push(state.deck.splice(0, 1)[0]);
        }
    }
}

// Calculer les scores (cartes restantes des perdants)
function calculateScores(state, winnerId) {
    const scores = {};
    state.players.forEach(p => {
        if (p.userId === winnerId) {
            scores[p.username] = 0;
        } else {
            scores[p.username] = state.hands[p.userId].reduce((sum, card) => {
                if (card.value === 'wild' || card.value === 'wild-draw4') return sum + 50;
                if (['draw2', 'reverse', 'skip'].includes(card.value)) return sum + 20;
                return sum + card.value;
            }, 0);
        }
    });
    return scores;
}

module.exports = { createDeck, shuffleDeck, createGameState, playCard, drawCards, calculateScores };