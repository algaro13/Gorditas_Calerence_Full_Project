## ADDED Requirements

### Requirement: A day with movement appears in the summary
The daily summary SHALL list every day of the period that had movement —sales, cash recorded, or expenses— and not only the days that had sales.

The totals of the period SHALL be the sum of what those days show, so that money spent on a day without sales is subtracted from the profit rather than ignored.

A day with no orders SHALL NOT offer to open its orders.

#### Scenario: Money spent on a day that did not open
- **WHEN** an expense is recorded on a day with no sales, inside the period being shown
- **THEN** that day appears in the summary with its expense, and the period's profit is lower by that amount

#### Scenario: Cash recorded on a quiet day
- **WHEN** cash is recorded for a day with no sales
- **THEN** that day appears in the summary with its amount, and the period's cash total includes it

#### Scenario: A period with expenses and no sales at all
- **WHEN** the period has no sales but does have expenses
- **THEN** the expenses are still fetched and shown, instead of an empty report
