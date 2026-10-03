## ADDED Requirements

### Requirement: Browser tests wait for what they measure
A browser test that measures an element SHALL first wait, with an assertion that retries, until that element is visible and the screen shows its content. Network idleness SHALL NOT be taken as proof that the page has rendered.

A test that measures too early fails now and then and passes on a retry, which teaches everyone to rerun the suite until it is green.

#### Scenario: The bar is measured right after loading
- **WHEN** a test opens a screen and measures the bottom navigation
- **THEN** it waits for the bar to be visible before measuring, and passes the same way on every run
