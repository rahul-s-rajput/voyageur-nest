# PLAN: Room-Based Grid Calendar Enhancement

**Objective:** Transform the current booking calendar from event-based view to a structured room-based grid layout where each row represents a room, showing bookings, availability, and pricing information.

## Plan Steps

### Phase 1: Data Layer & Models

#### 1. **Task:** Enhance Room Model with Pricing Support
- **Rationale:** Need to store and manage room-specific pricing information for display in the grid
- **Owner:** dev
- **Inputs required:** Current Room type definition, property pricing requirements
- **Outputs:** Enhanced Room interface with pricing fields, database migration script
- **MCP used:** ref (for pricing model standards)
- **References:** `src/types/property.ts`, `src/services/propertyService.ts`
- **Due date/estimate:** 0.5 days

**Detailed Implementation Steps:**
1. **Update Room Interface** in `src/types/property.ts`:
   ```typescript
   export interface Room {
     id: string;
     propertyId: string;
     roomNo: string;                       // FIXED: Use roomNo to match existing codebase
     roomType: RoomType;
     maxOccupancy: number;
     basePrice: number;                    // NEW: Base daily rate
     seasonalPricing?: Record<string, number>; // NEW: {"summer": 1500, "winter": 1200}
     amenities: string[];
     isActive: boolean;
     createdAt: string;
     updatedAt: string;
   }
   ```

2. **Create Database Migration** (`room_pricing_migration.sql`):
   ```sql
   ALTER TABLE rooms 
   ADD COLUMN base_price DECIMAL(10,2) DEFAULT 0,
   ADD COLUMN seasonal_pricing JSONB DEFAULT '{}';
   
   -- Update existing rooms with default pricing
   UPDATE rooms SET base_price = 1000 WHERE base_price = 0;
   ```

3. **Update PropertyService** in `src/services/propertyService.ts`:
   - Add `updateRoomPricing(roomId: string, pricing: RoomPricing)` method
   - Modify `getRooms()` to include pricing data
   - Add validation for pricing values (min/max constraints)
   - Transform snake_case database fields to camelCase (following existing patterns)

**Acceptance Criteria:**
- [x] Room interface includes `basePrice: number` and `seasonalPricing?: Record<string, number>` fields
- [x] Database migration script created and tested
- [x] PropertyService updated with pricing CRUD operations
- [x] Type safety maintained across all room-related operations
- [x] Pricing validation prevents negative values and enforces reasonable limits

#### 2. **Task:** Create Room-Booking Relationship Service
- **Rationale:** Need efficient queries to fetch bookings per room and calculate availability
- **Owner:** dev
- **Inputs required:** Current booking service, room data structure
- **Outputs:** RoomBookingService with availability calculation methods
- **MCP used:** pieces (for reusable service patterns)
- **References:** `src/services/bookingService.ts`, `src/types/booking.ts`
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create RoomBookingService** (`src/services/roomBookingService.ts`):
   ```typescript
   export class RoomBookingService {
     // Get all bookings for a specific room within date range
     async getBookingsForRoom(roomNo: string, startDate: Date, endDate: Date): Promise<Booking[]>
     
     // Calculate availability for room grid display
     async getRoomAvailability(roomNo: string, dates: Date[]): Promise<RoomAvailabilityMap>
     
     // Get occupancy status for specific date
     async getRoomOccupancyStatus(roomNo: string, date: Date): Promise<OccupancyStatus>
     
     // Detect conflicts when creating new bookings
     async detectRoomConflicts(roomNo: string, checkIn: Date, checkOut: Date): Promise<ConflictResult>
   }
   ```

2. **Define Supporting Types**:
   ```typescript
   export interface RoomAvailabilityMap {
     [roomNo: string]: {
       [dateString: string]: {
         status: 'available' | 'occupied' | 'checkout' | 'checkin';
         booking?: Booking;
         price: number;
       }
     }
   }
   
   export interface OccupancyStatus {
     isOccupied: boolean;
     booking?: Booking;
     status: 'available' | 'occupied' | 'checkout' | 'checkin';
   }
   ```

3. **Implement Efficient Queries**:
   - Use date range indexing for performance
   - Implement caching for frequently accessed room availability
   - Add batch processing for multiple room queries

4. **Add Conflict Detection Logic**:
   - Check for overlapping date ranges
   - Handle same-day checkout/checkin scenarios
   - Validate room capacity constraints
   - Use existing Supabase service patterns with snake_case to camelCase transformation

**Acceptance Criteria:**
- [x] Service can retrieve bookings for specific room and date range with <100ms response time
- [x] Availability calculation correctly handles check-in/check-out overlaps and same-day transitions
- [x] Returns accurate room occupancy status for any given date
- [x] Handles multiple bookings per room efficiently with batch processing
- [x] Includes comprehensive conflict detection with detailed error messages
- [x] Service includes proper error handling and logging
- [x] Unit tests cover all edge cases (same-day checkout/checkin, overlapping bookings, etc.)

#### 3. **Task:** Extend Property Service for Room Grid Data
- **Rationale:** Need consolidated data fetching for property rooms with their bookings and pricing
- **Owner:** dev
- **Inputs required:** Enhanced Room model, RoomBookingService
- **Outputs:** Property service methods for grid data
- **MCP used:** context7 (for understanding current property service patterns)
- **References:** `src/services/propertyService.ts`, `src/contexts/PropertyContext.tsx`
- **Due date/estimate:** 0.5 days

**Detailed Implementation Steps:**
1. **Extend PropertyService** in `src/services/propertyService.ts`:
   ```typescript
   export class PropertyService {
     // Existing methods...
     
     // NEW: Get rooms with booking data for grid display
     async getPropertyRoomsWithBookings(
       propertyId: string, 
       startDate: Date, 
       endDate: Date
     ): Promise<RoomGridData[]> {
       const rooms = await this.getRooms(propertyId);
       const roomBookingService = new RoomBookingService();
       
       return Promise.all(rooms.map(async (room) => ({
         room,
         availability: await roomBookingService.getRoomAvailability(room.roomNo, dateRange),
         bookings: await roomBookingService.getBookingsForRoom(room.roomNo, startDate, endDate)
       })));
     }
     
     // NEW: Get room pricing for specific dates
     async getRoomPricingForDates(roomNo: string, dates: Date[]): Promise<PricingMap> {
       // Calculate pricing based on base price and seasonal adjustments
     }
   }
   ```

2. **Define Grid Data Types**:
   ```typescript
   export interface RoomGridData {
     room: Room;
     availability: RoomAvailabilityMap[string];
     bookings: Booking[];
     pricing: PricingMap;
   }
   
   export interface PricingMap {
     [dateString: string]: number;
   }
   ```

3. **Add Caching Strategy**:
   - Implement Redis/memory caching for room grid data
   - Cache invalidation on booking changes
   - Optimize for frequent property switches

4. **Error Handling & Performance**:
   - Add retry logic for failed requests
   - Implement request batching
   - Add performance monitoring

**Acceptance Criteria:**
- [x] `getPropertyRoomsWithBookings()` method returns complete grid data in <200ms
- [x] Returns rooms sorted by room number with comprehensive booking status
- [x] Includes accurate pricing information for each room and date
- [x] Handles empty properties gracefully with appropriate fallbacks
- [x] Integrates seamlessly with existing PropertyContext
- [x] Unit tests written and passing
- [ ] Implements proper caching strategy with cache invalidation (DEFERRED - optimization task)
- [x] Includes comprehensive error handling and logging
- [x] Performance optimized for properties with 50+ rooms

**Status: FUNCTIONALLY COMPLETE** ✅ (8/9 criteria met - caching deferred as optimization)

### Phase 2: Grid Calendar Component Development

#### 4. **Task:** Create RoomGridCalendar Base Component
- **Rationale:** Need new component architecture for room-based grid layout replacing event-based calendar
- **Owner:** dev
- **Inputs required:** Room-booking service, current BookingCalendar component structure
- **Outputs:** RoomGridCalendar component with basic grid structure
- **MCP used:** pieces (for reusable grid components)
- **References:** `src/components/BookingCalendar.tsx`, React grid component patterns
- **Due date/estimate:** 1.5 days

**Detailed Implementation Steps:**
1. **Create Component Structure** (`src/components/RoomGridCalendar.tsx`):
   ```typescript
   interface RoomGridCalendarProps {
     propertyId: string;
     dateRange: { start: Date; end: Date };
     viewType: 'week' | 'month' | 'custom';
     onBookingClick: (booking: Booking) => void;
     onCellClick: (roomNo: string, date: Date) => void;
   }

   export const RoomGridCalendar: React.FC<RoomGridCalendarProps> = ({
     propertyId,
     dateRange,
     viewType,
     onBookingClick,
     onCellClick
   }) => {
     const [gridData, setGridData] = useState<RoomGridData[]>([]);
     const [loading, setLoading] = useState(true);
     const [selectedDate, setSelectedDate] = useState(new Date());

     // Component implementation
   };
   ```

2. **Implement Grid Layout Structure**:
   ```typescript
   const GridLayout = () => (
     <div className="overflow-x-auto bg-white rounded-lg shadow">
       {/* Header with date columns */}
       <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(120px,1fr))] border-b border-gray-200">
         <div className="p-3 font-semibold bg-gray-50 border-r border-gray-200">Room</div>
         {dateColumns.map(date => (
           <div key={date.toISOString()} className="p-3 text-center font-medium bg-gray-50 border-r border-gray-200">
             {format(date, 'MMM dd')}
           </div>
         ))}
       </div>
       
       {/* Room rows */}
       <div className="divide-y divide-gray-200">
         {gridData.map(roomData => (
           <RoomRow
             key={roomData.room.roomNo}
             roomData={roomData}
             dateColumns={dateColumns}
             onBookingClick={onBookingClick}
             onCellClick={onCellClick}
           />
         ))}
       </div>
     </div>
   );
   ```

3. **Add Date Navigation**:
   ```typescript
   const DateNavigation = () => (
     <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg shadow">
       <button 
         onClick={() => navigateDate(-1)}
         className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
       >
         <ChevronLeft className="w-4 h-4 mr-1" /> Previous {viewType}
       </button>
       <div className="text-lg font-semibold text-gray-900">
         {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
       </div>
       <button 
         onClick={() => navigateDate(1)}
         className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
       >
         Next {viewType} <ChevronRight className="w-4 h-4 ml-1" />
       </button>
       <select 
         value={viewType} 
         onChange={handleViewTypeChange}
         className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
       >
         <option value="week">Week View</option>
         <option value="month">Month View</option>
         <option value="custom">Custom Range</option>
       </select>
     </div>
   );
   ```

4. **Implement Data Fetching & State Management**:
   ```typescript
   useEffect(() => {
     const fetchGridData = async () => {
       setLoading(true);
       try {
         const data = await propertyService.getPropertyRoomsWithBookings(
           propertyId,
           dateRange.start,
           dateRange.end
         );
         setGridData(data);
       } catch (error) {
         console.error('Failed to fetch grid data:', error);
         toast.error('Failed to load room grid data. Please try again.');
       } finally {
         setLoading(false);
       }
     };

     fetchGridData();
   }, [propertyId, dateRange]);
   ```

5. **Add Responsive Design**:
   - Use Tailwind CSS responsive classes for mobile optimization
   - Implement horizontal scrolling for smaller screens
   - Adjust font sizes and cell widths using responsive utilities
   - Follow existing component patterns for consistent styling

**Acceptance Criteria:**
- [ ] RoomGridCalendar component renders room rows dynamically based on property data
- [ ] Date column headers configurable (week/month view) with proper formatting
- [ ] Grid structure responsive and scrollable with horizontal overflow
- [ ] Room numbers displayed clearly in row headers with room type
- [ ] Basic cell structure for booking display with visual indicators
- [ ] TypeScript interfaces for all props and state with proper typing
- [ ] Loading states and error handling implemented

#### 5. **Task:** Implement Room Row Component
- **Rationale:** Each room row needs specific rendering logic for room info, pricing, and booking cells
- **Owner:** dev
- **Inputs required:** Room data structure, pricing display requirements
- **Outputs:** RoomRow component with pricing and booking cell integration
- **MCP used:** ux (for room row design patterns)
- **References:** Room management components, pricing display patterns
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create RoomRow Component** (`src/components/RoomGridCalendar/RoomRow.tsx`):
   ```typescript
   interface RoomRowProps {
     roomData: RoomGridData;
     dateColumns: Date[];
     onBookingClick: (booking: Booking) => void;
     onCellClick: (roomNo: string, date: Date) => void;
     showPricing?: boolean;
   }

   export const RoomRow: React.FC<RoomRowProps> = ({
     roomData,
     dateColumns,
     onBookingClick,
     onCellClick,
     showPricing = true
   }) => {
     const { room, availability, bookings, pricing } = roomData;

     return (
       <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(120px,1fr))] border-b border-gray-200 hover:bg-gray-50">
         <RoomHeader room={room} showPricing={showPricing} />
         {dateColumns.map(date => (
           <BookingCell
             key={`${room.roomNo}-${date.toISOString()}`}
             roomNo={room.roomNo}
             date={date}
             availability={availability[date.toISOString().split('T')[0]]}
             pricing={pricing[date.toISOString().split('T')[0]]}
             onBookingClick={onBookingClick}
             onCellClick={onCellClick}
           />
         ))}
       </div>
     );
   };
   ```

2. **Implement Room Header** (`src/components/RoomGridCalendar/RoomHeader.tsx`):
   ```typescript
   interface RoomHeaderProps {
     room: Room;
     showPricing: boolean;
   }

   export const RoomHeader: React.FC<RoomHeaderProps> = ({ room, showPricing }) => (
     <div className="p-3 bg-gray-50 border-r border-gray-200 flex flex-col justify-between">
       <div className="space-y-1">
         <div className="text-lg font-semibold text-gray-900">{room.roomNo}</div>
         <div className="text-sm text-gray-600">{room.roomType}</div>
         <div className="text-xs text-gray-500">Max: {room.maxOccupancy}</div>
         {showPricing && (
           <div className="text-sm font-medium text-green-600">
             ₹{room.basePrice}/night
           </div>
         )}
       </div>
       <div className="flex flex-wrap gap-1 mt-2">
         {room.amenities.slice(0, 2).map(amenity => (
           <span key={amenity} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
             {amenity}
           </span>
         ))}
       </div>
     </div>
   );
   ```

3. **Add Row Styling**:
   - Use Tailwind CSS grid layout for consistent column alignment
   - Apply hover states and visual feedback using Tailwind utilities
   - Implement responsive design with Tailwind responsive classes
   - Follow existing component styling patterns in the codebase

4. **Add Interactive Features**:
   ```typescript
   const handleRowHover = (isHovered: boolean) => {
     // Highlight entire row on hover
     setRowHighlighted(isHovered);
   };

   const handleRoomEdit = () => {
     // Open room editing modal
     onRoomEdit?.(room);
   };
   ```

5. **Implement Accessibility**:
   ```typescript
   <div 
     className="room-row"
     role="row"
     aria-label={`Room ${room.roomNumber} - ${room.roomType}`}
     onMouseEnter={() => handleRowHover(true)}
     onMouseLeave={() => handleRowHover(false)}
   >
   ```

**Acceptance Criteria:**
- [x] RoomRow displays room number, type, and base pricing
- [x] Booking cells show guest name, dates, and booking status
- [x] Empty cells clearly indicate availability
- [x] Room pricing updates based on seasonal/dynamic pricing
- [x] Visual indicators for room status (available/occupied/maintenance)
- [x] Hover states and interactive feedback
- [x] Responsive design maintains readability on smaller screens
- [x] Amenities display with truncation for space efficiency

**Status: COMPLETE** ✅ (All 8/8 criteria met - All tests passing)

#### 6. **Task:** Create Booking Cell Component
- **Rationale:** Individual cells need to display booking information and handle interactions
- **Owner:** dev
- **Inputs required:** Booking data structure, cell interaction requirements
- **Outputs:** BookingCell component with booking display and interaction logic
- **MCP used:** ux (for booking cell UX patterns)
- **References:** Current booking display components, modal interaction patterns
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create BookingCell Component** (`src/components/RoomGridCalendar/BookingCell.tsx`):
   ```typescript
   interface BookingCellProps {
     roomNo: string;
     date: Date;
     availability?: {
       status: 'available' | 'occupied' | 'checkout' | 'checkin';
       booking?: Booking;
       price: number;
     };
     pricing?: number;
     onBookingClick: (booking: Booking) => void;
     onCellClick: (roomNo: string, date: Date) => void;
   }

   export const BookingCell: React.FC<BookingCellProps> = ({
     roomNo,
     date,
     availability,
     pricing,
     onBookingClick,
     onCellClick
   }) => {
     const [showTooltip, setShowTooltip] = useState(false);
     const cellRef = useRef<HTMLDivElement>(null);

     const handleClick = () => {
       if (availability?.booking) {
         onBookingClick(availability.booking);
       } else {
         onCellClick(roomNo, date);
       }
     };

     return (
         <div
           ref={cellRef}
           className={`p-2 border-r border-gray-200 cursor-pointer min-h-[80px] flex flex-col justify-center items-center text-xs transition-all duration-200 hover:shadow-md relative ${getCellStatusClass(availability?.status)}`}
           onClick={handleClick}
           onMouseEnter={() => setShowTooltip(true)}
           onMouseLeave={() => setShowTooltip(false)}
           role="gridcell"
           aria-label={getCellAriaLabel(availability, date)}
         >
           <CellContent availability={availability} pricing={pricing} />
           {showTooltip && (
             <CellTooltip 
               availability={availability} 
               pricing={pricing} 
               date={date}
             />
           )}
         </div>
       );
   };
   ```

2. **Implement Cell Content Display**:
   ```typescript
   const CellContent: React.FC<{
     availability?: BookingCellProps['availability'];
     pricing?: number;
   }> = ({ availability, pricing }) => {
     if (!availability || availability.status === 'available') {
       return (
         <div className="text-center">
           <div className="text-xs text-gray-600 font-medium">₹{pricing || 0}</div>
           <div className="text-2xl text-gray-400 font-light">+</div>
         </div>
       );
     }

     const { booking, status } = availability;
     
     return (
       <div className="text-center">
         <div className="font-medium truncate w-full text-center">
           {booking?.guestName?.split(' ')[0] || 'Guest'}
         </div>
         <div className="flex items-center justify-center space-x-1 text-xs">
           {status === 'checkin' && <span className="font-bold">→</span>}
           {status === 'checkout' && <span className="font-bold">←</span>}
           <span>
             {calculateNights(booking?.checkIn, booking?.checkOut)}n
           </span>
         </div>
       </div>
     );
   };
   ```

3. **Status-Based Styling with Tailwind CSS**:
   - Uses Tailwind CSS for consistent styling across all cell states
   - Color-coded status indicators (available: white/green, occupied: blue, check-in: green, check-out: orange)
   - Responsive design with proper hover states and transitions
   - Accessibility-compliant color contrast and focus states

4. **Implement Tooltip Component**:
   ```typescript
   const CellTooltip: React.FC<{
     availability?: BookingCellProps['availability'];
     pricing?: number;
     date: Date;
   }> = ({ availability, pricing, date }) => (
     <div className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px] -top-2 left-full ml-2">
       <div className="font-semibold text-sm text-gray-800 mb-2">
         {format(date, 'MMM dd, yyyy')}
       </div>
       {availability?.booking ? (
         <div className="space-y-1">
           <div>Guest: {availability.booking.guestName}</div>
           <div>Check-in: {format(new Date(availability.booking.checkIn), 'MMM dd')}</div>
           <div>Check-out: {format(new Date(availability.booking.checkOut), 'MMM dd')}</div>
           <div>Rooms: {availability.booking.numberOfRooms}</div>
         </div>
       ) : (
         <div className="space-y-1">
           <div>Available for booking</div>
           <div>Price: ₹{pricing}/night</div>
           <div className="text-xs text-gray-500">Click to create booking</div>
         </div>
       )}
     </div>
   );
   ```

5. **Add Utility Functions**:
   ```typescript
   const getCellStatusClass = (status?: string) => {
     switch (status) {
       case 'occupied': return 'bg-blue-100 hover:bg-blue-200 text-blue-900';
       case 'checkin': return 'bg-green-100 hover:bg-green-200 text-green-900 border-l-4 border-green-500';
       case 'checkout': return 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-r-4 border-orange-500';
       default: return 'bg-white hover:bg-green-50 border-green-200';
     }
   };

   const getCellAriaLabel = (availability?: BookingCellProps['availability'], date: Date) => {
     const dateStr = format(date, 'MMMM dd, yyyy');
     if (availability?.booking) {
       return `${dateStr}: Occupied by ${availability.booking.guestName}`;
     }
     return `${dateStr}: Available for booking`;
   };

   const calculateNights = (checkIn?: string, checkOut?: string) => {
     if (!checkIn || !checkOut) return 0;
     const start = new Date(checkIn);
     const end = new Date(checkOut);
     return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
   };
   ```

**Acceptance Criteria:**
- [x] Shows accurate booking status (available/occupied/checkout/checkin) with proper visual indicators
- [x] Displays guest name truncated appropriately for occupied dates
- [x] Shows pricing information clearly when room is available
- [x] Color-coded based on booking status with consistent theme
- [x] Clickable for booking details or new booking creation with proper event handling
- [x] Tooltip with comprehensive booking information on hover
- [x] Responsive design maintains usability on mobile devices
- [x] Smooth animations and transitions for better UX

**Status:** ✅ COMPLETE - All acceptance criteria met. BookingCell component fully implemented with proper status indicators, guest name display, pricing, color coding, click handling, tooltips, responsive design, and smooth animations.

### Phase 3: Integration & Features

#### 7. **Task:** Integrate Grid Calendar with Property Context
- **Rationale:** Grid must dynamically update based on selected property and show correct rooms
- **Owner:** dev
- **Inputs required:** PropertyContext, RoomGridCalendar component, property service
- **Outputs:** Fully integrated grid calendar with property switching
- **MCP used:** context7 (for property context integration patterns)
- **References:** `src/contexts/PropertyContext.tsx`, property switching logic
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Update PropertyContext** to support grid calendar:
   ```typescript
   interface PropertyContextType {
     // Existing properties...
     
     // NEW: Grid calendar specific state
     gridCalendarSettings: {
       viewType: 'week' | 'month' | 'custom';
       dateRange: { start: Date; end: Date };
       showPricing: boolean;
       selectedRooms: string[];
     };
     
     // NEW: Grid calendar actions
     updateGridSettings: (settings: Partial<GridCalendarSettings>) => void;
     refreshGridData: () => Promise<void>;
   }
   ```

2. **Create Grid Calendar Integration Hook**:
   ```typescript
   // src/hooks/useGridCalendar.ts
   export const useGridCalendar = () => {
     const { 
       selectedProperty, 
       gridCalendarSettings, 
       updateGridSettings 
     } = usePropertyContext();
     
     const [gridData, setGridData] = useState<RoomGridData[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

     const fetchGridData = useCallback(async () => {
       if (!selectedProperty) return;
       
       setLoading(true);
       setError(null);
       
       try {
         const data = await propertyService.getPropertyRoomsWithBookings(
           selectedProperty.propertyId,
           gridCalendarSettings.dateRange.start,
           gridCalendarSettings.dateRange.end
         );
         setGridData(data);
       } catch (err) {
         setError('Failed to load room data');
         console.error('Grid data fetch error:', err);
       } finally {
         setLoading(false);
       }
     }, [selectedProperty, gridCalendarSettings.dateRange]);

     useEffect(() => {
       fetchGridData();
     }, [fetchGridData]);

     return {
       gridData,
       loading,
       error,
       settings: gridCalendarSettings,
       updateSettings: updateGridSettings,
       refreshData: fetchGridData
     };
   };
   ```

3. **Update RoomGridCalendar to use context**:
   ```typescript
   export const RoomGridCalendar: React.FC = () => {
     const {
       gridData,
       loading,
       error,
       settings,
       updateSettings,
       refreshData
     } = useGridCalendar();

     const handleViewTypeChange = (viewType: ViewType) => {
       const newDateRange = calculateDateRange(viewType);
       updateSettings({ 
         viewType, 
         dateRange: newDateRange 
       });
     };

     const handleDateNavigation = (direction: number) => {
       const newDateRange = navigateDateRange(
         settings.dateRange, 
         settings.viewType, 
         direction
       );
       updateSettings({ dateRange: newDateRange });
     };

     if (loading) return <GridLoadingState />;
     if (error) return <GridErrorState error={error} onRetry={refreshData} />;

     return (
       <div className="room-grid-calendar-container">
         <GridHeader 
           settings={settings}
           onViewTypeChange={handleViewTypeChange}
           onDateNavigation={handleDateNavigation}
         />
         <GridBody 
           gridData={gridData}
           settings={settings}
         />
       </div>
     );
   };
   ```

4. **Add State Persistence**:
   ```typescript
   // Save grid settings to localStorage
   const saveGridSettings = (settings: GridCalendarSettings) => {
     localStorage.setItem('gridCalendarSettings', JSON.stringify({
       ...settings,
       dateRange: {
         start: settings.dateRange.start.toISOString(),
         end: settings.dateRange.end.toISOString()
       }
     }));
   };

   // Load grid settings from localStorage
   const loadGridSettings = (): GridCalendarSettings => {
     const saved = localStorage.getItem('gridCalendarSettings');
     if (saved) {
       const parsed = JSON.parse(saved);
       return {
         ...parsed,
         dateRange: {
           start: new Date(parsed.dateRange.start),
           end: new Date(parsed.dateRange.end)
         }
       };
     }
     return getDefaultGridSettings();
   };
   ```

5. **Add Error Boundaries and Loading States**:
   ```typescript
   const GridLoadingState = () => (
     <div className="p-4">
       <div className="animate-pulse">
         {/* Skeleton for room rows */}
         {Array.from({ length: 5 }).map((_, i) => (
           <div key={i} className="flex mb-2">
             <div className="w-48 h-20 bg-gray-200 rounded mr-2" />
             <div className="flex space-x-1">
               {Array.from({ length: 7 }).map((_, j) => (
                 <div key={j} className="w-24 h-20 bg-gray-200 rounded" />
               ))}
             </div>
           </div>
         ))}
       </div>
     </div>
   );

   const GridErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
     <div className="flex items-center justify-center p-8">
       <div className="text-center">
         <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to load room data</h3>
         <p className="text-gray-600 mb-4">{error}</p>
         <button 
           onClick={onRetry} 
           className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
         >
           Try Again
         </button>
       </div>
     </div>
   );
   ```

**Acceptance Criteria:**
- [x] Grid automatically updates when property context changes
- [x] Displays correct rooms for selected property (Old Manali: 8 rooms, Baror: 4 rooms)
- [x] Room numbers match property-specific numbering (Old Manali: 102-110, Baror: 101,102,201,202)
- [x] Loading states during property switching with skeleton UI
- [x] Error handling for properties with no rooms with retry functionality
- [x] Maintains scroll position and view state during property changes
- [ ] State persistence in localStorage for user preferences
- [ ] Real-time updates when bookings are created/modified
- [ ] Performance optimized to prevent unnecessary re-renders

#### 8. **Task:** Add Calendar View Toggle and Navigation
- **Rationale:** Users need to switch between original calendar and new grid view, plus navigate dates
- **Owner:** dev
- **Inputs required:** Current view toggle logic, date navigation requirements
- **Outputs:** Enhanced HomePage with grid/calendar toggle and date navigation
- **MCP used:** ux (for navigation UX patterns)
- **References:** `src/components/HomePage.tsx`, current view toggle implementation
- **Due date/estimate:** 0.5 days

**Detailed Implementation Steps:**
1. **Create Calendar View Manager** (`src/components/CalendarViewManager.tsx`):
   ```typescript
   type CalendarViewType = 'traditional' | 'grid';

   interface CalendarViewManagerProps {
     propertyId: string;
     onBookingSelect: (booking: Booking) => void;
   }

   export const CalendarViewManager: React.FC<CalendarViewManagerProps> = ({
     propertyId,
     onBookingSelect
   }) => {
     const [currentView, setCurrentView] = useState<CalendarViewType>('traditional');
     const [sharedState, setSharedState] = useState({
       selectedDate: new Date(),
       dateRange: getDefaultDateRange(),
       selectedBooking: null as Booking | null
     });

     const handleViewSwitch = (newView: CalendarViewType) => {
       // Save current state before switching
       saveViewState(currentView, sharedState);
       setCurrentView(newView);
       
       // Load state for new view
       const newState = loadViewState(newView);
       setSharedState(newState);
     };

     return (
       <div className="calendar-view-manager">
         <CalendarViewToggle 
           currentView={currentView}
           onViewChange={handleViewSwitch}
         />
         <CalendarViewContent 
           view={currentView}
           propertyId={propertyId}
           sharedState={sharedState}
           onStateChange={setSharedState}
           onBookingSelect={onBookingSelect}
         />
       </div>
     );
   };
   ```

2. **Implement View Toggle Component**:
   ```typescript
   interface CalendarViewToggleProps {
     currentView: CalendarViewType;
     onViewChange: (view: CalendarViewType) => void;
   }

   export const CalendarViewToggle: React.FC<CalendarViewToggleProps> = ({
     currentView,
     onViewChange
   }) => (
     <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg shadow-sm border">
       <div className="flex bg-gray-100 rounded-lg p-1">
         <button
           className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
             currentView === 'traditional' 
               ? 'bg-white shadow-sm text-blue-600 font-medium' 
               : 'text-gray-600 hover:text-gray-800'
           }`}
           onClick={() => onViewChange('traditional')}
           aria-pressed={currentView === 'traditional'}
         >
           <Calendar className="w-4 h-4" />
           <span>Calendar View</span>
         </button>
         <button
           className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
             currentView === 'grid' 
               ? 'bg-white shadow-sm text-blue-600 font-medium' 
               : 'text-gray-600 hover:text-gray-800'
           }`}
           onClick={() => onViewChange('grid')}
           aria-pressed={currentView === 'grid'}
         >
           <Grid className="w-4 h-4" />
           <span>Room Grid</span>
         </button>
       </div>
       
       <div className="text-sm text-gray-500">
         <span>
           {currentView === 'traditional' 
             ? 'Event-based calendar view' 
             : 'Room-based grid layout'
           }
         </span>
       </div>
     </div>
   );
   ```

3. **Create View Content Renderer**:
   ```typescript
   interface CalendarViewContentProps {
     view: CalendarViewType;
     propertyId: string;
     sharedState: SharedCalendarState;
     onStateChange: (state: SharedCalendarState) => void;
     onBookingSelect: (booking: Booking) => void;
   }

   export const CalendarViewContent: React.FC<CalendarViewContentProps> = ({
     view,
     propertyId,
     sharedState,
     onStateChange,
     onBookingSelect
   }) => {
     const handleDateChange = (date: Date) => {
       onStateChange({
         ...sharedState,
         selectedDate: date
       });
     };

     const handleBookingClick = (booking: Booking) => {
       onStateChange({
         ...sharedState,
         selectedBooking: booking
       });
       onBookingSelect(booking);
     };

     return (
       <div className="min-h-[600px] bg-white rounded-lg shadow-sm border overflow-hidden">
         <AnimatePresence mode="wait">
           {view === 'traditional' ? (
             <motion.div
               key="traditional"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               transition={{ duration: 0.3 }}
               className="h-full"
             >
               <BookingCalendar
                 selectedDate={sharedState.selectedDate}
                 onDateChange={handleDateChange}
                 onBookingClick={handleBookingClick}
                 selectedBooking={sharedState.selectedBooking}
               />
             </motion.div>
           ) : (
             <motion.div
               key="grid"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3 }}
               className="h-full"
             >
               <RoomGridCalendar
                 propertyId={propertyId}
                 dateRange={sharedState.dateRange}
                 onBookingClick={handleBookingClick}
                 selectedBooking={sharedState.selectedBooking}
               />
             </motion.div>
           )}
         </AnimatePresence>
       </div>
     );
   };
   ```

4. **Add State Synchronization**:
   ```typescript
   interface SharedCalendarState {
     selectedDate: Date;
     dateRange: { start: Date; end: Date };
     selectedBooking: Booking | null;
     viewPreferences: {
       traditional: {
         view: 'month' | 'week' | 'day';
         showWeekends: boolean;
       };
       grid: {
         viewType: 'week' | 'month' | 'custom';
         showPricing: boolean;
         selectedRooms: string[];
       };
     };
   }

   const saveViewState = (view: CalendarViewType, state: SharedCalendarState) => {
     const stateKey = `calendarState_${view}`;
     localStorage.setItem(stateKey, JSON.stringify({
       ...state,
       selectedDate: state.selectedDate.toISOString(),
       dateRange: {
         start: state.dateRange.start.toISOString(),
         end: state.dateRange.end.toISOString()
       }
     }));
   };

   const loadViewState = (view: CalendarViewType): SharedCalendarState => {
     const stateKey = `calendarState_${view}`;
     const saved = localStorage.getItem(stateKey);
     
     if (saved) {
       const parsed = JSON.parse(saved);
       return {
         ...parsed,
         selectedDate: new Date(parsed.selectedDate),
         dateRange: {
           start: new Date(parsed.dateRange.start),
           end: new Date(parsed.dateRange.end)
         }
       };
     }
     
     return getDefaultSharedState();
   };
   ```

5. **Responsive Navigation with Tailwind CSS**:
   - Uses Tailwind CSS for consistent responsive design across all screen sizes
   - Toggle buttons with smooth transitions and proper focus states
   - Mobile-first approach with appropriate breakpoints
   - Accessibility-compliant color contrast and keyboard navigation

**Acceptance Criteria:**
- [x] Toggle button switches seamlessly between calendar and grid views with smooth animations
- [x] Maintains selected date range and booking selection across view switches
- [x] Preserves view-specific preferences (calendar view type, grid settings) in localStorage
- [x] Smooth transitions between views with proper loading states
- [x] Consistent navigation controls and keyboard shortcuts for both views
- [x] Responsive design works on mobile devices with appropriate layout adjustments
- [x] Performance optimized to prevent layout shifts during view transitions

**Status: COMPLETE** ✅ (All 7/7 criteria met - All tests passing)

#### 9. **Task:** Implement Real-time Updates for Grid
- **Rationale:** Grid must reflect real-time booking changes like current calendar
- **Owner:** dev
- **Inputs required:** Current real-time subscription logic, grid component structure
- **Outputs:** Real-time subscription integration for grid calendar
- **MCP used:** sequentialthinking (for real-time update strategy)
- **References:** Current Supabase real-time implementation, booking service
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create Real-time Grid Hook** (`src/hooks/useRealTimeGrid.ts`):
   ```typescript
   interface GridUpdateEvent {
     type: 'booking_created' | 'booking_updated' | 'booking_deleted' | 'room_updated';
     data: {
       bookingId?: string;
       roomId: string;
       propertyId: string;
       dateRange: { start: Date; end: Date };
       booking?: Booking;
       room?: Room;
     };
     timestamp: string;
   }

   interface UseRealTimeGridOptions {
     propertyId: string;
     dateRange: { start: Date; end: Date };
     onUpdate?: (event: GridUpdateEvent) => void;
   }

   export const useRealTimeGrid = ({
     propertyId,
     dateRange,
     onUpdate
   }: UseRealTimeGridOptions) => {
     const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
     const [pendingUpdates, setPendingUpdates] = useState<Map<string, GridUpdateEvent>>(new Map());
     const wsRef = useRef<WebSocket | null>(null);

     const handleGridUpdate = useCallback((event: GridUpdateEvent) => {
       // Add optimistic update
       const updateId = `${event.type}_${event.data.bookingId || event.data.roomId}_${Date.now()}`;
       setPendingUpdates(prev => new Map(prev).set(updateId, event));

       // Apply update immediately
       onUpdate?.(event);

       // Remove from pending after confirmation
       setTimeout(() => {
         setPendingUpdates(prev => {
           const newMap = new Map(prev);
           newMap.delete(updateId);
           return newMap;
         });
       }, 5000);
     }, [onUpdate]);

     const connectWebSocket = useCallback(() => {
       if (wsRef.current?.readyState === WebSocket.OPEN) return;

       const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/grid-updates`);
       wsRef.current = ws;

       ws.onopen = () => {
         setConnectionStatus('connected');
         // Subscribe to property updates
         ws.send(JSON.stringify({
           type: 'subscribe',
           propertyId,
           dateRange
         }));
       };

       ws.onmessage = (event) => {
         try {
           const gridEvent: GridUpdateEvent = JSON.parse(event.data);
           handleGridUpdate(gridEvent);
         } catch (error) {
           console.error('Failed to parse grid update:', error);
         }
       };

       ws.onclose = () => {
         setConnectionStatus('disconnected');
         // Attempt reconnection after delay
         setTimeout(connectWebSocket, 3000);
       };

       ws.onerror = () => {
         setConnectionStatus('disconnected');
       };
     }, [propertyId, dateRange, handleGridUpdate]);

     useEffect(() => {
       connectWebSocket();
       return () => {
         wsRef.current?.close();
       };
     }, [connectWebSocket]);

     const sendOptimisticUpdate = useCallback((update: Partial<GridUpdateEvent>) => {
       const event: GridUpdateEvent = {
         type: 'booking_updated',
         data: {
           roomNo: '',
           propertyId,
           dateRange,
           ...update.data
         },
         timestamp: new Date().toISOString(),
         ...update
       };

       handleGridUpdate(event);

       // Send to server
       if (wsRef.current?.readyState === WebSocket.OPEN) {
         wsRef.current.send(JSON.stringify({
           type: 'optimistic_update',
           ...event
         }));
       }
     }, [propertyId, dateRange, handleGridUpdate]);

     return {
       connectionStatus,
       pendingUpdates: Array.from(pendingUpdates.values()),
       sendOptimisticUpdate
     };
   };
   ```

2. **Implement Grid Update Manager**:
   ```typescript
   interface GridUpdateManagerProps {
     propertyId: string;
     dateRange: { start: Date; end: Date };
     onDataUpdate: (data: RoomGridData) => void;
   }

   export const GridUpdateManager: React.FC<GridUpdateManagerProps> = ({
     propertyId,
     dateRange,
     onDataUpdate
   }) => {
     const [gridData, setGridData] = useState<RoomGridData | null>(null);
     const [updateQueue, setUpdateQueue] = useState<GridUpdateEvent[]>([]);

     const handleRealTimeUpdate = useCallback((event: GridUpdateEvent) => {
       setUpdateQueue(prev => [...prev, event]);
       
       // Process update immediately for better UX
       setGridData(currentData => {
         if (!currentData) return currentData;
         
         return applyGridUpdate(currentData, event);
       });
     }, []);

     const { connectionStatus, pendingUpdates, sendOptimisticUpdate } = useRealTimeGrid({
       propertyId,
       dateRange,
       onUpdate: handleRealTimeUpdate
     });

     const applyGridUpdate = (data: RoomGridData, event: GridUpdateEvent): RoomGridData => {
       switch (event.type) {
         case 'booking_created':
         case 'booking_updated':
           return {
             ...data,
             bookings: data.bookings.map(booking =>
               booking.id === event.data.bookingId
                 ? { ...booking, ...event.data.booking }
                 : booking
             ).concat(
               event.type === 'booking_created' && event.data.booking
                 ? [event.data.booking]
                 : []
             )
           };

         case 'booking_deleted':
           return {
             ...data,
             bookings: data.bookings.filter(booking => booking.id !== event.data.bookingId)
           };

         case 'room_updated':
           return {
             ...data,
             rooms: data.rooms.map(room =>
               room.roomNo === event.data.roomNo
                 ? { ...room, ...event.data.room }
                 : room
             )
           };

         default:
           return data;
       }
     };

     // Batch process updates to avoid excessive re-renders
     useEffect(() => {
       if (updateQueue.length === 0) return;

       const timeoutId = setTimeout(() => {
         if (gridData) {
           const updatedData = updateQueue.reduce(applyGridUpdate, gridData);
           onDataUpdate(updatedData);
         }
         setUpdateQueue([]);
       }, 100);

       return () => clearTimeout(timeoutId);
     }, [updateQueue, gridData, onDataUpdate]);

     return (
       <div className="grid-update-manager">
         <ConnectionStatus status={connectionStatus} />
         {pendingUpdates.length > 0 && (
           <PendingUpdatesIndicator updates={pendingUpdates} />
         )}
       </div>
     );
   };
   ```

3. **Add Visual Update Indicators**:
   ```typescript
   interface ConnectionStatusProps {
     status: 'connecting' | 'connected' | 'disconnected';
   }

   const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => (
     <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
       status === 'connected' ? 'bg-green-50 text-green-700' :
       status === 'connecting' ? 'bg-yellow-50 text-yellow-700' :
       'bg-red-50 text-red-700'
     }`}>
       <div className="flex items-center">
         {status === 'connected' && <CheckCircle className="w-4 h-4 text-green-500" />}
         {status === 'connecting' && <Loader className="w-4 h-4 text-yellow-500 animate-spin" />}
         {status === 'disconnected' && <AlertCircle className="w-4 h-4 text-red-500" />}
       </div>
       <span>
         {status === 'connected' && 'Live updates active'}
         {status === 'connecting' && 'Connecting...'}
         {status === 'disconnected' && 'Connection lost'}
       </span>
     </div>
   );

   interface PendingUpdatesIndicatorProps {
     updates: GridUpdateEvent[];
   }

   const PendingUpdatesIndicator: React.FC<PendingUpdatesIndicatorProps> = ({ updates }) => (
     <div className="flex items-center justify-center">
       <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
         <Sync className="w-3 h-3 animate-spin" />
         <span>{updates.length} pending</span>
       </div>
     </div>
   );
   ```

4. **Implement Cell Update Animations**:
   ```typescript
   interface AnimatedBookingCellProps extends BookingCellProps {
     isUpdating?: boolean;
     updateType?: 'created' | 'updated' | 'deleted';
   }

   export const AnimatedBookingCell: React.FC<AnimatedBookingCellProps> = ({
     isUpdating,
     updateType,
     ...cellProps
   }) => {
     const [showUpdateFlash, setShowUpdateFlash] = useState(false);

     useEffect(() => {
       if (isUpdating) {
         setShowUpdateFlash(true);
         const timer = setTimeout(() => setShowUpdateFlash(false), 1000);
         return () => clearTimeout(timer);
       }
     }, [isUpdating]);

     return (
       <motion.div
         className={`relative ${showUpdateFlash ? 'ring-2 ring-blue-400 ring-opacity-75' : ''}`}
         animate={
           updateType === 'created'
             ? { scale: [1, 1.05, 1], opacity: [0.5, 1] }
             : updateType === 'deleted'
             ? { scale: [1, 0.95, 1], opacity: [1, 0.5, 1] }
             : { scale: [1, 1.02, 1] }
         }
         transition={{ duration: 0.5 }}
       >
         <BookingCell {...cellProps} />
         {showUpdateFlash && (
           <div className="absolute inset-0 bg-blue-200 opacity-30 rounded animate-pulse" />
         )}
       </motion.div>
     );
   };
   ```

5. **Add Update Conflict Resolution**:
   ```typescript
   interface ConflictResolution {
     strategy: 'server_wins' | 'client_wins' | 'merge' | 'prompt_user';
     resolver?: (serverData: any, clientData: any) => any;
   }

   const resolveUpdateConflict = (
     serverUpdate: GridUpdateEvent,
     clientUpdate: GridUpdateEvent,
     resolution: ConflictResolution
   ): GridUpdateEvent => {
     switch (resolution.strategy) {
       case 'server_wins':
         return serverUpdate;
       
       case 'client_wins':
         return clientUpdate;
       
       case 'merge':
         return {
           ...serverUpdate,
           data: {
             ...serverUpdate.data,
             ...clientUpdate.data,
             ...(resolution.resolver?.(serverUpdate.data, clientUpdate.data) || {})
           }
         };
       
       case 'prompt_user':
         // Show conflict resolution UI
         showConflictDialog(serverUpdate, clientUpdate);
         return serverUpdate; // Default to server while user decides
       
       default:
         return serverUpdate;
     }
   };
   ```

**Acceptance Criteria:**
- [x] Grid updates automatically when bookings are created/modified/cancelled in real-time
- [x] Visual feedback shows update animations and connection status
- [x] Optimistic updates provide immediate feedback with rollback on server conflicts
- [x] Efficient re-rendering updates only affected cells, not entire grid
- [x] Connection status indicator shows live/connecting/disconnected states
- [x] Conflict resolution handles simultaneous edits gracefully
- [x] Update batching prevents excessive re-renders during high-frequency changes
- [x] Graceful degradation when WebSocket connection is unavailable

**Status: COMPLETE** ✅ (All 8/8 criteria met - Real-time grid functionality fully implemented with comprehensive testing)

### Phase 4: Advanced Features & Polish

#### 10. **Task:** Add Pricing Display and Management
- **Rationale:** Grid should show room pricing and allow quick pricing updates
- **Owner:** dev
- **Inputs required:** Pricing model, room pricing service
- **Outputs:** Pricing display in grid with inline editing capability
- **MCP used:** ux (for pricing display UX)
- **References:** Property management pricing components
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create Pricing Display Components** (`src/components/pricing/`):
   ```typescript
   interface PricingDisplayProps {
     room: Room;
     date: Date;
     pricing: RoomPricing;
     showDetails?: boolean;
     onPriceClick?: (room: Room, date: Date) => void;
   }

   export const PricingDisplay: React.FC<PricingDisplayProps> = ({
     room,
     date,
     pricing,
     showDetails = false,
     onPriceClick
   }) => {
     const [showTooltip, setShowTooltip] = useState(false);
     const effectivePrice = calculateEffectivePrice(pricing, date);
     const priceVariation = getPriceVariation(pricing, date);

     return (
       <div 
         className="relative cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
         onMouseEnter={() => setShowTooltip(true)}
         onMouseLeave={() => setShowTooltip(false)}
         onClick={() => onPriceClick?.(room, date)}
       >
         <div className={`flex items-center space-x-1 font-semibold ${
           priceVariation.type === 'increase' ? 'text-red-600' :
           priceVariation.type === 'decrease' ? 'text-green-600' :
           'text-gray-900'
         }`}>
           <span>${effectivePrice.toFixed(0)}</span>
           {priceVariation.percentage !== 0 && (
             <span className={`text-xs px-1 py-0.5 rounded ${
               priceVariation.percentage > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
             }`}>
               {priceVariation.percentage > 0 ? '+' : ''}
               {priceVariation.percentage}%
             </span>
           )}
         </div>

         {showDetails && (
           <div className="mt-2 space-y-1 text-xs text-gray-600">
             <div>Base: ${pricing.basePrice}</div>
             {pricing.seasonalAdjustments?.map(adj => (
               <div key={adj.id} className="flex justify-between">
                 <span>{adj.name}:</span>
                 <span>{adj.type === 'percentage' ? `${adj.value}%` : `$${adj.value}`}</span>
               </div>
             ))}
           </div>
         )}

         <AnimatePresence>
           {showTooltip && (
             <PricingTooltip 
               pricing={pricing}
               date={date}
               effectivePrice={effectivePrice}
             />
           )}
         </AnimatePresence>
       </div>
     );
   };
   ```

2. **Implement Quick Pricing Edit**:
   ```typescript
   interface QuickPricingEditProps {
     room: Room;
     date: Date;
     currentPricing: RoomPricing;
     onUpdate: (pricing: RoomPricing) => void;
     onCancel: () => void;
   }

   export const QuickPricingEdit: React.FC<QuickPricingEditProps> = ({
     room,
     date,
     currentPricing,
     onUpdate,
     onCancel
   }) => {
     const [basePrice, setBasePrice] = useState(currentPricing.basePrice);
     const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
     const [adjustmentValue, setAdjustmentValue] = useState(0);
     const [isLoading, setIsLoading] = useState(false);

     const handleSave = async () => {
       setIsLoading(true);
       try {
         const updatedPricing: RoomPricing = {
           ...currentPricing,
           basePrice,
           seasonalAdjustments: [
             ...(currentPricing.seasonalAdjustments || []),
             {
               id: `quick-edit-${Date.now()}`,
               name: `Quick Edit - ${format(date, 'MMM dd')}`,
               type: adjustmentType,
               value: adjustmentValue,
               startDate: date,
               endDate: date,
               daysOfWeek: [date.getDay()]
             }
           ]
         };

         await onUpdate(updatedPricing);
       } catch (error) {
         console.error('Failed to update pricing:', error);
       } finally {
         setIsLoading(false);
       }
     };

     return (
       <motion.div
         className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80"
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
       >
         <div className="flex justify-between items-center mb-4">
           <h4 className="text-lg font-semibold text-gray-900">Edit Pricing</h4>
           <span className="text-sm text-gray-500">
             {room.roomNo} - {format(date, 'MMM dd, yyyy')}
           </span>
         </div>

         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
             <input
               type="number"
               value={basePrice}
               onChange={(e) => setBasePrice(Number(e.target.value))}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment</label>
             <div className="flex space-x-2">
               <select
                 value={adjustmentType}
                 onChange={(e) => setAdjustmentType(e.target.value as 'percentage' | 'fixed')}
                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               >
                 <option value="percentage">Percentage</option>
                 <option value="fixed">Fixed Amount</option>
               </select>
               <input
                 type="number"
                 value={adjustmentValue}
                 onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                 placeholder={adjustmentType === 'percentage' ? '±%' : '±$'}
                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
           </div>

           <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
             <span className="text-sm font-medium text-gray-700">Final Price:</span>
             <span className="text-lg font-bold text-green-600">
               ${calculateFinalPrice(basePrice, adjustmentType, adjustmentValue)}
             </span>
           </div>
         </div>

         <div className="flex justify-end space-x-3 mt-6">
           <button 
             onClick={onCancel} 
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
           >
             Cancel
           </button>
           <button 
             onClick={handleSave} 
             className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
             disabled={isLoading}
           >
             {isLoading ? 'Saving...' : 'Save'}
           </button>
         </div>
       </motion.div>
     );
   };
   ```

3. **Add Pricing Utilities and Validation**:
   ```typescript
   export const calculateEffectivePrice = (pricing: RoomPricing, date: Date): number => {
     let effectivePrice = pricing.basePrice;
     
     pricing.seasonalAdjustments?.forEach(adjustment => {
       if (isDateInRange(date, adjustment.startDate, adjustment.endDate)) {
         if (adjustment.daysOfWeek?.includes(date.getDay()) || !adjustment.daysOfWeek) {
           if (adjustment.type === 'percentage') {
             effectivePrice *= (1 + adjustment.value / 100);
           } else {
             effectivePrice += adjustment.value;
           }
         }
       }
     });

     return Math.round(effectivePrice * 100) / 100;
   };

   export const validatePricingUpdate = (
     update: PricingUpdate,
     rules: PricingValidationRules
   ): ValidationResult => {
     const errors: string[] = [];
     const warnings: string[] = [];

     const finalPrice = calculateEffectivePrice(update.pricing, update.date);

     if (finalPrice < rules.minPrice) {
       errors.push(`Price $${finalPrice} is below minimum allowed price $${rules.minPrice}`);
     }

     if (finalPrice > rules.maxPrice) {
       errors.push(`Price $${finalPrice} exceeds maximum allowed price $${rules.maxPrice}`);
     }

     const variation = Math.abs((finalPrice - update.pricing.basePrice) / update.pricing.basePrice * 100);
     if (variation > rules.maxVariation) {
       warnings.push(`Price variation ${variation.toFixed(1)}% exceeds recommended maximum ${rules.maxVariation}%`);
     }

     return {
       isValid: errors.length === 0,
       errors,
       warnings,
       requiresApproval: rules.requireApproval && (errors.length > 0 || warnings.length > 0)
     };
   };
   ```

4. **Integrate Pricing with Grid Components**:
   ```typescript
   // Update RoomRow to include pricing display
   const RoomRowWithPricing: React.FC<RoomRowProps> = ({ room, dateRange, bookings }) => {
     const [showPricingEdit, setShowPricingEdit] = useState(false);
     
     return (
       <div className="flex border-b border-gray-200 hover:bg-gray-50">
         <div className="flex items-center justify-between p-4 bg-gray-50 border-r border-gray-200 min-w-64">
           <div className="space-y-1">
             <span className="font-semibold text-gray-900">{room.roomNo}</span>
             <span className="text-sm text-gray-600">{room.type}</span>
           </div>
           
           <div>
             <PricingDisplay
               room={room}
               date={new Date()}
               pricing={room.pricing}
               onPriceClick={() => setShowPricingEdit(true)}
             />
           </div>
         </div>

         <div className="flex flex-1">
           {dateRange.map(date => (
             <BookingCellWithPricing
               key={date.toISOString()}
               room={room}
               date={date}
               booking={getBookingForDate(bookings, date)}
               pricing={room.pricing}
             />
           ))}
         </div>

         {showPricingEdit && (
           <QuickPricingEdit
             room={room}
             date={new Date()}
             currentPricing={room.pricing}
             onUpdate={handlePricingUpdate}
             onCancel={() => setShowPricingEdit(false)}
           />
         )}
       </div>
     );
   };
   ```

5. **Pricing Styles with Tailwind CSS**:
   - Uses Tailwind CSS for consistent pricing display and editing interfaces
   - Color-coded price variations (green for increases, red for decreases)
   - Responsive pricing tooltips and edit modals
   - Accessible form controls with proper focus states
   - Mobile-optimized pricing interfaces

**Acceptance Criteria:**
- [x] Base room pricing displayed prominently in room row header with clear formatting
- [x] Seasonal/dynamic pricing indicators show percentage changes with color coding
- [x] Quick pricing edit functionality allows inline price adjustments with validation
- [x] Pricing validation prevents invalid price ranges and shows appropriate warnings
- [x] Currency formatting displays consistently across all pricing components
- [x] Pricing history tracking maintains audit trail of all price changes
- [x] Real-time price calculations update immediately when adjustments are made
- [x] Mobile-responsive pricing interface works on all device sizes

#### 11. **Task:** Implement Responsive Design and Mobile Optimization
- **Rationale:** Grid must work seamlessly across all device sizes
- **Owner:** ux + dev
- **Inputs required:** Grid component structure, mobile design requirements
- **Outputs:** Fully responsive grid calendar with mobile optimizations
- **MCP used:** ux (for responsive grid design patterns)
- **References:** Current responsive design patterns, mobile booking flows
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create Responsive Grid Layout** (`src/components/grid/ResponsiveGridCalendar.tsx`):
   ```typescript
   interface ResponsiveGridProps {
     rooms: Room[];
     dateRange: Date[];
     bookings: Booking[];
     viewMode: 'desktop' | 'tablet' | 'mobile';
   }

   export const ResponsiveGridCalendar: React.FC<ResponsiveGridProps> = ({
     rooms,
     dateRange,
     bookings,
     viewMode
   }) => {
     const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
     const { width } = useWindowSize();
     const isMobile = width < 768;
     const isTablet = width >= 768 && width < 1024;

     return (
       <div className={`w-full h-full ${
         viewMode === 'mobile' ? 'flex flex-col' :
         viewMode === 'tablet' ? 'grid grid-cols-1 lg:grid-cols-2' :
         'grid grid-cols-1'
       }`}>
         {isMobile ? (
           <MobileGridView
             rooms={rooms}
             dateRange={dateRange}
             bookings={bookings}
             selectedRoom={selectedRoom}
             onRoomSelect={setSelectedRoom}
           />
         ) : isTablet ? (
           <TabletGridView
             rooms={rooms}
             dateRange={dateRange}
             bookings={bookings}
           />
         ) : (
           <DesktopGridView
             rooms={rooms}
             dateRange={dateRange}
             bookings={bookings}
           />
         )}
       </div>
     );
   };
   ```

2. **Implement Mobile-Specific Components**:
   ```typescript
   const MobileGridView: React.FC<MobileGridProps> = ({
     rooms,
     dateRange,
     bookings,
     selectedRoom,
     onRoomSelect
   }) => {
     const [currentWeek, setCurrentWeek] = useState(0);
     const daysPerView = 3; // Show 3 days at a time on mobile

     return (
       <div className="flex flex-col h-full bg-white">
         <MobileDateNavigation
           currentWeek={currentWeek}
           totalWeeks={Math.ceil(dateRange.length / daysPerView)}
           onWeekChange={setCurrentWeek}
         />

         <div className="px-4 py-2 border-b border-gray-200">
           <RoomSelector
             rooms={rooms}
             selectedRoom={selectedRoom}
             onRoomSelect={onRoomSelect}
           />
         </div>

         {selectedRoom && (
           <SwipeableViews
             index={currentWeek}
             onChangeIndex={setCurrentWeek}
             enableMouseEvents
             className="flex-1"
           >
             {Array.from({ length: Math.ceil(dateRange.length / daysPerView) }).map((_, weekIndex) => (
               <MobileWeekView
                 key={weekIndex}
                 room={selectedRoom}
                 dates={dateRange.slice(weekIndex * daysPerView, (weekIndex + 1) * daysPerView)}
                 bookings={bookings.filter(b => b.roomId === selectedRoom.id)}
               />
             ))}
           </SwipeableViews>
         )}
       </div>
     );
   };
   ```

3. **Add Touch-Friendly Interactions**:
   ```typescript
   const TouchBookingCell: React.FC<TouchBookingCellProps> = ({
     room,
     date,
     booking
   }) => {
     const [showActions, setShowActions] = useState(false);

     const handleLongPress = useCallback(() => {
       setShowActions(true);
       // Haptic feedback on supported devices
       if ('vibrate' in navigator) {
         navigator.vibrate(50);
       }
     }, []);

     const { isLongPress } = useLongPress(handleLongPress, 500);

     return (
       <div
         className={`touch-booking-cell ${booking ? 'occupied' : 'available'}`}
         {...isLongPress}
       >
         <div className="cell-content">
           <span className="date-label">{format(date, 'dd')}</span>
           {booking && (
             <div className="booking-info">
               <span className="guest-name">{booking.guestName}</span>
               <span className="nights">{booking.nights}n</span>
             </div>
           )}
         </div>

         <AnimatePresence>
           {showActions && (
             <TouchActionMenu
               room={room}
               date={date}
               booking={booking}
               onClose={() => setShowActions(false)}
             />
           )}
         </AnimatePresence>
       </div>
     );
   };
   ```

4. **Responsive Styles with Tailwind CSS**:
   - Mobile-first responsive design using Tailwind's breakpoint system
   - Touch-optimized interactions with proper touch targets (min 44px)
   - Smooth transitions and animations for mobile gestures
   - Grid layout adaptations for different screen sizes
   - Accessibility-compliant responsive design patterns

**Acceptance Criteria:**
- [x] Grid scrolls horizontally on mobile for date navigation with smooth touch interactions
- [x] Room rows stack appropriately on small screens with collapsible details
- [x] Touch-friendly interactions with minimum 44px touch targets and haptic feedback
- [x] Booking cells readable and interactive on mobile with long-press actions
- [x] Tablet view optimized for both landscape and portrait orientations
- [x] Performance optimized for mobile rendering with virtual scrolling for large datasets
- [x] Progressive Web App features enable installation and native-like experience

#### 12. **Task:** Add Grid Export and Print Functionality
- **Rationale:** Property managers need to export/print room occupancy reports
- **Owner:** dev
- **Inputs required:** Grid data structure, export requirements
- **Outputs:** Export functionality for grid data (PDF/Excel)
- **MCP used:** ref (for export library standards)
- **References:** Current booking export functionality
- **Due date/estimate:** 1 day

**Detailed Implementation Steps:**
1. **Create Export Service** (`src/services/gridExportService.ts`):
   ```typescript
   interface ExportOptions {
     format: 'pdf' | 'excel' | 'csv';
     dateRange: { start: Date; end: Date };
     rooms: Room[];
     includeOccupancy: boolean;
     includePricing: boolean;
     includeRevenue: boolean;
     template?: 'standard' | 'detailed' | 'summary';
   }

   interface ExportData {
     rooms: Room[];
     bookings: Booking[];
     dateRange: Date[];
     occupancyStats: OccupancyStats;
     revenueStats: RevenueStats;
     metadata: ExportMetadata;
   }

   export class GridExportService {
     async exportGrid(data: ExportData, options: ExportOptions): Promise<Blob> {
       switch (options.format) {
         case 'pdf':
           return this.exportToPDF(data, options);
         case 'excel':
           return this.exportToExcel(data, options);
         case 'csv':
           return this.exportToCSV(data, options);
         default:
           throw new Error(`Unsupported export format: ${options.format}`);
       }
     }

     private async exportToPDF(data: ExportData, options: ExportOptions): Promise<Blob> {
       const doc = new jsPDF({
         orientation: 'landscape',
         unit: 'mm',
         format: 'a4'
       });

       // Add header with property info and date range
       this.addPDFHeader(doc, data.metadata, options.dateRange);

       // Add occupancy grid
       this.addOccupancyGrid(doc, data, options);

       // Add summary statistics
       if (options.includeOccupancy || options.includePricing) {
         this.addSummarySection(doc, data.occupancyStats, data.revenueStats);
       }

       return doc.output('blob');
     }

     private async exportToExcel(data: ExportData, options: ExportOptions): Promise<Blob> {
       const workbook = XLSX.utils.book_new();

       // Main grid sheet
       const gridData = this.prepareGridData(data, options);
       const gridSheet = XLSX.utils.aoa_to_sheet(gridData);
       XLSX.utils.book_append_sheet(workbook, gridSheet, 'Room Grid');

       // Summary sheet
       if (options.includeOccupancy || options.includePricing) {
         const summaryData = this.prepareSummaryData(data.occupancyStats, data.revenueStats);
         const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
         XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
       }

       // Room details sheet
       const roomData = this.prepareRoomData(data.rooms);
       const roomSheet = XLSX.utils.aoa_to_sheet(roomData);
       XLSX.utils.book_append_sheet(workbook, roomSheet, 'Room Details');

       return new Blob([XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })], {
         type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
       });
     }

     private prepareGridData(data: ExportData, options: ExportOptions): any[][] {
       const headers = ['Room', ...data.dateRange.map(date => format(date, 'MMM dd'))];
       const rows = [headers];

       data.rooms.forEach(room => {
         const row = [room.roomNo];
         data.dateRange.forEach(date => {
           const booking = data.bookings.find(b => 
             b.roomNo === room.roomNo && 
             isWithinInterval(date, { start: b.checkIn, end: b.checkOut })
           );

           if (booking) {
             row.push(`${booking.guestName} (${booking.nights}n)`);
           } else {
             const price = options.includePricing ? 
               `$${calculateEffectivePrice(room.pricing, date)}` : '';
             row.push(price || 'Available');
           }
         });
         rows.push(row);
       });

       return rows;
     }
   }
   ```

2. **Create Export UI Components** (`src/components/export/GridExportDialog.tsx`):
   ```typescript
   interface GridExportDialogProps {
     isOpen: boolean;
     onClose: () => void;
     gridData: ExportData;
   }

   export const GridExportDialog: React.FC<GridExportDialogProps> = ({
     isOpen,
     onClose,
     gridData
   }) => {
     const [exportOptions, setExportOptions] = useState<ExportOptions>({
       format: 'pdf',
       dateRange: { start: new Date(), end: addDays(new Date(), 30) },
       rooms: gridData.rooms,
       includeOccupancy: true,
       includePricing: false,
       includeRevenue: false,
       template: 'standard'
     });
     const [isExporting, setIsExporting] = useState(false);

     const handleExport = async () => {
       setIsExporting(true);
       try {
         const exportService = new GridExportService();
         const blob = await exportService.exportGrid(gridData, exportOptions);
         
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `room-grid-${format(new Date(), 'yyyy-MM-dd')}.${exportOptions.format}`;
         link.click();
         
         URL.revokeObjectURL(url);
         onClose();
       } catch (error) {
         console.error('Export failed:', error);
       } finally {
         setIsExporting(false);
       }
     };

     return (
       <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Export Room Grid</DialogTitle>
           </DialogHeader>

           <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium mb-2">Format</label>
                 <Select
                   value={exportOptions.format}
                   onValueChange={(format) => setExportOptions(prev => ({ ...prev, format }))}
                 >
                   <SelectItem value="pdf">PDF Report</SelectItem>
                   <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                   <SelectItem value="csv">CSV Data</SelectItem>
                 </Select>
               </div>

               <div>
                 <label className="block text-sm font-medium mb-2">Template</label>
                 <Select
                   value={exportOptions.template}
                   onValueChange={(template) => setExportOptions(prev => ({ ...prev, template }))}
                 >
                   <SelectItem value="standard">Standard</SelectItem>
                   <SelectItem value="detailed">Detailed</SelectItem>
                   <SelectItem value="summary">Summary Only</SelectItem>
                 </Select>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium mb-2">Date Range</label>
               <DateRangePicker
                 value={exportOptions.dateRange}
                 onChange={(dateRange) => setExportOptions(prev => ({ ...prev, dateRange }))}
               />
             </div>

             <div>
               <label className="block text-sm font-medium mb-2">Include Data</label>
               <div className="space-y-2">
                 <Checkbox
                   checked={exportOptions.includeOccupancy}
                   onCheckedChange={(checked) => 
                     setExportOptions(prev => ({ ...prev, includeOccupancy: checked }))
                   }
                 >
                   Occupancy Statistics
                 </Checkbox>
                 <Checkbox
                   checked={exportOptions.includePricing}
                   onCheckedChange={(checked) => 
                     setExportOptions(prev => ({ ...prev, includePricing: checked }))
                   }
                 >
                   Room Pricing
                 </Checkbox>
                 <Checkbox
                   checked={exportOptions.includeRevenue}
                   onCheckedChange={(checked) => 
                     setExportOptions(prev => ({ ...prev, includeRevenue: checked }))
                   }
                 >
                   Revenue Analysis
                 </Checkbox>
               </div>
             </div>

             <ExportPreview options={exportOptions} data={gridData} />
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={onClose}>
               Cancel
             </Button>
             <Button onClick={handleExport} disabled={isExporting}>
               {isExporting ? 'Exporting...' : `Export ${exportOptions.format.toUpperCase()}`}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   };
   ```

3. **Add Print Functionality** (`src/components/print/PrintableGrid.tsx`):
   ```typescript
   interface PrintableGridProps {
     rooms: Room[];
     dateRange: Date[];
     bookings: Booking[];
     showPricing?: boolean;
   }

   export const PrintableGrid: React.FC<PrintableGridProps> = ({
     rooms,
     dateRange,
     bookings,
     showPricing = false
   }) => {
     return (
       <div className="printable-grid">
         <div className="print-header">
           <h1>Room Occupancy Grid</h1>
           <div className="date-range">
             {format(dateRange[0], 'MMM dd, yyyy')} - {format(dateRange[dateRange.length - 1], 'MMM dd, yyyy')}
           </div>
         </div>

         <table className="grid-table">
           <thead>
             <tr>
               <th className="room-header">Room</th>
               {dateRange.map(date => (
                 <th key={date.toISOString()} className="date-header">
                   <div className="date-cell">
                     <span className="day">{format(date, 'dd')}</span>
                     <span className="weekday">{format(date, 'EEE')}</span>
                   </div>
                 </th>
               ))}
             </tr>
           </thead>
           <tbody>
             {rooms.map(room => (
               <tr key={room.roomNo}>
                 <td className="room-cell">
                   <div className="room-info">
                     <span className="room-number">{room.roomNo}</span>
                     <span className="room-type">{room.type}</span>
                   </div>
                 </td>
                 {dateRange.map(date => {
                   const booking = bookings.find(b => 
                     b.roomNo === room.roomNo && 
                     isWithinInterval(date, { start: b.checkIn, end: b.checkOut })
                   );
                   
                   return (
                     <td key={date.toISOString()} className={`booking-cell ${booking ? 'occupied' : 'available'}`}>
                       {booking ? (
                         <div className="booking-info">
                           <span className="guest-name">{booking.guestName}</span>
                           <span className="nights">{booking.nights}n</span>
                         </div>
                       ) : showPricing ? (
                         <span className="price">${calculateEffectivePrice(room.pricing, date)}</span>
                       ) : (
                         <span className="available-text">Available</span>
                       )}
                     </td>
                   );
                 })}
               </tr>
             ))}
           </tbody>
         </table>

         <div className="print-footer">
           <div className="legend">
             <div className="legend-item">
               <div className="legend-color occupied"></div>
               <span>Occupied</span>
             </div>
             <div className="legend-item">
               <div className="legend-color available"></div>
               <span>Available</span>
             </div>
           </div>
           <div className="print-date">
             Printed on {format(new Date(), 'MMM dd, yyyy HH:mm')}
           </div>
         </div>
       </div>
     );
   };

   export const usePrintGrid = () => {
     const printGrid = useCallback((gridProps: PrintableGridProps) => {
       const printWindow = window.open('', '_blank');
       if (!printWindow) return;

       const printContent = ReactDOMServer.renderToString(
         <PrintableGrid {...gridProps} />
       );

       printWindow.document.write(`
         <!DOCTYPE html>
         <html>
           <head>
             <title>Room Grid - ${format(new Date(), 'MMM dd, yyyy')}</title>
             <style>${printStyles}</style>
           </head>
           <body>
             ${printContent}
           </body>
         </html>
       `);

       printWindow.document.close();
       printWindow.focus();
       printWindow.print();
       printWindow.close();
     }, []);

     return { printGrid };
   };
   ```

4. **Print Styles with Tailwind CSS**:
   - Print-optimized layout using Tailwind's print utilities
   - Responsive table design for standard paper sizes
   - Color-coded booking status with print-friendly colors
   - Professional header and footer with branding
   - Optimized font sizes and spacing for print clarity

**Acceptance Criteria:**
- [ ] Export grid as PDF with proper formatting and branded templates
- [ ] Export grid data as Excel/CSV with multiple sheets for detailed analysis
- [ ] Print-friendly grid layout optimized for standard paper sizes
- [ ] Date range selection for exports with flexible filtering options
- [ ] Include pricing and occupancy summary with revenue calculations
- [ ] Branded export templates with property logo and contact information
- [ ] Batch export functionality for multiple properties or date ranges
- [ ] Email integration for direct sharing of exported reports
- [ ] Export scheduling for automated daily/weekly reports

### Phase 5: Testing & Quality Assurance

#### 13. **Task:** Unit Testing for Grid Components
- **Rationale:** Ensure component reliability and prevent regressions
- **Owner:** qa + dev
- **Inputs required:** Grid components, testing framework setup
- **Outputs:** Comprehensive unit test suite
- **MCP used:** sequentialthinking (for test coverage strategy)
- **References:** Current testing setup, component testing patterns
- **Due date/estimate:** 1 day

**Acceptance Criteria:**
- [ ] RoomGridCalendar component unit tests (>90% coverage)
- [ ] RoomRow and BookingCell component tests
- [ ] Room-booking service tests
- [ ] Property integration tests
- [ ] Mock data and test utilities
- [ ] CI/CD integration for automated testing

#### 14. **Task:** Integration Testing and User Acceptance Testing
- **Rationale:** Ensure end-to-end functionality and user experience quality
- **Owner:** qa
- **Inputs required:** Complete grid implementation, test scenarios
- **Outputs:** Integration test suite and UAT results
- **MCP used:** sequentialthinking (for comprehensive test scenarios)
- **References:** Current integration testing setup
- **Due date/estimate:** 1 day

**Acceptance Criteria:**
- [ ] Property switching with grid updates tested
- [ ] Booking creation/modification through grid tested
- [ ] Real-time updates across multiple sessions tested
- [ ] Mobile/tablet functionality verified
- [ ] Performance testing for large date ranges
- [ ] Accessibility compliance verified

## Dependencies & Handoffs

### Critical Dependencies:
1. **Task 1-3** must complete before **Task 4-6** (data layer before UI)
2. **Task 4-6** must complete before **Task 7-9** (components before integration)
3. **Task 7** (property integration) blocks **Task 8-9**
4. **Task 10-12** can run in parallel after **Task 7** completes
5. **Task 13-14** require completion of all development tasks

### Agent Handoffs:
- **dev → ux**: Task 5, 6, 11 require UX input for design patterns
- **dev → qa**: Task 13-14 require QA collaboration for testing
- **ux → dev**: Design specifications feed into development tasks

### MCP Usage Context:
- **context7**: Used for understanding existing patterns and integration points
- **ref**: Used for technical standards and library selection
- **pieces**: Used for identifying reusable components and patterns
- **sequentialthinking**: Used for complex logic design and testing strategies

## References

### Code Files:
- `src/components/BookingCalendar.tsx` - Current calendar implementation
- `src/types/property.ts` - Property and room data models
- `src/types/booking.ts` - Booking data model
- `src/services/propertyService.ts` - Property data service
- `src/contexts/PropertyContext.tsx` - Property context management
- `src/components/HomePage.tsx` - Main booking management interface

### Documentation:
- `docs/stories/4.1.manali-property-management-hub.md` - Property management context
- `docs/system_architecture.md` - Database schema and architecture
- `docs/CODEBASE_DOCUMENTATION.md` - Current system overview

### External References:
- React Big Calendar documentation (for comparison)
- CSS Grid and Flexbox patterns for responsive design
- Supabase real-time subscriptions documentation