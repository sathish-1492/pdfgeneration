const express = require('express');
const router = express.Router();
const path = require('path');

const { getCache } = require('../config/redis');

const getImageContent = async (req, res) => {
    
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    const imagePath = path.join(__dirname, '../usermedia', req.path);
    return await getCache(imagePath, req.headers.range, res);
}

router.get('/:imageName', getImageContent)
module.exports = router;