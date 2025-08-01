# Source Tree - Voyageur Nest Manali

## Project Structure Overview
This document outlines the complete source tree structure for the Voyageur Nest Manali Complete Booking Management System.

## Root Directory Structure

```
voyageur-nest-manali/
├── .bmad-core/                 # BMAD framework configuration
│   ├── core-config.yaml       # Core configuration
│   └── tasks/                  # Development tasks
├── .trae/                      # Trae AI configuration
│   └── rules/                  # Agent rules
├── docs/                       # Project documentation
├── src/                        # Source code
├── public/                     # Static assets
├── tests/                      # Test files
├── scripts/                    # Build and deployment scripts
├── .env.example               # Environment variables template
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── vite.config.ts             # Vite build configuration
└── README.md                  # Project overview
```

## Documentation Structure (`docs/`)

```
docs/
├── final_epics_stories.md     # Complete project requirements
├── system_architecture.md    # Technical architecture
├── architecture/              # Architecture documentation
│   ├── coding-standards.md   # Development standards
│   ├── tech-stack.md         # Technology stack
│   └── source-tree.md        # This file
├── api/                       # API documentation
│   ├── endpoints.md          # API endpoints
│   ├── schemas.md            # Data schemas
│   └── authentication.md    # Auth documentation
├── deployment/                # Deployment guides
│   ├── production.md         # Production deployment
│   ├── staging.md            # Staging environment
│   └── local-setup.md        # Local development setup
└── user-guides/              # User documentation
    ├── admin-guide.md        # Admin user guide
    ├── staff-guide.md        # Staff user guide
    └── guest-guide.md        # Guest user guide
```

## Source Code Structure (`src/`)

```
src/
├── components/                # React components
│   ├── common/               # Shared components
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Form/
│   │   ├── Table/
│   │   └── Layout/
│   ├── booking/              # Booking management
│   │   ├── BookingList/
│   │   ├── BookingCard/
│   │   ├── BookingForm/
│   │   ├── CheckInForm/
│   │   └── CheckOutForm/
│   ├── guest/                # Guest management
│   │   ├── GuestProfile/
│   │   ├── GuestList/
│   │   ├── GuestForm/
│   │   └── GuestHistory/
│   ├── property/             # Property management
│   │   ├── PropertyList/
│   │   ├── PropertyForm/
│   │   ├── RoomManagement/
│   │   └── PropertySettings/
│   ├── analytics/            # Analytics and reporting
│   │   ├── Dashboard/
│   │   ├── RevenueChart/
│   │   ├── OccupancyChart/
│   │   └── Reports/
│   ├── email/                # Email management
│   │   ├── EmailTemplates/
│   │   ├── EmailLogs/
│   │   ├── EmailParser/
│   │   └── EmailComposer/
│   ├── fnb/                  # Food & Beverage
│   │   ├── MenuManagement/
│   │   ├── OrderManagement/
│   │   ├── KitchenDisplay/
│   │   └── RoomService/
│   └── auth/                 # Authentication
│       ├── LoginForm/
│       ├── SignupForm/
│       ├── PasswordReset/
│       └── UserProfile/
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts           # Authentication hook
│   ├── useBookings.ts       # Booking management
│   ├── useGuests.ts         # Guest management
│   ├── useProperties.ts     # Property management
│   ├── useAnalytics.ts      # Analytics data
│   ├── useEmailParser.ts    # AI email parsing
│   └── useSupabase.ts       # Supabase integration
├── services/                 # External service integrations
│   ├── supabase/            # Supabase client
│   │   ├── client.ts        # Supabase client setup
│   │   ├── auth.ts          # Authentication service
│   │   ├── database.ts      # Database operations
│   │   └── storage.ts       # File storage
│   ├── ai/                  # AI services
│   │   ├── gemini.ts        # Google Gemini integration
│   │   ├── emailParser.ts   # Email parsing service
│   │   └── analytics.ts     # AI analytics
│   ├── email/               # Email services
│   │   ├── resend.ts        # Resend integration
│   │   ├── templates.ts     # Email templates
│   │   └── sender.ts        # Email sending
│   ├── sms/                 # SMS services
│   │   ├── twilio.ts        # Twilio integration
│   │   └── textbelt.ts      # TextBelt integration
│   └── ota/                 # OTA integrations
│       ├── booking-parser.ts # Booking email parser
│       ├── sync.ts          # OTA synchronization
│       └── webhooks.ts      # Webhook handlers
├── types/                    # TypeScript type definitions
│   ├── booking.ts           # Booking types
│   ├── guest.ts             # Guest types
│   ├── property.ts          # Property types
│   ├── email.ts             # Email types
│   ├── analytics.ts         # Analytics types
│   ├── fnb.ts               # F&B types
│   └── auth.ts              # Authentication types
├── utils/                    # Utility functions
│   ├── date.ts              # Date utilities
│   ├── currency.ts          # Currency formatting
│   ├── validation.ts        # Form validation
│   ├── formatting.ts        # Data formatting
│   ├── constants.ts         # Application constants
│   └── helpers.ts           # General helpers
├── contexts/                 # React contexts
│   ├── AuthContext.tsx      # Authentication context
│   ├── BookingContext.tsx   # Booking context
│   ├── PropertyContext.tsx  # Property context
│   └── ThemeContext.tsx     # Theme context
├── pages/                    # Page components
│   ├── Dashboard/           # Main dashboard
│   ├── Bookings/            # Booking management pages
│   ├── Guests/              # Guest management pages
│   ├── Properties/          # Property management pages
│   ├── Analytics/           # Analytics pages
│   ├── Settings/            # Settings pages
│   ├── FnB/                 # Food & Beverage pages
│   └── Auth/                # Authentication pages
├── styles/                   # Styling files
│   ├── globals.css          # Global styles
│   ├── components.css       # Component styles
│   └── utilities.css        # Utility classes
├── assets/                   # Static assets
│   ├── images/              # Image files
│   ├── icons/               # Icon files
│   └── fonts/               # Font files
├── config/                   # Configuration files
│   ├── database.ts          # Database configuration
│   ├── ai.ts                # AI configuration
│   ├── email.ts             # Email configuration
│   └── app.ts               # App configuration
├── App.tsx                   # Main App component
├── main.tsx                  # Application entry point
└── vite-env.d.ts            # Vite type definitions
```

## Test Structure (`tests/`)

```
tests/
├── unit/                     # Unit tests
│   ├── components/          # Component tests
│   ├── hooks/               # Hook tests
│   ├── services/            # Service tests
│   └── utils/               # Utility tests
├── integration/             # Integration tests
│   ├── api/                 # API tests
│   ├── database/            # Database tests
│   └── ai/                  # AI service tests
├── e2e/                     # End-to-end tests
│   ├── booking-flow.spec.ts # Booking workflow tests
│   ├── guest-management.spec.ts # Guest management tests
│   └── analytics.spec.ts    # Analytics tests
├── fixtures/                # Test data
│   ├── bookings.json       # Sample booking data
│   ├── guests.json         # Sample guest data
│   └── emails.json         # Sample email data
└── setup/                   # Test setup
    ├── test-utils.ts       # Testing utilities
    ├── mocks.ts            # Mock data
    └── setup.ts            # Test configuration
```

## Configuration Files

### Build Configuration
- `vite.config.ts`: Vite build configuration
- `tsconfig.json`: TypeScript compiler options
- `tailwind.config.js`: Tailwind CSS configuration
- `postcss.config.js`: PostCSS configuration

### Development Configuration
- `.env.example`: Environment variables template
- `.env.local`: Local environment variables (gitignored)
- `.eslintrc.js`: ESLint configuration
- `.prettierrc`: Prettier configuration
- `package.json`: Dependencies and scripts

### Deployment Configuration
- `vercel.json`: Vercel deployment configuration
- `Dockerfile`: Docker configuration (if needed)
- `docker-compose.yml`: Docker Compose setup

## Database Schema Files

```
database/
├── migrations/              # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_ai_features.sql
│   └── 003_add_fnb_tables.sql
├── seeds/                   # Seed data
│   ├── properties.sql
│   ├── users.sql
│   └── sample_data.sql
├── functions/               # Database functions
│   ├── booking_triggers.sql
│   ├── analytics_functions.sql
│   └── ai_processing.sql
└── policies/                # Row Level Security policies
    ├── booking_policies.sql
    ├── guest_policies.sql
    └── property_policies.sql
```

## Scripts Directory (`scripts/`)

```
scripts/
├── build/                   # Build scripts
│   ├── build-prod.sh       # Production build
│   └── build-staging.sh    # Staging build
├── deploy/                  # Deployment scripts
│   ├── deploy-prod.sh      # Production deployment
│   └── deploy-staging.sh   # Staging deployment
├── database/                # Database scripts
│   ├── migrate.sh          # Run migrations
│   ├── seed.sh             # Seed database
│   └── backup.sh           # Database backup
└── development/             # Development scripts
    ├── setup.sh            # Initial setup
    ├── reset-db.sh         # Reset database
    └── generate-types.sh   # Generate TypeScript types
```

## Key File Purposes

### Core Application Files
- `src/main.tsx`: Application entry point with providers
- `src/App.tsx`: Main app component with routing
- `src/config/app.ts`: Application-wide configuration

### Service Integration
- `src/services/supabase/client.ts`: Supabase client configuration
- `src/services/ai/gemini.ts`: Google Gemini AI integration
- `src/services/email/resend.ts`: Email service integration

### Type Safety
- `src/types/`: TypeScript definitions for all data models
- Database types auto-generated from Supabase schema

### Testing
- `tests/`: Comprehensive test suite covering all functionality
- Mock data and utilities for consistent testing

This source tree structure ensures:
- Clear separation of concerns
- Scalable architecture
- Easy navigation and maintenance
- Comprehensive testing coverage
- Proper documentation organization