// ==================== GAME PAGE ====================

if (!checkAuth()) {
    throw new Error('Non authentifié');
}

const socket = initSocket();
const leaveGameBtn = document.getElementById('leave-game-btn');
const myCardsDiv = document.getElementById('my-cards');
const currentCardDiv = document.getElementById('current-card');
const drawBtn = document.getElementById('draw-btn');
const currentPlayerDisplay = document.getElementById('current-player');
const gameMessageDisplay = document.getElementById('game-message');
const otherPlayersDiv = document.getElementById('other-players');
const deckCountSpan = document.getElementById('deck-count');

let gameState = {
    lobbyId: localStorage.getItem('currentLobbyId'),
    code: localStorage.getItem('currentLobbyCode'),
    myCards: [],
    currentCard: null,
    players: [],
    currentPlayerName: '',
    isMyTurn: false
};

// ========== EVENT LISTENERS ==========

leaveGameBtn.addEventListener('click', () => {
    socket.emit('leave_game', { lobbyId: gameState.lobbyId });
    window.location.href = 'lobby.html';
});

drawBtn.addEventListener('click', () => {
    if (gameState.isMyTurn) {
        socket.emit('draw_card', { lobbyId: gameState.lobbyId });
    }
});

myCardsDiv.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card-hand-item');
    if (!cardEl || !gameState.isMyTurn) return;

    const cardIndex = parseInt(cardEl.dataset.index);
    const card = gameState.myCards[cardIndex];

    if (!card) return;

    // Si c'est un Joker ou +4, demander la couleur
    if (card.value === 'wild' || card.value === 'wild-draw4') {
        showColorPicker(cardIndex, card);
    } else {
        playCard(cardIndex);
    }
});

// ========== SOCKET EVENTS ==========

socket.on('connect', () => {
    console.log('Connecté. Rejoignant la game:', gameState.code);
    sendAuthToServer();
    socket.emit('join_game', { code: gameState.code });
});

socket.on('game_state', (state) => {
    console.log('État du jeu reçu:', state);
    updateGameState(state);
});

socket.on('card_played', (data) => {
    console.log('Carte jouée:', data);
    gameState.currentCard = data.card;
    gameState.players = data.players;
    updateDisplay();
});

socket.on('turn_changed', (data) => {
    gameState.currentPlayerName = data.currentPlayer;
    gameState.isMyTurn = data.isYourTurn;
    updateDisplay();
});

socket.on('hand_updated', (data) => {
    gameState.myCards = data.cards;
    updateDisplay();
});

socket.on('player_joined', (data) => {
    console.log('Joueur rejoint:', data);
    gameState.players = data.players;
    updateDisplay();
});

socket.on('game_ended', (data) => {
    alert(`🎉 ${data.winner} a gagné la partie!\n\nScore: ${data.scores.join(', ')}`);
    window.location.href = 'lobby.html';
});

socket.on('error', (error) => {
    console.error('Erreur:', error);
    alert('Erreur: ' + error);
});

// ========== FONCTIONS DE JEU ==========

function playCard(cardIndex) {
    const card = gameState.myCards[cardIndex];
    if (!card) return;

    socket.emit('play_card', {
        lobbyId: gameState.lobbyId,
        cardIndex: cardIndex,
        chosenColor: null
    });
}

function showColorPicker(cardIndex, card) {
    const colors = ['Red', 'Green', 'Blue', 'Yellow'];
    let colorChoice = prompt(`Choisissez une couleur:\n${colors.join(', ')}`);
    
    if (!colorChoice) return;

    const chosenColor = colors.find(c => c.toLowerCase().startsWith(colorChoice.toLowerCase()));
    
    if (!chosenColor) {
        alert('Couleur invalide');
        return;
    }

    socket.emit('play_card', {
        lobbyId: gameState.lobbyId,
        cardIndex: cardIndex,
        chosenColor: chosenColor.toLowerCase()
    });
}

function updateGameState(state) {
    gameState.myCards = state.myCards || [];
    gameState.currentCard = state.currentCard;
    gameState.players = state.players || [];
    gameState.currentPlayerName = state.currentPlayer || '';
    gameState.isMyTurn = state.isYourTurn || false;
    updateDisplay();
}

function updateDisplay() {
    // Afficher la carte actuelle
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

    // Afficher mes cartes
    myCardsDiv.innerHTML = '';
    gameState.myCards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-hand-item';
        cardEl.dataset.index = index;
        cardEl.style.background = getCardColor(card.color);
        cardEl.innerHTML = `<span>${getCardDisplay(card)}</span>`;
        myCardsDiv.appendChild(cardEl);
    });

    // Afficher le joueur actuel
    const isMyTurnText = gameState.isMyTurn ? ' ← C\'EST À MOI !' : '';
    currentPlayerDisplay.innerHTML = `C'est à <strong>${gameState.currentPlayerName}</strong> de jouer${isMyTurnText}`;

    if (gameState.isMyTurn) {
        currentPlayerDisplay.classList.add('my-turn');
        drawBtn.classList.add('can-draw');
    } else {
        currentPlayerDisplay.classList.remove('my-turn');
        drawBtn.classList.remove('can-draw');
    }

    // Afficher les autres joueurs
    updateOtherPlayers();
}

function updateOtherPlayers() {
    otherPlayersDiv.innerHTML = '';
    
    gameState.players.forEach(player => {
        if (player.username === localStorage.getItem('username')) return; // C'est moi

        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-card';
        playerDiv.innerHTML = `
            <div class="player-info">
                <strong>${escapeHtml(player.username)}</strong>
                <span class="card-count">${player.cardCount} 🃏</span>
            </div>
        `;
        otherPlayersDiv.appendChild(playerDiv);
    });
}

// ========== UTILITAIRES ==========

function getCardColor(color) {
    const colors = {
        'red': '#E63946',
        'green': '#2A9D5C',
        'blue': '#457B9D',
        'yellow': '#F4A261',
        null: '#333'
    };
    return colors[color] || '#666';
}

function getCardDisplay(card) {
    if (!card) return '?';
    if (card.value === 'wild') return '🎨';
    if (card.value === 'wild-draw4') return '+4';
    if (card.value === 'draw2') return '+2';
    if (card.value === 'reverse') return '↩';
    if (card.value === 'skip') return '⏭';
    return card.value;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ========== INIT ==========

console.log('Game page loaded. Lobby:', gameState.code);
