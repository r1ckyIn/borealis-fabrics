# ADR-001: Modular Monolith Architecture

## Status

Accepted

## Context

Borealis Fabrics is a fabric trading management system serving ~100 suppliers, ~50 B2B customers, and processing 500+ orders per month. The system needs to support supply chain automation (Phase 1) and B2B e-commerce (Phase 2).

Key constraints:
- Solo developer with enterprise-grade discipline
- Monthly server budget: ~100 CNY
- MVP concurrent users: 5-10
- Need for future scalability (microservices, AI features, logistics API)

## Decision

Adopt **Modular Monolith** architecture using NestJS Modules.

Each business domain is encapsulated in a separate NestJS Module:
- AuthModule, FabricModule, SupplierModule, CustomerModule
- OrderModule, QuoteModule, LogisticsModule
- FileModule, ImportModule, CommonModule

Modules communicate via dependency injection (service imports), not HTTP calls.

## Rationale

### Why Modular Monolith over Microservices
- **Simplicity**: Single deployment, no inter-service communication overhead
- **Cost**: Runs on a single lightweight server (~100 CNY/month)
- **Solo developer**: No need for service mesh, distributed tracing, etc.
- **Performance**: In-process calls, no network latency

### Why Modular Monolith over Plain Monolith
- **Separation of concerns**: Each module has clear boundaries
- **Future extraction**: Any module can be extracted into a microservice
- **Testability**: Modules can be tested in isolation
- **Maintainability**: Changes in one module don't cascade to others

### Alternatives Considered
1. **Microservices**: Too complex for solo developer, too expensive for MVP budget
2. **Plain Monolith**: Poor maintainability, hard to evolve
3. **Serverless (SCF)**: Cold start latency, vendor lock-in, complex local development

## Consequences

### Positive
- Low operational cost and complexity
- Fast development iteration
- Clear module boundaries for future microservice extraction
- Single database simplifies transactions

### Negative
- Scaling is limited to vertical (bigger server)
- All modules share the same process; a crash affects everything
- Database schema is shared, module boundaries are convention-based

### Mitigation
- Docker containerization for consistent deployment
- Health check endpoints for quick failure detection
- Strict module dependency rules enforced by code review
