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

module.exports = { createDeck, shuffleDeck, dealCards, isValidMove };
