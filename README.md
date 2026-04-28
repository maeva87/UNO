# Projet UNO Web

Jeu de UNO multijoueur en ligne, développé en JavaScript vanilla sans framework.  
Projet réalisé dans le cadre d'un cours de développement web.

## 🎮 Fonctionnalités

✅ **Multijoueur en temps réel** avec Socket.IO  
✅ **Système de lobby** - Créez ou rejoignez des salles  
✅ **Authentification JWT** avec SQLite  
✅ **Règles complètes du UNO** - +2, +4, Joker, Inversion, Passe  
✅ **Interface responsive** - Mobile friendly  
✅ **Système de points** - Calcul automatique des scores  

## 📋 Table des matières

- [Installation](#installation)
- [Lancement](#lancement)
- [Parcours utilisateur](#parcours-utilisateur)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Équipe](#équipe)

---

## ⚙️ Installation

### Prérequis
- **Node.js** (v14 ou supérieur)
- **npm** (inclus avec Node.js)

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/maeva87/UNO.git
cd UNO
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration (optionnel)**
Créer un fichier `.env` à la racine:
```env
PORT=3000
JWT_SECRET=votre-secret-jwt-complexe
```

---

## 🚀 Lancement

### Mode développement
```bash
npm start
```
ou
```bash
node server.js
```

Le serveur démarre sur `http://localhost:3000`

### Accéder à l'application
1. Ouvrez votre navigateur
2. Allez sur `http://localhost:3000`
3. Créez un compte ou connectez-vous

---

## 👤 Parcours utilisateur

### 1. **Page d'accueil** (`/`)
- Affichage du logo UNO
- Bouton pour commencer

### 2. **Page de connexion/inscription** (`/login.html`)
- **Inscription** : Créer un compte avec pseudo et mot de passe
- **Connexion** : Se connecter avec ses identifiants
- Validation du mot de passe (sécurité)
- Photo de profil optionnelle

### 3. **Page des lobbies** (`/lobby.html`)
- Liste des salles disponibles (refresh automatique)
- Affichage : Nom, créateur, nombre de joueurs
- **Créer une salle** : Définir le nom et le nombre max de joueurs (2-4)
- **Rejoindre une salle** : Cliquer sur une salle disponible
- Affichage du username connecté
- Bouton de déconnexion

### 4. **Page de jeu** (`/game.html`)
- **Zone centrale** : Carte actuelle (talon) et pile de pioche
- **Joueurs adversaires** : Affichage du nombre de cartes en main
- **Mes cartes** : Ma main scrollable
- **État du jeu** : Affichage du joueur actuel et des messages
- **Actions** : Cliquer sur une carte pour la jouer, cliquer la pile pour piocher

---

## 🏗️ Architecture

### Structure du projet

```
projet-uno/
├── server.js                 ← Point d'entrée (Express + Socket.io)
├── db.js                     ← Initialisation SQLite
├── package.json              ← Dépendances
├── routes/
│   ├── auth.js               ← /register, /login
│   └── lobby.js              ← /lobbies, /create, /join
├── middleware/
│   └── auth.js               ← Vérification JWT
├── game/
│   └── engine.js             ← Moteur UNO (deck, shuffle)
└── public/
    ├── index.html            ← Page d'accueil
    ├── login.html            ← Connexion/Inscription
    ├── lobby.html            ← Liste des salles
    ├── game.html             ← Interface de jeu
    ├── styles/
    │   └── main.css          ← Styles responsifs
    └── scripts/
        ├── socket.js         ← Client Socket.IO
        ├── login.js          ← Logique authentification
        ├── lobby.js          ← Gestion des lobbies
        └── game.js           ← Logique du jeu
```

### Flux de données

```
Client (Frontend)
    ↓ (REST API + Socket.IO)
Server (Node.js + Express)
    ↓ (SQL)
Database (SQLite)
```

---

## 🛠️ Technologies

### Backend
- **Express.js** - Framework web
- **Socket.IO** - Communication temps réel (WebSocket)
- **SQLite3** - Base de données
- **bcryptjs** - Hashage de mots de passe
- **jsonwebtoken (JWT)** - Authentification

### Frontend
- **HTML5** - Structure
- **CSS3** - Styles (responsive, animations)
- **JavaScript vanilla** - Logique (pas de framework)
- **Socket.IO Client** - Communication temps réel

### Outils
- **Node.js & npm** - Runtime et gestionnaire de paquets
- **Git & GitHub** - Versioning

---

## 📊 Règles du UNO implémentées

### Cartes
- 🎨 Numérotées (0-9) - Chaque couleur
- 🔄 Inversion - Change le sens de jeu
- ⏭️ Passe - Saute le joueur suivant
- ➕ +2 - Pioche 2 cartes + passe
- 🌈 Joker - Change la couleur
- ➕➕ +4 - Pioche 4 cartes + change couleur

### Mécaniques
- Être le **premier à avoir 0 cartes**
- Cartes spéciales peuvent être **accumulées** (+2 sur +2 = 4 cartes)
- Les jokers peuvent être **posés sur n'importe quelle carte**
- Annonce obligatoire "UNO!" quand il ne reste 1 carte (pénalité: +2)

### Points
- Cartes 0-9 : Leur valeur
- +2, Inversion, Passe : **20 points**
- Joker, +4 : **50 points**
- Gagnant : Premier à 500 points (variable)

---

## 🔀 Branches Git

| Branche | Responsable | Contenu |
|---------|------------|---------|
| `main` | Intégrateur | Version stable fusionnée |
| `BDD` | Membre A | Base de données & Auth |
| `Back-end` | Membre B | Serveur & Logique de jeu |
| `Front-end` | Membre C | Interface utilisateur |

### Fusion des branches
```bash
# Sur main
git merge BDD
git merge Back-end
git merge Front-end
git push origin main
```

---

## 📝 API Endpoints

### Authentification (publique)
- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter

### Lobbies (protégées par JWT)
- `GET /api/lobbies` - Lister les salles
- `POST /api/lobbies/create` - Créer une salle
- `POST /api/lobbies/join` - Rejoindre une salle

### Socket.IO Events
- `authenticate` - Envoyer le token au serveur
- `join_game` - Rejoindre une partie
- `play_card` - Jouer une carte
- `draw_card` - Piocher une carte
- `leave_game` - Quitter la partie

---

## 🐛 Problèmes connus & Solutions

### "Connection refused" au démarrage
→ Vérifiez que le port 3000 est disponible
```bash
# Changer le port
PORT=8000 node server.js
```

### Socket.IO ne se connecte pas
→ Assurez-vous que le serveur tourne et que vous êtes authentifié

### Cartes mal affichées
→ Videz le cache du navigateur (Ctrl+Shift+Del)

---

## 👥 Équipe

| Nom | Rôle | Branche |
|-----|------|---------|
| Membre A | BDD & Auth | `BDD` |
| Membre B | Back-end & Socket | `Back-end` |
| Membre C | Front-end | `Front-end` |

---

## 📅 Planning

- **Week 1-2** : Setup + DB + Auth
- **Week 3-4** : Backend Socket + Game Logic
- **Week 5-6** : Frontend complète
- **Week 7** : Tests & Déploiement
- **28 Avril** : 🎉 Soutenance

---

## 📜 License

Ce projet est un exercice pédagogique. Libre d'utilisation pour fins éducatives.
    │   └── game.js           ← Logique JS de la page de jeu
    └── assets/
        └── UNO_cards/
            ├── UNO_blue/     ← Cartes 0-9, draw2, reverse, skip en bleu
            │   └── ...
            ├── UNO_yellow/   ← Cartes 0-9, draw2, reverse, skip en jaune
            │   └── ...
            ├── UNO_red/      ← Cartes 0-9, draw2, reverse, skip en rouge
            │   └── ...
            ├── UNO_green/    ← Cartes 0-9, draw2, reverse, skip en vert
            │   └── ...
            └── UNO_others/   ← Cartes sans couleur : back, wild, wild-draw4
                └── ...
```

---

## Installation

### Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- npm

### Étapes

1. Cloner le repo :

```bash
git clone https://github.com/votre-repo/projet-uno.git
cd projet-uno
```

2. Installer les dépendances :

```bash
npm install
```

3. Créer le fichier `.env` à la racine :

```env
PORT=3000
JWT_SECRET=votre_secret_jwt
```

4. Lancer le serveur :

```bash
node server.js
```

5. Ouvrir le navigateur à l'adresse :

```
http://localhost:3000
```

---

## Dépendances

| Package | Utilisation |
|---------|-------------|
| `express` | Serveur HTTP et routage |
| `socket.io` | Communication temps réel (WebSocket) |
| `sqlite3` | Base de données locale |
| `bcrypt` | Chiffrement des mots de passe |
| `jsonwebtoken` | Génération et vérification des tokens JWT |

Installation complète :

```bash
npm install express socket.io sqlite3 bcrypt jsonwebtoken
```

---

## Parcours utilisateur

1. **Page d'accueil** — présentation du jeu, bouton pour se connecter ou s'inscrire
2. **Inscription / Connexion** — création de compte ou connexion avec pseudo et mot de passe
3. **Lobby** — liste des salles disponibles, possibilité de créer ou rejoindre une salle (2 à 4 joueurs)
4. **Salle d'attente** — on attend que tous les joueurs soient prêts, puis la partie démarre
5. **Partie** — chaque joueur joue à son tour, les cartes spéciales sont actives, l'annonce UNO est obligatoire
6. **Fin de manche** — les points sont calculés, le vainqueur est affiché

---

## Règles du jeu

- Le deck contient **108 cartes** réparties en 4 couleurs (bleu, rouge, vert, jaune)
- Chaque joueur reçoit **7 cartes** en début de partie
- On joue une carte de même **couleur** ou même **chiffre** que la défausse
- **Cartes spéciales** : +2 (cumulable), +4, Joker, Inversion, Passer
- Quand il ne reste qu'**une carte** en main, il faut annoncer **UNO**
- Le premier joueur à n'avoir plus de cartes remporte la manche

---

## Organisation Git

- `main` — branche stable, merge uniquement via pull request
- `BDD` — base de données et authentification
- `Back-end` — serveur et logique de jeu
- `Front-end` — interface utilisateur

Chaque fonctionnalité est développée sur sa branche et intégrée à `main` après review par un autre membre.
