const COLORS   = ['red', 'green', 'blue', 'yellow'];
const SPECIALS = ['draw2', 'reverse', 'skip'];

function createDeck() {
    const deck = [];
    let cardId = 0;

    for (let i = 0; i < COLORS.length; i++) {
        const color = COLORS[i];

        deck.push({ id: 'c' + cardId, color: color, value: '0' });
        cardId++;

        for (let n = 1; n <= 9; n++) {
            deck.push({ id: 'c' + cardId, color: color, value: String(n) });
            cardId++;
            deck.push({ id: 'c' + cardId, color: color, value: String(n) });
            cardId++;
        }

        for (let j = 0; j < SPECIALS.length; j++) {
            deck.push({ id: 'c' + cardId, color: color, value: SPECIALS[j] });
            cardId++;
            deck.push({ id: 'c' + cardId, color: color, value: SPECIALS[j] });
            cardId++;
        }
    }

    for (let i = 0; i < 4; i++) {
        deck.push({ id: 'c' + cardId, color: 'wild', value: 'wild' });
        cardId++;
        deck.push({ id: 'c' + cardId, color: 'wild', value: 'draw4' });
        cardId++;
    }

    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    return deck;
}

function initGame(players) {
    const deck = shuffleDeck(createDeck());

    const hands = {};
    for (let i = 0; i < players.length; i++) {
        hands[players[i].id] = deck.splice(0, 7);
    }

    let topCard = null;
    while (topCard === null) {
        const card = deck.shift();
        if (card.value === 'draw4') {
            deck.push(card);
        } else {
            topCard = card;
        }
    }

    const game = {
        players:            players,
        deck:               deck,
        hands:              hands,
        topCard:            topCard,
        currentPlayerIndex: 0,
        direction:          1,
        activeColor:        topCard.color,
    };

    return game;
}

function getPlayerState(game, playerId) {
    const currentPlayer = game.players[game.currentPlayerIndex];

    const playersList = [];
    for (let i = 0; i < game.players.length; i++) {
        const p = game.players[i];
        playersList.push({
            id:        p.id,
            username:  p.username,
            cardCount: game.hands[p.id].length,
        });
    }

    const state = {
        currentPlayerId: currentPlayer.id,
        direction:       game.direction === 1 ? 'CW' : 'CCW',
        topCard:         { id: game.topCard.id, color: game.activeColor, value: game.topCard.value },
        deckSize:        game.deck.length,
        players:         playersList,
        hand:            game.hands[playerId] || [],
    };

    return state;
}

function canPlayCard(card, topCard, activeColor) {
    if (card.color === 'wild') {
        return true;
    }
    if (card.color === activeColor) {
        return true;
    }
    if (card.value === topCard.value) {
        return true;
    }
    return false;
}

function getNextIndex(game, skip) {
    const total = game.players.length;
    let steps = 1;
    if (skip === true) {
        steps = 2;
    }
    const next = ((game.currentPlayerIndex + game.direction * steps) % total + total) % total;
    return next;
}

function applyCardEffect(game, cardValue, chosenColor) {
    if (cardValue === 'reverse') {
        game.direction = game.direction * -1;
        if (game.players.length === 2) {
            game.currentPlayerIndex = getNextIndex(game, true);
        } else {
            game.currentPlayerIndex = getNextIndex(game, false);
        }

    } else if (cardValue === 'skip') {
        game.currentPlayerIndex = getNextIndex(game, true);

    } else if (cardValue === 'draw2') {
        const nextIndex  = getNextIndex(game, false);
        const victimId   = game.players[nextIndex].id;
        const drawnCards = game.deck.splice(0, 2);
        for (let i = 0; i < drawnCards.length; i++) {
            game.hands[victimId].push(drawnCards[i]);
        }
        game.currentPlayerIndex = getNextIndex(game, true);

    } else if (cardValue === 'draw4') {
        const nextIndex  = getNextIndex(game, false);
        const victimId   = game.players[nextIndex].id;
        const drawnCards = game.deck.splice(0, 4);
        for (let i = 0; i < drawnCards.length; i++) {
            game.hands[victimId].push(drawnCards[i]);
        }
        if (chosenColor) {
            game.activeColor = chosenColor;
        }
        game.currentPlayerIndex = getNextIndex(game, true);

    } else if (cardValue === 'wild') {
        if (chosenColor) {
            game.activeColor = chosenColor;
        }
        game.currentPlayerIndex = getNextIndex(game, false);

    } else {
        game.currentPlayerIndex = getNextIndex(game, false);
    }
}

function checkWinner(game, playerId) {
    if (game.hands[playerId].length === 0) {
        return true;
    }
    return false;
}

function computeScores(game) {
    const scores = [];

    for (let i = 0; i < game.players.length; i++) {
        const player = game.players[i];
        const hand   = game.hands[player.id];
        let total    = 0;

        for (let j = 0; j < hand.length; j++) {
            const card = hand[j];
            if (card.color === 'wild') {
                total = total + 50;
            } else if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2' || card.value === 'draw4') {
                total = total + 20;
            } else {
                total = total + parseInt(card.value, 10);
            }
        }

        scores.push({ username: player.username, score: total });
    }

    return scores;
}

function ensureDeck(game) {
    if (game.deck.length === 0) {
        game.deck = shuffleDeck(createDeck());
    }
}

module.exports = {
    initGame:        initGame,
    getPlayerState:  getPlayerState,
    canPlayCard:     canPlayCard,
    applyCardEffect: applyCardEffect,
    checkWinner:     checkWinner,
    computeScores:   computeScores,
    ensureDeck:      ensureDeck,
};
