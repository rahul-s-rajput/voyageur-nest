import React, { useState, useEffect } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import { CrossPropertyGuest, Property } from '../../types/property';
import { propertyService } from '../../services/propertyService';
import { 
  UserGroupIcon, 
  StarIcon, 
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  HeartIcon,
  TrophyIcon,
  GiftIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface GuestRecognitionProps {
  className?: string;
}

const GuestRecognition: React.FC<GuestRecognitionProps> = ({ className = '' }) => {
  const { currentProperty, properties } = useProperty();
  const [guests, setGuests] = useState<CrossPropertyGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [guestTier, setGuestTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'lastVisit' | 'totalSpent' | 'visitCount' | 'rating'>('lastVisit');
  const [viewMode, setViewMode] = useState<'list' | 'analytics' | 'loyalty'>('list');
  const [selectedGuest, setSelectedGuest] = useState<CrossPropertyGuest | null>(null);

  useEffect(() => {
    loadCrossPropertyGuests();
  }, [currentProperty]);

  const loadCrossPropertyGuests = async () => {
    try {
      setLoading(true);
      // This would be implemented in propertyService
      const crossPropertyGuests = await fetchCrossPropertyGuests();
      setGuests(crossPropertyGuests);
    } catch (error) {
      console.error('Failed to load cross-property guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrossPropertyGuests = async (): Promise<CrossPropertyGuest[]> => {
    try {
      return await propertyService.getCrossPropertyGuests();
    } catch (error) {
      console.error('Failed to fetch cross-property guests:', error);
      return [];
    }
  };

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.phone?.includes(searchTerm);
    
    const matchesProperty = selectedProperty === 'all' || 
                           guest.preferredProperties.includes(selectedProperty);
    
    const matchesTier = guestTier === 'all' || guest.loyaltyTier === guestTier;
    
    return matchesSearch && matchesProperty && matchesTier;
  });

  const sortedGuests = [...filteredGuests].sort((a, b) => {
    switch (sortBy) {
      case 'lastVisit':
        return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime();
      case 'totalSpent':
        return b.totalSpent - a.totalSpent;
      case 'visitCount':
        return b.totalBookings - a.totalBookings;
      case 'rating':
        return b.averageRating - a.averageRating;
      default:
        return 0;
    }
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600 bg-purple-100';
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'bronze': return 'text-orange-600 bg-orange-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return TrophyIcon;
      case 'gold': return StarIconSolid;
      case 'silver': return StarIcon;
      default: return HeartIcon;
    }
  };

  const calculateGuestAnalytics = () => {
    const totalGuests = guests.length;
    const vipGuests = guests.filter(g => g.isVIP).length;
    const avgSpending = guests.reduce((sum, g) => sum + g.totalSpent, 0) / totalGuests;
    const avgRating = guests.reduce((sum, g) => sum + g.averageRating, 0) / totalGuests;
    
    const tierDistribution = guests.reduce((acc, guest) => {
      acc[guest.loyaltyTier] = (acc[guest.loyaltyTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalGuests,
      vipGuests,
      avgSpending: Math.round(avgSpending),
      avgRating: Math.round(avgRating * 10) / 10,
      tierDistribution
    };
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const analytics = calculateGuestAnalytics();

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <UserGroupIcon className="h-6 w-6 mr-2 text-blue-600" />
              Cross-Property Guest Recognition
            </h2>
            <p className="text-gray-600 mt-1">
              Track and recognize guests across all properties
            </p>
          </div>
          
          <button
            onClick={loadCrossPropertyGuests}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-1 mt-4 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'list', label: 'Guest List', icon: UserGroupIcon },
            { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
            { key: 'loyalty', label: 'Loyalty Program', icon: GiftIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'list' && (
          <GuestListView
            guests={sortedGuests}
            properties={properties}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
            guestTier={guestTier}
            setGuestTier={setGuestTier}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onSelectGuest={setSelectedGuest}
            getTierColor={getTierColor}
            getTierIcon={getTierIcon}
          />
        )}

        {viewMode === 'analytics' && (
          <GuestAnalyticsView
            analytics={analytics}
            guests={guests}
            properties={properties}
          />
        )}

        {viewMode === 'loyalty' && (
          <LoyaltyProgramView
            guests={guests}
            analytics={analytics}
            getTierColor={getTierColor}
            getTierIcon={getTierIcon}
          />
        )}
      </div>

      {/* Guest Detail Modal */}
      {selectedGuest && (
        <GuestDetailModal
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          getTierColor={getTierColor}
          getTierIcon={getTierIcon}
        />
      )}
    </div>
  );
};

// Guest List View Component
interface GuestListViewProps {
  guests: CrossPropertyGuest[];
  properties: Property[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedProperty: string;
  setSelectedProperty: (propertyId: string) => void;
  guestTier: string;
  setGuestTier: (tier: string) => void;
  sortBy: string;
  setSortBy: (sort: any) => void;
  onSelectGuest: (guest: CrossPropertyGuest) => void;
  getTierColor: (tier: string) => string;
  getTierIcon: (tier: string) => any;
}

const GuestListView: React.FC<GuestListViewProps> = ({
  guests,
  properties,
  searchTerm,
  setSearchTerm,
  selectedProperty,
  setSelectedProperty,
  guestTier,
  setGuestTier,
  sortBy,
  setSortBy,
  onSelectGuest,
  getTierColor,
  getTierIcon
}) => {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guests by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Properties</option>
          {properties.map(property => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        
        <select
          value={guestTier}
          onChange={(e) => setGuestTier(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Tiers</option>
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="lastVisit">Last Visit</option>
          <option value="totalSpent">Total Spent</option>
          <option value="visitCount">Visit Count</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {/* Guest Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {guests.map(guest => {
          const TierIcon = getTierIcon(guest.loyaltyTier);
          
          return (
            <div
              key={guest.id}
              onClick={() => onSelectGuest(guest)}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {guest.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center">
                        {guest.name}
                        {guest.isVIP && (
                          <HeartIconSolid className="h-4 w-4 text-red-500 ml-2" />
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span>{guest.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4" />
                        <span>{guest.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span>{guest.totalBookings} visits</span>
                    </div>
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span>₹{guest.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{guest.averageRating}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Last visit: {new Date(guest.lastVisitDate).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getTierColor(guest.loyaltyTier)}`}>
                    <TierIcon className="h-3 w-3 mr-1" />
                    {guest.loyaltyTier}
                  </div>
                  
                  {guest.tags && guest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {guest.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {guests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No guests found matching your criteria.
        </div>
      )}
    </div>
  );
};

// Guest Analytics View Component
interface GuestAnalyticsViewProps {
  analytics: {
    totalGuests: number;
    vipGuests: number;
    avgSpending: number;
    avgRating: number;
    tierDistribution: Record<string, number>;
  };
  guests: CrossPropertyGuest[];
  properties: Property[];
}

const GuestAnalyticsView: React.FC<GuestAnalyticsViewProps> = ({ analytics, guests, properties }) => {
  const propertyGuestCounts = properties.map(property => ({
    property,
    guestCount: guests.filter(guest => guest.preferredProperties.includes(property.id)).length,
    totalSpent: guests
      .filter(guest => guest.preferredProperties.includes(property.id))
      .reduce((sum, guest) => sum + guest.totalSpent, 0)
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{analytics.totalGuests}</div>
          <div className="text-sm text-blue-800">Total Guests</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{analytics.vipGuests}</div>
          <div className="text-sm text-red-800">VIP Guests</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">₹{analytics.avgSpending.toLocaleString()}</div>
          <div className="text-sm text-green-800">Avg. Spending</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{analytics.avgRating}</div>
          <div className="text-sm text-yellow-800">Avg. Rating</div>
        </div>
      </div>

      {/* Loyalty Tier Distribution */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Tier Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analytics.tierDistribution).map(([tier, count]) => (
            <div key={tier} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{tier} Tier</div>
              <div className="text-xs text-gray-500">
                {Math.round((count / analytics.totalGuests) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Property-wise Guest Distribution */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property-wise Guest Distribution</h3>
        <div className="space-y-4">
          {propertyGuestCounts.map(({ property, guestCount, totalSpent }) => (
            <div key={property.id} className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <div className="font-medium text-gray-900">{property.name}</div>
                <div className="text-sm text-gray-600">{property.location}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{guestCount} guests</div>
                <div className="text-sm text-gray-600">₹{totalSpent.toLocaleString()} total</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Guests */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Guests by Spending</h3>
        <div className="space-y-3">
          {guests
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5)
            .map((guest, index) => (
              <div key={guest.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{guest.name}</div>
                    <div className="text-sm text-gray-600">{guest.totalBookings} visits</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">₹{guest.totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">★ {guest.averageRating}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Loyalty Program View Component
interface LoyaltyProgramViewProps {
  guests: CrossPropertyGuest[];
  analytics: {
    totalGuests: number;
    vipGuests: number;
    avgSpending: number;
    avgRating: number;
    tierDistribution: Record<string, number>;
  };
  getTierColor: (tier: string) => string;
  getTierIcon: (tier: string) => any;
}

const LoyaltyProgramView: React.FC<LoyaltyProgramViewProps> = ({ 
  guests, 
  analytics, 
  getTierColor, 
  getTierIcon 
}) => {
  const tierBenefits = {
    bronze: ['5% discount on bookings', 'Priority customer support'],
    silver: ['10% discount on bookings', 'Free WiFi', 'Late checkout (2 PM)'],
    gold: ['15% discount on bookings', 'Free breakfast', 'Room upgrade (subject to availability)', 'Early check-in'],
    platinum: ['20% discount on bookings', 'Free breakfast & dinner', 'Guaranteed room upgrade', 'Personal concierge service']
  };

  const tierRequirements: Record<'bronze' | 'silver' | 'gold' | 'platinum', { visits: number; spending: number }> = {
    bronze: { visits: 1, spending: 5000 },
    silver: { visits: 3, spending: 15000 },
    gold: { visits: 6, spending: 35000 },
    platinum: { visits: 12, spending: 75000 }
  };

  return (
    <div className="space-y-6">
      {/* Loyalty Program Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Program Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(analytics.tierDistribution).map(([tier, count]) => {
            const TierIcon = getTierIcon(tier);
            return (
              <div key={tier} className="bg-white p-4 rounded-lg text-center">
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${getTierColor(tier)}`}>
                  <TierIcon className="h-6 w-6" />
                </div>
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{tier} Members</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(tierBenefits).map(([tier, benefits]) => {
          const TierIcon = getTierIcon(tier);
          const requirements = tierRequirements[tier as keyof typeof tierRequirements];
          
          return (
            <div key={tier} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getTierColor(tier)}`}>
                  <TierIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 capitalize">{tier} Tier</h4>
                  <p className="text-sm text-gray-600">
                    {requirements.visits}+ visits • ₹{requirements.spending.toLocaleString()}+ spent
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Benefits:</h5>
                <ul className="space-y-1">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade Candidates */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Upgrade Candidates</h3>
        <div className="space-y-3">
          {guests
            .filter(guest => {
              const currentTier = guest.loyaltyTier;
              const nextTierMap: Record<'bronze' | 'silver' | 'gold', 'silver' | 'gold' | 'platinum'> = {
                bronze: 'silver',
                silver: 'gold',
                gold: 'platinum'
              };
              const nextTier = nextTierMap[currentTier as keyof typeof nextTierMap];
              const nextTierRequirements = nextTier ? tierRequirements[nextTier] : null;
              
              return nextTierRequirements && 
                     (guest.totalBookings >= nextTierRequirements.visits * 0.8 || 
                      guest.totalSpent >= nextTierRequirements.spending * 0.8);
            })
            .slice(0, 5)
            .map(guest => {
              const currentTier = guest.loyaltyTier;
              const nextTierMap: Record<'bronze' | 'silver' | 'gold', 'silver' | 'gold' | 'platinum'> = {
                bronze: 'silver',
                silver: 'gold',
                gold: 'platinum'
              };
              const nextTier = nextTierMap[currentTier as keyof typeof nextTierMap] || 'platinum';
              
              const nextTierRequirements = tierRequirements[nextTier];
              const visitProgress = (guest.totalBookings / nextTierRequirements.visits) * 100;
              const spendingProgress = (guest.totalSpent / nextTierRequirements.spending) * 100;
              
              return (
                <div key={guest.id} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{guest.name}</div>
                      <div className="text-sm text-gray-600">
                        Current: {currentTier} → Next: {nextTier}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Visits: {guest.totalBookings}/{nextTierRequirements.visits} ({Math.round(visitProgress)}%)
                      </div>
                      <div className="text-sm text-gray-600">
                        Spending: ₹{guest.totalSpent.toLocaleString()}/₹{nextTierRequirements.spending.toLocaleString()} ({Math.round(spendingProgress)}%)
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Visit Progress</span>
                        <span>{Math.round(visitProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(visitProgress, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Spending Progress</span>
                        <span>{Math.round(spendingProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(spendingProgress, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// Guest Detail Modal Component
interface GuestDetailModalProps {
  guest: CrossPropertyGuest;
  onClose: () => void;
  getTierColor: (tier: string) => string;
  getTierIcon: (tier: string) => any;
}

const GuestDetailModal: React.FC<GuestDetailModalProps> = ({ 
  guest, 
  onClose, 
  getTierColor, 
  getTierIcon 
}) => {
  const TierIcon = getTierIcon(guest.loyaltyTier);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-2xl">
                  {guest.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  {guest.name}
                  {guest.isVIP && (
                    <HeartIconSolid className="h-5 w-5 text-red-500 ml-2" />
                  )}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    {guest.email}
                  </span>
                  <span className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {guest.phone}
                  </span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getTierColor(guest.loyaltyTier)}`}>
                  <TierIcon className="h-4 w-4 mr-1" />
                  {guest.loyaltyTier} Member
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Guest Stats */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Guest Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{guest.totalBookings}</div>
                    <div className="text-sm text-gray-600">Total Visits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">₹{guest.totalSpent.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Spent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{guest.averageRating}</div>
                    <div className="text-sm text-gray-600">Avg Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Date(guest.lastVisitDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">Last Visit</div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Preferences</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Room Type:</strong> {guest.preferences.roomType}</div>
                  <div><strong>Bed Type:</strong> {guest.preferences.bedType}</div>
                  <div><strong>Floor:</strong> {guest.preferences.floor}</div>
                  <div><strong>Amenities:</strong> {guest.preferences.amenities?.join(', ') || 'None specified'}</div>
                </div>
              </div>

              {/* Special Requests */}
              {guest.specialRequests && guest.specialRequests.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Special Requests</h4>
                  <ul className="space-y-1">
                    {guest.specialRequests.map((request, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                        {request}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {guest.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-700">{guest.notes}</p>
                </div>
              )}
            </div>

            {/* Visit History */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Visit History</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {guest.visitHistory.map((visit, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{visit.propertyName}</div>
                        <div className="text-sm text-gray-600">{visit.roomType} room</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">₹{visit.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{new Date(visit.visitDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIconSolid
                            key={i}
                            className={`h-4 w-4 ${
                              i < (visit.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({visit.rating || 'N/A'}/5)</span>
                    </div>
                    
                    {visit.review && (
                      <p className="text-sm text-gray-700 italic">"{visit.review}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          {guest.tags && guest.tags.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {guest.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestRecognition;