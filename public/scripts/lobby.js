// ==================== LOBBY PAGE ====================

// Vérification auth
if (!checkAuth()) {
    throw new Error('Non authentifié');
}

// Init socket
initSocket();

// Éléments du DOM
const usernameDisplay  = document.getElementById('username-display');
const logoutBtn        = document.getElementById('logout-btn');
const createLobbyBtn   = document.getElementById('create-lobby-btn');
const createModal      = document.getElementById('create-modal');
const confirmCreateBtn = document.getElementById('confirm-create');
const cancelCreateBtn  = document.getElementById('cancel-create');
const roomNameInput    = document.getElementById('room-name');
const maxPlayersSelect = document.getElementById('max-players');
const lobbiesGrid      = document.getElementById('lobbies-grid');
const joinCodeInput    = document.getElementById('join-code-input');
const joinCodeBtn      = document.getElementById('join-code-btn');

// Afficher l'username
const username = localStorage.getItem('username');
usernameDisplay.textContent = username || 'Utilisateur';

// ========== STYLE DU CHAMP CODE ==========

const style = document.createElement('style');
style.textContent = `
    .join-by-code {
        display: flex;
        gap: 10px;
        margin-bottom: 24px;
        align-items: center;
    }
    .join-by-code input {
        padding: 10px 16px;
        border-radius: 8px;
        border: 2px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.1);
        color: white;
        font-size: 1rem;
        text-transform: uppercase;
        letter-spacing: 4px;
        font-weight: 700;
        width: 180px;
    }
    .join-by-code input::placeholder {
        letter-spacing: 1px;
        font-weight: 400;
        text-transform: none;
        opacity: 0.6;
    }
    .waiting-screen {
        text-align: center;
        padding: 40px;
        color: white;
    }
    .waiting-screen h2 {
        margin-bottom: 16px;
    }
    .waiting-players {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 20px;
    }
    .waiting-player-badge {
        background: rgba(255,255,255,0.15);
        border-radius: 20px;
        padding: 8px 16px;
        font-weight: 700;
    }
`;
document.head.appendChild(style);

// ========== ÉVÉNEMENTS ==========

// Déconnexion
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
});

// Ouvrir le modal de création
createLobbyBtn.addEventListener('click', () => {
    createModal.classList.remove('hidden');
    roomNameInput.focus();
});

// Fermer le modal
cancelCreateBtn.addEventListener('click', () => {
    createModal.classList.add('hidden');
});

// Mettre le code en majuscules automatiquement
joinCodeInput.addEventListener('input', () => {
    joinCodeInput.value = joinCodeInput.value.toUpperCase();
});

// Rejoindre via un code
joinCodeBtn.addEventListener('click', async () => {
    const code = joinCodeInput.value.trim().toUpperCase();

    if (code.length !== 5) {
        alert('Le code doit faire 5 caractères');
        return;
    }

    await joinLobbyByCode(code);
});

// Rejoindre en appuyant sur Entrée
joinCodeInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') joinCodeBtn.click();
});

// Créer une salle
confirmCreateBtn.addEventListener('click', async () => {
    const name       = roomNameInput.value.trim();
    const maxPlayers = parseInt(maxPlayersSelect.value);

    if (!name) {
        alert('Veuillez entrer un nom de salle');
        return;
    }

    try {
        const res = await fetch('/api/lobbies/create', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, max_players: maxPlayers })
        });

        const data = await res.json();

        if (!res.ok) {
            alert('Erreur : ' + (data.error || 'Impossible de créer la salle'));
            return;
        }

        localStorage.setItem('currentLobbyId',   data.id);
        localStorage.setItem('currentLobbyCode', data.code);
        window.location.href = 'game.html';
    } catch (err) {
        console.error('Erreur création salle:', err);
        alert('Erreur réseau');
    }
});

// ========== CHARGEMENT DES SALLES ==========

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

// Afficher les salles
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

// Rejoindre via le bouton de la carte
async function joinLobby(lobbyId, code) {
    try {
        const res = await fetch('/api/lobbies/join', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ code })
        });

        const data = await res.json();

        if (!res.ok) {
            alert('Erreur : ' + (data.error || 'Impossible de rejoindre'));
            return;
        }

        localStorage.setItem('currentLobbyId',   lobbyId);
        localStorage.setItem('currentLobbyCode', code);
        window.location.href = 'game.html';
    } catch (err) {
        console.error('Erreur rejoindre salle:', err);
        alert('Erreur réseau');
    }
}

// Rejoindre via un code saisi
async function joinLobbyByCode(code) {
    try {
        const res = await fetch('/api/lobbies/join', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ code })
        });

        const data = await res.json();

        if (!res.ok) {
            alert('Erreur : ' + (data.error || 'Code invalide ou salle introuvable'));
            return;
        }

        localStorage.setItem('currentLobbyId',   data.lobby.id);
        localStorage.setItem('currentLobbyCode', code);
        window.location.href = 'game.html';
    } catch (err) {
        console.error('Erreur rejoindre via code:', err);
        alert('Erreur réseau');
    }
}

// ========== SOCKET ==========

getSocket().on('connect', () => {
    console.log('✓ Connecté au serveur');
    sendAuthToServer();
});

// Rafraîchir si un lobby change
getSocket().on('lobby_updated', () => {
    loadLobbies();
});

// ========== INIT ==========

loadLobbies();
setInterval(loadLobbies, 3000);

// ========== UTILITAIRES ==========

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