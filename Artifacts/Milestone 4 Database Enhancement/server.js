const express = require('express');
const winston = require('winston');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'contact-management-api' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 5 }),
        new winston.transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 5 }),
        new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })
    ]
});

logger.on('error', (error) => {
    console.error('Winston logger error:', error);
});

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// MySQL connection configuration (update with your credentials)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'contact_management_db'
};

let db;
async function initializeDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS contacts (
                id VARCHAR(10) PRIMARY KEY,
                firstName VARCHAR(50) NOT NULL,
                lastName VARCHAR(50) NOT NULL,
                phone VARCHAR(15) NOT NULL,
                address VARCHAR(200),
                email VARCHAR(100) NOT NULL
            )
        `);
        logger.info('MySQL database and contacts table initialized');
    } catch (err) {
        logger.error('Database initialization error:', err);
    }
}

// Load test data on startup
const loadTestData = async () => {
    const filePath = path.join(__dirname, 'TestData.txt');
    try {
        await fs.access(filePath);
        const data = await fs.readFile(filePath, 'utf8');
        const lines = data.trim().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split(',');
            if (parts.length !== 6) {
                logger.warn(`Skipped invalid line: "${line}" - Expected 6 fields, got ${parts.length}`);
                continue;
            }
            const [id, firstName, lastName, phone, address, email] = parts.map(part => part.trim());
            const validationErrors = validateContact({ id, firstName, lastName, phone, address, email });
            if (Object.keys(validationErrors).length === 0) {
                try {
                    await db.execute(
                        'INSERT IGNORE INTO contacts (id, firstName, lastName, phone, address, email) VALUES (?, ?, ?, ?, ?, ?)',
                        [id, firstName, lastName, phone, address, email]
                    );
                    logger.info(`Loaded test contact with ID ${id}`);
                } catch (err) {
                    logger.warn(`Failed to insert contact ${id}:`, err);
                }
            } else {
                logger.warn(`Skipped invalid test contact with ID ${id}:`, validationErrors);
            }
        }
        logger.info(`Loaded test data into MySQL from ${filePath}`);
    } catch (error) {
        logger.error('Failed to load test data:', { error: error.message, stack: error.stack, file: filePath });
    }
};

// Validation functions
const validateEmail = (email) => !email ? 'Email is required' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Invalid email';
const validatePhone = (phone) => !phone ? 'Phone is required' : /^(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(phone) ? null : 'Invalid phone';
const validateAddress = (address) => address && address.length > 200 ? 'Address must be 200 characters or less' : null;
const validateContact = (contact) => {
    const errors = {};
    if (!contact.id || contact.id.length > 10) errors.id = 'ID must be 10 characters or less';
    if (!contact.firstName) errors.firstName = 'First name is required';
    if (!contact.lastName) errors.lastName = 'Last name is required';
    const emailError = validateEmail(contact.email);
    if (emailError) errors.email = emailError;
    const phoneError = validatePhone(contact.phone);
    if (phoneError) errors.phone = phoneError;
    const addressError = validateAddress(contact.address);
    if (addressError) errors.address = addressError;
    return errors;
};

/**
 * Handles GET request to retrieve all contacts.
 * @param {Object} res - Response object.
 * @returns {Object} JSON response with contacts.
 */
app.get('/contacts', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM contacts ORDER BY id');
        logger.info('GET /contacts - Retrieved all contacts', { count: rows.length });
        res.json(rows);
    } catch (err) {
        logger.error('GET /contacts error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Handles POST request to add a new contact.
 * @param {Object} req.body - Contact data.
 * @param {Object} res - Response object.
 * @returns {Object} JSON response.
 */
app.post('/contacts', async (req, res) => {
    const { id, firstName, lastName, phone, address, email } = req.body;
    const validationErrors = validateContact({ id, firstName, lastName, phone, address, email });
    if (Object.keys(validationErrors).length > 0) {
        logger.warn('POST /contacts - Validation failed', validationErrors);
        return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    try {
        await db.execute(
            'INSERT INTO contacts (id, firstName, lastName, phone, address, email) VALUES (?, ?, ?, ?, ?, ?)',
            [id, firstName, lastName, phone, address, email]
        );
        logger.info('POST /contacts - Contact added', { id });
        res.status(201).json({ message: 'Contact added successfully' });
    } catch (err) {
        logger.error('POST /contacts error:', err);
        res.status(400).json({ error: 'Duplicate ID or database error' });
    }
});

/**
 * Handles PUT request to update a contact.
 * @param {Object} req.params - Contact ID.
 * @param {Object} req.body - Updated contact data.
 * @param {Object} res - Response object.
 * @returns {Object} JSON response.
 */
app.put('/contacts/:id', async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, phone, address, email } = req.body;
    const validationErrors = validateContact({ id, firstName, lastName, phone, address, email });
    if (Object.keys(validationErrors).length > 0) {
        logger.warn('PUT /contacts/:id - Validation failed', validationErrors);
        return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    try {
        const [result] = await db.execute(
            'UPDATE contacts SET firstName = ?, lastName = ?, phone = ?, address = ?, email = ? WHERE id = ?',
            [firstName, lastName, phone, address, email, id]
        );
        if (result.affectedRows === 0) {
            logger.warn('PUT /contacts/:id - Contact not found', { id });
            return res.status(404).json({ error: 'Contact not found' });
        }
        logger.info('PUT /contacts/:id - Contact updated', { id });
        res.json({ message: 'Contact updated successfully' });
    } catch (err) {
        logger.error('PUT /contacts/:id error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Handles DELETE request to delete a contact.
 * @param {Object} req.params - Contact ID.
 * @param {Object} res - Response object.
 * @returns {Object} JSON response.
 */
app.delete('/contacts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM contacts WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            logger.warn('DELETE /contacts/:id - Contact not found', { id });
            return res.status(404).json({ error: 'Contact not found' });
        }
        logger.info('DELETE /contacts/:id - Contact deleted', { id });
        res.json({ message: 'Contact deleted successfully' });
    } catch (err) {
        logger.error('DELETE /contacts/:id error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.url, method: req.method });
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
(async () => {
    await initializeDatabase();
    await loadTestData();
    app.listen(PORT, () => {
        logger.info('Server running on port ' + PORT);
        console.log('Server running on port ' + PORT);
    });
})();