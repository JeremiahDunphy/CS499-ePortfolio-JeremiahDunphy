import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ContactTest {

    // Test the Contact constructor with valid parameters
    @Test
    public void testValidContact() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        assertNotNull(contact);
        assertEquals("12345", contact.getContactId());
        assertEquals("John", contact.getFirstName());
        assertEquals("Doe", contact.getLastName());
        assertEquals("1234567890", contact.getPhone());
        assertEquals("123 Elm St", contact.getAddress());
    }

    // Test invalid contact ID (too long)
    @Test
    public void testInvalidContactId() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345678901", "John", "Doe", "1234567890", "123 Elm St");
        });
    }

    // Test invalid first name (too long)
    @Test
    public void testInvalidFirstName() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345", "Jonathan", "Doe", "1234567890", "123 Elm St");
        });
    }

    // Test invalid last name (too long)
    @Test
    public void testInvalidLastName() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345", "John", "DoeTheThird", "1234567890", "123 Elm St");
        });
    }

    // Test invalid phone number (not exactly 10 digits)
    @Test
    public void testInvalidPhoneNumber() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345", "John", "Doe", "123456789", "123 Elm St");
        });
    }

    // Test invalid address (too long)
    @Test
    public void testInvalidAddress() {
        assertThrows(IllegalArgumentException.class, () -> {
            new Contact("12345", "John", "Doe", "1234567890", "123 Elm Street, Apartment 101, Floor 3, Building A, City X");
        });
    }

    // Test valid update of first name
    @Test
    public void testSetValidFirstName() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        contact.setFirstName("Jane");
        assertEquals("Jane", contact.getFirstName());
    }

    // Test invalid update of first name (too long)
    @Test
    public void testSetInvalidFirstName() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        assertThrows(IllegalArgumentException.class, () -> {
            contact.setFirstName("Jonathan");
        });
    }

    // Test valid update of last name
    @Test
    public void testSetValidLastName() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        contact.setLastName("Smith");
        assertEquals("Smith", contact.getLastName());
    }

    // Test invalid update of last name (too long)
    @Test
    public void testSetInvalidLastName() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        assertThrows(IllegalArgumentException.class, () -> {
            contact.setLastName("DoeTheThird");
        });
    }

    // Test valid update of phone number
    @Test
    public void testSetValidPhoneNumber() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        contact.setPhone("0987654321");
        assertEquals("0987654321", contact.getPhone());
    }

    // Test invalid update of phone number (not 10 digits)
    @Test
    public void testSetInvalidPhoneNumber() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        assertThrows(IllegalArgumentException.class, () -> {
            contact.setPhone("123456789");
        });
    }

    // Test valid update of address
    @Test
    public void testSetValidAddress() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        contact.setAddress("456 Oak St");
        assertEquals("456 Oak St", contact.getAddress());
    }

    // Test invalid update of address (too long)
    @Test
    public void testSetInvalidAddress() {
        Contact contact = new Contact("12345", "John", "Doe", "1234567890", "123 Elm St");
        assertThrows(IllegalArgumentException.class, () -> {
            contact.setAddress("123 Elm Street, Apartment 101, Floor 3, Building A, City X");
        });
    }
}

