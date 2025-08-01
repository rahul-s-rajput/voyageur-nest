# Voyageur Nest - Complete System Architecture
## Technical Architecture & Implementation Guide

---

## 🏗️ **System Overview**

### **Architecture Pattern**
- **Frontend**: React SPA (Single Page Application)
- **Backend**: Supabase BaaS (Backend as a Service)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **AI Services**: Google Gemini Flash 2.5
- **Email Service**: Resend (free tier: 3,000 emails/month)
- **SMS Service**: Twilio or TextBelt (for check-in links)

### **Deployment Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │────│   Supabase       │────│  External APIs  │
│   (Netlify)     │    │   (PostgreSQL)   │    │  - Gemini Flash │
│                 │    │   (Auth/Storage) │    │  - Resend Email │
│                 │    │   (Real-time)    │    │  - SMS Service  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 📊 **Database Schema**

### **Core Tables**

#### **Properties Table**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  description TEXT,
  website_url TEXT,
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '11:00',
  total_rooms INTEGER DEFAULT 10,
  amenities JSONB DEFAULT '[]',
  policies JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}', -- colors, logo, etc.
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### **Enhanced Bookings Table** (Simplified)
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  
  -- Booking Details
  guest_name TEXT NOT NULL,
  room_no TEXT NOT NULL,
  number_of_rooms INTEGER DEFAULT 1,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  no_of_pax INTEGER DEFAULT 1,
  adult_child TEXT DEFAULT '1/0',
  
  -- Status & Financial
  status TEXT CHECK (status IN ('confirmed', 'pending', 'checked-in', 'checked-out', 'cancelled')) DEFAULT 'confirmed',
  cancelled BOOLEAN DEFAULT false,
  total_amount DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
  payment_amount DECIMAL(12,2),
  payment_mode TEXT,
  
  -- Contact Information
  contact_phone TEXT,
  contact_email TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  
  -- Basic Guest Information
  guest_id_type TEXT, -- aadhaar, passport, driving_license, pan
  guest_id_number TEXT,
  guest_address TEXT,
  
  -- Booking Source & References
  booking_source TEXT DEFAULT 'direct', -- direct, airbnb, booking, agoda, mmt
  ota_booking_id TEXT,
  folio_number TEXT,
  booking_date DATE DEFAULT CURRENT_DATE,
  
  -- Check-in Status
  checkin_status TEXT DEFAULT 'pending', -- pending, completed, no_show
  checkin_completed_at TIMESTAMP WITH TIME ZONE,
  id_verified BOOLEAN DEFAULT false,
  id_verification_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  
  -- Simple Notes
  special_requests TEXT,
  purpose_of_visit TEXT,
  additional_guest_names TEXT, -- Simple text field for group bookings
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### **Simplified Guest Profiles**
```sql
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Contact Information
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  
  -- Simple Behavioral Data
  total_stays INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_stay_date DATE,
  typical_group_size INTEGER DEFAULT 1,
  
  -- Basic Marketing Preferences
  email_marketing_consent BOOLEAN DEFAULT true,
  sms_marketing_consent BOOLEAN DEFAULT true,
  
  -- Privacy & Compliance
  data_retention_consent BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(email),
  UNIQUE(phone)
);
```

#### **Simple Check-in Data**
```sql
CREATE TABLE checkin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  guest_profile_id UUID REFERENCES guest_profiles(id),
  
  -- Check-in Form Data
  form_data JSONB NOT NULL,
  id_document_urls TEXT[], -- Array of uploaded document URLs
  
  -- Simple Verification Status
  id_verification_status TEXT DEFAULT 'pending',
  verification_notes TEXT,
  verified_by TEXT, -- staff member name
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Form Metadata
  form_completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### **Basic Email Templates**
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  
  name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- pre_arrival, post_checkout, promotional
  trigger_event TEXT NOT NULL, -- booking_confirmed, checked_out, manual
  trigger_delay INTEGER DEFAULT 0, -- hours after trigger event
  
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  
  -- Simple Analytics
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  booking_id UUID REFERENCES bookings(id),
  guest_profile_id UUID REFERENCES guest_profiles(id),
  
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  -- Status Tracking
  status TEXT DEFAULT 'queued', -- queued, sent, delivered, opened, failed
  
  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Handling
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### **Property Expenses Table**
```sql
CREATE TABLE property_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  
  -- Expense Details
  expense_date DATE NOT NULL,
  category TEXT NOT NULL, -- utilities, food_supplies, staff_salary, maintenance, marketing, other
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Receipt Management
  receipt_url TEXT,
  vendor_name TEXT,
  
  -- Approval Workflow
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional Info
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### **Enhanced F&B System**
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  
  name TEXT NOT NULL,
  name_hindi TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  icon_emoji TEXT,
  
  availability_schedule JSONB, -- breakfast: 7-11, lunch: 12-15, etc.
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES menu_categories(id) NOT NULL,
  
  -- Basic Information
  name TEXT NOT NULL,
  name_hindi TEXT,
  description TEXT,
  price DECIMAL(8,2) NOT NULL,
  cost_price DECIMAL(8,2), -- for profit analysis
  
  -- Classification
  is_veg BOOLEAN DEFAULT true,
  is_vegan BOOLEAN DEFAULT false,
  is_jain BOOLEAN DEFAULT false,
  spice_level INTEGER DEFAULT 1, -- 1-5 scale
  
  -- Operational Data
  prep_time INTEGER DEFAULT 15, -- minutes
  is_available BOOLEAN DEFAULT true,
  daily_quantity_limit INTEGER,
  current_quantity_sold INTEGER DEFAULT 0,
  
  -- Media & Additional Info
  image_urls TEXT[],
  ingredients TEXT[],
  allergens TEXT[],
  nutritional_info JSONB,
  
  -- Tags for filtering and AI
  tags TEXT[] DEFAULT '{}', -- popular, chef-special, healthy, comfort-food
  
  -- Analytics
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  property_id UUID REFERENCES properties(id) NOT NULL,
  
  -- Order Details
  order_number TEXT NOT NULL, -- RO-20250801-001
  room_no TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  
  -- Timing
  order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  requested_delivery_time TIMESTAMP WITH TIME ZONE,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  
  -- Status Management
  status TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')) DEFAULT 'pending',
  kitchen_notes TEXT,
  delivery_notes TEXT,
  
  -- Financial
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 5.00,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  delivery_charge DECIMAL(8,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  
  -- Customer Experience
  special_instructions TEXT,
  guest_rating INTEGER, -- 1-5
  guest_feedback TEXT,
  
  -- Staff Assignment
  taken_by TEXT, -- staff member who took the order
  prepared_by TEXT, -- kitchen staff
  delivered_by TEXT, -- delivery staff
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(order_number)
);
```

#### **Analytics & Business Intelligence**
```sql
CREATE TABLE daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  date DATE NOT NULL,
  
  -- Occupancy Metrics
  total_rooms INTEGER NOT NULL,
  occupied_rooms INTEGER DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0,
  adr DECIMAL(10,2) DEFAULT 0, -- Average Daily Rate
  revpar DECIMAL(10,2) DEFAULT 0, -- Revenue Per Available Room
  
  -- Revenue Breakdown
  room_revenue DECIMAL(12,2) DEFAULT 0,
  fnb_revenue DECIMAL(12,2) DEFAULT 0,
  other_revenue DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- Guest Metrics
  total_guests INTEGER DEFAULT 0,
  new_guests INTEGER DEFAULT 0,
  returning_guests INTEGER DEFAULT 0,
  average_los DECIMAL(4,2) DEFAULT 0, -- Length of Stay
  
  -- F&B Metrics
  total_fnb_orders INTEGER DEFAULT 0,
  fnb_order_value DECIMAL(10,2) DEFAULT 0,
  fnb_profit_margin DECIMAL(5,2) DEFAULT 0,
  
  -- Channel Performance
  direct_bookings INTEGER DEFAULT 0,
  ota_bookings INTEGER DEFAULT 0,
  channel_breakdown JSONB DEFAULT '{}',
  
  -- Guest Satisfaction
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  nps_score INTEGER, -- Net Promoter Score
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(property_id, date)
);

CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  insight_type TEXT NOT NULL, -- pricing, demand, guest_behavior, operations
  
  -- AI Generated Content
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  recommended_actions JSONB,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Context Data
  data_sources TEXT[], -- bookings, reviews, market_data
  analysis_period JSONB, -- date range, parameters used
  
  -- Impact Tracking
  potential_impact TEXT, -- low, medium, high
  estimated_revenue_impact DECIMAL(12,2),
  implementation_difficulty TEXT, -- easy, medium, hard
  
  -- Status
  status TEXT DEFAULT 'new', -- new, reviewed, implemented, dismissed
  implemented_at TIMESTAMP WITH TIME ZONE,
  actual_impact DECIMAL(12,2),
  
  -- Metadata
  ai_model_version TEXT DEFAULT 'gemini-2.5-flash',
  prompt_used TEXT,
  raw_ai_response JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🔧 **API Design & Services**

### **Core Service Architecture**

#### **Authentication Service**
```typescript
// services/authService.ts
interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  checkStaffPermissions(propertyId: string): Promise<StaffPermissions>;
}

interface StaffPermissions {
  canManageBookings: boolean;
  canManageMenu: boolean;
  canViewAnalytics: boolean;
  canManageStaff: boolean;
  properties: string[]; // accessible property IDs
}
```

### **AI-Powered OTA Email Processing Service**
```typescript
// services/aiEmailService.ts
interface AIEmailService {
  setupGmailWatch(): Promise<void>;
  processGmailWebhook(webhookData: GmailWebhookData): Promise<void>;
  analyzeEmailWithAI(email: EmailData): Promise<AIEmailAnalysis>;
  processBookingData(analysis: AIEmailAnalysis, email: EmailData): Promise<void>;
  trainFromFeedback(bookingId: string, wasCorrect: boolean, corrections?: any): Promise<void>;
}

interface AIEmailAnalysis {
  isBookingEmail: boolean;
  confidence: number; // 0-1
  bookingData: {
    source: 'booking.com' | 'makemytrip' | 'airbnb' | 'agoda' | 'expedia' | 'unknown';
    bookingId: string;
    guestName: string;
    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
    propertyId: 'old-manali' | 'baror';
    totalAmount: number;
    guestEmail?: string;
    guestPhone?: string;
    roomType?: string;
    numberOfGuests?: number;
    specialRequests?: string;
  };
  extractionIssues: string[];
  reasoning: string;
  aiModelUsed: string;
  processingTime: number;
}

interface GeminiEmailParser {
  analyzeEmail(email: EmailData): Promise<AIEmailAnalysis>;
  validateExtraction(analysis: AIEmailAnalysis): Promise<ValidationResult>;
  explainDecision(analysis: AIEmailAnalysis): Promise<string>;
}
```

### **Gemini Flash 2.5 Integration**
```typescript
// services/ai/geminiEmailParser.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiEmailParser implements GeminiEmailParser {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: this.getBookingAnalysisSchema()
      }
    });
  }
  
  async analyzeEmail(email: EmailData): Promise<AIEmailAnalysis> {
    const prompt = this.buildAnalysisPrompt(email);
    
    try {
      const startTime = Date.now();
      const result = await this.model.generateContent(prompt);
      const processingTime = Date.now() - startTime;
      
      const analysis = JSON.parse(result.response.text());
      
      return {
        ...analysis,
        aiModelUsed: 'gemini-2.5-flash',
        processingTime
      };
    } catch (error) {
      console.error('Gemini email analysis error:', error);
      return this.getFallbackAnalysis(email, error);
    }
  }
  
  private buildAnalysisPrompt(email: EmailData): string {
    return `
You are an expert email analyst for Voyageur Nest, a hospitality business with two properties in Manali, India.

ANALYZE THIS EMAIL:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}
Received: ${email.receivedAt}

CONTEXT:
- Business: Voyageur Nest (boutique BnBs in Manali, Himachal Pradesh)
- Properties:
  1. "Voyageur Nest" or "Old Manali" → propertyId: "old-manali"
  2. "Voyageur Nest Baror" → propertyId: "baror"
- Common OTA partners: Booking.com, MakeMyTrip, Goibibo, Airbnb, Agoda, Expedia

TASK:
1. Determine if this is a hotel booking confirmation email (not cancellation, modification, or promotion)
2. If yes, extract all available booking data
3. Provide confidence score and reasoning
4. Flag any missing or unclear information

IMPORTANT:
- Only mark as booking email if it's a NEW booking confirmation
- Ignore cancellations, modifications, promotions, or general notifications
- Be conservative with confidence scores
- If any critical data is missing, note it in extractionIssues
- Property detection is crucial for our two-property operation

Respond with structured JSON matching the required schema.
`;
  }
  
  private getBookingAnalysisSchema() {
    return {
      type: 'object',
      properties: {
        isBookingEmail: { 
          type: 'boolean',
          description: 'True only if this is a NEW booking confirmation'
        },
        confidence: { 
          type: 'number',
          description: 'Confidence score from 0 to 1'
        },
        bookingData: {
          type: 'object',
          properties: {
            source: { 
              type: 'string',
              enum: ['booking.com', 'makemytrip', 'airbnb', 'agoda', 'expedia', 'goibibo', 'unknown']
            },
            bookingId: { type: 'string' },
            guestName: { type: 'string' },
            checkIn: { 
              type: 'string',
              description: 'Date in YYYY-MM-DD format'
            },
            checkOut: { 
              type: 'string',
              description: 'Date in YYYY-MM-DD format'
            },
            propertyId: { 
              type: 'string',
              enum: ['old-manali', 'baror']
            },
            totalAmount: { type: 'number' },
            guestEmail: { type: 'string' },
            guestPhone: { type: 'string' },
            roomType: { type: 'string' },
            numberOfGuests: { type: 'number' },
            specialRequests: { type: 'string' }
          },
          required: ['source', 'guestName', 'checkIn', 'checkOut', 'propertyId']
        },
        extractionIssues: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of any missing or unclear data points'
        },
        reasoning: {
          type: 'string',
          description: 'Explanation of the analysis decision'
        }
      },
      required: ['isBookingEmail', 'confidence', 'reasoning']
    };
  }
}
```

### **Simplified Email Processing Flow**
```typescript
// netlify/functions/gmail-ai-webhook.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // Decode Gmail webhook notification
    const gmailNotification = decodeGmailWebhook(event.body);
    const newEmails = await getNewEmailsFromGmail(gmailNotification.historyId);
    
    // Process each email with AI (no pre-filtering needed!)
    for (const email of newEmails) {
      const analysis = await analyzeEmailWithGemini(email);
      
      // Process based on AI confidence
      if (analysis.isBookingEmail) {
        if (analysis.confidence >= 0.8) {
          await autoImportBooking(analysis, email);
        } else if (analysis.confidence >= 0.5) {
          await flagForManualReview(analysis, email);
        }
        // Log all decisions for learning
        await logAIDecision(analysis, email);
      }
    }
    
    return { statusCode: 200, body: 'Processed successfully' };
  } catch (error) {
    await logError('Gmail AI webhook error', error, event.body);
    return { statusCode: 500, body: error.message };
  }
};

async function analyzeEmailWithGemini(email) {
  const geminiParser = new GeminiEmailParser(process.env.GEMINI_API_KEY);
  return await geminiParser.analyzeEmail(email);
}

async function autoImportBooking(analysis, email) {
  // High confidence - auto-import for verification
  const booking = {
    id: `ai-import-${Date.now()}`,
    ...analysis.bookingData,
    ai_confidence: analysis.confidence,
    ai_reasoning: analysis.reasoning,
    extraction_issues: analysis.extractionIssues,
    status: 'pending_verification',
    raw_email_data: email,
    imported_at: new Date().toISOString()
  };
  
  await supabase.from('ota_imported_bookings').insert([booking]);
  await sendMobileNotification(booking, 'high-confidence');
}

async function flagForManualReview(analysis, email) {
  // Medium confidence - needs human review
  const reviewItem = {
    id: `ai-review-${Date.now()}`,
    email_data: email,
    ai_analysis: analysis,
    status: 'needs_human_review',
    created_at: new Date().toISOString()
  };
  
  await supabase.from('ai_email_reviews').insert([reviewItem]);
  await sendMobileNotification(reviewItem, 'needs-review');
}
```

interface GmailWebhookData {
  emailAddress: string;
  historyId: string;
}

interface ParsedBookingData {
  source: 'booking.com' | 'makemytrip' | 'airbnb' | 'agoda' | 'expedia';
  bookingId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  guestEmail?: string;
  guestPhone?: string;
  roomType?: string;
  confidence: number;
  rawEmailData: EmailData;
  parsingIssues?: string[];
}

interface EmailData {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  headers: Record<string, string>;
}

interface OTASource {
  name: string;
  patterns: RegExp[];
  dataExtractors: DataExtractor[];
}

interface DataExtractor {
  field: string;
  patterns: RegExp[];
  required: boolean;
  validator?: (value: string) => boolean;
}
```

### **Gmail API Integration Architecture**
```typescript
// services/gmail/gmailApiService.ts
import { google } from 'googleapis';

class GmailAPIService {
  private gmail: any;
  private auth: any;
  
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly']
    });
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }
  
  async setupEmailWatch(): Promise<void> {
    const watchRequest = {
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/gmail-ota-emails`,
        labelIds: ['INBOX'],
        labelFilterAction: 'include'
      }
    };
    
    const response = await this.gmail.users.watch(watchRequest);
    console.log('Gmail watch setup:', response.data);
  }
  
  async getEmailsSinceHistory(historyId: string): Promise<EmailData[]> {
    const historyResponse = await this.gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded']
    });
    
    const emails = [];
    for (const history of historyResponse.data.history || []) {
      for (const message of history.messagesAdded || []) {
        const emailDetails = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.message.id,
          format: 'full'
        });
        
        emails.push(this.parseEmailData(emailDetails.data));
      }
    }
    
    return emails;
  }
  
  private parseEmailData(gmailMessage: any): EmailData {
    const headers = gmailMessage.payload.headers;
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    return {
      id: gmailMessage.id,
      from: getHeader('from'),
      subject: getHeader('subject'),
      body: this.extractEmailBody(gmailMessage.payload),
      receivedAt: getHeader('date'),
      headers: headers.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {})
    };
  }
  
  private extractEmailBody(payload: any): string {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }
    
    return '';
  }
}
```

### **Cloud Pub/Sub Webhook Handler**
```typescript
// netlify/functions/gmail-webhook.js
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    // Verify webhook signature for security
    const signature = event.headers['x-goog-signature'];
    if (!verifyWebhookSignature(event.body, signature)) {
      return { statusCode: 401, body: 'Unauthorized' };
    }
    
    // Decode Pub/Sub message
    const pubsubMessage = JSON.parse(event.body);
    const data = Buffer.from(pubsubMessage.message.data, 'base64').toString();
    const gmailNotification = JSON.parse(data);
    
    // Process new emails
    const gmailService = new GmailAPIService();
    const newEmails = await gmailService.getEmailsSinceHistory(gmailNotification.historyId);
    
    // Filter for OTA booking emails only
    const bookingEmails = [];
    for (const email of newEmails) {
      const otaCheck = await checkIfOTABookingEmail(email);
      if (otaCheck.isBooking) {
        bookingEmails.push({ ...email, otaSource: otaCheck.source });
      }
    }
    
    // Process each booking email
    for (const email of bookingEmails) {
      await processBookingEmail(email);
    }
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        processed: bookingEmails.length,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Gmail webhook processing error:', error);
    
    // Log error to Supabase for debugging
    await supabase.from('email_processing_errors').insert([{
      error_message: error.message,
      stack_trace: error.stack,
      webhook_data: event.body,
      timestamp: new Date().toISOString()
    }]);
    
    return { statusCode: 500, body: error.message };
  }
};

async function checkIfOTABookingEmail(email) {
  const otaPatterns = {
    'booking.com': {
      fromPatterns: [/noreply@booking\.com/i, /@booking\.com/i],
      subjectPatterns: [/booking confirmation/i, /your booking/i, /confirmed/i],
      bodyPatterns: [/booking id/i, /check.?in/i, /reservation/i]
    },
    'makemytrip': {
      fromPatterns: [/@makemytrip\.com/i, /@goibibo\.com/i],
      subjectPatterns: [/booking confirmed/i, /mmt booking/i, /confirmed/i],
      bodyPatterns: [/mmt.*booking/i, /confirmation/i, /hotel.*booking/i]
    },
    'airbnb': {
      fromPatterns: [/@airbnb\.com/i, /automated@airbnb/i],
      subjectPatterns: [/new reservation/i, /booking request/i, /reservation/i],
      bodyPatterns: [/reservation/i, /check.?in/i, /guest/i]
    }
  };
  
  for (const [source, patterns] of Object.entries(otaPatterns)) {
    const matchesFrom = patterns.fromPatterns.some(p => p.test(email.from));
    const matchesSubject = patterns.subjectPatterns.some(p => p.test(email.subject));
    const matchesBody = patterns.bodyPatterns.some(p => p.test(email.body));
    
    // Need at least 2 out of 3 matches for confidence
    if ((matchesFrom + matchesSubject + matchesBody) >= 2) {
      return { isBooking: true, source };
    }
  }
  
  return { isBooking: false, source: null };
}
```

interface CheckinFormData {
  personalDetails: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    occupation: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    emergencyContact: string;
    emergencyPhone: string;
    address: string;
  };
  stayDetails: {
    purposeOfVisit: string;
    additionalGuests: string; // Simple text field
    specialRequests: string;
  };
  idVerification: {
    idType: 'aadhaar' | 'passport' | 'driving_license' | 'pan';
    idNumber: string;
    idDocuments: File[];
  };
  agreements: {
    termsAccepted: boolean;
    privacyPolicyAccepted: boolean;
    marketingConsent: boolean;
  };
}
```

#### **Simple Email Service**
```typescript
// services/emailService.ts
interface EmailService {
  sendPreArrivalEmail(bookingId: string): Promise<void>;
  sendPostCheckoutEmail(bookingId: string): Promise<void>;
  sendPromotionalEmail(campaignId: string, recipientIds: string[]): Promise<void>;
  generateBasicContent(templateId: string, guestData: BasicGuestData): Promise<EmailContent>;
}

interface EmailContent {
  subject: string;
  htmlContent: string;
  textContent: string;
  guestName: string;
  propertyInfo: PropertyInfo;
}

interface BasicGuestData {
  name: string;
  email: string;
  checkInDate: string;
  checkOutDate: string;
  roomNumber: string;
  isRepeatGuest: boolean;
}
```

#### **Manali-Specific AI Integration Service**
```typescript
// services/ai/manaliAIService.ts
interface ManaliAIService {
  generatePromotionalEmail(
    campaignType: string,
    targetAudience: string,
    currentSeason: string,
    propertyData: PropertyData
  ): Promise<CreativeEmailContent>;
  
  generateManaliMarketInsights(
    businessData: BusinessData,
    competitorData: CompetitorData,
    seasonalData: SeasonalData
  ): Promise<ManaliMarketAnalysis>;
  
  generateSeasonalRecommendations(
    currentWeather: WeatherData,
    bookingData: BookingData,
    menuData: MenuData
  ): Promise<SeasonalInsights>;
  
  generateCompetitorAnalysis(
    competitorData: CompetitorData,
    ownData: PropertyData
  ): Promise<CompetitionAnalysis>;
}

interface CreativeEmailContent {
  subject: string;
  greeting: string;
  heroMessage: string;
  seasonalHook: string;
  localExperience: string;
  offer: string;
  urgency: string;
  callToAction: string;
  closing: string;
  ps: string;
}

interface ManaliMarketAnalysis {
  marketPosition: {
    strengths: string[];
    opportunities: string[];
    threats: string[];
  };
  pricingStrategy: {
    currentSeason: 'Peak' | 'Moderate' | 'Low';
    recommendedAdjustment: string;
    competitorComparison: string;
    seasonalPricing: string;
  };
  guestExperience: {
    manaliSpecificOffers: string[];
    seasonalPackages: string[];
    localPartnerships: string[];
  };
  revenueOptimization: {
    fnbOpportunities: string[];
    upselling: string[];
    costReduction: string[];
  };
  immediateActions: string[];
}

interface LocationContext {
  city: 'Manali';
  state: 'Himachal Pradesh';
  altitude: '2050m above sea level';
  touristSeasons: {
    peak: string[];
    moderate: string[];
    low: string[];
  };
  nearbyAttractions: string[];
  localEvents: string[];
}
```

#### **Enhanced Email Service for Mountain Hospitality**
```typescript
// services/emailService.ts
interface EmailService {
  sendPreArrivalEmail(bookingId: string): Promise<void>;
  sendPostCheckoutEmail(bookingId: string): Promise<void>;
  sendAIGeneratedPromotionalEmail(
    campaignType: string,
    recipientSegment: string,
    currentSeason: string
  ): Promise<void>;
  generateManaliSpecificContent(
    templateId: string,
    guestData: BasicGuestData,
    locationContext: LocationContext
  ): Promise<EmailContent>;
}

interface ManaliEmailContent extends EmailContent {
  weatherInfo: WeatherData;
  localAttractions: ManaliAttraction[];
  seasonalTips: string[];
  mountainExperiences: string[];
  localRecommendations: string[];
}

interface ManaliAttraction {
  name: string;
  distance: string;
  description: string;
  seasonalAvailability: string;
  recommendedFor: string[];
}
```
```
```

---

## 📱 **Frontend Architecture**

### **Component Structure**
```
src/
├── components/
│   ├── admin/                  # Internal management components
│   │   ├── dashboard/
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── OccupancyChart.tsx
│   │   │   └── RevenueMetrics.tsx
│   │   ├── bookings/
│   │   │   ├── BookingList.tsx
│   │   │   ├── BookingDetails.tsx
│   │   │   └── CheckinStatus.tsx
│   │   ├── guests/
│   │   │   ├── GuestProfiles.tsx
│   │   │   ├── GuestHistory.tsx
│   │   │   └── IdVerification.tsx
│   │   ├── fnb/
│   │   │   ├── MenuManagement.tsx
│   │   │   ├── OrderQueue.tsx
│   │   │   └── KitchenDisplay.tsx
│   │   ├── marketing/
│   │   │   ├── EmailCampaigns.tsx
│   │   │   ├── TemplateEditor.tsx
│   │   │   └── CampaignAnalytics.tsx
│   │   └── ota/
│   │       ├── OTADashboard.tsx
│   │       ├── ConflictDetection.tsx
│   │       └── SyncStatus.tsx
│   ├── public/                 # Customer-facing components
│   │   ├── checkin/
│   │   │   ├── CheckinForm.tsx
│   │   │   ├── IdUpload.tsx
│   │   │   └── CheckinSuccess.tsx
│   │   ├── menu/
│   │   │   ├── PublicMenu.tsx
│   │   │   ├── CategoryFilter.tsx
│   │   │   └── MenuItemCard.tsx
│   │   ├── ordering/
│   │   │   ├── OrderingInterface.tsx
│   │   │   ├── Cart.tsx
│   │   │   └── OrderTracking.tsx
│   │   └── info/
│   │       ├── PropertyInfo.tsx
│   │       ├── LocalAttractions.tsx
│   │       └── ContactInfo.tsx
│   ├── shared/                 # Reusable components
│   │   ├── forms/
│   │   ├── ui/
│   │   └── layout/
│   └── mobile/                 # Mobile-specific components
│       ├── StaffApp.tsx
│       └── KitchenApp.tsx
├── services/                   # API and business logic
│   ├── api/
│   ├── auth/
│   ├── checkin/
│   ├── email/
│   ├── ai/
│   └── analytics/
├── contexts/                   # React contexts
│   ├── AuthContext.tsx
│   ├── PropertyContext.tsx
│   ├── GuestContext.tsx
│   └── NotificationContext.tsx
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts
│   ├── useBookings.ts
│   ├── useGuests.ts
│   └── useAnalytics.ts
├── utils/                      # Utility functions
│   ├── dateHelpers.ts
│   ├── formatters.ts
│   ├── validation.ts
│   └── constants.ts
└── types/                      # TypeScript type definitions
    ├── booking.ts
    ├── guest.ts
    ├── menu.ts
    └── analytics.ts
```

### **State Management Architecture**
```typescript
// Using React Context + useReducer for complex state
interface AppState {
  auth: AuthState;
  properties: PropertiesState;
  bookings: BookingsState;
  guests: GuestsState;
  menu: MenuState;
  orders: OrdersState;
  analytics: AnalyticsState;
  notifications: NotificationState;
}

// Real-time updates using Supabase subscriptions
const useRealtimeBookings = (propertyId: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  useEffect(() => {
    const subscription = supabase
      .channel('bookings')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          // Handle real-time updates
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [propertyId]);
  
  return bookings;
};
```

---

## 🔌 **Integration Architecture**

### **External Service Integrations**

#### **Email Service Integration (Resend)**
```typescript
// services/emailProviders/resendProvider.ts
import { Resend } from 'resend';

class ResendEmailProvider implements EmailProvider {
  private resend: Resend;
  
  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }
  
  async sendEmail(emailData: EmailRequest): Promise<EmailResult> {
    try {
      const result = await this.resend.emails.send({
        from: `${emailData.propertyName} <noreply@${emailData.domain}>`,
        to: emailData.recipients,
        subject: emailData.subject,
        html: emailData.htmlContent,
        text: emailData.textContent,
        headers: {
          'X-Property-ID': emailData.propertyId,
          'X-Campaign-ID': emailData.campaignId,
        },
      });
      
      return {
        success: true,
        messageId: result.data?.id,
        providerId: 'resend',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

#### **SMS Service Integration**
```typescript
// services/smsService.ts
interface SMSService {
  sendCheckinLink(phone: string, link: string, guestName: string): Promise<SMSResult>;
  sendOrderConfirmation(phone: string, orderDetails: OrderSummary): Promise<SMSResult>;
  sendPromotionalMessage(phone: string, message: string): Promise<SMSResult>;
}

class TwilioSMSProvider implements SMSService {
  async sendCheckinLink(phone: string, link: string, guestName: string): Promise<SMSResult> {
    const message = `Hi ${guestName}! Welcome to Voyageur Nest. Complete your check-in here: ${link}`;
    
    // Implementation using Twilio or free alternative
    return await this.sendSMS(phone, message);
  }
}
```

#### **AI Service Integration (Gemini Flash)**
```typescript
// services/ai/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiAIService implements AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  
  async generatePersonalizedEmail(
    template: EmailTemplate,
    guestProfile: GuestProfile,
    context: EmailContext
  ): Promise<PersonalizedEmail> {
    const prompt = this.buildEmailPrompt(template, guestProfile, context);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return this.parseEmailResponse(response);
    } catch (error) {
      console.error('AI email generation failed:', error);
      return this.getFallbackEmail(template, guestProfile);
    }
  }
  
  private buildEmailPrompt(
    template: EmailTemplate,
    guestProfile: GuestProfile,
    context: EmailContext
  ): string {
    return `
You are a hospitality expert writing personalized emails for ${context.propertyName}, a boutique BnB in ${context.location}.

GUEST PROFILE:
${JSON.stringify(guestProfile, null, 2)}

EMAIL CONTEXT:
${JSON.stringify(context, null, 2)}

TEMPLATE TYPE: ${template.type}

Create a warm, personalized email that:
1. Uses the guest's name and references their preferences
2. Includes relevant local recommendations based on their interests
3. Mentions weather-appropriate suggestions if applicable
4. Maintains the property's welcoming, family-operated tone
5. Includes actionable next steps

Respond with JSON format:
{
  "subject": "Personalized subject line",
  "greeting": "Warm personalized greeting",
  "mainContent": "Main email content with recommendations",
  "callToAction": "Clear next steps",
  "closing": "Warm closing message",
  "recommendations": ["List of personalized recommendations"]
}
`;
  }
}
```

---

## 🔒 **Security & Compliance**

### **Data Security Measures**
```typescript
// Security configurations
const securityConfig = {
  // File upload security
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB max file size
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    virusScanning: true,
    contentTypeValidation: true,
  },
  
  // API rate limiting
  rateLimiting: {
    checkInForm: { requests: 3, window: '15m' }, // 3 submissions per 15 minutes
    emailSend: { requests: 100, window: '1h' }, // 100 emails per hour
    fileUpload: { requests: 10, window: '5m' }, // 10 uploads per 5 minutes
  },
  
  // Data retention policies
  dataRetention: {
    idDocuments: 30, // days
    emailLogs: 365, // days
    analyticsData: 2555, // days (7 years)
    guestProfiles: 'indefinite_with_consent',
  },
  
  // Privacy settings
  privacy: {
    dataMinimization: true,
    consentTracking: true,
    rightToErasure: true,
    dataPortability: true,
  },
};
```

### **GDPR Compliance Implementation**
```typescript
// services/privacyService.ts
interface PrivacyService {
  recordConsent(guestId: string, consentType: ConsentType, granted: boolean): Promise<void>;
  exportGuestData(guestId: string): Promise<GuestDataExport>;
  deleteGuestData(guestId: string, deletionType: DeletionType): Promise<DeletionResult>;
  anonymizeGuestData(guestId: string): Promise<void>;
}

interface ConsentRecord {
  guestId: string;
  consentType: 'email_marketing' | 'sms_marketing' | 'data_processing' | 'analytics';
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}
```

---

## 📊 **Performance & Monitoring**

### **Performance Optimization**
```typescript
// Performance monitoring setup
const performanceConfig = {
  // React Performance
  lazyLoading: {
    components: ['AnalyticsDashboard', 'EmailCampaigns', 'GuestProfiles'],
    images: true,
    routes: true,
  },
  
  // Database optimization
  database: {
    indexing: ['guest_profiles.email', 'bookings.check_in', 'room_orders.status'],
    queryOptimization: true,
    connectionPooling: true,
  },
  
  // Caching strategy
  caching: {
    staticAssets: '1y',
    apiResponses: '5m',
    menuData: '1h',
    analyticsData: '15m',
  },
  
  // Error tracking
  errorMonitoring: {
    provider: 'Sentry', // Free tier: 5,000 errors/month
    errorBoundaries: true,
    performanceTracking: true,
  },
};
```

### **Monitoring & Analytics**
```typescript
// Analytics tracking
interface AnalyticsEvents {
  // Guest Journey
  'checkin_started': { bookingId: string; source: string };
  'checkin_completed': { bookingId: string; timeToComplete: number };
  'id_uploaded': { documentType: string; processingTime: number };
  
  // Email Engagement
  'email_sent': { templateType: string; recipientId: string };
  'email_opened': { emailId: string; timestamp: Date };
  'email_clicked': { emailId: string; linkUrl: string };
  
  // F&B Ordering
  'menu_viewed': { propertyId: string; categoryId: string };
  'order_placed': { orderId: string; totalAmount: number; itemCount: number };
  'order_completed': { orderId: string; deliveryTime: number };
  
  // System Performance
  'page_load_time': { page: string; loadTime: number };
  'api_response_time': { endpoint: string; responseTime: number };
  'error_occurred': { errorType: string; context: string };
}
```

---

## 🚀 **Deployment & DevOps**

### **Deployment Architecture**
```yaml
# Deployment configuration
deployment:
  frontend:
    platform: "Netlify"
    buildCommand: "npm run build"
    environment:
      NODE_ENV: "production"
      REACT_APP_SUPABASE_URL: "${SUPABASE_URL}"
      REACT_APP_SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
      REACT_APP_GEMINI_API_KEY: "${GEMINI_API_KEY}"
      REACT_APP_RESEND_API_KEY: "${RESEND_API_KEY}"
  
  backend:
    platform: "Supabase"
    database: "PostgreSQL"
    functions: "Edge Functions"
    storage: "Supabase Storage"
  
  monitoring:
    uptime: "UptimeRobot" # Free: 50 monitors
    analytics: "Google Analytics 4"
    errors: "Sentry" # Free: 5,000 errors/month
```

### **CI/CD Pipeline**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run type-check
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - name: Deploy to Netlify
        uses: netlify/actions/build@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

This architecture provides:
- ✅ **Scalability**: Handles 2-5 properties, 10,000+ guests
- ✅ **Cost Efficiency**: Stays within free tiers
- ✅ **Security**: GDPR compliant, secure file handling
- ✅ **Performance**: <3s load times, real-time updates  
- ✅ **Maintainability**: Clean code structure, comprehensive testing
- ✅ **User Experience**: Mobile-first, accessibility compliant