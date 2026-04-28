// ==================== SOCKET.IO CLIENT ====================
let socket = null;

function initSocket() {
    if (socket) return socket;
    
    socket = io();

    socket.on('connect', () => {
        console.log('✓ Connecté au serveur Socket.io');
    });

    socket.on('disconnect', () => {
        console.log('✗ Déconnecté du serveur');
    });

    socket.on('error', (error) => {
        console.error('Erreur Socket:', error);
    });

    return socket;
}

function getSocket() {
    if (!socket) {
        return initSocket();
    }
    return socket;
}

// Vérifier qu'on a un token avant d'accéder aux pages protégées
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Envoyer le token au serveur après connexion Socket.io
function sendAuthToServer() {
    const token = localStorage.getItem('token');
    if (token) {
        getSocket().emit('authenticate', { token });
    }
}
