## REMOVED Requirements

### Requirement: Destructive actions are not a tap away from routine ones
Sustituido por el requisito de acciones irreversibles: cobrar no destruye nada y aun así no se
puede deshacer, así que la categoría que importa es la reversibilidad, no la destrucción.

## ADDED Requirements

### Requirement: Irreversible actions are not a tap away from routine ones
An action the operator cannot undo SHALL require an explicit confirmation, so that a single mis-tap cannot remove an item from an order or close a sale.

The confirmation SHALL name what is about to happen, including the amount when money is involved. A prompt that only asks «are you sure?» carries no information, and an operator who is asked that all day stops reading it — the prompt has to be the thing that makes them look.

The confirmation SHALL apply only to the irreversible transition. Asking on every tap would slow the service rhythm this requirement exists to protect. In particular, an action that merely records delivery SHALL NOT be confirmed, even when it shares a control with charging.

Charging a whole table SHALL be confirmed once, naming the total, rather than once per order.

#### Scenario: Reducing a quantity to zero
- **WHEN** an item's quantity is 1 and the operator taps the reduce control
- **THEN** the item is not removed by that tap alone; removal happens only after the operator confirms

#### Scenario: Reducing a quantity above one
- **WHEN** an item's quantity is above 1 and the operator taps the reduce control
- **THEN** the quantity drops immediately, with no confirmation

#### Scenario: Charging an order
- **WHEN** the operator taps the charge control on an order
- **THEN** the order is not marked paid by that tap alone, and the confirmation states the amount being charged

#### Scenario: Charging a whole table
- **WHEN** the operator charges every order of a table at once
- **THEN** a single confirmation naming the table total precedes the charge, not one per order

#### Scenario: Marking an already-paid order as delivered
- **WHEN** the operator taps the same control on an order that is already paid, which then means «deliver»
- **THEN** the action happens immediately, with no confirmation, because nothing irreversible occurs
