import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Percent, DollarSign, Save, RotateCcw } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import { toast } from 'react-hot-toast';
import ExpenseService from '../../services/expenseService';
import { useProperty } from '../../contexts/PropertyContext';
import type { Expense } from '../../types/expenses';
import type { Property } from '../../types/property';
import type { ExpenseFormData } from './UnifiedExpenseModal';

interface ExpenseSharesTabProps {
  formData: ExpenseFormData;
  onFormDataChange: (updates: Partial<ExpenseFormData>) => void;
  mode: 'create' | 'edit' | 'view';
  loading: boolean;
  expense?: Expense | null;
  properties: Property[];
  hideActionButtons?: boolean; // New prop to hide save/reset buttons
  // Lifted state props
  shares?: Array<{
    propertyId: string;
    propertyName: string;
    sharePercent?: number;
    shareAmount?: number;
  }>;
  onSharesChange?: (shares: Array<{
    propertyId: string;
    propertyName: string;
    sharePercent?: number;
    shareAmount?: number;
  }>) => void;
  shareMode?: 'percentage' | 'amount';
  onShareModeChange?: (mode: 'percentage' | 'amount') => void;
}

interface PropertyShare {
  propertyId: string;
  propertyName: string;
  sharePercent?: number;
  shareAmount?: number;
}

interface ExpenseShare {
  id?: string;
  expenseId: string;
  propertyId: string;
  sharePercent?: number;
  shareAmount?: number;
}

const ExpenseSharesTab: React.FC<ExpenseSharesTabProps> = ({
  formData,
  onFormDataChange: _onFormDataChange,
  mode,
  loading: _loading,
  expense,
  properties,
  hideActionButtons = false,
  shares: liftedShares,
  onSharesChange,
  shareMode: liftedShareMode,
  onShareModeChange
}) => {
  const { currentProperty } = useProperty();
  const isReadOnly = mode === 'view';
  // Use lifted state if provided, otherwise fall back to local state
  const isLiftedState = liftedShares !== undefined && onSharesChange !== undefined;
  const [localShareMode, setLocalShareMode] = useState<'percentage' | 'amount'>('percentage');
  const [localShares, setLocalShares] = useState<PropertyShare[]>([]);
  const [originalShares, setOriginalShares] = useState<PropertyShare[]>([]);
  
  // Use lifted or local state
  const shareMode = isLiftedState ? (liftedShareMode || 'percentage') : localShareMode;
  const shares = isLiftedState ? (liftedShares || []) : localShares;
  const [loadingShares, setLoadingShares] = useState(false);
  const [savingShares, setSavingShares] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing shares when expense is available (only if not using lifted state)
  useEffect(() => {
    if (isLiftedState) {
      // Skip loading when using lifted state - parent handles this
      return;
    }
    
    if (expense && mode !== 'create') {
      loadExistingShares();
    } else {
      initializeDefaultShares();
    }
  }, [expense, mode, properties, formData.amount, isLiftedState]);

  const loadExistingShares = async () => {
    if (!expense) return;
    
    setLoadingShares(true);
    try {
      const existingShares = await ExpenseService.getExpenseShares(expense.id);
      console.log('[ExpenseSharesTab] Loaded existing shares:', existingShares);
      
      if (existingShares.length > 0) {
        // Convert to PropertyShare format
        const propertyShares = properties.map(property => {
          const existingShare = existingShares.find(s => s.propertyId === property.id);
          return {
            propertyId: property.id,
            propertyName: property.name,
            sharePercent: existingShare?.sharePercent ?? undefined,
            shareAmount: existingShare?.shareAmount ?? undefined
          };
        });
        
        // Determine share mode based on existing data
        const hasPercentages = existingShares.some(s => s.sharePercent != null);
        const hasAmounts = existingShares.some(s => s.shareAmount != null);
        
        if (hasPercentages) {
          if (isLiftedState && onShareModeChange) {
            onShareModeChange('percentage');
          } else {
            setLocalShareMode('percentage');
          }
        } else if (hasAmounts) {
          if (isLiftedState && onShareModeChange) {
            onShareModeChange('amount');
          } else {
            setLocalShareMode('amount');
          }
        }
        
        if (isLiftedState && onSharesChange) {
          onSharesChange(propertyShares);
        } else {
          setLocalShares(propertyShares);
        }
        setOriginalShares(propertyShares);
      } else {
        initializeDefaultShares();
      }
    } catch (error) {
      console.error('[ExpenseSharesTab] Failed to load shares:', error);
      initializeDefaultShares();
    } finally {
      setLoadingShares(false);
    }
  };

  const initializeDefaultShares = () => {
    // Only initialize if more than one property
    if (properties.length > 1) {
      const defaultShares = properties.map(property => ({
        propertyId: property.id,
        propertyName: property.name,
        sharePercent: shareMode === 'percentage' ? (100 / properties.length) : undefined,
        shareAmount: shareMode === 'amount' ? (formData.amount / properties.length) : undefined
      }));
      if (isLiftedState && onSharesChange) {
        onSharesChange(defaultShares);
      } else {
        setLocalShares(defaultShares);
      }
      setOriginalShares(defaultShares);
    } else {
      // Single property - 100% allocation
      const singleShare = properties.map(property => ({
        propertyId: property.id,
        propertyName: property.name,
        sharePercent: 100,
        shareAmount: formData.amount
      }));
      if (isLiftedState && onSharesChange) {
        onSharesChange(singleShare);
      } else {
        setLocalShares(singleShare);
      }
      setOriginalShares(singleShare);
    }
  };

  // Check for changes when shares update
  useEffect(() => {
    const sharesChanged = JSON.stringify(shares) !== JSON.stringify(originalShares);
    setHasChanges(sharesChanged);
  }, [shares, originalShares]);

  const handleShareChange = (propertyId: string, value: number, propertyIndex?: number) => {
    console.log('[ExpenseSharesTab] handleShareChange called:', { propertyId, value, propertyIndex, isLiftedState });
    
    const updateShares = (updater: (prev: PropertyShare[]) => PropertyShare[]) => {
      if (isLiftedState && onSharesChange) {
        console.log('[ExpenseSharesTab] Updating lifted state shares');
        const updated = updater(shares as PropertyShare[]);
        console.log('[ExpenseSharesTab] Updated shares:', updated);
        onSharesChange(updated);
      } else {
        console.log('[ExpenseSharesTab] Updating local shares');
        setLocalShares(updater);
      }
    };
    
    updateShares(prev => {
      const updated = prev.map(share => 
        share.propertyId === propertyId 
          ? { 
              ...share, 
              [shareMode === 'percentage' ? 'sharePercent' : 'shareAmount']: value 
            }
          : share
      );

      // Auto-calculate last property only when:
      // 1. We have 2+ properties
      // 2. We're editing any property except the last one
      // 3. PropertyIndex is provided and is not the last property
      const shouldAutoCalculate = updated.length >= 2 && 
                                  propertyIndex !== undefined && 
                                  propertyIndex < updated.length - 1;

      if (shouldAutoCalculate) {
        const lastIndex = updated.length - 1;
        const otherTotal = updated.slice(0, lastIndex).reduce((sum, share) => {
          return sum + (shareMode === 'percentage' ? (share.sharePercent || 0) : (share.shareAmount || 0));
        }, 0);

        const target = shareMode === 'percentage' ? 100 : formData.amount;
        const remaining = Math.max(0, target - otherTotal);

        updated[lastIndex] = {
          ...updated[lastIndex],
          [shareMode === 'percentage' ? 'sharePercent' : 'shareAmount']: remaining
        };
      }

      return updated;
    });
  };

  const handleShareModeChange = (newMode: 'percentage' | 'amount') => {
    if (isLiftedState && onShareModeChange) {
      onShareModeChange(newMode);
    } else {
      setLocalShareMode(newMode);
    }
    
    // Convert existing shares to new mode
    const updateShares = (updater: (prev: PropertyShare[]) => PropertyShare[]) => {
      if (isLiftedState && onSharesChange) {
        const updated = updater(shares as PropertyShare[]);
        onSharesChange(updated);
      } else {
        setLocalShares(updater);
      }
    };
    
    updateShares(prev => prev.map(share => {
      if (newMode === 'percentage') {
        // Convert from amount to percentage
        const percent = formData.amount > 0 ? ((share.shareAmount || 0) / formData.amount * 100) : (100 / prev.length);
        return {
          ...share,
          sharePercent: Math.round(percent * 10) / 10, // Round to 1 decimal
          shareAmount: undefined
        };
      } else {
        // Convert from percentage to amount
        const amount = formData.amount * ((share.sharePercent || 0) / 100);
        return {
          ...share,
          sharePercent: undefined,
          shareAmount: Math.round(amount * 100) / 100 // Round to 2 decimals
        };
      }
    }));
  };

  const saveShares = async () => {
    if (!expense) {
      toast.error('Cannot save shares: No expense found');
      return;
    }

    setSavingShares(true);
    try {
      // Convert to ExpenseShare format (use undefined for omitted fields)
      const expenseShares: Omit<ExpenseShare, 'id'>[] = shares.map(share => ({
        expenseId: expense.id,
        propertyId: share.propertyId,
        sharePercent: shareMode === 'percentage' ? share.sharePercent : undefined,
        shareAmount: shareMode === 'amount' ? share.shareAmount : undefined
      }));

      await ExpenseService.saveExpenseShares(expense.id, expenseShares);
      setOriginalShares([...shares]); // Update original to current
      toast.success('Expense shares saved successfully');
    } catch (error) {
      console.error('[ExpenseSharesTab] Failed to save shares:', error);
      toast.error('Failed to save expense shares');
    } finally {
      setSavingShares(false);
    }
  };

  const resetShares = () => {
    if (isLiftedState && onSharesChange) {
      onSharesChange([...originalShares]);
    } else {
      setLocalShares([...originalShares]);
    }
  };

  const distributeEqually = () => {
    const equalValue = shareMode === 'percentage' 
      ? 100 / properties.length 
      : formData.amount / properties.length;
    
    const updateShares = (updater: (prev: PropertyShare[]) => PropertyShare[]) => {
      if (isLiftedState && onSharesChange) {
        const updated = updater(shares as PropertyShare[]);
        onSharesChange(updated);
      } else {
        setLocalShares(updater);
      }
    };
    
    updateShares(prev => prev.map(share => ({
      ...share,
      [shareMode === 'percentage' ? 'sharePercent' : 'shareAmount']: equalValue
    })));
  };

  const getTotalPercent = () => {
    return shares.reduce((sum, share) => sum + (share.sharePercent || 0), 0);
  };

  const getTotalAmount = () => {
    return shares.reduce((sum, share) => sum + (share.shareAmount || 0), 0);
  };

  const isValidTotal = () => {
    if (shareMode === 'percentage') {
      return Math.abs(getTotalPercent() - 100) < 0.01;
    } else {
      return Math.abs(getTotalAmount() - formData.amount) < 0.01;
    }
  };

  // Show loading state
  if (loadingShares) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size={24} className="mr-3" />
              <span className="text-gray-600">Loading expense shares...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if only one property
  if (properties.length <= 1) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Expense Allocation</h3>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">Single Property Expense</p>
              <p className="text-sm mt-2">
                This expense is allocated to: <span className="font-medium text-gray-900">{currentProperty?.name}</span>
              </p>
              <p className="text-sm mt-1">
                Amount: <span className="font-medium text-gray-900">₹{formData.amount.toFixed(2)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Expense Allocation</h3>
            {hasChanges && (
              <Badge variant="secondary">Unsaved Changes</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Share Mode Toggle */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h4 className="font-medium text-gray-900">Allocation Method</h4>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant={shareMode === 'percentage' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleShareModeChange('percentage')}
                    disabled={isReadOnly || savingShares}
                    className="w-full sm:w-auto"
                  >
                    <Percent className="h-4 w-4 mr-1" />
                    Percentage
                  </Button>
                  <Button
                    variant={shareMode === 'amount' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleShareModeChange('amount')}
                    disabled={isReadOnly || savingShares}
                    className="w-full sm:w-auto"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Fixed Amount
                  </Button>
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">Total Allocation</h4>
                <Badge variant={isValidTotal() ? 'default' : 'destructive'}>
                  {shareMode === 'percentage' 
                    ? `${getTotalPercent().toFixed(1)}% of 100%`
                    : `₹${getTotalAmount().toFixed(2)} of ₹${formData.amount.toFixed(2)}`
                  }
                </Badge>
              </div>
              {!isValidTotal() && (
                <p className="text-sm text-red-600 mt-2">
                  {shareMode === 'percentage' 
                    ? 'Total percentage must equal 100%'
                    : 'Total amount must equal expense amount'
                  }
                </p>
              )}
            </div>

            {/* Share Distribution */}
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h4 className="font-medium text-gray-900">Property Distribution</h4>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={distributeEqually}
                    disabled={isReadOnly || savingShares}
                    className="w-full sm:w-auto"
                  >
                    Distribute Equally
                  </Button>
                </div>
              </div>

              {shares.map((share, index) => {
                const isLastProperty = index === shares.length - 1;
                const shareValue = shareMode === 'percentage' ? share.sharePercent || 0 : share.shareAmount || 0;
                const progressPercent = shareMode === 'percentage' 
                  ? Math.min(shareValue, 100)
                  : Math.min(shareValue / formData.amount * 100, 100);

                return (
                  <div key={share.propertyId} className="border rounded-lg p-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{share.propertyName}</p>
                          <p className="text-sm text-gray-500">
                            {isLastProperty && shares.length >= 2 ? 'Auto-calculated' : `Property ${index + 1}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="number"
                            step={shareMode === 'percentage' ? '0.1' : '0.01'}
                            min="0"
                            max={shareMode === 'percentage' ? '100' : formData.amount}
                            value={shareValue}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              handleShareChange(share.propertyId, newValue, index);
                            }}
                            disabled={isReadOnly || savingShares || (isLastProperty && shares.length >= 2)}
                            className="w-full sm:w-28 text-right"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 w-8">
                            {shareMode === 'percentage' ? '%' : '₹'}
                          </span>
                        </div>
                      </div>

                      {/* Slider for interactive adjustment */}
                      {!isReadOnly && !(isLastProperty && shares.length >= 2) && (
                        <div className="px-1">
                          <input
                            type="range"
                            min="0"
                            max={shareMode === 'percentage' ? '100' : formData.amount}
                            step={shareMode === 'percentage' ? '0.1' : '0.01'}
                            value={shareValue}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              handleShareChange(share.propertyId, newValue, index);
                            }}
                            disabled={savingShares}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progressPercent}%, #e5e7eb ${progressPercent}%, #e5e7eb 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0</span>
                            <span>{shareMode === 'percentage' ? '100%' : `₹${formData.amount}`}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Visual progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          progressPercent > 100 ? 'bg-red-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>

                    {/* Share amount in other unit */}
                    {shareValue > 0 && (
                      <div className="text-xs text-gray-500">
                        {shareMode === 'percentage' 
                          ? `≈ ₹${(formData.amount * shareValue / 100).toFixed(2)}`
                          : `≈ ${(shareValue / formData.amount * 100).toFixed(1)}%`
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            {!isReadOnly && expense && !hideActionButtons && (
              <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 pt-4 border-t">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={resetShares}
                    disabled={!hasChanges || savingShares}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>

                <Button
                  className="w-full sm:w-auto"
                  onClick={saveShares}
                  disabled={!hasChanges || !isValidTotal() || savingShares}
                >
                  {savingShares && <LoadingSpinner size={16} className="mr-2" />}
                  <Save className="h-4 w-4 mr-1" />
                  Save Shares
                </Button>
              </div>
            )}

            {/* Info for new expenses */}
            {mode === 'create' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Expense shares can be configured after the expense is created. 
                  Save the expense first, then return to this tab to set up property allocation.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSharesTab;
