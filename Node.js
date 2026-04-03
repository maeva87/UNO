//1. Module HTTP natif de Node.js
const http = require('http');

//2. Express -gère les routes + fichiers statiques
const express = require('express');
const app = express();
app.use(express.static('./public'));

//3. Création du serveur HTTP avec Express
const server = http.creationServer(app);

//4.Socker.IO se greffe sur le serveur HTTP
const IO = new Server(server,{
    cors: {origin: '*'}
});

server.listen(3000);

