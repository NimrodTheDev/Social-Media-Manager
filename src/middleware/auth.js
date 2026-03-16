const jwt = require('jsonwebtoken');
const { makeResponse } = require('../utils/responder');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json(makeResponse(false, 'Unauthorized'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error authenticating:', error);
        return res.status(401).json(makeResponse(false, 'Unauthorized'));
    }
}

module.exports = authMiddleware;