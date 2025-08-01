# Voyageur Nest Manali - Complete Booking Management System
## Project Epics & User Stories (Final Version)

### 📋 **EPIC 1: Guest Check-in & Data Collection System**
**Goal**: Create a seamless digital check-in experience for mountain hospitality

#### **Story 1.1: Digital Check-in Form**
**As a** property manager  
**I want** guests to fill their check-in details digitally during arrival  
**So that** I can avoid paperwork and speed up the check-in process  

**Acceptance Criteria:**
- [ ] Check-in form accessible via QR code or direct link on property device
- [ ] Form is mobile-responsive and works on property tablet/guest phone
- [ ] Guest can fill personal details, emergency contact, purpose of visit
- [ ] Form auto-populates from booking data where possible
- [ ] Form saves data immediately upon completion
- [ ] Staff can access completed forms instantly
- [ ] Form works in English and Hindi
- [ ] Can handle multiple guests under single booking

**Definition of Done:**
- Form deployed and accessible via QR code/link
- Data saves to database correctly
- Mobile responsiveness tested on tablets and phones
- Staff dashboard shows check-in completion status

#### **Story 1.2: ID Verification with Photo Upload**
**As a** property manager  
**I want** guests to upload their ID proof digitally  
**So that** I can verify identity without physical document handling  

**Acceptance Criteria:**
- [ ] Guest can capture ID photo using phone camera or upload existing photo
- [ ] Support for Aadhaar, PAN, Passport, Driving License
- [ ] Image compression to optimize storage (max 10MB per file)
- [ ] Simple manual verification option for staff
- [ ] Secure file storage with encryption in Supabase Storage
- [ ] ID images auto-delete after 30 days (privacy compliance)
- [ ] Staff can mark ID as verified/rejected with notes

**Definition of Done:**
- Photo upload working on mobile browsers
- Images stored securely in Supabase Storage
- Staff can easily verify IDs in admin panel
- Auto-deletion job configured

#### **Story 1.3: Simple Guest Data Collection**
**As a** property manager  
**I want** to collect basic guest information during check-in  
**So that** I can maintain records and handle group bookings properly  

**Acceptance Criteria:**
- [ ] System records basic contact details and emergency contact
- [ ] Tracks number of guests in current booking vs previous stays
- [ ] Option to add additional guest names if known (simple text field)
- [ ] Links check-in data to guest profile across stays
- [ ] Staff can view guest history (number of visits, group sizes)
- [ ] Simple notes field for important information only
- [ ] GDPR-compliant data handling with basic privacy controls

**Definition of Done:**
- Guest data collection working in check-in form
- Historical data accessible in admin dashboard  
- Privacy settings allow basic data control

---

### 📧 **EPIC 2: AI-Enhanced Email Automation System**
**Goal**: Create automated email workflows with AI-generated promotional content for Manali-based hospitality

#### **Story 2.1: Basic Pre-Arrival Email**
**As a** guest with an upcoming booking in Manali  
**I want** to receive helpful information before my arrival  
**So that** I feel prepared for my stay in the mountains  

**Acceptance Criteria:**
- [ ] Confirmation email sent immediately after booking
- [ ] Pre-arrival email 1 day before with check-in instructions and Manali-specific info
- [ ] Welcome message on arrival day with room details and WiFi password
- [ ] Basic property information (location, contact, check-in/out times)
- [ ] Manali-specific information (weather tips, what to pack, local transport)
- [ ] Seasonal recommendations (summer: light clothes, winter: warm clothes)
- [ ] All emails branded with property-specific information
- [ ] Support for both Manali properties with location-specific templates

**Definition of Done:**
- Email sequence triggered automatically
- Templates support both Manali properties (Old Manali & Baror)
- Email delivery tracking implemented
- Manali-specific content covers essential mountain travel information

#### **Story 2.2: Post-Checkout Review Request**
**As a** property manager  
**I want** to request reviews after guests leave  
**So that** I can improve my online ratings and get feedback about the Manali experience  

**Acceptance Criteria:**
- [ ] Thank you email sent 4 hours after checkout
- [ ] Google Maps review request links for both properties
- [ ] Simple feedback form for internal improvements
- [ ] Polite request for online reviews (Google, Booking.com, Airbnb, MakeMyTrip)
- [ ] Different templates for different booking sources
- [ ] One-time email only (no follow-up spam)
- [ ] Ask about overall Manali experience, not just property

**Definition of Done:**
- Post-checkout email sent automatically
- Review links working correctly for both properties
- Feedback collection integrated with system
- Email tracking shows delivery and opens

#### **Story 2.3: AI-Generated Promotional Campaigns**
**As a** property manager  
**I want** to send creative, AI-generated promotional emails  
**So that** I can attract bookings with compelling, personalized offers for Manali stays  

**Acceptance Criteria:**
- [ ] Maximum 1-2 promotional emails per month
- [ ] AI generates creative content using Gemini Flash
- [ ] Manali-specific seasonal offers (monsoon packages, snow season, apple harvest time)
- [ ] Weather-based promotions (valley views during clear weather, cozy stays during rain)
- [ ] Festival-based offers (Dussehra, Diwali, New Year in the mountains)
- [ ] Local event promotions (Manali Winter Carnival, Hadimba Devi festival)
- [ ] Competitor analysis for pricing and offers
- [ ] Simple unsubscribe option
- [ ] Send only to guests who haven't opted out
- [ ] Basic segmentation (recent guests vs old guests, families vs couples)

**Definition of Done:**
- AI email generation working with Manali context
- Campaign management interface built
- Email frequency limits enforced
- Unsubscribe system working
- Legal compliance verified

---

### 👥 **EPIC 3: Simple Guest Data Management**
**Goal**: Maintain basic guest records for service and business tracking

#### **Story 3.1: Basic Guest Profile System**
**As a** property manager  
**I want** a simple view of guest history  
**So that** I can recognize repeat guests and track group patterns  

**Acceptance Criteria:**
- [ ] Single guest profile per primary booking contact
- [ ] Complete booking history with total spend
- [ ] Track group size changes across visits (solo, couple, family, group)
- [ ] Option to add additional guest names for group bookings
- [ ] Communication history (emails sent, reviews received)
- [ ] Simple notes field for important information
- [ ] Guest lifetime value calculation
- [ ] Quick identification of repeat vs new guests
- [ ] Track preferences for Manali experiences (adventure, relaxation, cultural)

**Definition of Done:**
- Guest profile accessible in admin dashboard
- Data shows clear visit patterns and spending
- Staff can quickly see if guest is returning
- Additional guest names can be added to bookings

#### **Story 3.2: Simple Feedback Collection**
**As a** property manager  
**I want** to collect basic guest feedback  
**So that** I can identify issues and improve service  

**Acceptance Criteria:**
- [ ] Simple feedback form sent post-checkout
- [ ] Basic rating system (1-5 stars for overall experience)
- [ ] Open-ended feedback for suggestions and complaints
- [ ] Issue tracking for follow-up if needed
- [ ] Feedback summary dashboard showing trends
- [ ] Integration with online review requests
- [ ] Basic sentiment tracking (positive/negative/neutral)

**Definition of Done:**
- Feedback collection system implemented
- Simple dashboard shows feedback trends
- Staff can identify and address recurring issues
- Feedback data helps improve operations

---

### 🏨 **EPIC 4: Multi-Property & OTA Management** (Enhanced)
**Goal**: Efficiently manage multiple Manali properties, OTA synchronization, automatic email parsing, and track expenses

#### **Story 4.1: Manali Property Management Hub**
**As a** property manager with two Manali properties  
**I want** to switch between properties seamlessly  
**So that** I can manage both BnBs from one interface  

**Acceptance Criteria:**
- [ ] Property selector in header with easy switching
- [ ] Property-specific branding and settings (Old Manali vs Baror)
- [ ] Cross-property guest recognition
- [ ] Separate analytics per property with Manali market comparison
- [ ] Unified reporting across properties
- [ ] Property comparison dashboards
- [ ] Same staff access to all properties
- [ ] Location-specific settings (Old Manali: backpacker-friendly, Baror: family-oriented)

**Definition of Done:**
- Multi-property context working throughout app
- Data properly isolated by property
- Cross-property analytics functional
- Single login manages both Manali properties

#### **Story 4.2: OTA Calendar Synchronization**
**As a** property manager  
**I want** to keep all OTA calendars synchronized  
**So that** I avoid double bookings and manual updates  

**Acceptance Criteria:**
- [ ] iCal export/import for Airbnb and VRBO
- [ ] Manual update checklists for Booking.com, Agoda, MMT
- [ ] Conflict detection across all platforms
- [ ] One-click export of all required files
- [ ] Platform-specific formatting for updates
- [ ] Update tracking and confirmation system
- [ ] Staff notifications for conflicts

**Definition of Done:**
- iCal automation working for supported platforms
- Manual workflows streamlined with checklists
- Conflict detection preventing double bookings
- Staff trained on update procedures

#### **Story 4.3: AI-Powered OTA Email Parsing & Auto-Import**
**As a** property manager  
**I want** OTA booking emails to be automatically analyzed and imported using AI  
**So that** I never have to manually copy booking details from emails, regardless of format changes  

**Acceptance Criteria:**
- [ ] Gmail API integration with Cloud Pub/Sub webhooks for real-time email processing
- [ ] Gemini Flash 2.5 AI analyzes ALL incoming emails to determine if they're booking-related
- [ ] AI intelligently extracts booking data using structured JSON schema
- [ ] Single AI call processes any OTA email format (Booking.com, MakeMyTrip, Airbnb, Agoda, etc.)
- [ ] AI automatically detects which property (Old Manali vs Baror) from email content
- [ ] Confidence scoring (0-100%) for AI analysis accuracy
- [ ] High-confidence bookings (>80%) auto-imported for verification
- [ ] Medium-confidence bookings (50-80%) flagged for manual review
- [ ] Low-confidence or non-booking emails ignored automatically
- [ ] AI provides reasoning for its decisions (explainable AI)
- [ ] Extraction issue reporting when data is incomplete/unclear
- [ ] Real-time mobile notifications (Telegram/WhatsApp) when bookings imported
- [ ] Self-improving system learns from verification feedback
- [ ] Processing unlimited emails per day (within Gmail + Gemini quotas)
- [ ] Audit trail of all AI analysis results and decisions

**Definition of Done:**
- Gmail API webhook integration working reliably
- Gemini Flash 2.5 AI analysis achieving >98% accuracy
- AI correctly distinguishes booking emails from promotions/cancellations
- Staff verification interface shows AI reasoning and confidence scores
- Mobile notifications working instantly
- System handles any email format without code changes
- AI learns and improves from staff feedback
- Complete audit trail for debugging and improvement
- Zero maintenance required for new OTA email formats

#### **Story 4.4: Property Expense Tracking**
**As a** property manager  
**I want** to track all expenses for each Manali property  
**So that** I can monitor profitability and manage costs  

**Acceptance Criteria:**
- [ ] Add expenses by category (utilities, food costs, staff salary, maintenance, marketing)
- [ ] Upload receipt photos for expense records
- [ ] Monthly expense reports per property
- [ ] Compare expenses across properties (Old Manali vs Baror)
- [ ] Track profit margins after all costs
- [ ] Expense vs revenue analysis
- [ ] Simple expense approval workflow
- [ ] Export expense data for accounting
- [ ] Seasonal expense tracking (heating costs in winter, etc.)

**Definition of Done:**
- Expense tracking system implemented
- Receipt storage working
- Expense reports generating correctly
- Profitability analysis functional per property

---

### 🍽️ **EPIC 5: Food & Beverage Management System**
**Goal**: Streamline F&B operations and increase revenue through better menu management

#### **Story 5.1: Digital Menu Management**
**As a** property manager  
**I want** to manage menus digitally with proper categorization  
**So that** I can update prices and availability easily  

**Acceptance Criteria:**
- [ ] Menu categories based on current Voyageur Nest structure:
  - Hot Beverages, Cool Refreshments, Shakes & Lassis
  - Egg Delights, Parantha, Toasts and Spreads, Soups
  - Sandwiches & Burgers, Snacks, Chinese
  - Indian Main Course, Indian Breads and Rice
  - Salads & Raita, Thali
- [ ] Add/edit/delete menu items with photos
- [ ] Real-time price updates across all channels
- [ ] Availability toggle for out-of-stock items
- [ ] Cost tracking for profit analysis
- [ ] Veg/non-veg classification with icons
- [ ] Multi-language support (English/Hindi with simple translation)
- [ ] Basic ingredient information for common allergies
- [ ] Seasonal menu adjustments (hot items in winter, cold in summer)

**Definition of Done:**
- Menu CRUD operations working
- Public menu display responsive
- Price changes reflect immediately
- Category-based organization matches current menu

#### **Story 5.2: Simple Room Service Ordering**
**As a** guest  
**I want** to place food orders for my room easily  
**So that** I can enjoy meals without leaving my room  

**Acceptance Criteria:**
- [ ] Guest can browse menu by category
- [ ] Direct ordering system (no cart - staff confirms availability)
- [ ] Order form with room number, items, and quantities
- [ ] Special instructions field for customization
- [ ] Staff receives orders instantly with notification
- [ ] Order confirmation via WhatsApp/SMS to guest
- [ ] Kitchen dashboard to manage incoming orders
- [ ] Simple order status tracking (received, preparing, delivered)

**Definition of Done:**
- Direct ordering system functional
- Kitchen staff can manage orders efficiently
- Guest receives proper confirmations
- No cart complexity - staff handles stock management

#### **Story 5.3: Kitchen Order Management**
**As a** kitchen staff  
**I want** to manage incoming orders efficiently  
**So that** I can prepare and deliver food on time  

**Acceptance Criteria:**
- [ ] Kitchen display shows new orders immediately
- [ ] Order details: room number, items, quantities, special requests
- [ ] Mark items as out-of-stock to prevent new orders
- [ ] Update order status (received, preparing, ready, delivered)
- [ ] Estimated preparation time display
- [ ] Print order tickets for kitchen workflow
- [ ] Daily order summary and popular items report
- [ ] Track popular items vs Manali tourist preferences

**Definition of Done:**
- Kitchen dashboard functional
- Order workflow smooth from receipt to delivery
- Stock management prevents unavailable item orders
- Reporting helps with inventory planning

---

### 📊 **EPIC 6: Manali-Focused AI Analytics & Business Intelligence**
**Goal**: Get location-specific business insights and revenue optimization for Manali hospitality market

#### **Story 6.1: Manali Market Analysis Dashboard**
**As a** property manager in Manali  
**I want** to see AI-powered business analytics specific to the Manali tourism market  
**So that** I can make informed decisions based on local trends and competition  

**Acceptance Criteria:**
- [ ] Daily/weekly/monthly revenue tracking per property (Old Manali vs Baror)
- [ ] Occupancy rate trends with Manali seasonal patterns
- [ ] F&B profit margin analysis with mountain location considerations
- [ ] Expense tracking vs revenue analysis for both properties
- [ ] Popular menu items considering local preferences and tourist tastes
- [ ] Guest booking patterns (repeat vs new, domestic vs international)
- [ ] Manali seasonal trend identification (peak: May-June, Oct-Nov; low: monsoon, extreme winter)
- [ ] AI-powered competitor analysis of other Manali properties
- [ ] Weather-based demand forecasting for valley destinations
- [ ] Local event impact analysis (festivals, local celebrations, tourist season)

**Definition of Done:**
- Analytics dashboard displays Manali-specific metrics
- Expense vs revenue analysis working for both properties
- AI insights provide location-specific actionable suggestions
- Historical data helps with seasonal planning for mountain tourism

#### **Story 6.2: AI-Powered Manali Business Insights**
**As a** property manager  
**I want** automated business reports with Manali market intelligence  
**So that** I can optimize pricing and operations for mountain tourism  

**Acceptance Criteria:**
- [ ] Weekly summary reports via email with Manali market context
- [ ] Monthly property comparison reports (Old Manali vs Baror performance)
- [ ] F&B performance analysis considering local and tourist preferences
- [ ] Guest satisfaction trends from feedback
- [ ] Cost analysis and profit margins for mountain hospitality operations
- [ ] AI recommendations for menu optimization based on Manali tourism patterns
- [ ] Seasonal booking pattern insights for Himachal Pradesh tourism
- [ ] Competitor pricing analysis for similar Manali properties
- [ ] Weather impact analysis on bookings and F&B sales
- [ ] Local event correlation with booking spikes
- [ ] Export reports for accounting purposes

**Definition of Done:**
- Automated report generation working with Manali context
- Reports provide actionable business insights for mountain hospitality
- Competitor analysis helps with pricing strategy
- Weather and seasonal data integrated into recommendations
- Email delivery of location-specific reports reliable

---

## 📅 **Implementation Timeline (14-18 weeks)**

### **Phase 1: Foundation + AI Email Automation (Weeks 1-5) - PRIORITY**
- Epic 4: Multi-Property & OTA Management (**including AI-powered unlimited email parsing**)
- Epic 5: F&B Management System (Basic menu structure)
- Database architecture and core infrastructure
- Manali location context setup
- **Gmail API + Gemini Flash 2.5 email automation (CRITICAL - saves 8+ hours/week)**

### **Phase 2: Guest Experience (Weeks 6-11)**
- Epic 1: Guest Check-in & Data Collection
- Epic 3: Simple Guest Data Management
- Epic 5: F&B Management System (Complete with ordering)
- Basic email templates
- AI email analysis optimization and feedback loop

### **Phase 3: AI & Automation (Weeks 12-15)**
- Epic 2: AI-Enhanced Email Automation (Manali-specific)
- Epic 6: Manali-Focused Analytics & Business Intelligence
- Integration testing and optimization
- AI content generation for promotions
- **Email parsing AI training with real usage data**

### **Phase 4: Polish & Launch (Weeks 16-17)**
- User training and documentation
- Performance optimization
- Final testing with both Manali properties
- Staff onboarding on new workflows
- **AI system performance monitoring and fine-tuning**

---

## 🎯 **Success Metrics**

### **Guest Experience Metrics**
- Check-in time reduced by 60% (from 10 minutes to 4 minutes)
- Guest satisfaction score >4.2/5 with Manali experience feedback
- Repeat booking rate increased by 25%
- Email open rate >20% for promotional campaigns

### **Operational Efficiency Metrics** (MAJOR IMPROVEMENTS)
- Manual OTA updates reduced by 75%
- **OTA booking entry time reduced by 98%** (from 10 minutes to 10 seconds)
- **Staff time saved: 8+ hours weekly** (from AI-powered unlimited email processing)
- **Email processing capacity: Unlimited** (1,500 AI analyses/day vs 5 emails/day with other solutions)
- Double booking incidents: Zero
- F&B profit margin improved by 15%
- Expense tracking reduces wastage by 10%
- **AI email parsing accuracy: >98%** (vs 85% with regex patterns)
- **Real-time booking alerts: <10 seconds** from email receipt to mobile notification
- **Zero maintenance**: No code updates needed when OTAs change email formats
- **Future-proof**: Works with any new OTA automatically

### **Revenue Metrics**
- Revenue per guest increased by 10%
- F&B revenue increased by 20%
- Overall property revenue growth: 15%
- AI-generated promotional emails achieve >5% conversion rate
- Seasonal pricing optimization increases peak season revenue by 12%
- **Faster OTA response**: Reduced time to confirm bookings improves OTA rankings
- **Prevented lost bookings**: Zero missed bookings due to email oversight

### **Manali Market Positioning**
- Improved online review ratings by 0.3 points
- Increased direct bookings by 20% (vs OTA bookings)
- Better competitive positioning in Manali market
- Enhanced guest experience through local insights
- **Technology advantage**: Most advanced booking system among Manali BnBs

---

## 🔧 **Technical Requirements**

### **Core Technologies**
- Frontend: React 18+ with TypeScript
- Backend: Supabase (PostgreSQL + Auth + Storage)
- AI Integration: Google Gemini Flash 2.5 for Manali-specific insights
- Email Service: Resend (free tier: 3,000 emails/month)
- File Storage: Supabase Storage
- SMS/WhatsApp: Twilio or free alternatives

### **Manali-Specific Features**
- Location context integrated into all AI services
- Weather API integration for seasonal recommendations
- Local event calendar integration
- Competitor analysis for Manali hospitality market
- Seasonal pricing algorithms for mountain tourism

### **Performance Requirements**
- Page load time <3 seconds on mountain internet
- Mobile responsiveness on all devices (staff tablets, guest phones)
- 99.9% uptime for check-in system
- Email delivery rate >95%
- Image upload <30 seconds on slower connections

### **Security & Compliance**
- GDPR compliance for international tourists
- Secure file storage with encryption
- Input validation and sanitization
- Rate limiting for API endpoints
- Regular security audits

### **Scalability Considerations**
- Support for 2 Manali properties initially (expandable to 5)
- Database design for 10,000+ guests
- Email system handling 1,000+ emails/day
- File storage for 50GB+ images
- API rate limits within free tiers

---

## 🏔️ **Manali Market Context**

### **Location Advantages**
- **Old Manali Property**: Backpacker hub, cafes, international crowd
- **Baror Property**: Residential area, families, peaceful setting
- **Altitude**: 2050m above sea level - unique selling point
- **Proximity**: Walking distance to Hadimba Temple, Mall Road

### **Seasonal Considerations**
- **Peak Season** (May-June, Oct-Nov): Premium pricing, adventure activities
- **Moderate Season** (Mar-Apr, Sep, Dec): Balanced pricing, varied activities  
- **Low Season** (Jan-Feb, Jul-Aug): Budget pricing, cozy experiences

### **Target Market**
- **Domestic Tourists**: 60% of guests, price-sensitive, family groups
- **International Tourists**: 40% of guests, experience-focused, longer stays
- **Adventure Seekers**: Trekking, rafting, paragliding enthusiasts
- **Leisure Travelers**: Families, couples, nature lovers

This comprehensive system will position Voyageur Nest as a modern, tech-savvy hospitality business while maintaining the personal touch that makes mountain BnBs special in Manali.