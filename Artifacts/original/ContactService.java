import java.util.HashMap;
import java.util.Map;

public class ContactService {
    private final Map<String, Contact> contacts = new HashMap<>();

    // Add Contact
    public boolean addContact(Contact contact) {
        if (contacts.containsKey(contact.getContactId())) {
            return false; // ID already exists
        }
        contacts.put(contact.getContactId(), contact);
        return true;
    }

    // Delete Contact
    public boolean deleteContact(String contactId) {
        return contacts.remove(contactId) != null;
    }

    // Update Contact (validate if contact exists)
    public boolean updateContact(String contactId, String firstName, String lastName, String phone, String address) {
        Contact contact = contacts.get(contactId);
        if (contact == null) {
            return false; // Contact does not exist
        }
        // Only update fields if they are not null
        if (firstName != null) contact.setFirstName(firstName);
        if (lastName != null) contact.setLastName(lastName);
        if (phone != null) contact.setPhone(phone);
        if (address != null) contact.setAddress(address);
        return true;
    }

    // Get Contact
    public Contact getContact(String contactId) {
        return contacts.get(contactId);
    }
}

