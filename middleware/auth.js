// Middleware d'authentification
module.exports = (req, res, next) => {
    // Pour maintenant, accepter tous les utilisateurs avec un username
    const username = req.query.username || req.body.username || 'Guest';
    
    req.user = { username };;
    next();
};
