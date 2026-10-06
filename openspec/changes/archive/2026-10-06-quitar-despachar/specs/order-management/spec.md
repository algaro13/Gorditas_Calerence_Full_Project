## ADDED Requirements

### Requirement: Orders go from the kitchen straight to the cashier
The order flow SHALL have three steps: take the order, prepare it in the kitchen (Surtir orden) and charge it (Cobrar). An order marked as prepared (Surtida) SHALL appear in Cobrar and be chargeable without an intermediate delivery step. No role SHALL see a Despachar screen in its menu.

#### Scenario: A prepared order is charged
- **WHEN** the kitchen marks a table's orders as prepared
- **THEN** the table appears in Cobrar and can be charged

#### Scenario: The waiter menu
- **WHEN** a waiter opens the menu
- **THEN** it shows Nueva orden, Editar orden and Cobrar, and no Despachar
