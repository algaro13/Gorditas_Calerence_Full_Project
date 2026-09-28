## ADDED Requirements

### Requirement: A discount is a line of the order, not a number on it
A reduction in what an order costs SHALL be recorded as its own line, carrying a negative amount, the name of what granted it, and whether it came from a promotion or from a person.

The order's total SHALL be the sum of every line including those, computed where it is computed today, so that no path can produce a total that the lines do not explain.

A discount SHALL NOT be recorded by changing the price of the lines it applies to. Prices on the lines are what the menu said; moving the discount into them loses both the menu price and the reason, and prorating it across lines introduces rounding that makes the parts stop summing to the whole.

#### Scenario: A combo alongside a promotion
- **WHEN** an order has three dishes and a drink, one promotion applies, and a combo covers part of it
- **THEN** the order keeps its four item lines at menu prices, carries one discount line per grant, and its total is the sum of all of them

#### Scenario: Reading what was given away
- **WHEN** someone asks why an order was charged less than its items
- **THEN** each discount names what granted it and how much it took off

### Requirement: A combo is sold as what it is made of
A combo SHALL be recorded as the items it contains, at their catalog prices, plus the discount that brings the order to the combo's price. It SHALL NOT be recorded as a single opaque line.

Everything downstream of an order reads its lines: the kitchen to know what to prepare, the stock to know what left the shelf, and the product reports to know what sold. A combo that hides its contents is invisible to all three — the drink inside it is never deducted from stock and never appears among the products sold.

#### Scenario: A combo containing a stocked product
- **WHEN** a combo containing a bottled drink is sold
- **THEN** the drink is deducted from stock and counted among the products sold, exactly as if it had been ordered on its own

#### Scenario: The kitchen reads a combo
- **WHEN** an order containing a combo reaches the preparation screen
- **THEN** the dishes of the combo are listed one by one, not as the combo's name

### Requirement: Promotion discounts are derived, manual ones are not
A discount granted by a promotion SHALL be recomputed from the order's current lines whenever those lines change, and SHALL replace whatever the previous computation wrote.

Applying a promotion once, when a line is added, leaves the order wrong as soon as the line is removed: a three-for-two that was earned by a third dish must stop being earned when that dish goes back. Deriving it is what keeps the order and its discounts telling the same story.

A discount entered by a person is an input, not a derivation, and SHALL survive recomputation. The two SHALL be distinguishable, or recomputing an order would silently delete what a manager authorised.

#### Scenario: The line that earned the promotion is removed
- **WHEN** a dish that qualified the order for a promotion is deleted
- **THEN** the promotion's discount is recomputed and no longer applies

#### Scenario: A manual discount survives a change to the order
- **WHEN** a manager has granted a discount and another line is then added
- **THEN** the manual discount is still there and the order's total still includes it

### Requirement: Only one promotion applies unless it says otherwise
When more than one promotion applies to the same order, the system SHALL grant only the one that reduces the total the most, unless a promotion is marked as combinable, in which case it SHALL be granted alongside the others.

Without a stated policy the same basket produces different totals depending on the order in which the rules happen to run, which is impossible to explain to a customer and impossible to test.

#### Scenario: Two promotions reach the same basket
- **WHEN** a basket qualifies for both a three-for-two and a percentage off, neither marked combinable
- **THEN** only the one worth more to the customer is granted, and the other is not

### Requirement: Granting a discount by hand is an authorised act
Entering a discount by hand SHALL be restricted to Admin and Encargado, SHALL require a written reason, and SHALL record who granted it and when.

A manual discount is money leaving the till. Without a name against it there is no difference between a courtesy to a regular and a theft, and the day's report cannot tell the owner which one happened.

#### Scenario: A waiter tries to discount
- **WHEN** a Mesero tries to grant a manual discount
- **THEN** the system refuses, as it does for any action outside the role

#### Scenario: A discount without a reason
- **WHEN** a manual discount is submitted with no reason written
- **THEN** it is refused, because a discount nobody can explain is one nobody can review

### Requirement: A promotion runs on the restaurant's clock
A promotion limited to certain days or hours SHALL be evaluated in the restaurant's time zone, server-side, never in UTC nor in whatever zone the device happens to be set to.

A happy hour from four to six evaluated in UTC starts at ten in the morning in Mexico. This is the same failure already corrected in the daily report, whose day was computed with `toISOString()`.

#### Scenario: A happy hour in the evening
- **WHEN** an order is taken at 17:00 local time and a promotion runs from 16:00 to 18:00 local
- **THEN** the promotion applies, regardless of the date in UTC or the clock of the device taking the order

### Requirement: The shapes of a promotion are a closed set
The system SHALL support a fixed set of promotion shapes — a combo, N items for the price of M, and a percentage or amount off a category — each with its own named parameters.

Closed on purpose, as with the interface sizes: a general rule engine is where this kind of feature stops being finishable, and no restaurant has yet asked for the rule that would justify one. A shape that is needed later is added deliberately, with its own scenarios.

#### Scenario: A promotion that does not fit a shape
- **WHEN** someone needs a rule that none of the shapes expresses
- **THEN** a new shape is added to the set with its parameters and its tests, rather than a free-form expression being evaluated at runtime
