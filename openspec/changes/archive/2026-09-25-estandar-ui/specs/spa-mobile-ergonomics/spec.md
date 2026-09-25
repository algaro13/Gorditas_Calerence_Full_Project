## ADDED Requirements

### Requirement: A closed set of sizes, not a recommendation
The SPA SHALL define its spacing, control and type sizes as a small closed set, published as component classes that a developer applies by name rather than composing by hand.

The set SHALL be: spacing of 8, 12, 16, 24, 32 and 48 pixels; button heights of 44, 48 and 56 pixels; a single field height of 48 pixels; and four named type sizes, none below 14 pixels, with body text at 16.

Sizes SHALL be named for their role, not their measurement, so that changing the measurement later does not require renaming every use.

Applying a standard size SHALL be shorter to write than composing the same result from utilities. A standard that costs more than ignoring it gets ignored, and the rule stops being enforced by anything but review.

#### Scenario: Building a new control
- **WHEN** a developer adds a button, a field or a label
- **THEN** a named class gives a size that already meets the touch and legibility floors, with no per-component decision

#### Scenario: A size outside the set
- **WHEN** a control needs a size the set does not contain
- **THEN** that is a signal to extend the set deliberately, not to add a one-off value, because one-off values are how the previous sizes drifted

### Requirement: Labels do not depend on whitespace between flex items
A control's label SHALL remain readable regardless of how the control lays out its children. Text that must read as a phrase SHALL live in a single text node, rather than relying on whitespace between sibling elements, because a flex or grid container drops that whitespace and joins the words.

#### Scenario: Responsive label in a flex button
- **WHEN** a button lays its children out with flex and shows a longer label only on wider screens
- **THEN** the words of that label are separated on every screen, and never render joined
