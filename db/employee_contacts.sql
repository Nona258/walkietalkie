-- SQL: Create employee_contacts table for group chat
CREATE TABLE employee_contacts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id),
    contact_id INTEGER REFERENCES users(id),
    group_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SQL: Admin can add contacts to employee (insert statement example)
-- INSERT INTO employee_contacts (employee_id, contact_id, group_name) VALUES (1, 2, 'Security Team');

-- SQL: Get all contacts for an employee
-- SELECT u.* FROM users u JOIN employee_contacts ec ON u.id = ec.contact_id WHERE ec.employee_id = 1;

-- SQL: Get all groups for an employee
-- SELECT DISTINCT group_name FROM employee_contacts WHERE employee_id = 1;

-- SQL: Get all contacts in a group
-- SELECT u.* FROM users u JOIN employee_contacts ec ON u.id = ec.contact_id WHERE ec.employee_id = 1 AND ec.group_name = 'Security Team';
