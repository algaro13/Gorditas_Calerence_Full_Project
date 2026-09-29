## ADDED Requirements

### Requirement: Sales are reported gross, discounted and net
Where the report shows what was sold, it SHALL show three figures: what the items came to, what was given away, and what was charged.

Until now the day's sales were the sum of the order totals, and the two were the same number. With discounts that total becomes the net, and its meaning changes without anyone being told. A restaurant that cannot see what it gave away cannot tell a promotion that works from one that only costs money.

Each promotion SHALL be reportable on its own, so that the restaurant can tell a promotion that brings people in from one that only gives away what it would have sold anyway.

#### Scenario: A day with promotions
- **WHEN** the day had sales with promotions applied
- **THEN** the report shows the gross, the total discounted and the net, and the profit is computed from the net

#### Scenario: Telling one promotion from another
- **WHEN** two promotions ran during the same period
- **THEN** what each one gave away is shown apart, not only their sum
