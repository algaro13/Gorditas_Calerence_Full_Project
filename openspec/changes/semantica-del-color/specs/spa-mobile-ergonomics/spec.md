## ADDED Requirements

### Requirement: Colour carries one meaning
Button colour SHALL encode the kind of action, drawn from a set small enough to recall at a glance: the primary action of a screen, advancing an order to its next state, destroying something, and everything else.

The same kind of action SHALL always carry the same colour. Advancing an order was painted in four different colours across the screens that do it, which teaches a rule and then breaks it — worse than having no rule, because the operator stops trusting the signal and reads every button anyway.

Colour SHALL NOT be used to tell neighbouring buttons apart. Their icon and their label already do that, and spending colour on it leaves none for meaning.

Status indicators are not actions and keep their own colours.

#### Scenario: Advancing an order from any screen
- **WHEN** an operator moves an order to its next state, from whichever screen does it
- **THEN** the control carries the same colour every time

#### Scenario: Sibling actions in one place
- **WHEN** several actions of the same kind sit together
- **THEN** they share a colour and are told apart by their labels and icons
