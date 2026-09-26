## ADDED Requirements

### Requirement: Re-reading the restaurant keeps the screen alive
Once the SPA knows which restaurant it is showing, re-reading it SHALL NOT report the app as loading, so the screen stays mounted with the data it already had until the answer arrives.

A full-screen loading state SHALL be reserved for not yet knowing who the user is. Tearing the tree down for a refresh destroys the state of whatever screen asked for it — its confirmation message, its scroll position, its open dialog and anything being typed.

A refresh that answers 401 or 404 `NO_TENANT` SHALL still move the user, as those answers mean the session or the restaurant is gone. A refresh that fails for any other reason SHALL keep the data already loaded rather than sending the user back to sign in.

#### Scenario: Saving the business settings
- **WHEN** an Admin saves the configuration, which re-reads the restaurant afterwards
- **THEN** the screen stays mounted and its confirmation message is shown

#### Scenario: The session ended while refreshing
- **WHEN** a refresh answers 401
- **THEN** the user is sent to sign in again, as before

#### Scenario: The network hiccups while refreshing
- **WHEN** a refresh fails with a transient error and a restaurant was already loaded
- **THEN** the loaded restaurant is kept and the user stays where they were
