## ADDED Requirements

### Requirement: The registration wizard fits a phone screen
On a 375 px wide screen the registration wizard SHALL show its step indicator and every input row inside the card, without horizontal scrolling. The final screen SHALL tell the user that the verification email may arrive in the spam or junk folder.

#### Scenario: Adding a dish on a phone
- **WHEN** the user reaches the quick catalog step on a 375 px wide screen
- **THEN** the dish name, the price and the add button are all visible inside the card

#### Scenario: Example catalog
- **WHEN** the user loads the example catalog
- **THEN** the dishes are Gordita de harina, Gordita de maíz, Quesadilla, Taco and Burrito
