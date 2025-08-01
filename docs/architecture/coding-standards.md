# Coding Standards - Voyageur Nest Manali

## Overview
This document outlines the coding standards for the Voyageur Nest Manali Complete Booking Management System, ensuring consistency, maintainability, and quality across the codebase.

## Frontend Standards (React/TypeScript)

### Component Structure
- Use functional components with hooks
- Follow PascalCase for component names
- Use TypeScript interfaces for props
- Implement proper error boundaries

```typescript
interface BookingCardProps {
  booking: Booking;
  onUpdate: (id: string) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onUpdate }) => {
  // Component implementation
};
```

### State Management
- Use React Context for global state
- Implement custom hooks for business logic
- Follow the single responsibility principle
- Use proper TypeScript typing for state

### File Organization
```
src/
├── components/
│   ├── common/
│   ├── booking/
│   ├── guest/
│   └── analytics/
├── hooks/
├── services/
├── types/
└── utils/
```

## Backend Standards (Supabase)

### Database Schema
- Use snake_case for table and column names
- Include created_at and updated_at timestamps
- Implement proper foreign key relationships
- Use UUIDs for primary keys

### API Integration
- Use Supabase client with proper error handling
- Implement retry logic for critical operations
- Use TypeScript for database types
- Follow RESTful conventions

## AI Integration Standards

### Google Gemini Flash 2.5
- Implement proper prompt engineering
- Use structured output formats
- Include confidence scoring
- Implement fallback mechanisms

### Email Parsing
- Validate parsed data before database insertion
- Implement manual review workflows
- Log all parsing attempts with metadata
- Use structured error handling

## Security Standards

### Authentication
- Use Supabase Auth with proper session management
- Implement role-based access control (RBAC)
- Secure API endpoints with proper authorization
- Use environment variables for sensitive data

### Data Protection
- Encrypt sensitive guest information
- Implement audit trails for data changes
- Follow GDPR compliance requirements
- Use secure communication protocols

## Testing Standards

### Unit Testing
- Achieve minimum 80% code coverage
- Test all business logic functions
- Mock external dependencies
- Use descriptive test names

### Integration Testing
- Test API endpoints thoroughly
- Validate database operations
- Test AI parsing accuracy
- Include error scenario testing

## Code Quality

### Linting and Formatting
- Use ESLint with TypeScript rules
- Implement Prettier for code formatting
- Use Husky for pre-commit hooks
- Follow consistent naming conventions

### Documentation
- Document all public APIs
- Include inline comments for complex logic
- Maintain up-to-date README files
- Document deployment procedures

## Performance Standards

### Frontend Performance
- Implement lazy loading for components
- Use React.memo for expensive components
- Optimize bundle size with code splitting
- Implement proper caching strategies

### Database Performance
- Use proper indexing strategies
- Implement query optimization
- Use connection pooling
- Monitor query performance

## Hospitality-Specific Standards

### Guest Data Handling
- Implement proper data anonymization
- Use secure storage for sensitive information
- Follow hospitality industry compliance
- Implement data retention policies

### Booking Management
- Ensure real-time synchronization
- Implement conflict resolution
- Use proper validation for booking data
- Maintain audit trails for all changes

## Error Handling

### Frontend Error Handling
- Use error boundaries for component errors
- Implement user-friendly error messages
- Log errors for debugging
- Provide fallback UI components

### Backend Error Handling
- Use structured error responses
- Implement proper logging
- Use appropriate HTTP status codes
- Include error tracking and monitoring