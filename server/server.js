const https = require('https');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const userMediaRoutes = require('./routes/userMediaRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

const morgan = require('morgan');
const app = express();

const cors = require('cors');
app.use(cors());

// Set up body-parser for JSON requests only
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


// Define the log file paths
const logDir = path.join(__dirname, 'logs');
const accessLogPath = path.join(logDir, 'access.log');

const logFileStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
app.use(morgan('combined', { stream: logFileStream }));


// Ensure the log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Function to rename the existing access log
function rotateLogFile() {
    // Start logging to a fresh access.log

    if (fs.existsSync(accessLogPath)) {
        // Get the current timestamp
        const date = new Date();
        const indianTimeOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds    
        const timestamp = new Date(date.getTime() + indianTimeOffset).toISOString().replace('T', '_').replace(/\..+/, '');
        // Set the new log file name with the timestamp
        const rotatedLogPath = path.join(logDir, `access_${timestamp}.log`);

        // Rename the current access.log to the new timestamped filename
        fs.renameSync(accessLogPath, rotatedLogPath);
    }
}

// Load your private key and certificate
const options = {
    key: fs.readFileSync('./ssl/private-key.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
};

// Enable trust proxy
//app.set('trust proxy', false);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

const csrfProtection = csrf({ cookie: true });

app.use(cookieParser());
// app.use(csrfProtection);
app.use(limiter);

// Serve static files from the 'public' directory
const publicDir = '/../client';
const htmlDir = publicDir + '/html';

// app.use(express.static(path.join(__dirname, publicDir)));

// Define a route to serve the index.html file
app.get('/pdf', (req, res) => {
    res.sendFile(path.join(__dirname, htmlDir, 'pdf.html'));
});

app.get('/pdf-editor', (req, res) => {
    res.sendFile(path.join(__dirname, htmlDir, 'pdf_editor.html'));
});

// Routes
app.use('/api/pdf', pdfRoutes);

// Middleware to set custom cache headers
app.use('/static', (req, res, next) => {
    // console.log('static:::', req.url);

    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    } else {
        res.setHeader('Cache-Control', 'no-cache');
    }
    next();
}, express.static(path.join(__dirname, publicDir, 'static'), {
    etag: true, // Enable ETag
    lastModified: true // Enable Last-Modified header
}));

app.use('/usermedia', userMediaRoutes);
// Error handling for unsupported content types
app.use((err, req, res, next) => {

    console.log('app error', err)
    if (err instanceof multer.MulterError) {
        return res.status(500).json({ error: err.message });
    }
    if (err) {
        return res.status(500).json({ error: 'Something went wrong' });
    }
    next();
});

// Handle CSRF token errors
// app.use((err, req, res, next) => {
//     if (err.code !== 'EBADCSRFTOKEN') return next(err);

//     // CSRF token validation failed
//     res.status(403);
//     res.send('Form tampered with.');
// });

// Handle 404
app.use((req, res, next) => {
    res.status(404).send('404 Not Found');
});

async function startServer() {
    try {
        // Connect to DB
        const PORT = process.env.PORT || 5001;

        app.listen(PORT, () => {
            console.log(`HTTP Server running on port ${PORT}`);
        });


        const httpsPort = process.env.HTTPS_PORT || 5555;

        // Create HTTPS server
        https.createServer(options, app).listen(httpsPort, () => {
            console.log(`HTTPS server running on port ${httpsPort}`);
        });

        // Rotate the log file before starting the server
        rotateLogFile();

        console.log('App initiated')

    } catch (err) {
        console.error('Unable to start server:', err);
        process.exit(1);
    }
}

startServer();
