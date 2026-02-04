module.exports = function allowRoles(...roles) {
    // Support both array and multiple arguments
    // allowRoles(['admin', 'superadmin']) or allowRoles('admin', 'superadmin')
    const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;

    return (req, res, next) => {
        // User must be authenticated first
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not authenticated" });
        }

        // Role must be allowed
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }

        next();
    };
};
