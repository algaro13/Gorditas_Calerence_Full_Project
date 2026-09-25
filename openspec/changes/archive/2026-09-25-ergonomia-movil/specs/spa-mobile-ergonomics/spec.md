## ADDED Requirements

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

### Requirement: Destructive actions are not a tap away from routine ones
A control whose meaning changes from routine to destructive SHALL require an explicit confirmation before the destructive outcome, so that a single mis-tap cannot remove an item from an order.

The confirmation SHALL apply only to the destructive transition. Asking on every tap would slow the service rhythm this requirement exists to protect, and an operator who is prompted constantly stops reading the prompt.

#### Scenario: Reducing a quantity to zero
- **WHEN** an item's quantity is 1 and the operator taps the reduce control
- **THEN** the item is not removed by that tap alone; removal happens only after the operator confirms

#### Scenario: Reducing a quantity above one
- **WHEN** an item's quantity is above 1 and the operator taps the reduce control
- **THEN** the quantity drops immediately, with no confirmation
