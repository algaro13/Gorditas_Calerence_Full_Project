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

### Requirement: Records are readable and actionable on a phone
A screen that lists records SHALL present them on a phone in a form where every record reads on its own and its actions are reachable without scrolling sideways.

A table MAY be used from tablet width upward, where comparing rows across aligned columns is possible and worth its cost. On a phone it SHALL NOT be the only presentation, because the columns that fall off the right edge are the ones a table places last — which in this system was consistently the actions column.

Where both presentations exist, each field SHALL be defined once and used by both. Two copies of the same field diverge at the first change, and the divergence only shows on one screen size.

A control SHALL NOT extend beyond the bounds of the container it is drawn in, not merely beyond the viewport. A control that stops exactly at the screen edge passes a viewport check and is still clipped.

Where a screen serves several record types whose fields differ, both presentations SHALL honour the same conditions, so that the screen stays one screen rather than one per type.

#### Scenario: Acting on a record from a phone
- **WHEN** an operator opens a list of records on a phone
- **THEN** every action for a record is visible within the screen, with no horizontal scrolling and no hidden column

#### Scenario: The same list on a wide screen
- **WHEN** the same list is opened at tablet width or wider
- **THEN** it may be shown as a table, with all of its columns visible

#### Scenario: A control wider than its card
- **WHEN** a control does not fit the container it is drawn in
- **THEN** the layout gives it room rather than letting it overflow, and a test reports the overflow against the container

#### Scenario: A list whose fields depend on the record type
- **WHEN** a screen lists a type whose fields differ from another it also serves
- **THEN** the phone and the wide presentations show and hide the same fields

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

### Requirement: Reports read as records on a phone
On screens narrower than the tablet breakpoint, the reports screen SHALL present each record —a
day's sales, an order, a stock line, a product sold, an expense— as a self-contained card rather
than a table row, and SHALL keep every action for that record visible without sideways
scrolling.

Where a list carries a total, the total SHALL remain present and SHALL equal the sum of the
records shown.

From the tablet breakpoint up the screen MAY present the same records as a table, where
comparing rows across aligned columns is worth its cost. Both presentations SHALL derive each
field from a single definition, so that a correction to one cannot leave the other behind.

Controls on this screen SHALL be named in full words rather than abbreviations.

The exported spreadsheet SHALL be unaffected, as it is produced from the data rather than from
what is on screen.

#### Scenario: Reading the day's takings on a phone
- **WHEN** the manager opens the sales report on a phone
- **THEN** each day's figures and its actions are readable without scrolling sideways

#### Scenario: Looking into one order
- **WHEN** the manager opens the detail of an order
- **THEN** its products, dishes and extras read as lines with their amounts, not as tables inside a table

#### Scenario: Removing an expense
- **WHEN** the manager finds an expense to delete on a phone
- **THEN** the delete action is visible on that expense's card

