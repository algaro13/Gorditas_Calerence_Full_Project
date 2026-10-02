## ADDED Requirements

### Requirement: Browser tests reach the API the app uses
Browser tests that call the API directly SHALL resolve its address the same way the SPA does —`VITE_API_URL` from the environment, then from `.env.development`, then the same default— and MAY be overridden with `E2E_API_URL`. No test SHALL write the API's address by hand.

When a test and the app talk to different servers, a failure blames the feature for something that belongs to the environment.

#### Scenario: Backend on another port
- **WHEN** the backend runs on port 5001 and the SPA is started with `VITE_API_URL` pointing to it
- **THEN** the browser tests that prepare data through the API reach that same backend and pass

#### Scenario: Nothing configured
- **WHEN** no variable is set
- **THEN** the tests use the address in `Gorditas_frontend/project/.env.development`, as the app does
