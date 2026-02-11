// Role-based access control middleware

exports.adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    next();
};

exports.superAdminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied. Super admin only.' });
    }

    next();
};
