const express = require('express');
const winston = require('winston');
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

// Handle Winston errors
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

let contacts = []; // In-memory storage

// Validation functions
const validateEmail = (email) => {
    if (!email || !email.trim()) {
        return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Please enter a valid email address';
};

const validatePhone = (phone) => {
    if (!phone || !phone.trim()) {
        return 'Phone number is required';
    }
    
    // Remove all non-digit characters except + at the beginning
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check for minimum length (at least 10 digits)
    const digitsOnly = cleanedPhone.replace(/[^\d]/g, '');
    
    if (digitsOnly.length < 10) {
        return 'Phone number must have at least 10 digits';
    }
    
    // Check if it starts with + and has at least 10 digits, or has at least 10 digits without +
    const phoneRegex = /^(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    
    return phoneRegex.test(phone) ? null : 'Please enter a valid phone number (e.g., +1-555-123-4567 or 555-123-4567)';
};

const validateAddress = (address) => {
    // Address is optional, but if provided, validate length
    if (address && address.trim().length > 200) {
        return 'Address must be 200 characters or less';
    }
    return null;
};

const validateContact = (contact, isNewContact = false) => {
    const errors = {};
    
    // Required field validations
    if (!contact.id || !contact.id.trim()) {
        errors.id = 'ID is required';
    } else if (contact.id.trim().length > 10) {
        errors.id = 'ID must be 10 characters or less';
    } else if (isNewContact && contacts.find(c => c.id === contact.id.trim())) {
        errors.id = 'ID already exists. Please choose a different ID.';
    }
    
    if (!contact.firstName || !contact.firstName.trim()) {
        errors.firstName = 'First name is required';
    }
    
    if (!contact.lastName || !contact.lastName.trim()) {
        errors.lastName = 'Last name is required';
    }
    
    // Email validation
    const emailError = validateEmail(contact.email);
    if (emailError) errors.email = emailError;
    
    // Phone validation
    const phoneError = validatePhone(contact.phone);
    if (phoneError) errors.phone = phoneError;
    
    // Address validation (optional field)
    const addressError = validateAddress(contact.address);
    if (addressError) errors.address = addressError;
    
    return errors;
};

/**
 * Handles GET request to retrieve all contacts.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
// GET all contacts
app.get('/contacts', (req, res) => {
    logger.info('GET /contacts - Retrieving all contacts', { count: contacts.length });
    res.json(contacts);
});

/**
 * Handles POST request to add a new contact.
 * @param {Object} req.body - Request body with id, firstName, lastName, phone, address.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
// POST a new contact
app.post('/contacts', (req, res) => {
    const { id, firstName, lastName, phone, address, email } = req.body;
    
    logger.info('POST /contacts - Adding new contact', { id, firstName, lastName });
    
    // Validate contact data (includes ID validation and duplicate check)
    const validationErrors = validateContact(req.body, true); // true for new contact
    if (Object.keys(validationErrors).length > 0) {
        logger.warn('POST /contacts - Validation failed', { errors: validationErrors });
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validationErrors 
        });
    }
    
    const contact = { id, firstName, lastName, phone, address, email };
    contacts.push(contact);
    
    logger.info('POST /contacts - Contact added successfully', { id, contactCount: contacts.length });
    res.status(201).json({ message: 'Contact added successfully' });
});

/**
 * Handles PUT request to update an existing contact.
 * @param {Object} req.params - Route parameter with contact ID.
 * @param {Object} req.body - Request body with updated firstName, lastName, phone, address.
 * @param {Object} res - Response object to send status and message.
 * @returns {Object} JSON response with success message or error.
 * @supports {Enhancement 1: Develop RESTful API for CRUD operations}
 */
// PUT update a contact
app.put('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, phone, address, email } = req.body;
    
    logger.info('PUT /contacts/:id - Updating contact', { id, firstName, lastName });
    
    const contactIndex = contacts.findIndex(c => c.id === id);
    if (contactIndex === -1) {
        logger.warn('PUT /contacts/:id - Contact not found', { id });
        return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Validate contact data (no duplicate check for updates)
    const validationErrors = validateContact(req.body, false);
    if (Object.keys(validationErrors).length > 0) {
        logger.warn('PUT /contacts/:id - Validation failed', { id, errors: validationErrors });
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validationErrors 
        });
    }
    
    contacts[contactIndex] = { id, firstName, lastName, phone, address, email };
    
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
// DELETE a contact
app.delete('/contacts/:id', (req, res) => {
    const { id } = req.params;
    
    logger.info('DELETE /contacts/:id - Deleting contact', { id });
    
    const initialLength = contacts.length;
    contacts = contacts.filter(c => c.id !== id);
    
    if (contacts.length === initialLength) {
        logger.warn('DELETE /contacts/:id - Contact not found', { id });
        return res.status(404).json({ error: 'Contact not found' });
    }
    
    logger.info('DELETE /contacts/:id - Contact deleted successfully', { id, remainingContacts: contacts.length });
    res.json({ message: 'Contact deleted successfully' });
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

// Start server
app.listen(3000, () => {
    logger.info('Server running on port 3000');
    console.log('Server running on port 3000');
});