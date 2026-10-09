## ADDED Requirements

### Requirement: Service screens follow arrival order
The kitchen screen (Surtir orden) and the cashier screen (Cobrar) SHALL list work first-come,
first-served. Tables SHALL be ordered by their oldest order shown on that screen, oldest first,
never by table name. Within a table, orders SHALL be listed oldest first by the order's time, and
within an order the dishes and products SHALL be listed in the order they were captured.

#### Scenario: Kitchen queue
- **WHEN** Mesa 2 orders first, then Mesa 10, then Mesa 2 orders again
- **THEN** Surtir orden shows Mesa 2 above Mesa 10, and inside Mesa 2 the first order above the second

#### Scenario: Cashier queue is not alphabetical
- **WHEN** Mesa 10 is prepared from an order taken before Mesa 2's
- **THEN** Cobrar shows Mesa 10 above Mesa 2

### Requirement: Adding items keeps the order's place
Adding a dish or product to an existing order SHALL NOT change the order's time. The order keeps its
place in the kitchen and cashier queues, and reports keep the time it was taken.

#### Scenario: A table adds a dish
- **WHEN** a dish is added in Editar orden to an order taken earlier
- **THEN** the order's time is unchanged and it stays ahead of orders taken after it
