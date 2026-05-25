## ADDED Requirements

### Requirement: Generic useApi hook for data fetching
The system SHALL provide a `useApi` hook that encapsulates the fetch-loading-error pattern with automatic state management.

#### Scenario: Hook manages loading state
- **WHEN** a component uses `useApi` to fetch data
- **THEN** the hook exposes `{ data, loading, error, refresh }` with correct state transitions

#### Scenario: Hook handles errors gracefully
- **WHEN** an API call fails
- **THEN** the hook sets `error` with the message and `loading` to false without crashing the component

### Requirement: usePolling hook for periodic data refresh
The system SHALL provide a `usePolling` hook that periodically refreshes data at a configurable interval.

#### Scenario: Polling starts on mount
- **WHEN** a component mounts with `usePolling(fetchFn, interval)`
- **THEN** it calls `fetchFn` immediately and then every `interval` milliseconds

#### Scenario: Polling stops on unmount
- **WHEN** the component unmounts
- **THEN** the polling interval is cleared to prevent memory leaks

#### Scenario: Polling interval is configurable
- **WHEN** `usePolling` is called with a custom interval
- **THEN** it uses that interval instead of the default from app-config

### Requirement: Domain hooks encapsulate business operations
The system SHALL provide domain-specific hooks (`useOrdenes`, `useCatalogos`, `useInventario`) that combine service calls with state management.

#### Scenario: useOrdenes provides order operations
- **WHEN** a component uses `useOrdenes()`
- **THEN** it receives `{ ordenes, loading, error, refresh, createOrden, updateStatus }` with all operations pre-wired

#### Scenario: useCatalogos loads catalog data
- **WHEN** a component uses `useCatalogos('platillo')`
- **THEN** it receives `{ items, loading, error, create, update, remove }` for that specific catalog model

#### Scenario: Hooks are composable
- **WHEN** a page needs multiple data sources
- **THEN** it can use multiple hooks independently without conflicts (e.g., `useOrdenes()` + `useCatalogos('mesa')`)
