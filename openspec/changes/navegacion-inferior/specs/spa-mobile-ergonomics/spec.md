## ADDED Requirements

### Requirement: Navigation sits where the thumb reaches
On screens narrower than the desktop breakpoint, the SPA SHALL place its primary navigation at the bottom of the viewport, with each destination labelled in words rather than by icon alone.

It SHALL show the destinations the current role actually has, up to four, and offer the remainder behind a single further control only when the role has more. Most roles in this system have four or fewer, so for them nothing is hidden.

Navigation SHALL NOT consume horizontal space on a phone. A permanent side rail took 19 percent of the width from the content, which is part of why table columns did not fit.

The content and any floating message SHALL keep clear of the navigation bar wherever the bar is the topmost thing at that position, and the bar SHALL respect the device safe area. The clearance SHALL derive from the bar's rendered height rather than a written-down value: the bar's height depends on how the labels wrap, and a fixed figure left the message nine pixels behind it.

A floating message SHALL NOT be covered by anything. Clearing the bar is how that is achieved when the bar is in front; when a dialog covers the bar, raising the message above it instead puts it over the dialog's own buttons, which is the same failure with a different lid.

#### Scenario: Changing screens during service
- **WHEN** an operator moves between screens on a phone
- **THEN** the destinations are within thumb reach at the bottom, each named in words

#### Scenario: A role with few destinations
- **WHEN** the signed-in role has four destinations or fewer
- **THEN** all of them are visible and none is hidden behind a further control

#### Scenario: A message while the bar is present
- **WHEN** an action produces a message on a phone
- **THEN** the message appears above the navigation bar rather than behind it

#### Scenario: A message raised from inside a dialog
- **WHEN** an action inside a dialog produces a message, so the dialog already covers the bar
- **THEN** the message stays at the bottom edge and does not cover the dialog's own buttons
