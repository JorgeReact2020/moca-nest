HubSpot to PostgreSQL Synchronizer - NestJS Implementation
Project Overview
Build a robust, production-ready HubSpot webhook synchronizer using NestJS that validates webhook signatures, retrieves contact data from HubSpot, and stores it in a PostgreSQL database on AWS.
Technical Stack

Framework: NestJS (TypeScript)
Database: PostgreSQL (AWS RDS)
Validation: class-validator and class-transformer
ORM: TypeORM (or Prisma - choose best for project)
Logging: Winston with file rotation (Laravel-style logs)
Environment: dotenv for configuration

Core Requirements
1. Webhook Endpoint

Create a POST endpoint /webhooks/hubspot to receive HubSpot webhook events
Handle contact creation/update events
Return appropriate HTTP status codes (200, 401, 400, 500)

2. Signature Verification Middleware

Implement a NestJS middleware/guard to verify HubSpot webhook signatures
Use HMAC SHA-256 validation
Compare X-HubSpot-Signature header against computed signature
Secret key stored in .env as HUBSPOT_WEBHOOK_SECRET
Reject requests with invalid signatures (401 Unauthorized)
Log all verification attempts (success/failure)

3. HubSpot API Integration

Extract objectId from webhook payload
Use HubSpot API to fetch complete contact details:

firstname
lastname (not "name")
email


Use HubSpot API client library (@hubspot/api-client)
API key stored in .env as HUBSPOT_API_KEY
Handle API rate limits and errors gracefully

4. Database Operations

update Contact entity with TypeORM decorators
Fields: id (UUID), firstName, lastName, email, hubspotId, createdAt, updatedAt
Implement upsert logic (update if exists, create if new)
Use transactions for data consistency
Proper error handling for database operations

5. Validation & DTOs

Create DTOs for webhook payload with class-validator decorators
Validate all incoming data
Create DTOs for HubSpot API responses
Sanitize and validate data before database insertion
Use ValidationPipe globally

6. Logging System (Laravel-style)

Use Winston logger with daily file rotation
Log structure: storage/logs/app-YYYY-MM-DD.log
Log levels: error, warn, info, debug
Include in logs:

All incoming webhook requests (timestamp, payload, headers)
Signature verification results
HubSpot API calls (request/response)
Database operations
Errors with stack traces


Create custom LoggerService injectable throughout the app
Format: [YYYY-MM-DD HH:mm:ss] [LEVEL] Message {context}

7. Project Structure
src/
├── common/
│   ├── guards/
│   │   └── hubspot-signature.guard.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── decorators/
├── config/
│   ├── database.config.ts
│   ├── hubspot.config.ts
│   └── logger.config.ts
├── modules/
│   ├── webhook/
│   │   ├── dto/
│   │   │   ├── hubspot-webhook.dto.ts
│   │   │   └── contact.dto.ts
│   │   ├── webhook.controller.ts
│   │   ├── webhook.service.ts
│   │   └── webhook.module.ts
│   ├── hubspot/
│   │   ├── hubspot.service.ts
│   │   └── hubspot.module.ts
│   └── contact/
│       ├── entities/
│       │   └── contact.entity.ts
│       ├── contact.service.ts
│       └── contact.module.ts
├── shared/
│   └── services/
│       └── logger.service.ts
└── main.ts
8. Code Quality Standards

TypeScript: Strict mode enabled
ESLint: Airbnb style guide with NestJS rules
Prettier: Consistent formatting
Error Handling:

Try-catch blocks for all async operations
Custom exception filters
Never expose internal errors to clients


Type Safety: No any types, proper interfaces/types everywhere
Dependency Injection: Proper use of NestJS DI system
Documentation: JSDoc comments for all public methods
Testing Ready: Structure code for unit/integration tests

9. Security & Robustness

Rate limiting on webhook endpoint
Request size limits
Timeout handling for external API calls
Retry logic with exponential backoff for HubSpot API
Database connection pooling
Graceful shutdown handling
Health check endpoint
Input sanitization against injection attacks

10. Environment Variables (.env)
# HubSpot
HUBSPOT_WEBHOOK_SECRET=your_secret_here
HUBSPOT_API_KEY=your_api_key_here

# Database
DATABASE_HOST=your-aws-rds-endpoint
DATABASE_PORT=5432
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_db_name

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
Implementation Notes

The project has existing code - review it first before making changes
Follow NestJS best practices and conventions
Use async/await consistently
Implement proper error boundaries
Add TODO comments for future enhancements
Keep functions small and focused (single responsibility)
Use meaningful variable and function names

Expected Behavior

Webhook arrives → Signature verified → Valid ✓
Extract objectId from payload
Call HubSpot API to get contact details
Validate data with class-validator
Upsert contact to PostgreSQL
Log entire flow with timestamps
Return 200 OK to HubSpot

Error Scenarios to Handle

Invalid webhook signature → 401 + log
Missing/malformed payload → 400 + log
HubSpot API failure → retry → eventual 500 + log + alert
Database connection failure → 500 + log + alert
Duplicate email handling → update existing record

Build this with the mindset that it will run in production handling thousands of webhooks per day. Make it bulletproof.


Architecture Pattern (NestJS Best Practices)
Follow the Controller → Service → Repository pattern strictly:
Controllers (*.controller.ts)

Responsibility: HTTP layer only

Handle incoming requests
Route definition and HTTP decorators (@Post, @Get, etc.)
Apply guards, interceptors, and pipes
Request/response transformation
Return HTTP status codes


Should NOT: Contain business logic, database calls, or external API calls
Example:

typescript@Controller('webhooks')
@UseGuards(HubSpotSignatureGuard)
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly logger: LoggerService
  ) {}

  @Post('hubspot')
  async handleHubSpotWebhook(@Body() payload: HubSpotWebhookDto) {
    this.logger.info('Received HubSpot webhook', { payload });
    await this.webhookService.processContactWebhook(payload);
    return { status: 'success' };
  }
}
Services (*.service.ts)

Responsibility: Business logic layer

Orchestrate operations
Call other services (HubSpot API, Contact service)
Transform data between layers
Handle complex workflows


Should NOT: Know about HTTP concerns (requests, responses, status codes)

Repositories/Entities (*.entity.ts, *.repository.ts)

Responsibility: Data access layer

Database operations only
TypeORM entities and repositories
Query building



Why This Matters:

Testability: Each layer can be unit tested independently
Reusability: Services can be used by multiple controllers (HTTP, GraphQL, CLI, Queue workers)
Maintainability: Clear separation of concerns
Scalability: Easy to refactor or replace layers


Updated Key Requirement:
Every module MUST follow this pattern:

1 Controller (HTTP layer)
1+ Services (business logic)
Entities/Repositories (data layer)
DTOs for data validation
Module file to tie them together