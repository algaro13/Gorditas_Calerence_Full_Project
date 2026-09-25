## ADDED Requirements

### Requirement: Feedback is visible where the hand is
A message the SPA shows in response to an action SHALL be visible without scrolling, regardless of where the action was triggered from.

Messages SHALL be anchored to the bottom of the viewport rather than placed in document flow above the control that caused them. A message rendered above a long form is off screen for anyone who pressed a button at its end, and from there the application appears not to have responded at all.

A message SHALL be dismissable by the operator and SHALL clear itself after a short time, so that it neither blocks the screen nor requires attention during service. Errors SHALL persist longer than confirmations, because they are the ones that need reading.

Messages SHALL NOT cover the controls of the screen they belong to.

#### Scenario: An action fails from the bottom of a long form
- **WHEN** an operator triggers a failing action from a control below the fold
- **THEN** the message is visible without scrolling

#### Scenario: A confirmation after a routine action
- **WHEN** an action succeeds
- **THEN** the confirmation appears and clears itself without the operator having to act
