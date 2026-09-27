## MODIFIED Requirements

### Requirement: The standard is enforced by a test, not by review
The repository SHALL carry browser tests that assert the touch and legibility floors on every route at phone width: no interactive control smaller than 44 pixels on either axis, no interface text below 14 pixels, and no horizontal overflow of the page.

A rule that only a person checks is a rule that drifts. The sizes in this capability were measured by hand once and 136 of 161 buttons were already below the floor; without a test, the next change starts that drift again.

The tests SHALL measure the states that only appear after an interaction, not only the screen as it opens. An inline editor does not exist until someone taps to edit, so a test that measures screens at rest cannot see it: two editors reached production with their buttons overlapping while the rule against it was written and a test was watching. Opening those editors SHALL NOT change data, and a run that finds none SHALL fail rather than pass without measuring anything.

The tests SHALL also assert that every route renders content and that the order lifecycle — take, prepare, deliver, charge — completes, because a screen that fails to load or a flow that breaks makes the sizes irrelevant.

The tests SHALL cover editing as well as creating: changing a dish and saving the restaurant configuration. A form that submits without persisting leaves the screen looking correct and the data unchanged, so each of these SHALL reload the page before asserting, since asserting without reloading only proves the client updated its own state.

#### Scenario: A control is added below the floor
- **WHEN** a change introduces an interactive control smaller than 44 pixels at phone width
- **THEN** the ergonomics test fails and names the control

#### Scenario: An inline editor does not fit
- **WHEN** the controls of an editor that opens on tap do not fit the card they are drawn in
- **THEN** the test opens that editor and reports the overflow, instead of measuring the screen as it was before the tap

#### Scenario: A screen stops rendering
- **WHEN** a change leaves any route blank or throwing in the console
- **THEN** the smoke test fails for that route

#### Scenario: The order lifecycle breaks
- **WHEN** a change prevents an order from being taken, prepared, delivered or charged
- **THEN** the flow test fails at the step that broke

#### Scenario: An edit stops persisting
- **WHEN** a change makes a dish edit or a configuration save submit without persisting
- **THEN** the corresponding test fails after reloading, because the old value is still there
