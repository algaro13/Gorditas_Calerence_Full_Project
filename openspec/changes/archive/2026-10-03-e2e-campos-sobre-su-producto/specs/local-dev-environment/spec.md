## ADDED Requirements

### Requirement: Browser tests act only on what they created
A browser test that creates a record SHALL locate that record by something unique to it and perform every action —editing, reading, saving and deleting— inside it. It SHALL NOT act on the first matching control on the screen.

Acting on the first matching control works only while the list happens to show that record first. When it does not, the test measures the wrong record and fails at random, and a cleanup step deletes data the test never created.

#### Scenario: The list has not filtered yet
- **WHEN** a test searches for the record it just created and the list still shows other records
- **THEN** the test still edits, checks and deletes its own record, and no other

