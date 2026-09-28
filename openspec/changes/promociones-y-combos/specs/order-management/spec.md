## ADDED Requirements

### Requirement: A paid order does not change
Once an order is Pagada, the system SHALL refuse to add, remove or modify its lines, and SHALL NOT recompute its total.

Today nothing stops it: adding a line to a paid order recomputes the total, so what was charged and what the order says can drift apart with no record of either. With discounts recomputed from the current lines, a later recomputation would silently change the amount a customer already paid.

A discount line SHALL keep a copy of the name of whatever granted it, as the item lines already keep `nombrePlatillo` and `costoPlatillo`: what was sold is reported as it was on the day it was sold, even after the promotion is renamed or withdrawn.

#### Scenario: Adding to an order already paid
- **WHEN** a line is added to an order whose status is Pagada
- **THEN** the request is refused and the order's total is unchanged

#### Scenario: A promotion is withdrawn after it was used
- **WHEN** a promotion that was applied to a paid order is later deleted or renamed
- **THEN** that order still shows the name and the amount it was granted
