const express = require('express');
const winston = require('winston');
const fs = require('fs').promises; // Use promises version of fs
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
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
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

let contacts = new Map(); // In-memory storage with sorted key behavior

// Validation functions
const validateEmail = (email) => {
    if (!email || !email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Please enter a valid email address';
};

const validatePhone = (phone) => {
    if (!phone || !phone.trim()) return 'Phone number is required';
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    const digitsOnly = cleanedPhone.replace(/[^\d]/g, '');
    if (digitsOnly.length < 10) return 'Phone number must have at least 10 digits';
    const phoneRegex = /^(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    return phoneRegex.test(phone) ? null : 'Please enter a valid phone number (e.g., +1-555-123-4567 or 555-123-4567)';
};

const validateAddress = (address) => {
    if (address && address.trim().length > 200) return 'Address must be 200 characters or less';
    return null;
};

const validateContact = (contact, isNewContact = false) => {
    const errors = {};
    if (!contact.id || !contact.id.trim()) errors.id = 'ID is required';
    else if (contact.id.trim().length > 10) errors.id = 'ID must be 10 characters or less';
    else if (isNewContact && contacts.has(contact.id.trim())) errors.id = 'ID already exists';
    if (!contact.firstName || !contact.firstName.trim()) errors.firstName = 'First name is required';
    if (!contact.lastName || !contact.lastName.trim()) errors.lastName = 'Last name is required';
    const emailError = validateEmail(contact.email);
    if (emailError) errors.email = emailError;
    const phoneError = validatePhone(contact.phone);
    if (phoneError) errors.phone = phoneError;
    const addressError = validateAddress(contact.address);
    if (addressError) errors.address = addressError;
    return errors;
};

// Load test data on startup
const loadTestData = async () => {
    const filePath = path.join(__dirname, 'TestData.txt');
    try {
        await fs.access(filePath); // Check if file exists
        const data = await fs.readFile(filePath, 'utf8');
        const lines = data.trim().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue; // Skip empty lines
            const parts = line.split(',');
            if (parts.length !== 6) {
                logger.warn(`Skipped invalid line: "${line}" - Expected 6 fields, got ${parts.length}`);
                continue;
            }
            const [id, firstName, lastName, phone, address, email] = parts;
            const contact = { id: id.trim(), firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), address: address.trim(), email: email.trim() };
            const validationErrors = validateContact(contact, true);
            if (Object.keys(validationErrors).length === 0) {
                contacts.set(id.trim(), contact);
                logger.info(`Loaded test contact with ID ${id}`);
            } else {
                logger.warn(`Skipped invalid test contact with ID ${id}:`, validationErrors);
            }
        }
        logger.info(`Loaded ${contacts.size} test contacts from ${filePath}`);
    } catch (error) {
        logger.error('Failed to load test data:', { error: error.message, stack: error.stack, file: filePath });
    }
};

loadTestData(); // Call on server startup

/**
 * Handles GET request to retrieve all contacts.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
app.get('/contacts', (req, res) => {
    logger.info('GET /contacts - Retrieving all contacts', { count: contacts.size });
    const sortedContacts = Array.from(contacts.values()).sort((a, b) => a.id.localeCompare(b.id));
    res.json(sortedContacts);
});

/**
 * Handles POST request to add a new contact.
 * @param {Object} req.body - Request body with id, firstName, lastName, phone, address, email.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
app.post('/contacts', (req, res) => {
    const { id, firstName, lastName, phone, address, email } = req.body;
    logger.info('POST /contacts - Adding new contact', { id, firstName, lastName });
    const validationErrors = validateContact(req.body, true);
    if (Object.keys(validationErrors).length > 0) {
        logger.warn('POST /contacts - Validation failed', { errors: validationErrors });
        return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    const contact = { id, firstName, lastName, phone, address, email };
    contacts.set(id, contact);
    logger.info('POST /contacts - Contact added successfully', { id, contactCount: contacts.size });
    res.status(201).json({ message: 'Contact added successfully' });
});

/**
 * Handles PUT request to update an existing contact.
 * @param {Object} req.params - Route parameter with contact ID.
 * @param {Object} req.body - Request body with updated firstName, lastName, phone, address, email.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
app.put('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, phone, address, email } = req.body;
    logger.info('PUT /contacts/:id - Updating contact', { id, firstName, lastName });
    if (!contacts.has(id)) {
        logger.warn('PUT /contacts/:id - Contact not found', { id });
        return res.status(404).json({ error: 'Contact not found' });
    }
    const contact = contacts.get(id);
    if (firstName) contact.firstName = firstName;
    if (lastName) contact.lastName = lastName;
    if (phone) contact.phone = phone;
    if (address) contact.address = address;
    if (email) contact.email = email;
    const validationErrors = validateContact(contact, false);
    if (Object.keys(validationErrors).length > 0) {
        logger.warn('PUT /contacts/:id - Validation failed', { id, errors: validationErrors });
        return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    logger.info('PUT /contacts/:id - Contact updated successfully', { id });
    res.json({ message: 'Contact updated successfully' });
});

/**
 * Handles DELETE request to delete a contact.
 * @param {Object} req.params - Route parameter with contact ID.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
app.delete('/contacts/:id', (req, res) => {
    const { id } = req.params;
    logger.info('DELETE /contacts/:id - Deleting contact', { id });
    if (contacts.delete(id)) {
        logger.info('DELETE /contacts/:id - Contact deleted successfully', { id, remainingContacts: contacts.size });
        res.json({ message: 'Contact deleted successfully' });
    } else {
        logger.warn('DELETE /contacts/:id - Contact not found', { id });
        res.status(404).json({ error: 'Contact not found' });
    }
});

/**
 * Handles GET request to retrieve a specific contact with binary search.
 * @param {Object} req.params - Route parameter with contact ID.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 2: Optimize with algorithms and data structures}
 */
app.get('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const sortedIds = Array.from(contacts.keys()).sort();
    let left = 0, right = sortedIds.length - 1;
    while (left <= right) {
        const mid = Math.floor(left + (right - left) / 2);
        if (sortedIds[mid] === id) {
            const contact = contacts.get(id);
            logger.info('GET /contacts/:id - Retrieved contact', { id });
            return res.status(200).json(contact);
        } else if (sortedIds[mid] < id) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    logger.warn('GET /contacts/:id - Contact not found', { id });
    res.status(404).json({ error: 'Contact not found' });
});

/**
 * Handles GET request to benchmark performance.
 * @param {Object} res - Response object to send performance data.
 * @returns {Object} JSON response with performance metrics.
 * @supports {Enhancement 2: Optimize with algorithms and data structures}
 */
app.get('/performance', (req, res) => {
    const testContacts = [];
    for (let i = 0; i < 100; i++) {
        testContacts.push({ id: String(i), firstName: `Name${i}`, lastName: `Last${i}`, phone: "1234567890", address: `Addr${i}`, email: `email${i}@example.com` });
    }

    let startTime = process.hrtime.bigint();
    testContacts.forEach(c => contacts.set(c.id, c));
    let endTime = process.hrtime.bigint();
    const treeMapInsertTime = Number(endTime - startTime) / 1e6; // ms

    startTime = process.hrtime.bigint();
    contacts.get("50"); // Example lookup
    endTime = process.hrtime.bigint();
    const treeMapLookupTime = Number(endTime - startTime) / 1e6; // ms

    startTime = process.hrtime.bigint();
    // Simulate binary search time
    const sortedIds = Array.from(contacts.keys()).sort();
    let left = 0, right = sortedIds.length - 1;
    while (left <= right) {
        const mid = Math.floor(left + (right - left) / 2);
        if (sortedIds[mid] === "50") break;
        else if (sortedIds[mid] < "50") left = mid + 1;
        else right = mid - 1;
    }
    endTime = process.hrtime.bigint();
    const binarySearchTime = Number(endTime - startTime) / 1e6; // ms

    res.json({ treeMapInsertTime, treeMapLookupTime, binarySearchTime });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { 
        error: err.message, 
        stack: err.stack,
        url: req.url,
        method: req.method 
    });
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info('Server running on port ' + PORT);
    console.log('Server running on port ' + PORT);
});