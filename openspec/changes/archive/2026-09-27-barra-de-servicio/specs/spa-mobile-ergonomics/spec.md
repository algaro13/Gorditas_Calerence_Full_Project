## MODIFIED Requirements

### Requirement: Navigation sits where the thumb reaches
On screens narrower than the desktop breakpoint, the SPA SHALL place its primary navigation at the bottom of the viewport, with each destination labelled in words rather than by icon alone.

The bar SHALL carry the tasks of service —taking an order, editing it, preparing or delivering it, and charging for it— in the order they happen, showing the ones the signed-in role has. Everything else, including the dashboard, SHALL sit behind a single further control, offered only when the role has something outside the bar. A place at the bottom of the screen is worth what it is pressed during a shift: the dashboard is read once or twice, while charging closes every table.

Where two destinations serve the same moment of service for different roles, the bar SHALL include both, so that each role finds its own rather than losing it behind the further control.

Navigation SHALL NOT consume horizontal space on a phone. A permanent side rail took 19 percent of the width from the content, which is part of why table columns did not fit.

The content and any floating message SHALL keep clear of the navigation bar wherever the bar is the topmost thing at that position, and the bar SHALL respect the device safe area. The clearance SHALL derive from the bar's rendered height rather than a written-down value: the bar's height depends on how the labels wrap, and a fixed figure left the message nine pixels behind it.

A floating message SHALL NOT be covered by anything. Clearing the bar is how that is achieved when the bar is in front; when a dialog covers the bar, raising the message above it instead puts it over the dialog's own buttons, which is the same failure with a different lid.

#### Scenario: Changing screens during service
- **WHEN** an operator moves between screens on a phone
- **THEN** the destinations are within thumb reach at the bottom, each named in words

#### Scenario: Charging a table
- **WHEN** a waiter finishes a table on a phone
- **THEN** charging is one tap away in the bar, not behind the further control

#### Scenario: A role with only service tasks
- **WHEN** the signed-in role has nothing beyond the tasks of service
- **THEN** all of them are visible and no further control is offered

#### Scenario: A message while the bar is present
- **WHEN** an action produces a message on a phone
- **THEN** the message appears above the navigation bar rather than behind it

#### Scenario: A message raised from inside a dialog
- **WHEN** an action inside a dialog produces a message, so the dialog already covers the bar
- **THEN** the message stays at the bottom edge and does not cover the dialog's own buttons
