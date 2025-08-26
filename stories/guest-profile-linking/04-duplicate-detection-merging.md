# Story 4: Implement Guest Profile Duplicate Detection and Merging

## 🎯 Objective
Add functionality to detect potential duplicate guest profiles and provide a UI to merge them, ensuring clean guest data and accurate statistics.

## 📋 Acceptance Criteria
- [ ] Service can detect potential duplicate profiles by email, phone, or similar names
- [ ] UI component shows duplicate alerts to staff
- [ ] Staff can select primary profile and merge duplicates
- [ ] Merging updates all bookings to point to primary profile
- [ ] Duplicate profiles are deleted after merge
- [ ] Statistics are recalculated after merge

## 📍 Files to Modify/Create
1. `src/services/guestProfileService.ts` - Add duplicate detection methods
2. `src/components/GuestDuplicateAlert.tsx` - New UI component
3. `src/pages/GuestProfiles.tsx` - Integrate duplicate detection UI

## 🔧 Implementation Details

### Part 1: Add Duplicate Detection Methods to GuestProfileService

**Location**: `src/services/guestProfileService.ts`

**Add these methods**:
```typescript
/**
 * Find potential duplicate guest profiles
 */
static async findPotentialDuplicates(
  name: string, 
  email?: string, 
  phone?: string
): Promise<GuestProfile[]> {
  const duplicates: GuestProfile[] = [];
  const foundIds = new Set<string>();
  
  // Exact email match
  if (email) {
    const emailMatches = await this.searchGuestProfiles({ 
      search: email,
      limit: 10 
    });
    emailMatches.forEach(guest => {
      if (guest.email?.toLowerCase() === email.toLowerCase() && !foundIds.has(guest.id)) {
        duplicates.push(guest);
        foundIds.add(guest.id);
      }
    });
  }
  
  // Exact phone match
  if (phone) {
    const phoneMatches = await this.searchGuestProfiles({ 
      search: phone,
      limit: 10 
    });
    phoneMatches.forEach(guest => {
      if (guest.phone === phone && !foundIds.has(guest.id)) {
        duplicates.push(guest);
        foundIds.add(guest.id);
      }
    });
  }
  
  // Similar name match (using Levenshtein distance)
  const nameMatches = await this.searchGuestProfiles({ 
    search: name,
    limit: 20 
  });
  nameMatches.forEach(guest => {
    const similarity = this.calculateNameSimilarity(guest.name, name);
    if (similarity > 0.8 && !foundIds.has(guest.id)) {
      duplicates.push(guest);
      foundIds.add(guest.id);
    }
  });
  
  return duplicates;
}

/**
 * Calculate similarity between two names (0-1)
 */
private static calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().replace(/\s+/g, '');
  const s2 = name2.toLowerCase().replace(/\s+/g, '');
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Use Levenshtein distance for similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = this.levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
private static levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s2.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s1.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s1.length] = lastValue;
  }
  return costs[s1.length];
}

/**
 * Merge multiple guest profiles into one
 */
static async mergeGuestProfiles(
  primaryGuestId: string,
  guestIdsToMerge: string[]
): Promise<GuestProfile> {
  try {
    // Update all bookings to point to primary guest
    for (const guestId of guestIdsToMerge) {
      if (guestId !== primaryGuestId) {
        await supabase
          .from('bookings')
          .update({ guest_profile_id: primaryGuestId })
          .eq('guest_profile_id', guestId);
        
        // Delete the duplicate guest profile
        await supabase
          .from('guest_profiles')
          .delete()
          .eq('id', guestId);
      }
    }
    
    // Force stats recalculation
    await supabase
      .from('guest_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', primaryGuestId);
    
    // Return updated primary guest profile
    const updatedGuest = await this.getGuestProfile(primaryGuestId);
    if (!updatedGuest) throw new Error('Failed to fetch updated guest profile');
    
    return updatedGuest;
  } catch (error) {
    console.error('Error merging guest profiles:', error);
    throw error;
  }
}

/**
 * Check for system-wide duplicates
 */
static async findAllDuplicates(): Promise<Array<{
  name: string;
  duplicates: GuestProfile[];
}>> {
  try {
    // Get all unique email addresses with multiple profiles
    const { data: emailDupes } = await supabase
      .from('guest_profiles')
      .select('email')
      .not('email', 'is', null)
      .order('email');
    
    // Get all unique phone numbers with multiple profiles
    const { data: phoneDupes } = await supabase
      .from('guest_profiles')
      .select('phone')
      .not('phone', 'is', null)
      .order('phone');
    
    // Process and group duplicates
    const duplicateGroups = new Map<string, GuestProfile[]>();
    
    // Group by email
    for (const record of emailDupes || []) {
      const profiles = await this.searchGuestProfiles({ search: record.email });
      const exactMatches = profiles.filter(p => p.email === record.email);
      if (exactMatches.length > 1) {
        const key = `email:${record.email}`;
        duplicateGroups.set(key, exactMatches);
      }
    }
    
    // Group by phone
    for (const record of phoneDupes || []) {
      const profiles = await this.searchGuestProfiles({ search: record.phone });
      const exactMatches = profiles.filter(p => p.phone === record.phone);
      if (exactMatches.length > 1) {
        const key = `phone:${record.phone}`;
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, exactMatches);
        }
      }
    }
    
    return Array.from(duplicateGroups.entries()).map(([key, duplicates]) => ({
      name: key,
      duplicates
    }));
  } catch (error) {
    console.error('Error finding all duplicates:', error);
    return [];
  }
}
```

### Part 2: Create GuestDuplicateAlert Component

**Create New File**: `src/components/GuestDuplicateAlert.tsx`

```typescript
import React, { useState } from 'react';
import { AlertTriangle, Users, Merge, Check } from 'lucide-react';
import { GuestProfile } from '../types/guest';

interface GuestDuplicateAlertProps {
  potentialDuplicates: GuestProfile[];
  onMerge: (primaryId: string, mergeIds: string[]) => Promise<void>;
  onDismiss: () => void;
}

export const GuestDuplicateAlert: React.FC<GuestDuplicateAlertProps> = ({
  potentialDuplicates,
  onMerge,
  onDismiss
}) => {
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [selectedMerge, setSelectedMerge] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  if (potentialDuplicates.length === 0) return null;

  const handleMerge = async () => {
    if (!selectedPrimary || selectedMerge.size === 0) return;
    
    setMerging(true);
    try {
      await onMerge(
        selectedPrimary,
        Array.from(selectedMerge)
      );
      onDismiss();
    } catch (error) {
      console.error('Failed to merge profiles:', error);
    } finally {
      setMerging(false);
    }
  };

  const toggleMergeSelection = (guestId: string) => {
    if (guestId === selectedPrimary) return; // Can't merge primary with itself
    
    const newSelection = new Set(selectedMerge);
    if (newSelection.has(guestId)) {
      newSelection.delete(guestId);
    } else {
      newSelection.add(guestId);
    }
    setSelectedMerge(newSelection);
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Potential Duplicate Guests Detected
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            The following guests might be the same person based on matching contact information:
          </p>
          
          <div className="space-y-2 mb-4">
            {potentialDuplicates.map(guest => (
              <div 
                key={guest.id} 
                className={`flex items-center p-3 bg-white rounded border-2 transition-all ${
                  selectedPrimary === guest.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : selectedMerge.has(guest.id)
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center flex-1">
                  {/* Primary Selection Radio */}
                  <input
                    type="radio"
                    name="primary-guest"
                    value={guest.id}
                    checked={selectedPrimary === guest.id}
                    onChange={(e) => {
                      setSelectedPrimary(e.target.value);
                      // Remove from merge selection if selecting as primary
                      const newMerge = new Set(selectedMerge);
                      newMerge.delete(guest.id);
                      setSelectedMerge(newMerge);
                    }}
                    className="mr-3 h-4 w-4 text-blue-600"
                  />
                  
                  {/* Merge Checkbox */}
                  {selectedPrimary && selectedPrimary !== guest.id && (
                    <input
                      type="checkbox"
                      checked={selectedMerge.has(guest.id)}
                      onChange={() => toggleMergeSelection(guest.id)}
                      className="mr-3 h-4 w-4 text-yellow-600"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm">{guest.name}</div>
                    <div className="text-xs text-gray-600">
                      {guest.email && <span className="mr-2">{guest.email}</span>}
                      {guest.phone && <span className="mr-2">{guest.phone}</span>}
                      <span className="text-gray-500">
                        • {guest.total_stays || 0} stay(s) • ₹{guest.total_spent || 0}
                      </span>
                    </div>
                    {guest.last_stay_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        Last stay: {new Date(guest.last_stay_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Labels */}
                <div className="ml-4 flex gap-2">
                  {selectedPrimary === guest.id && (
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                      Keep as Primary
                    </span>
                  )}
                  {selectedMerge.has(guest.id) && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      Will Merge
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleMerge}
              disabled={!selectedPrimary || selectedMerge.size === 0 || merging}
              className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Merge className="w-4 h-4 mr-1" />
              {merging ? 'Merging...' : `Merge ${selectedMerge.size} into Primary`}
            </button>
            <button
              onClick={onDismiss}
              disabled={merging}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
            >
              Keep Separate
            </button>
          </div>
          
          {selectedPrimary && selectedMerge.size > 0 && (
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>This will:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Keep the primary profile and its information</li>
                  <li>Move all bookings from merged profiles to the primary</li>
                  <li>Delete the merged duplicate profiles</li>
                  <li>Update statistics for the primary profile</li>
                </ul>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## ✅ Testing Steps

### Test Case 1: Duplicate Detection
1. Create 3 guest profiles with same email
2. Run findPotentialDuplicates
3. Verify all 3 are detected

### Test Case 2: Name Similarity
1. Create profiles: "John Smith", "Jon Smith", "John Smyth"
2. Run detection for "John Smith"
3. Verify similar names are detected (> 80% similarity)

### Test Case 3: Merge Operation
1. Create 2 duplicate profiles with bookings
2. Select primary and merge
3. Verify:
   - Bookings transferred to primary
   - Duplicate deleted
   - Statistics updated

### Test Case 4: UI Integration
1. Open guest profiles page
2. Verify duplicate alert appears
3. Test merge workflow
4. Verify UI updates after merge

## 🚨 Risks & Considerations
- **Data Loss**: Merging is irreversible - need confirmation
- **Performance**: Similarity calculations can be slow for large datasets
- **False Positives**: May detect non-duplicates as duplicates
- **Concurrent Operations**: Need to handle if profiles are being edited during merge

## 📊 Success Metrics
- Reduction in duplicate profiles by 80%
- No data loss during merge operations
- Staff can process duplicates in < 30 seconds per group
- Accurate duplicate detection (< 5% false positives)

## ⏱️ Estimated Time
- Service Methods: 2 hours
- UI Component: 2 hours
- Integration: 1 hour
- Testing: 2 hours
- Total: 7 hours

## 🏷️ Priority
**MEDIUM** - Important for data quality but not blocking operations

## 🔗 Dependencies
- Stories 1-3 should be completed first
- Requires admin authentication to access

## 📝 Notes
- Consider adding a "review duplicates" scheduled task
- Could add ML-based duplicate detection in future
- Consider adding undo functionality for merges