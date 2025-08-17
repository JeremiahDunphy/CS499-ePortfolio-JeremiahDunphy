import React, { useState, useEffect } from 'react';
import './ContactManager.css';

/**
 * Manages contact display, addition, update, and deletion via React UI.
 * @returns {JSX.Element} Rendered contact management interface.
 * @supports {Enhancement 2: Develop React UI for CRUD operations}
 */
function ContactManager() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingContact, setEditingContact] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [newContact, setNewContact] = useState({
        id: '',
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        email: ''
    });
    const [validationErrors, setValidationErrors] = useState({});

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? null : 'Please enter a valid email address';
    };

    const validatePhone = (phone) => {
        const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
        const digitsOnly = cleanedPhone.replace(/[^\d]/g, '');
        if (digitsOnly.length < 10) return 'Phone number must have at least 10 digits';
        return phoneRegex.test(phone) ? null : 'Please enter a valid phone number (e.g., +1-555-123-4567 or 555-123-4567)';
    };

    const validateId = (id) => {
        if (!id.trim()) return 'ID is required';
        if (id.trim().length > 10) return 'ID must be 10 characters or less';
        if (!editingContact && contacts.find(c => c.id === id.trim())) return 'ID already exists. Please choose a different ID.';
        return null;
    };

    const validateForm = (contact) => {
        const errors = {};
        if (!contact.id.trim()) errors.id = 'ID is required';
        else if (contact.id.trim().length > 10) errors.id = 'ID must be 10 characters or less';
        else if (!editingContact && contacts.find(c => c.id === contact.id.trim())) errors.id = 'ID already exists. Please choose a different ID.';
        if (!contact.firstName.trim()) errors.firstName = 'First name is required';
        if (!contact.lastName.trim()) errors.lastName = 'Last name is required';
        if (!contact.phone.trim()) errors.phone = validatePhone(contact.phone) || 'Phone number is required';
        if (!contact.email.trim()) errors.email = validateEmail(contact.email) || 'Email address is required';
        if (contact.address && contact.address.trim().length > 200) errors.address = 'Address must be 200 characters or less';
        return errors;
    };

    // Fetch contacts on component mount
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/contacts');
            const data = await response.json();
            // Remove client-side sorting since MySQL handles ORDER BY id
            setContacts(data);
        } catch (error) {
            setError('Failed to fetch contacts');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const errors = validateForm(newContact);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
        try {
            const contactToAdd = {
                ...newContact,
                id: newContact.id.trim()
            };
            const response = await fetch('http://localhost:3000/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactToAdd),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add contact');
            }
            setContacts([...contacts, contactToAdd]);
            setNewContact({ id: '', firstName: '', lastName: '', phone: '', address: '', email: '' });
            setShowForm(false);
            setError(null);
            setValidationErrors({});
        } catch (err) {
            setError(err.message);
            console.error('Error adding contact:', err);
        }
    };

    const handleUpdate = async (contact) => {
        const errors = validateForm(contact);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/contacts/${contact.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contact),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update contact');
            }
            setContacts(contacts.map(c => c.id === contact.id ? contact : c));
            setEditingContact(null);
            setError(null);
            setValidationErrors({});
        } catch (err) {
            setError(err.message);
            console.error('Error updating contact:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;
        try {
            const response = await fetch(`http://localhost:3000/contacts/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete contact');
            setContacts(contacts.filter(c => c.id !== id));
            setError(null);
        } catch (err) {
            setError('Failed to delete contact');
            console.error('Error deleting contact:', err);
        }
    };

    const startEdit = (contact) => {
        setEditingContact({ ...contact });
        setValidationErrors({});
    };

    const cancelEdit = () => {
        setEditingContact(null);
        setValidationErrors({});
    };

    const handleInputChange = (field, value) => {
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        if (editingContact) {
            setEditingContact({ ...editingContact, [field]: value });
        } else {
            setNewContact({ ...newContact, [field]: value });
        }
    };

    const getFieldClassName = (fieldName) => `form-control ${validationErrors[fieldName] ? 'is-invalid' : ''}`;

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Loading contacts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm">
                        <div className="card-header bg-primary text-white">
                            <div className="d-flex justify-content-between align-items-center">
                                <h2 className="mb-0">
                                    <i className="fas fa-address-book me-2"></i>
                                    Contact Manager
                                </h2>
                                <button 
                                    className="btn btn-light btn-sm"
                                    onClick={() => setShowForm(!showForm)}
                                >
                                    {showForm ? 'Cancel' : (
                                        <>
                                            <i className="fas fa-plus me-1"></i>
                                            Add Contact
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            {error && (
                                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    {error}
                                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                                </div>
                            )}
                            {showForm && (
                                <div className="card mb-4 border-primary">
                                    <div className="card-header bg-light">
                                        <h5 className="mb-0">
                                            <i className="fas fa-user-plus me-2"></i>
                                            Add New Contact
                                        </h5>
                                    </div>
                                    <div className="card-body">
                                        <form onSubmit={handleAdd}>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">ID *</label>
                                                    <input
                                                        type="text"
                                                        className={getFieldClassName('id')}
                                                        value={newContact.id}
                                                        onChange={(e) => handleInputChange('id', e.target.value)}
                                                        placeholder="Enter unique ID (max 10 chars)"
                                                        maxLength="10"
                                                        required
                                                    />
                                                    {validationErrors.id && <div className="invalid-feedback">{validationErrors.id}</div>}
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">First Name *</label>
                                                    <input
                                                        type="text"
                                                        className={getFieldClassName('firstName')}
                                                        value={newContact.firstName}
                                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                        required
                                                    />
                                                    {validationErrors.firstName && <div className="invalid-feedback">{validationErrors.firstName}</div>}
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">Last Name *</label>
                                                    <input
                                                        type="text"
                                                        className={getFieldClassName('lastName')}
                                                        value={newContact.lastName}
                                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                        required
                                                    />
                                                    {validationErrors.lastName && <div className="invalid-feedback">{validationErrors.lastName}</div>}
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">Phone *</label>
                                                    <input
                                                        type="tel"
                                                        className={getFieldClassName('phone')}
                                                        value={newContact.phone}
                                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                                        placeholder="e.g., +1-555-123-4567"
                                                        required
                                                    />
                                                    {validationErrors.phone && <div className="invalid-feedback">{validationErrors.phone}</div>}
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">Email *</label>
                                                    <input
                                                        type="email"
                                                        className={getFieldClassName('email')}
                                                        value={newContact.email}
                                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                                        placeholder="e.g., john.doe@example.com"
                                                        required
                                                    />
                                                    {validationErrors.email && <div className="invalid-feedback">{validationErrors.email}</div>}
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">Address</label>
                                                    <textarea
                                                        className={getFieldClassName('address')}
                                                        rows="2"
                                                        value={newContact.address}
                                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                                        placeholder="Enter address (optional, max 200 chars)"
                                                        maxLength="200"
                                                    ></textarea>
                                                    {validationErrors.address && <div className="invalid-feedback">{validationErrors.address}</div>}
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button type="submit" className="btn btn-primary">
                                                    <i className="fas fa-save me-1"></i>
                                                    Save Contact
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-secondary"
                                                    onClick={() => {
                                                        setShowForm(false);
                                                        setValidationErrors({});
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                            <div className="contacts-list">
                                {contacts.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="fas fa-address-book fa-3x text-muted mb-3"></i>
                                        <h5 className="text-muted">No contacts found</h5>
                                        <p className="text-muted">Add your first contact to get started!</p>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => setShowForm(true)}
                                        >
                                            <i className="fas fa-plus me-1"></i>
                                            Add Contact
                                        </button>
                                    </div>
                                ) : (
                                    <div className="row">
                                        {contacts.map(contact => (
                                            <div key={contact.id} className="col-lg-6 col-xl-4 mb-4">
                                                <div className="card h-100 contact-card">
                                                    {editingContact && editingContact.id === contact.id ? (
                                                        <div className="card-body edit-mode">
                                                            <div className="edit-header mb-3">
                                                                <h6 className="text-primary mb-0">
                                                                    <i className="fas fa-edit me-2"></i>
                                                                    Edit Contact
                                                                </h6>
                                                            </div>
                                                            <form onSubmit={(e) => {
                                                                e.preventDefault();
                                                                handleUpdate(editingContact);
                                                            }}>
                                                                <div className="row">
                                                                    <div className="col-6 mb-3">
                                                                        <label className="form-label small fw-bold">ID *</label>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control form-control-sm ${validationErrors.id ? 'is-invalid' : ''}`}
                                                                            value={editingContact.id}
                                                                            onChange={(e) => handleInputChange('id', e.target.value)}
                                                                            placeholder="ID"
                                                                            disabled
                                                                            required
                                                                        />
                                                                        {validationErrors.id && <div className="invalid-feedback">{validationErrors.id}</div>}
                                                                    </div>
                                                                    <div className="col-6 mb-3">
                                                                        <label className="form-label small fw-bold">First Name *</label>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control form-control-sm ${validationErrors.firstName ? 'is-invalid' : ''}`}
                                                                            value={editingContact.firstName}
                                                                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                                            placeholder="First Name"
                                                                            required
                                                                        />
                                                                        {validationErrors.firstName && <div className="invalid-feedback">{validationErrors.firstName}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="row">
                                                                    <div className="col-6 mb-3">
                                                                        <label className="form-label small fw-bold">Last Name *</label>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control form-control-sm ${validationErrors.lastName ? 'is-invalid' : ''}`}
                                                                            value={editingContact.lastName}
                                                                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                                            placeholder="Last Name"
                                                                            required
                                                                        />
                                                                        {validationErrors.lastName && <div className="invalid-feedback">{validationErrors.lastName}</div>}
                                                                    </div>
                                                                    <div className="col-6 mb-3">
                                                                        <label className="form-label small fw-bold">Phone *</label>
                                                                        <input
                                                                            type="tel"
                                                                            className={`form-control form-control-sm ${validationErrors.phone ? 'is-invalid' : ''}`}
                                                                            value={editingContact.phone}
                                                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                                                            placeholder="Phone"
                                                                            required
                                                                        />
                                                                        {validationErrors.phone && <div className="invalid-feedback">{validationErrors.phone}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="row">
                                                                    <div className="col-6 mb-3">
                                                                        <label className="form-label small fw-bold">Email *</label>
                                                                        <input
                                                                            type="email"
                                                                            className={`form-control form-control-sm ${validationErrors.email ? 'is-invalid' : ''}`}
                                                                            value={editingContact.email}
                                                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                                                            placeholder="Email"
                                                                            required
                                                                        />
                                                                        {validationErrors.email && <div className="invalid-feedback">{validationErrors.email}</div>}
                                                                    </div>
                                                                    <div className="col-6 mb-3">
                                                                        <label className="form-label small fw-bold">Address</label>
                                                                        <textarea
                                                                            className={`form-control form-control-sm ${validationErrors.address ? 'is-invalid' : ''}`}
                                                                            rows="2"
                                                                            value={editingContact.address}
                                                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                                                            placeholder="Address (max 200 chars)"
                                                                            maxLength="200"
                                                                        ></textarea>
                                                                        {validationErrors.address && <div className="invalid-feedback">{validationErrors.address}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-2">
                                                                    <button type="submit" className="btn btn-success btn-sm">
                                                                        <i className="fas fa-check me-1"></i>
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={cancelEdit}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="card-body">
                                                                <div className="contact-header">
                                                                    <div className="contact-avatar">
                                                                        <i className="fas fa-user"></i>
                                                                    </div>
                                                                    <div className="contact-info">
                                                                        <h6 className="contact-name mb-1">
                                                                            {contact.firstName} {contact.lastName}
                                                                        </h6>
                                                                        <div className="contact-actions">
                                                                            <button 
                                                                                className="btn btn-outline-primary btn-sm me-1"
                                                                                onClick={() => startEdit(contact)}
                                                                                title="Edit Contact"
                                                                            >
                                                                                <i className="fas fa-edit"></i>
                                                                            </button>
                                                                            <button 
                                                                                className="btn btn-outline-danger btn-sm"
                                                                                onClick={() => handleDelete(contact.id)}
                                                                                title="Delete Contact"
                                                                            >
                                                                                <i className="fas fa-trash"></i>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="contact-details mt-3">
                                                                    <div className="contact-detail-item">
                                                                        <i className="fas fa-id-card text-primary"></i>
                                                                        <span>ID: {contact.id}</span>
                                                                    </div>
                                                                    {contact.phone && (
                                                                        <div className="contact-detail-item">
                                                                            <i className="fas fa-phone text-primary"></i>
                                                                            <span>{contact.phone}</span>
                                                                        </div>
                                                                    )}
                                                                    {contact.email && (
                                                                        <div className="contact-detail-item">
                                                                            <i className="fas fa-envelope text-primary"></i>
                                                                            <span>{contact.email}</span>
                                                                        </div>
                                                                    )}
                                                                    {contact.address && (
                                                                        <div className="contact-detail-item">
                                                                            <i className="fas fa-map-marker-alt text-primary"></i>
                                                                            <span>{contact.address}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContactManager;