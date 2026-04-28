// ==================== GAME PAGE ====================

// Vérification auth
if (!checkAuth()) {
    throw new Error('Non authentifié');
}

// Init socket
initSocket();

// Éléments du DOM
const leaveGameBtn         = document.getElementById('leave-game-btn');
const myCardsDiv           = document.getElementById('my-cards');
const currentCardDiv       = document.getElementById('current-card');
const drawBtn              = document.getElementById('draw-btn');
const currentPlayerDisplay = document.getElementById('current-player');
const gameMessageDisplay   = document.getElementById('game-message');
const otherPlayersDiv      = document.getElementById('other-players');
const deckCountSpan        = document.getElementById('deck-count');

// Écran d'attente par défaut
currentPlayerDisplay.innerHTML = 'En attente d\'autres joueurs...';
myCardsDiv.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">La partie démarre à 2 joueurs minimum </p>';

// État du jeu
let gameState = {
    lobbyId:           localStorage.getItem('currentLobbyId'),
    code:              localStorage.getItem('currentLobbyCode'),
    myCards:           [],
    currentCard:       null,
    players:           [],
    currentPlayerName: '',
    isMyTurn:          false
};

// ========== ÉVÉNEMENTS DOM ==========

// Quitter la partie
leaveGameBtn.addEventListener('click', async () => {
    await fetch('/api/lobbies/leave', {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ lobbyId: gameState.lobbyId })
    });
    getSocket().emit('leave_game', { lobbyId: gameState.lobbyId });
    window.location.href = 'lobby.html';
});

// Piocher une carte
drawBtn.addEventListener('click', () => {
    if (gameState.isMyTurn) {
        getSocket().emit('draw_card', { lobbyId: gameState.lobbyId });
    }
});

// Jouer une carte depuis la main
myCardsDiv.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card-hand-item');
    if (!cardEl || !gameState.isMyTurn) return;

    const cardIndex = parseInt(cardEl.dataset.index);
    const card      = gameState.myCards[cardIndex];
    if (!card) return;

    // Joker ou +4 : demander la couleur
    if (card.value === 'wild' || card.value === 'wild-draw4') {
        showColorPicker(cardIndex);
    } else {
        playCard(cardIndex);
    }
});

// ========== ÉVÉNEMENTS SOCKET ==========

// Connexion — s'authentifier
getSocket().on('connect', () => {
    console.log('Connecté au serveur');
    sendAuthToServer();
});

// Authentification confirmée — rejoindre la game
getSocket().on('authenticated', () => {
    console.log('Authentifié, rejoindre la game:', gameState.code);
    getSocket().emit('join_game', { code: gameState.code });
});

// En attente d'autres joueurs
getSocket().on('waiting', ({ message }) => {
    currentPlayerDisplay.innerHTML = `⏳ ${message}`;
});

// Réception de l'état du jeu
getSocket().on('game_state', (state) => {
    console.log('État reçu:', state);
    updateGameState(state);
});

// Une carte a été jouée
getSocket().on('card_played', (data) => {
    gameState.currentCard = data.card;
    gameState.players     = data.players;
    updateDisplay();
});

// Changement de tour
getSocket().on('turn_changed', (data) => {
    gameState.currentPlayerName = data.currentPlayer;
    gameState.isMyTurn          = data.isYourTurn;
    updateDisplay();
});

// Main mise à jour
getSocket().on('hand_updated', (data) => {
    gameState.myCards = data.cards;
    updateDisplay();
});

// Un joueur a rejoint
getSocket().on('player_joined', (data) => {
    gameState.players = data.players;
    updateDisplay();
});

// Fin de partie
getSocket().on('game_ended', (data) => {
    alert(`🎉 ${data.winner} a gagné !\n\n${data.scores.join('\n')}`);
    window.location.href = 'lobby.html';
});

// Erreur serveur
getSocket().on('error', (error) => {
    console.error('Erreur:', error);
    alert('Erreur: ' + error);
});

// ========== FONCTIONS DE JEU ==========

// Jouer une carte
function playCard(cardIndex) {
    getSocket().emit('play_card', {
        lobbyId:     gameState.lobbyId,
        cardIndex:   cardIndex,
        chosenColor: null
    });
}

// Choisir une couleur pour Joker / +4
function showColorPicker(cardIndex) {
    const colors = ['Red', 'Green', 'Blue', 'Yellow'];
    const colorChoice = prompt(`Choisissez une couleur :\n${colors.join(', ')}`);
    if (!colorChoice) return;

    const chosenColor = colors.find(c =>
        c.toLowerCase().startsWith(colorChoice.toLowerCase())
    );

    if (!chosenColor) {
        alert('Couleur invalide');
        return;
    }

    getSocket().emit('play_card', {
        lobbyId:     gameState.lobbyId,
        cardIndex:   cardIndex,
        chosenColor: chosenColor.toLowerCase()
    });
}

// Mettre à jour l'état du jeu
function updateGameState(state) {
    gameState.myCards           = state.myCards       || [];
    gameState.currentCard       = state.currentCard;
    gameState.players           = state.players       || [];
    gameState.currentPlayerName = state.currentPlayer || '';
    gameState.isMyTurn          = state.isYourTurn    || false;

    if (deckCountSpan && state.deckCount !== undefined) {
        deckCountSpan.textContent = state.deckCount;
    }

    updateDisplay();
}

// Mettre à jour l'affichage complet
function updateDisplay() {
    // Carte actuelle sur le talon
    if (gameState.currentCard) {
        const card = gameState.currentCard;
        currentCardDiv.innerHTML = `
            <div class="card-inner" style="background: ${getCardColor(card.color)}">
                <div class="card-front">
                    <span>${getCardDisplay(card)}</span>
                </div>
            </div>
        `;
    }

    // Mes cartes en main
    myCardsDiv.innerHTML = '';
    gameState.myCards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className        = 'card-hand-item';
        cardEl.dataset.index    = index;
        cardEl.style.background = getCardColor(card.color);
        cardEl.innerHTML        = `<span>${getCardDisplay(card)}</span>`;
        myCardsDiv.appendChild(cardEl);
    });

    // Joueur actuel
    const myTurnText = gameState.isMyTurn ? ' ← C\'EST TON TOUR !' : '';
    currentPlayerDisplay.innerHTML =
        `C'est à <strong>${gameState.currentPlayerName}</strong> de jouer${myTurnText}`;

    if (gameState.isMyTurn) {
        currentPlayerDisplay.classList.add('my-turn');
        drawBtn.classList.add('can-draw');
    } else {
        currentPlayerDisplay.classList.remove('my-turn');
        drawBtn.classList.remove('can-draw');
    }

    // Autres joueurs
    updateOtherPlayers();
}

// Afficher les autres joueurs
function updateOtherPlayers() {
    otherPlayersDiv.innerHTML = '';
    const me = localStorage.getItem('username');

    gameState.players.forEach(player => {
        if (player.username === me) return;

        const div = document.createElement('div');
        div.className = 'player-card';
        div.innerHTML = `
            <div class="player-info">
                <strong>${escapeHtml(player.username)}</strong>
                <span class="card-count">${player.cardCount} 🃏</span>
            </div>
        `;
        otherPlayersDiv.appendChild(div);
    });
}

// ========== UTILITAIRES ==========

// Couleur de la carte
function getCardColor(color) {
    const colors = {
        'red':    '#E63946',
        'green':  '#2A9D5C',
        'blue':   '#457B9D',
        'yellow': '#F4A261',
        null:     '#333'
    };
    return colors[color] || '#666';
}

// Symbole de la carte
function getCardDisplay(card) {
    if (!card)                           return '?';
    if (card.value === 'wild')           return '🎨';
    if (card.value === 'wild-draw4')     return '+4';
    if (card.value === 'draw2')          return '+2';
    if (card.value === 'reverse')        return '↩';
    if (card.value === 'skip')           return '⏭';
    return card.value;
}

// Échapper les caractères HTML
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&':  '&amp;',
        '<':  '&lt;',
        '>':  '&gt;',
        '"':  '&quot;',
        "'":  '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ========== INIT ==========
console.log('Game chargée. Lobby:', gameState.code);