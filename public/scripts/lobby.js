'use strict';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

const headerUsername  = document.getElementById('header-username');
const btnLogout       = document.getElementById('btn-logout');

const roomNameInput   = document.getElementById('room-name');
const roomNameErr     = document.getElementById('room-name-err');
const maxPlayersInput = document.getElementById('max-players');
const btnCreate       = document.getElementById('btn-create');

const joinCodeInput   = document.getElementById('join-code');
const joinCodeErr     = document.getElementById('join-code-err');
const btnJoin         = document.getElementById('btn-join');

const panelLobby      = document.getElementById('panel-lobby');
const roomNameDisplay = document.getElementById('room-name-display');
const roomCodeDisplay = document.getElementById('room-code-display');
const roomCount       = document.getElementById('room-count');
const btnCopyCode     = document.getElementById('btn-copy-code');
const playerList      = document.getElementById('player-list');
const chatMessages    = document.getElementById('chat-messages');
const chatInput       = document.getElementById('chat-input');
const btnSendChat     = document.getElementById('btn-send-chat');
const btnLeave        = document.getElementById('btn-leave');
const btnStart        = document.getElementById('btn-start');
const waitingMsg      = document.getElementById('waiting-msg');

let currentLobby  = null;

let currentUserId = null;

let socket        = null;

function init() {
  const token    = getToken();
  const username = localStorage.getItem('username');

  
  const userId = parseInt(localStorage.getItem('userId'), 10);

  
  if (!token || isNaN(userId)) {
    window.location.href = 'login.html';
    return;
  }

  
  currentUserId = userId;
  headerUsername.textContent = username || 'Player';

  
  socket = io({ auth: { token } });
  bindSocketEvents();
  bindUIEvents();
}

function bindSocketEvents() {

  socket.on('connect', () => {
    console.log('[Socket] Connected :', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error :', err.message);
    showToast('Real-time connection failed.', 'error');
  });

  

  
  socket.on('lobby:players', ({ players, maxPlayers }) => {
    renderPlayerList(players);
    roomCount.textContent = `${players.length} / ${maxPlayers}`;
  });

  
  socket.on('lobby:player-joined', ({ username }) => {
    appendChatLine(`${username} joined the room.`, 'system');
  });

  
  socket.on('lobby:player-left', ({ username }) => {
    appendChatLine(`${username} left the room.`, 'system');
  });

  
  socket.on('lobby:chat', ({ username, message }) => {
    appendChatLine(message, 'player', username);
  });

  
  socket.on('lobby:game-started', ({ lobbyId }) => {
    showToast('Game is starting… 🃏', 'success');
    setTimeout(() => {
      window.location.href = `game.html?lobby=${lobbyId}`;
    }, 800);
  });

  
  socket.on('lobby:error', ({ message }) => {
    showToast(message, 'error');
  });
}

function bindUIEvents() {
  btnLogout.addEventListener('click', handleLogout);
  btnCreate.addEventListener('click', handleCreate);
  btnJoin.addEventListener('click', handleJoin);
  btnCopyCode.addEventListener('click', handleCopyCode);
  btnLeave.addEventListener('click', handleLeave);
  btnStart.addEventListener('click', handleStart);
  btnSendChat.addEventListener('click', handleSendChat);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });

  
  joinCodeInput.addEventListener('input', () => {
    joinCodeInput.value = joinCodeInput.value.toUpperCase();
  });
}

function handleLogout() {
  localStorage.clear();
  if (socket) socket.disconnect();
  window.location.href = 'login.html';
}

async function handleCreate() {
  const name       = roomNameInput.value.trim();
  const maxPlayers = parseInt(maxPlayersInput.value, 10);

  
  if (!name || name.length < 2) {
    setFieldError(roomNameInput, roomNameErr, 'Room name must be at least 2 characters.');
    return;
  }
  clearFieldError(roomNameInput, roomNameErr);

  try {
    const res  = await fetch('/api/lobby/create', {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ name, maxPlayers }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to create room.', 'error');
      return;
    }

    enterLobby(data.lobby);
  } catch (err) {
    console.error('[Create] Network error :', err);
    showToast('Unable to reach the server.', 'error');
  }
}

async function handleJoin() {
  const code = joinCodeInput.value.trim().toUpperCase();

  if (code.length !== 6) {
    setFieldError(joinCodeInput, joinCodeErr, 'The code must be exactly 6 characters.');
    return;
  }
  clearFieldError(joinCodeInput, joinCodeErr);

  try {
    const res  = await fetch('/api/lobby/join', {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ code }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Could not join the room.', 'error');
      return;
    }

    enterLobby(data.lobby);
  } catch (err) {
    console.error('[Join] Network error :', err);
    showToast('Unable to reach the server.', 'error');
  }
}

function handleCopyCode() {
  if (!currentLobby) return;
  navigator.clipboard.writeText(currentLobby.code)
    .then(() => showToast('Code copied! 📋', 'success'))
    .catch(() => showToast('Copy failed.', 'error'));
}

function handleLeave() {
  if (!currentLobby || !socket) return;
  socket.emit('lobby:leave', { lobbyId: currentLobby.id });
  exitLobby();
}

function handleStart() {
  if (!currentLobby || !socket) return;
  socket.emit('lobby:start', { lobbyId: currentLobby.id });
}

function handleSendChat() {
  const msg = chatInput.value.trim();
  if (!msg || !currentLobby || !socket) return;
  socket.emit('lobby:chat', { lobbyId: currentLobby.id, message: msg });
  chatInput.value = '';
}

function enterLobby(lobby) {
  currentLobby = {
    
    id:         parseInt(lobby.id,          10),
    name:       lobby.name,
    code:       lobby.code,
    ownerId:    parseInt(lobby.owner_id,    10),
    maxPlayers: parseInt(lobby.max_players, 10),
  };

  
  roomNameDisplay.textContent = lobby.name;
  roomCodeDisplay.textContent = lobby.code;
  roomCount.textContent       = `1 / ${lobby.max_players}`;

  
  const isOwner = currentLobby.ownerId === currentUserId;
  btnStart.hidden  = !isOwner;
  waitingMsg.style.display = isOwner ? 'none' : '';

  
  socket.emit('lobby:join', { lobbyId: lobby.id });

  
  panelLobby.hidden = false;
  panelLobby.scrollIntoView({ behavior: 'smooth', block: 'start' });

  appendChatLine('You joined the room.', 'system');
  showToast(`Joined "${lobby.name}" 🎉`, 'success');
}

function exitLobby() {
  currentLobby      = null;
  panelLobby.hidden = true;
  playerList.innerHTML  = '';
  chatMessages.innerHTML = '';
  showToast('You left the room.', 'info');
}

function renderPlayerList(players) {
  playerList.innerHTML = '';

  players.forEach(({ id, username }) => {
    const li = document.createElement('li');
    li.className = 'player-item';
    li.dataset.playerId = id;

    const dot   = document.createElement('span');
    dot.className = 'player-dot';

    const name  = document.createElement('span');
    name.className   = 'player-item-name';
    name.textContent = username;

    li.appendChild(dot);
    li.appendChild(name);

    
    if (currentLobby && parseInt(id, 10) === currentLobby.ownerId) {
      const crown = document.createElement('span');
      crown.className   = 'player-item-crown';
      crown.textContent = '👑';
      li.appendChild(crown);
    }

    playerList.appendChild(li);
  });
}

function appendChatLine(message, type = 'player', author = null) {
  const div = document.createElement('div');
  div.className = type === 'system' ? 'chat-line chat-line--system' : 'chat-line';

  if (type === 'player' && author) {
    const span = document.createElement('span');
    span.className   = 'chat-author';
    span.textContent = author;
    div.appendChild(span);
  }

  div.appendChild(document.createTextNode(message));
  chatMessages.appendChild(div);

  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setFieldError(input, errorEl, message) {
  errorEl.textContent = message;
  input.classList.add('is-invalid');
  input.classList.remove('is-valid');
}

function clearFieldError(input, errorEl) {
  errorEl.textContent = '';
  input.classList.remove('is-invalid');
  input.classList.add('is-valid');
}

function showToast(message, type = 'info') {
  
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className   = 'toast';
  toast.textContent = message;

  const colors = { success: '#2a9d5c', error: '#E63946', info: '#457B9D' };
  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '28px',
    left:         '50%',
    transform:    'translateX(-50%)',
    background:   colors[type] ?? colors.info,
    color:        '#fff',
    padding:      '10px 24px',
    borderRadius: '30px',
    fontFamily:   "'Nunito', sans-serif",
    fontWeight:   '700',
    fontSize:     '0.88rem',
    boxShadow:    '0 6px 20px rgba(0,0,0,.25)',
    zIndex:       '9999',
    animation:    'toastIn .3s ease',
    whiteSpace:   'nowrap',
  });

  
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes toastIn  { from{opacity:0;bottom:10px} to{opacity:1;bottom:28px} }
      @keyframes toastOut { from{opacity:1;bottom:28px} to{opacity:0;bottom:10px} }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
