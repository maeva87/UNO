// ==================== LOBBY PAGE ====================

if (!checkAuth()) {
    throw new Error('Non authentifié');
}

const socket = initSocket();
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const createLobbyBtn = document.getElementById('create-lobby-btn');
const createModal = document.getElementById('create-modal');
const confirmCreateBtn = document.getElementById('confirm-create');
const cancelCreateBtn = document.getElementById('cancel-create');
const roomNameInput = document.getElementById('room-name');
const maxPlayersSelect = document.getElementById('max-players');
const lobbiesGrid = document.getElementById('lobbies-grid');

// Afficher l'username
const username = localStorage.getItem('username');
usernameDisplay.textContent = username || 'Utilisateur';

// ========== EVENT LISTENERS ==========

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
});

createLobbyBtn.addEventListener('click', () => {
    createModal.classList.remove('hidden');
    roomNameInput.focus();
});

cancelCreateBtn.addEventListener('click', () => {
    createModal.classList.add('hidden');
});

confirmCreateBtn.addEventListener('click', async () => {
    const name = roomNameInput.value.trim();
    const maxPlayers = parseInt(maxPlayersSelect.value);

    if (!name) {
        alert('Veuillez entrer un nom de salle');
        return;
    }

    try {
        const res = await fetch('/api/lobbies/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, max_players: maxPlayers })
        });

        const data = await res.json();

        if (!res.ok) {
            alert('Erreur : ' + (data.error || 'Impossible de créer la salle'));
            return;
        }

        // Rejoindre la salle créée
        localStorage.setItem('currentLobbyId', data.id);
        localStorage.setItem('currentLobbyCode', data.code);
        window.location.href = 'game.html';
    } catch (err) {
        console.error('Erreur création salle:', err);
        alert('Erreur réseau');
    }
});

// ========== CHARGER LES SALLES ==========

async function loadLobbies() {
    try {
        const res = await fetch('/api/lobbies', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const lobbies = await res.json();
        displayLobbies(lobbies);
    } catch (err) {
        console.error('Erreur chargement salles:', err);
        lobbiesGrid.innerHTML = '<p class="error">Erreur de connexion</p>';
    }
}

function displayLobbies(lobbies) {
    lobbiesGrid.innerHTML = '';

    if (lobbies.length === 0) {
        lobbiesGrid.innerHTML = '<p class="empty-message">Aucune salle disponible. Créez la première !</p>';
        return;
    }

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'lobby-card';
        card.innerHTML = `
            <h3>${escapeHtml(lobby.name)}</h3>
            <p>Créateur: <strong>${escapeHtml(lobby.owner_name)}</strong></p>
            <p>Joueurs: <strong>${lobby.player_count}/${lobby.max_players}</strong></p>
            <p>Code: <code>${lobby.code}</code></p>
            <button class="btn btn-primary join-btn" data-lobby-id="${lobby.id}">Rejoindre</button>
        `;

        const joinBtn = card.querySelector('.join-btn');
        joinBtn.addEventListener('click', async () => {
            await joinLobby(lobby.id, lobby.code);
        });

        lobbiesGrid.appendChild(card);
    });
}

async function joinLobby(lobbyId, code) {
    try {
        const res = await fetch('/api/lobbies/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ code })
        });

        const data = await res.json();

        if (!res.ok) {
            alert('Erreur : ' + (data.error || 'Impossible de rejoindre'));
            return;
        }

        localStorage.setItem('currentLobbyId', lobbyId);
        localStorage.setItem('currentLobbyCode', code);
        window.location.href = 'game.html';
    } catch (err) {
        console.error('Erreur rejoindre salle:', err);
        alert('Erreur réseau');
    }
}

// ========== CONNEXION SOCKET ==========

socket.on('connect', () => {
    console.log('✓ Connecté au serveur');
    sendAuthToServer();
});

socket.on('lobby_updated', () => {
    console.log('Lobby mis à jour');
    loadLobbies();
});

// ========== INIT ==========

// Charger les salles toutes les 3 secondes
loadLobbies();
setInterval(loadLobbies, 3000);

// UTILITAIRES

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
