# Projet UNO Web

Jeu de UNO multijoueur en ligne, développé en JavaScript vanilla sans framework.  
Projet réalisé dans le cadre d'un cours de développement web — rendu le 28 avril.

---

## Équipe

| Membre | Rôle | Branche |
|--------|------|---------|
| Membre A | Base de données & Auth | `BDD` |
| Membre B | Serveur & Logique de jeu | `Back-end` |
| Membre C | Interface utilisateur | `Front-end` |

---

## Arborescence du projet

```
projet-uno/
├── server.js                 ← Point d'entrée du serveur (Express + Socket.io)
├── db.js                     ← Connexion et initialisation SQLite
├── routes/
│   ├── auth.js               ← Routes /register et /login
│   └── lobby.js              ← Routes de gestion des salles
├── middleware/
│   └── auth.js               ← Vérification des tokens JWT
├── game/
│   └── engine.js             ← Moteur de jeu UNO (deck, règles, tours)
└── public/
    ├── index.html            ← Page d'accueil
    ├── login.html            ← Page connexion / inscription
    ├── lobby.html            ← Page liste des salles
    ├── game.html             ← Page de jeu
    ├── styles/
    │   └── main.css          ← Styles globaux
    └── scripts/
        ├── socket.js         ← Connexion Socket.io côté client
        ├── lobby.js          ← Logique JS de la page lobby
        └── game.js           ← Logique JS de la page de jeu
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
