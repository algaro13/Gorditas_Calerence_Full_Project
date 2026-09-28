## ADDED Requirements

### Requirement: Sales are reported gross, discounted and net
Where the report shows what was sold, it SHALL show three figures: what the items came to, what was given away, and what was charged.

Until now the day's sales were the sum of the order totals, and the two were the same number. With discounts that total becomes the net, and its meaning changes without anyone being told. A restaurant that cannot see what it gave away cannot tell a promotion that works from one that only costs money.

Manual discounts SHALL be visible apart from promotional ones, because they are the ones somebody has to answer for.

#### Scenario: A day with promotions
- **WHEN** the day had sales with promotions applied
- **THEN** the report shows the gross, the total discounted and the net, and the profit is computed from the net

#### Scenario: Discounts granted by hand
- **WHEN** a manager granted manual discounts during the day
- **THEN** their total is shown separately, with who granted them available for review
