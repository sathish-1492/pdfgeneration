//cacheService.js

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageTTL = 86400;
// Create a Redis client with TLS
let redisOptions;
if (process.env.PRODUCTION == "true") {
    console.log('iffff', process.env.PRODUCTION)

    redisOptions = {
        maxRetriesPerRequest: 3,
        tls: true
    }
} else {
    redisOptions = {
        maxRetriesPerRequest: 3
    }
}

const redis = new Redis(process.env.REDIS_URL, redisOptions);


// Testing Redis connection
redis.on('connect', () => {
    console.log('Connected to Redis!', process.env.REDIS_URL);
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Function to get image from Redis cache or server based on Redis availability and cache status
async function getCache(imageKey, range, res, callback, params) {
    try {

        // Check if Redis is available by testing the connection
        await redis.ping();  // Ping Redis to check if it's available

        // Try to get the image from Redis
        const cachedImage = await redis.get(imageKey);

        if (cachedImage) {
            // If image is found in Redis cache, return the cached data
            //  console.log("Image found in Redis cache.");
            if (callback) {
                return res.json(JSON.parse(cachedImage));
            } else {
                return res.send(Buffer.from(cachedImage, 'base64'));
            }
        } else {

            if (callback) {
                const data = await callback(params);

                await redis.set(imageKey, JSON.stringify(data), 'EX', imageTTL); // Cache for 1 day (24 hours)
                return res.json(data);
            } else {

                // If the image is not found in Redis, fetch it from the server
                console.log("Image not found in Redis, fetching from server...");
                const imageData = await getImageFromServer(imageKey, range, true);
                const processedImage = await sharp(imageData).toBuffer();

                // Store the image in Redis for future use
                await redis.set(imageKey, processedImage.toString('base64'), 'EX', imageTTL); // Cache for 1 day (24 hours)
                console.log("Image fetched from server and cached in Redis.");
                return res.send(Buffer.from(processedImage));
            }

        }
    } catch (error) {
        console.error("Redis connection error or fetching from Redis failed:", error.message);

        // If Redis is not running or any Redis error, fall back to server
        console.log("Fallback: Fetching image from server...");
        if (callback) {
            const data = await callback(params);
            return res.json(data);

        } else {
            return getImageFromServer(imageKey, range, false, res);  // Fallback to fetching image from the server
        }
    }
}


// Function to get image from the server (local file system or an external API)
async function getImageFromServer(filePath, range, isdata, res) {
    try {
        const ext = path.extname(filePath).toLowerCase();

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        // Determine the MIME type based on file extension
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mp3',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };

        const mimeType = mimeTypes[ext];
        if (!mimeType) {
            return res.status(400).send('Unsupported file type');
        }

        res.setHeader('Content-Type', mimeType);


        // Handle video streaming for `.mp4`
        if (ext === '.mp4') {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunkSize = end - start + 1;

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                });

                const stream = fs.createReadStream(filePath, { start, end });
                stream.pipe(res);
           
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                });

                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
            }
        } else if ( ext == '.mp3') {
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);

        } else {
            // Serve images directly
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }


        // if (fs.existsSync(imagePath, (res, stats))) {
        //     if (isdata) {
        //         // Read and return image from file system
        //         return fs.readFileSync(imagePath);
        //     } else {
        //         res.sendFile(imagePath, (err) => {
        //             if (err) {
        //                 console.error("Error serving the image:", err);
        //                 res.status(500).send("Error serving image");
        //             }
        //         });
        //     }

        // }
    } catch (error) {
        console.error("Error fetching image from server:", error.message);
        throw new Error("Image not found on the server");
    }
}


module.exports = { getCache };
