## ADDED Requirements

### Requirement: The standard is enforced by a test, not by review
The repository SHALL carry browser tests that assert the touch and legibility floors on every route at phone width: no interactive control smaller than 44 pixels on either axis, no interface text below 14 pixels, and no horizontal overflow of the page.

A rule that only a person checks is a rule that drifts. The sizes in this capability were measured by hand once and 136 of 161 buttons were already below the floor; without a test, the next change starts that drift again.

The tests SHALL also assert that every route renders content and that the order lifecycle — take, prepare, deliver, charge — completes, because a screen that fails to load or a flow that breaks makes the sizes irrelevant.

#### Scenario: A control is added below the floor
- **WHEN** a change introduces an interactive control smaller than 44 pixels at phone width
- **THEN** the ergonomics test fails and names the control

#### Scenario: A screen stops rendering
- **WHEN** a change leaves any route blank or throwing in the console
- **THEN** the smoke test fails for that route

#### Scenario: The order lifecycle breaks
- **WHEN** a change prevents an order from being taken, prepared, delivered or charged
- **THEN** the flow test fails at the step that broke
