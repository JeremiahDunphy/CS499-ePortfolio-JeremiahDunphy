import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ContactServiceTest {
    @Test
    public void testAddContact() {
        ContactService service = new ContactService();
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        assertTrue(service.addContact(contact)); // Contact added successfully
        assertFalse(service.addContact(contact)); // Duplicate ID should fail
    }

    @Test
    public void testDeleteContact() {
        ContactService service = new ContactService();
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        service.addContact(contact);
        assertTrue(service.deleteContact("12345")); // Contact deleted successfully
        assertFalse(service.deleteContact("12345")); // Already deleted, should fail
    }

    @Test
    public void testUpdateContact() {
        ContactService service = new ContactService();
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        service.addContact(contact);
        // Update contact with valid new data
        assertTrue(service.updateContact("12345", "Jane", "Smith", "0987654321", "456 Oak St"));
        Contact updatedContact = service.getContact("12345");
        assertEquals("Jane", updatedContact.getFirstName());
        assertEquals("Smith", updatedContact.getLastName());
        assertEquals("0987654321", updatedContact.getPhone());
        assertEquals("456 Oak St", updatedContact.getAddress());
    }

    @Test
    public void testUpdateNonexistentContact() {
        ContactService service = new ContactService();
        // Update nonexistent contact, should return false
        assertFalse(service.updateContact("99999", "Jane", "Smith", "0987654321", "456 Oak St"));
    }

    @Test
    public void testInvalidContactIdOnAdd() {
        ContactService service = new ContactService();
        // Adding a contact with invalid ID should throw an exception
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345678901", "John", "Doe", "1234567890", "123 Elm St");
        });
    }
    
    @Test
    public void testInvalidPhoneNumber() {
        ContactService service = new ContactService();
        // Adding a contact with an invalid phone number should throw an exception
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345", "John", "Doe", "12345678", "123 Elm St");
        });
    }
}

