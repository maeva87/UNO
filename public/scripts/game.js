var socket          = null;
var gameState       = null;
var currentUserId   = null;
var currentUsername = '';
var lobbyId         = null;
var pendingWild     = null;

function init() {
    var token    = localStorage.getItem('token');
    currentUserId   = parseInt(localStorage.getItem('userId'), 10);
    currentUsername = localStorage.getItem('username') || 'You';

    var params  = new URLSearchParams(window.location.search);
    lobbyId     = parseInt(params.get('lobby'), 10);

    if (!token || isNaN(currentUserId) || isNaN(lobbyId)) {
        window.location.href = 'lobby.html';
        return;
    }

    document.getElementById('self-name').textContent   = currentUsername;
    document.getElementById('self-avatar').textContent = currentUsername.slice(0, 2).toUpperCase();

    socket = io({ auth: { token: token } });

    socket.on('connect', function() {
        console.log('Connected to server');
        socket.emit('game:ready', { lobbyId: lobbyId });
    });

    socket.on('connect_error', function(err) {
        console.log('Connection error: ' + err.message);
        showToast('Connection lost.', 'error');
    });

    socket.on('game:state', function(state) {
        gameState = state;
        renderGameState(state);
    });

    socket.on('game:over', function(data) {
        showGameOver(data.winnerName, data.scores);
    });

    socket.on('game:uno', function(data) {
        showToast(data.username + ' says UNO!', 'error');
    });

    socket.on('game:error', function(data) {
        showToast(data.message, 'error');
    });

    document.getElementById('draw-pile').addEventListener('click', handleDraw);

    document.getElementById('btn-uno').addEventListener('click', function() {
        socket.emit('game:uno', { lobbyId: lobbyId });
        document.getElementById('btn-uno').disabled = true;
    });

    document.getElementById('btn-play-again').addEventListener('click', function() {
        document.getElementById('gameover-screen').hidden = true;
        socket.emit('game:ready', { lobbyId: lobbyId });
    });

    document.getElementById('btn-back-lobby').addEventListener('click', function() {
        window.location.href = 'lobby.html';
    });

    var swatches = document.querySelectorAll('.swatch');
    for (var i = 0; i < swatches.length; i++) {
        swatches[i].addEventListener('click', function() {
            handleColorChoice(this.dataset.color);
        });
    }
}

function handleDraw() {
    if (!isMyTurn()) {
        showToast('Not your turn.', 'error');
        return;
    }
    socket.emit('game:draw-card', { lobbyId: lobbyId });
}

function handlePlayCard(cardId, card) {
    if (!isMyTurn()) {
        return;
    }

    if (card.color === 'wild') {
        pendingWild = cardId;
        document.getElementById('color-picker').hidden = false;
        return;
    }

    socket.emit('game:play-card', { lobbyId: lobbyId, cardId: cardId });
}

function handleColorChoice(color) {
    if (!pendingWild) {
        return;
    }

    document.getElementById('color-picker').hidden = true;
    socket.emit('game:play-card', { lobbyId: lobbyId, cardId: pendingWild, chosenColor: color });
    pendingWild = null;
}

function isMyTurn() {
    if (!gameState) {
        return false;
    }
    return parseInt(gameState.currentPlayerId, 10) === currentUserId;
}

function renderGameState(state) {
    var isMyTurnNow = parseInt(state.currentPlayerId, 10) === currentUserId;

    if (isMyTurnNow) {
        document.getElementById('turn-player-name').textContent = 'Your turn!';
        document.getElementById('turn-player-name').classList.add('is-you');
        document.getElementById('zone-bottom').classList.add('your-turn');
    } else {
        var currentPlayer = null;
        for (var i = 0; i < state.players.length; i++) {
            if (parseInt(state.players[i].id, 10) === parseInt(state.currentPlayerId, 10)) {
                currentPlayer = state.players[i];
                break;
            }
        }
        var name = currentPlayer ? currentPlayer.username : '?';
        document.getElementById('turn-player-name').textContent = name;
        document.getElementById('turn-player-name').classList.remove('is-you');
        document.getElementById('zone-bottom').classList.remove('your-turn');
    }

    if (state.direction === 'CW') {
        document.getElementById('direction-badge').textContent = '▶ CW';
    } else {
        document.getElementById('direction-badge').textContent = '◀ CCW';
    }

    document.getElementById('deck-count').textContent = '🂠 ' + state.deckSize;

    renderTopCard(state.topCard);
    renderHand(state.hand, state.topCard);
    renderOpponents(state.players);

    var btnUno = document.getElementById('btn-uno');
    if (state.hand.length === 2 && isMyTurnNow) {
        btnUno.disabled = false;
        btnUno.classList.add('is-active');
    } else {
        btnUno.disabled = true;
        btnUno.classList.remove('is-active');
    }
}

function renderTopCard(card) {
    var topCardEl = document.getElementById('top-card');
    topCardEl.className   = 'card card--' + card.color;
    topCardEl.dataset.val = card.value;
    topCardEl.innerHTML   = '';
    topCardEl.appendChild(createCardImg(card, 'card-img--top'));
}

function renderHand(hand, topCard) {
    var container = document.getElementById('hand-scroller');
    container.innerHTML = '';

    for (var i = 0; i < hand.length; i++) {
        var card     = hand[i];
        var playable = false;

        if (isMyTurn()) {
            if (card.color === 'wild') {
                playable = true;
            } else if (card.color === topCard.color) {
                playable = true;
            } else if (card.value === topCard.value) {
                playable = true;
            }
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'card card--' + card.color + ' hand-card';

        if (playable) {
            wrapper.className += ' is-playable';
        }

        wrapper.appendChild(createCardImg(card, ''));

        if (playable) {
            wrapper.addEventListener('click', (function(cId, c) {
                return function() { handlePlayCard(cId, c); };
            })(card.id, card));
        }

        container.appendChild(wrapper);
    }
}

function renderOpponents(players) {
    var opponents = [];
    for (var i = 0; i < players.length; i++) {
        if (parseInt(players[i].id, 10) !== currentUserId) {
            opponents.push(players[i]);
        }
    }

    var positions = ['top', 'left', 'right'];

    for (var p = 0; p < positions.length; p++) {
        var pos = positions[p];
        var opp = opponents[p];

        var zone = document.getElementById('zone-' + pos);

        if (!opp) {
            zone.style.visibility = 'hidden';
            continue;
        }

        zone.style.visibility = 'visible';
        document.getElementById('opp-' + pos + '-name').textContent   = opp.username;
        document.getElementById('opp-' + pos + '-avatar').textContent = opp.username.slice(0, 2).toUpperCase();
        document.getElementById('opp-' + pos + '-n').textContent      = opp.cardCount;

        var handEl     = document.getElementById('opp-' + pos + '-hand');
        var horizontal = (pos === 'top');
        renderOpponentHand(handEl, opp.cardCount, horizontal);
    }
}

function renderOpponentHand(container, count, horizontal) {
    container.innerHTML = '';

    var display = count;
    if (display > 12) {
        display = 12;
    }

    for (var i = 0; i < display; i++) {
        var wrapper = document.createElement('div');

        if (horizontal) {
            wrapper.className = 'card card--back card--mini';
        } else {
            wrapper.className = 'card card--back card--mini card--mini--v';
        }

        var img   = document.createElement('img');
        img.src   = 'assets/UNO_cards/UNO_others/back.png';
        img.alt   = 'Card back';
        img.className = 'card-img card-img--back';

        wrapper.appendChild(img);
        container.appendChild(wrapper);
    }
}

function createCardImg(card, extraClass) {
    var img = document.createElement('img');

    if (card.color === 'wild') {
        if (card.value === 'draw4') {
            img.src = 'assets/UNO_cards/UNO_others/wild-draw4.png';
        } else {
            img.src = 'assets/UNO_cards/UNO_others/wild.png';
        }
    } else {
        img.src = 'assets/UNO_cards/UNO_' + card.color + '/' + card.value + '-' + card.color + '.png';
    }

    img.alt       = card.color + ' ' + card.value;
    img.className = 'card-img';

    if (extraClass) {
        img.className += ' ' + extraClass;
    }

    img.addEventListener('error', function() {
        img.style.display = 'none';
    });

    return img;
}

function showGameOver(winnerName, scores) {
    if (winnerName === currentUsername) {
        document.getElementById('gameover-title').textContent    = 'You Win!';
        document.getElementById('gameover-subtitle').textContent = 'You emptied your hand first!';
    } else {
        document.getElementById('gameover-title').textContent    = 'Game Over';
        document.getElementById('gameover-subtitle').textContent = winnerName + ' wins this round!';
    }

    var scoresList = document.getElementById('scores-list');
    scoresList.innerHTML = '';

    for (var i = 0; i < scores.length; i++) {
        var row = document.createElement('div');
        row.className = 'score-row';
        row.innerHTML = '<span class="score-name">' + scores[i].username + '</span>' +
                        '<span class="score-pts">' + scores[i].score + ' pts</span>';
        scoresList.appendChild(row);
    }

    document.getElementById('gameover-screen').hidden = false;
}

function showToast(message, type) {
    var container = document.getElementById('toast-container');
    var el        = document.createElement('div');
    el.className  = 'toast-msg toast-msg--' + type;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(function() {
        el.remove();
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
