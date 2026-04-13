let io;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, { cors: { origin: '*' } });

    // 👇 AJOUTE ÇA
    io.on('connection', (socket) => {
      console.log('Un joueur connecté :', socket.id);

      // Rejoindre un lobby
      socket.on('join', ({ lobbyId, username }) => {
        socket.join(lobbyId);
        io.to(lobbyId).emit('message', `${username} a rejoint le lobby`);
      });

      // Quitter un lobby
      socket.on('leave', ({ lobbyId, username }) => {
        socket.leave(lobbyId);
        io.to(lobbyId).emit('message', `${username} a quitté le lobby`);
      });

      // Démarrer la partie
      socket.on('start', ({ lobbyId }) => {
        io.to(lobbyId).emit('gameStart', { lobbyId });
      });

      socket.on('disconnect', () => {
        console.log('Joueur déconnecté :', socket.id);
      });
    });
    // 👆 FIN

    return io;
  },
  getIO: () => io
};