// middleware/uppercase.js
function toUpperCase(req, res, next) {
    if (req.query) {
        for (const key in req.query) {
            req.query[key.toUpperCase()] = req.query[key];
        }
    }

    if (req.params) {
        for (const key in req.params) {
            req.params[key.toUpperCase()] = req.params[key];
        }
    }

    if (req.body) {
        for (const key in req.body) {
            req.body[key.toUpperCase()] = req.body[key];
        }
    }
    next();
}

module.exports = toUpperCase;