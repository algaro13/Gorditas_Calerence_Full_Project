## ADDED Requirements

### Requirement: The tenant owner holds no organization management role
Registration SHALL leave the restaurant owner without any management role over their own identity organization. The identity provider grants `ORG_OWNER` to the organization administrator even when no roles are requested, so registration SHALL remove that membership explicitly after creating the organization, and SHALL fail (triggering the rollback that deletes the organization) if it cannot.

The product does not need it: the backend administers organizations with its own machine account. Leaving it would let the owner create users straight in the identity provider's console, bypassing `/api/usuarios` and therefore the plan user limit.

#### Scenario: A freshly registered organization has no members
- **WHEN** a restaurant is registered through public onboarding
- **THEN** its identity organization has no members holding management roles

#### Scenario: The owner can still sign in
- **WHEN** the owner signs in with the password chosen at registration
- **THEN** authentication succeeds and their project role grant is unchanged
