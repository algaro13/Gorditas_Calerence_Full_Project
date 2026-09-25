## ADDED Requirements

### Requirement: Navigation sits where the thumb reaches
On screens narrower than the desktop breakpoint, the SPA SHALL place its primary navigation at the bottom of the viewport, with each destination labelled in words rather than by icon alone.

It SHALL show the destinations the current role actually has, up to four, and offer the remainder behind a single further control only when the role has more. Most roles in this system have four or fewer, so for them nothing is hidden.

Navigation SHALL NOT consume horizontal space on a phone. A permanent side rail took 19 percent of the width from the content, which is part of why table columns did not fit.

The content and any floating message SHALL keep clear of the navigation bar, and the bar SHALL respect the device safe area.

#### Scenario: Changing screens during service
- **WHEN** an operator moves between screens on a phone
- **THEN** the destinations are within thumb reach at the bottom, each named in words

#### Scenario: A role with few destinations
- **WHEN** the signed-in role has four destinations or fewer
- **THEN** all of them are visible and none is hidden behind a further control

#### Scenario: A message while the bar is present
- **WHEN** an action produces a message on a phone
- **THEN** the message appears above the navigation bar rather than behind it
