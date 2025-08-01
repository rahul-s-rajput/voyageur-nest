# Booking Management System - Codebase Documentation

## Project Overview

This is a comprehensive **Booking Management System** built for hotels and hospitality businesses. Originally designed as an invoice generator, it has evolved into a full-featured booking management platform with real-time capabilities, invoice generation, and comprehensive CRUD operations.

### Business Purpose
- **Primary Function**: Hotel booking management with integrated invoice generation
- **Target Users**: Hotel staff, property managers, and hospitality businesses
- **Core Value**: Streamlined booking operations with automated invoice generation and real-time updates

## Technical Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Lucide React icons
- **Calendar**: React Big Calendar 1.19.3
- **Date Handling**: date-fns 4.1.0

#### Backend & Database
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase real-time subscriptions
- **Authentication**: Supabase Auth (configured but not actively used)

#### Development Tools
- **Linting**: ESLint 9.9.1 with TypeScript support
- **Type Checking**: TypeScript 5.5.3
- **CSS Processing**: PostCSS 8.4.35 with Autoprefixer

### Project Structure

```
project/
├── src/
│   ├── components/           # React components
│   │   ├── BookingCalendar.tsx      # Calendar view for bookings
│   │   ├── BookingDetails.tsx       # Booking detail modal
│   │   ├── BookingFiltersPanel.tsx  # Advanced filtering
│   │   ├── BookingList.tsx          # Table view for bookings
│   │   ├── CancellationInvoiceForm.tsx
│   │   ├── CancellationInvoicePreview.tsx
│   │   ├── HomePage.tsx             # Main dashboard
│   │   ├── InvoiceForm.tsx          # Invoice creation form
│   │   ├── InvoicePreview.tsx       # Invoice preview
│   │   ├── InvoiceTemplate.tsx      # Invoice template
│   │   └── NewBookingModal.tsx      # New booking creation
│   ├── lib/
│   │   └── supabase.ts             # Database services & API
│   ├── types/
│   │   ├── booking.ts              # Booking type definitions
│   │   └── invoice.ts              # Invoice type definitions
│   ├── App.tsx                     # Main application component
│   ├── main.tsx                    # Application entry point
│   └── index.css                   # Global styles
├── database.sql                    # Database schema
├── *.sql                          # Database migrations
├── package.json                   # Dependencies & scripts
└── configuration files            # Vite, TypeScript, Tailwind configs
```

## Core Features

### 1. Booking Management
- **CRUD Operations**: Create, read, update, delete bookings
- **Real-time Updates**: Live synchronization across all clients
- **Status Tracking**: confirmed, pending, checked-in, checked-out
- **Cancellation Management**: Soft delete with cancellation tracking

### 2. Calendar & List Views
- **Calendar View**: Visual booking calendar using React Big Calendar
- **List View**: Detailed table with sorting and filtering
- **View Toggle**: Seamless switching between calendar and list modes
- **Search Functionality**: Global search across all booking fields

### 3. Invoice Generation
- **Standard Invoices**: Generate invoices from bookings
- **Cancellation Invoices**: Specialized cancellation invoice handling
- **Auto-numbering**: Automatic invoice number generation with counter management
- **Print Support**: Print-optimized invoice layouts

### 4. Real-time Features
- **Live Updates**: Real-time booking updates across all connected clients
- **Counter Synchronization**: Automatic invoice counter synchronization
- **Conflict Detection**: Scheduling conflict identification

### 5. Advanced Filtering & Search
- **Multi-criteria Filtering**: Date range, status, payment status, guest name
- **Search**: Full-text search across guest names, room numbers, contact info
- **Statistics Dashboard**: Real-time booking statistics and revenue tracking

## Database Schema

### Tables

#### `bookings`
```sql
- id (UUID, Primary Key)
- guest_name (TEXT, NOT NULL)
- room_no (TEXT, NOT NULL)
- number_of_rooms (INTEGER, DEFAULT 1)
- check_in (DATE, NOT NULL)
- check_out (DATE, NOT NULL)
- no_of_pax (INTEGER, DEFAULT 1)
- adult_child (TEXT, DEFAULT '1/0')
- status (TEXT, CHECK: confirmed|pending|checked-in|checked-out)
- cancelled (BOOLEAN, DEFAULT false)
- total_amount (DECIMAL(10,2), DEFAULT 0)
- payment_status (TEXT, CHECK: paid|partial|unpaid)
- payment_amount (DECIMAL(10,2))
- payment_mode (TEXT)
- contact_phone (TEXT)
- contact_email (TEXT)
- special_requests (TEXT)
- booking_date (DATE)
- folio_number (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### `invoice_counter`
```sql
- id (INTEGER, Primary Key, DEFAULT 1)
- value (INTEGER, NOT NULL, DEFAULT 391)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

### Security
- **Row Level Security (RLS)**: Enabled on all tables
- **Policies**: Full CRUD access policies configured
- **Real-time**: Enabled for live updates

## Data Models

### Booking Interface
```typescript
interface Booking {
  id: string;
  guestName: string;
  roomNo: string;
  numberOfRooms: number;
  checkIn: string;
  checkOut: string;
  noOfPax: number;
  adultChild: string;
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out';
  cancelled: boolean;
  totalAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentAmount?: number;
  paymentMode?: string;
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  bookingDate?: string;
  folioNumber?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Invoice Data Interface
```typescript
interface InvoiceData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  invoiceNumber: string;
  guestName: string;
  // ... additional invoice fields
}
```

## Key Components

### 1. App.tsx (Main Application)
- **State Management**: Central state for bookings, invoices, and UI state
- **Real-time Subscriptions**: Manages Supabase real-time connections
- **Route Management**: Handles view switching between home and invoice views
- **Event Handling**: Coordinates all booking and invoice operations

### 2. HomePage.tsx (Dashboard)
- **Statistics Display**: Real-time booking and revenue statistics
- **View Management**: Calendar/List view toggle
- **Search & Filtering**: Advanced search and filter capabilities
- **Action Coordination**: Handles all booking-related actions

### 3. Supabase Service (lib/supabase.ts)
- **Database Operations**: Complete CRUD operations for bookings
- **Real-time Subscriptions**: Live data synchronization
- **Counter Management**: Invoice number generation and management
- **Conflict Detection**: Scheduling conflict identification

### 4. Booking Components
- **BookingCalendar**: Visual calendar interface
- **BookingList**: Tabular booking display
- **BookingDetails**: Detailed booking view/edit modal
- **NewBookingModal**: New booking creation form

### 5. Invoice Components
- **InvoiceTemplate**: Standard invoice generation
- **CancellationInvoicePreview**: Cancellation invoice handling
- **InvoiceForm**: Manual invoice creation
- **InvoicePreview**: Invoice preview and printing

## Configuration

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Company Information (Hardcoded)
- **Company**: Voyageur Nest
- **Address**: Old Manali, Manali, Himachal Pradesh, 175131, India
- **Phone**: +919876161215
- **Email**: voyageur.nest@gmail.com

## Development Workflow

### Setup
1. Install dependencies: `npm install`
2. Configure Supabase credentials in `.env.local`
3. Run database migrations from `database.sql`
4. Start development server: `npm run dev`

### Build & Deploy
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## Current Implementation Status

### ✅ Completed Features
- Complete booking CRUD operations
- Real-time data synchronization
- Calendar and list views
- Invoice generation from bookings
- Search and filtering
- Statistics dashboard
- Cancellation invoice handling
- Database schema with migrations

### 🔄 Areas for Enhancement
- Advanced reporting and analytics
- Email notification system
- Payment processing integration
- Multi-property support
- User authentication and roles
- Backup and data export
- Mobile responsiveness optimization

## Security Considerations

### Current Security Measures
- Row Level Security (RLS) enabled
- Environment variable configuration
- Input validation on forms
- SQL injection protection via Supabase

### Recommended Enhancements
- User authentication implementation
- Role-based access control
- API rate limiting
- Data encryption for sensitive information
- Audit logging for all operations

## Performance Characteristics

### Optimizations
- Real-time subscriptions for live updates
- Efficient filtering and search
- Optimized database queries
- Component-level state management

### Scalability Considerations
- Supabase handles database scaling
- React component architecture supports growth
- TypeScript ensures maintainable codebase
- Modular component structure

## Integration Points

### External Services
- **Supabase**: Database, real-time, and authentication
- **Print API**: Browser print functionality
- **Date Libraries**: date-fns for date manipulation

### Potential Integrations
- Payment gateways (Stripe, PayPal)
- Email services (SendGrid, Mailgun)
- SMS notifications
- Property management systems
- Accounting software

## Conclusion

This booking management system represents a well-architected, modern web application built with industry-standard technologies. It successfully combines real-time capabilities, comprehensive booking management, and integrated invoice generation into a cohesive platform suitable for hospitality businesses.

The codebase demonstrates good separation of concerns, type safety, and scalable architecture patterns that can support future growth and feature additions.