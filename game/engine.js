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

module.exports = { createDeck, shuffleDeck };
