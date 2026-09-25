# spa-mobile-ergonomics Specification

## Purpose
TBD - created by archiving change ergonomia-movil. Update Purpose after archive.
## Requirements
### Requirement: Finger-sized controls on phones
On viewports narrower than the tablet breakpoint, every interactive control the SPA renders — buttons, links styled as buttons, inputs, selects, textareas and checkboxes — SHALL present a touch target of at least 44 CSS pixels on both axes, and adjacent targets SHALL be separated by at least 8 pixels.

The floor SHALL be enforced centrally rather than per component, so that a control added later inherits it without anyone remembering to. A per-component fix would leave the rule unwritten and the next screen would reintroduce the problem.

#### Scenario: Taking an order on a phone
- **WHEN** the order flow is measured at a phone viewport
- **THEN** no control the flow presents is smaller than 44 pixels on either axis, including the quantity controls, the paid-table checkbox and the dialog close button

#### Scenario: A newly added control
- **WHEN** a component is added without any size class of its own
- **THEN** it still meets the floor, because the rule lives in one place and applies by default

### Requirement: Readable text on phones
On phone viewports the SPA SHALL NOT render interface text below 16 CSS pixels, and form fields SHALL use at least 16 pixels so that mobile Safari does not zoom the viewport when a field takes focus.

Text SHALL NOT be smaller on a phone than on a larger screen. Sizing that shrinks as the screen shrinks inverts the need: the phone is where the reader is furthest from ideal conditions.

#### Scenario: Focusing a form field
- **WHEN** a customer name or quantity field takes focus on iOS
- **THEN** the page does not zoom and the layout does not shift

#### Scenario: Responsive type scale
- **WHEN** any screen is rendered at phone and at desktop width
- **THEN** the phone rendering uses type at least as large as the desktop one

### Requirement: Irreversible actions are not a tap away from routine ones
An action the operator cannot undo SHALL require an explicit confirmation, so that a single mis-tap cannot remove an item from an order or close a sale.

The confirmation SHALL name what is about to happen, including the amount when money is involved. A prompt that only asks «are you sure?» carries no information, and an operator who is asked that all day stops reading it — the prompt has to be the thing that makes them look.

The confirmation SHALL apply only to the irreversible transition. Asking on every tap would slow the service rhythm this requirement exists to protect. In particular, an action that merely records delivery SHALL NOT be confirmed, even when it shares a control with charging.

Charging a whole table SHALL be confirmed once, naming the total, rather than once per order.

#### Scenario: Reducing a quantity to zero
- **WHEN** an item's quantity is 1 and the operator taps the reduce control
- **THEN** the item is not removed by that tap alone; removal happens only after the operator confirms

#### Scenario: Reducing a quantity above one
- **WHEN** an item's quantity is above 1 and the operator taps the reduce control
- **THEN** the quantity drops immediately, with no confirmation

#### Scenario: Charging an order
- **WHEN** the operator taps the charge control on an order
- **THEN** the order is not marked paid by that tap alone, and the confirmation states the amount being charged

#### Scenario: Charging a whole table
- **WHEN** the operator charges every order of a table at once
- **THEN** a single confirmation naming the table total precedes the charge, not one per order

#### Scenario: Marking an already-paid order as delivered
- **WHEN** the operator taps the same control on an order that is already paid, which then means «deliver»
- **THEN** the action happens immediately, with no confirmation, because nothing irreversible occurs

### Requirement: A closed set of sizes, not a recommendation
The SPA SHALL define its spacing, control and type sizes as a small closed set, published as component classes that a developer applies by name rather than composing by hand.

The set SHALL be: spacing of 8, 12, 16, 24, 32 and 48 pixels; button heights of 44, 48 and 56 pixels; a single field height of 48 pixels; and four named type sizes, none below 14 pixels, with body text at 16.

Sizes SHALL be named for their role, not their measurement, so that changing the measurement later does not require renaming every use.

Applying a standard size SHALL be shorter to write than composing the same result from utilities. A standard that costs more than ignoring it gets ignored, and the rule stops being enforced by anything but review.

The screens SHALL express these sizes in their own markup rather than relying on a corrective stylesheet to impose them. A layer that fixes sizes in the browser leaves the source saying something different from what renders, and the next developer copies what the source says.

#### Scenario: Building a new control
- **WHEN** a developer adds a button, a field or a label
- **THEN** a named class gives a size that already meets the touch and legibility floors, with no per-component decision

#### Scenario: A size outside the set
- **WHEN** a control needs a size the set does not contain
- **THEN** that is a signal to extend the set deliberately, not to add a one-off value, because one-off values are how the previous sizes drifted

#### Scenario: Reading an existing screen
- **WHEN** a developer opens a migrated screen to copy a pattern
- **THEN** the classes they read are the standard ones, not hand-composed sizes that a later stylesheet corrects

### Requirement: Labels do not depend on whitespace between flex items
A control's label SHALL remain readable regardless of how the control lays out its children. Text that must read as a phrase SHALL live in a single text node, rather than relying on whitespace between sibling elements, because a flex or grid container drops that whitespace and joins the words.

#### Scenario: Responsive label in a flex button
- **WHEN** a button lays its children out with flex and shows a longer label only on wider screens
- **THEN** the words of that label are separated on every screen, and never render joined

### Requirement: The standard is enforced by a test, not by review
The repository SHALL carry browser tests that assert the touch and legibility floors on every route at phone width: no interactive control smaller than 44 pixels on either axis, no interface text below 14 pixels, and no horizontal overflow of the page.

A rule that only a person checks is a rule that drifts. The sizes in this capability were measured by hand once and 136 of 161 buttons were already below the floor; without a test, the next change starts that drift again.

The tests SHALL also assert that every route renders content and that the order lifecycle — take, prepare, deliver, charge — completes, because a screen that fails to load or a flow that breaks makes the sizes irrelevant.

The tests SHALL cover editing as well as creating: changing a dish and saving the restaurant configuration. A form that submits without persisting leaves the screen looking correct and the data unchanged, so each of these SHALL reload the page before asserting, since asserting without reloading only proves the client updated its own state.

#### Scenario: A control is added below the floor
- **WHEN** a change introduces an interactive control smaller than 44 pixels at phone width
- **THEN** the ergonomics test fails and names the control

#### Scenario: A screen stops rendering
- **WHEN** a change leaves any route blank or throwing in the console
- **THEN** the smoke test fails for that route

#### Scenario: The order lifecycle breaks
- **WHEN** a change prevents an order from being taken, prepared, delivered or charged
- **THEN** the flow test fails at the step that broke

#### Scenario: An edit stops persisting
- **WHEN** a change makes a dish edit or a configuration save submit without persisting
- **THEN** the corresponding test fails after reloading, because the old value is still there

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

