import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle, XCircle, Clock, User, Calendar, MessageSquare, AlertCircle, FileText, Eye, History, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import ExpenseService from '../../services/expenseService';
import type { Expense } from '../../types/expenses';

interface ExpenseApprovalTabProps {
  expense?: Expense | null;
  mode: 'create' | 'edit' | 'view';
  loading: boolean;
  onExpenseChange?: () => void;
}

interface ApprovalHistoryEntry {
  id: string;
  action: 'created' | 'approved' | 'rejected' | 'modified' | 'submitted';
  timestamp: string;
  performer?: string;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
}

const ExpenseApprovalTab: React.FC<ExpenseApprovalTabProps> = ({
  expense,
  mode,
  loading,
  onExpenseChange
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // In real app, this would come from auth context

  // Load approval history when expense is available
  useEffect(() => {
    if (expense && mode !== 'create') {
      loadApprovalHistory();
    }
  }, [expense, mode]);

  const loadApprovalHistory = async () => {
    if (!expense) return;
    
    setLoadingHistory(true);
    try {
      // Generate history based on expense data
      const history: ApprovalHistoryEntry[] = [];
      
      // Always include creation entry
      if (expense.createdAt) {
        history.push({
          id: 'created',
          action: 'created',
          timestamp: expense.createdAt,
          performer: 'User', // In real app, this would be the actual user
          notes: 'Expense submitted for approval'
        });
      }

      // Add approval/rejection entry if exists
      if (expense.approvedAt) {
        history.push({
          id: 'approval',
          action: expense.approvalStatus === 'approved' ? 'approved' : 'rejected',
          timestamp: expense.approvedAt,
          performer: expense.approvedBy || 'System',
          notes: expense.approvalNotes || undefined,
          previousStatus: 'pending',
          newStatus: expense.approvalStatus
        });
      }

      // Sort by timestamp (newest first for display)
      history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setApprovalHistory(history);
    } catch (error) {
      console.error('[ExpenseApprovalTab] Failed to load approval history:', error);
      setApprovalHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!expense) {
      toast.error('No expense to approve');
      return;
    }

    if (!isAdmin) {
      toast.error('Admin privileges required for approvals');
      return;
    }

    setProcessing(true);
    try {
      console.log(`[ExpenseApprovalTab] Handling ${status} for expense:`, expense.id);
      
      const token = (localStorage.getItem('admin_device_token') || localStorage.getItem('auth_token') || '') as string;
      
      // Use existing ExpenseService approval method
      const updated = await ExpenseService.setApproval(expense.id, status, token, approvalNotes);
      
      console.log(`[ExpenseApprovalTab] Approval ${status} successful:`, updated);
      
      // Clear notes after successful approval
      setApprovalNotes('');
      
      // Reload approval history to show new entry
      await loadApprovalHistory();
      
      // Notify parent of changes
      onExpenseChange?.();
      
      toast.success(`Expense ${status} successfully`);
    } catch (error) {
      console.error(`[ExpenseApprovalTab] Failed to ${status} expense:`, error);
      toast.error(`Failed to ${status} expense`);
    } finally {
      setProcessing(false);
    }
  };

  const getActionIcon = (action: ApprovalHistoryEntry['action']) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Eye className="h-4 w-4 text-orange-600" />;
      case 'submitted':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: ApprovalHistoryEntry['action']) => {
    switch (action) {
      case 'created':
      case 'submitted':
        return 'bg-blue-50 border-blue-200';
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'modified':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Show loading state
  if (loading || loadingHistory) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size={24} className="mr-3" />
              <span className="text-gray-600">Loading approval details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message for create mode
  if (mode === 'create') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Expense Approval</h3>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Approval Available After Creation</p>
              <p className="text-sm mt-2">
                Once the expense is saved, it will be available for approval workflow.
              </p>
              <p className="text-sm mt-1">
                Expenses are automatically set to "pending" status upon creation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No Expense Found</p>
              <p className="text-sm mt-2">Unable to load expense approval details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Approval Status</h3>
            <Badge variant={getStatusColor(expense.approvalStatus)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(expense.approvalStatus)}
                {expense.approvalStatus?.charAt(0).toUpperCase() + expense.approvalStatus?.slice(1) || 'Pending'}
              </div>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submission Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Submission Details
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Submitted by: User</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>Amount: ₹{expense.amount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Approval Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                {expense.approvalStatus === 'approved' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : expense.approvalStatus === 'rejected' ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
                {expense.approvalStatus === 'approved' ? 'Approved' : 
                 expense.approvalStatus === 'rejected' ? 'Rejected' : 'Awaiting Review'}
              </h4>
              
              {expense.approvedAt ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Reviewed by: {expense.approvedBy || 'System'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Reviewed: {formatTimestamp(expense.approvedAt)}</span>
                  </div>
                  {expense.approvalNotes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 mt-0.5" />
                      <span>Notes available</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <p>Pending administrative review</p>
                  <p className="text-xs mt-1">Submitted {expense.createdAt ? formatTimestamp(expense.createdAt) : 'recently'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Approval Notes Display */}
          {expense.approvalNotes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-gray-600" />
                <p className="text-sm font-medium text-gray-700">
                  {expense.approvalStatus === 'approved' ? 'Approval Notes' : 'Rejection Notes'}
                </p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{expense.approvalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Actions */}
      {mode === 'edit' && expense.approvalStatus === 'pending' && isAdmin && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Administrative Action Required
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Expense Summary for Quick Review */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Quick Review</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Amount:</span>
                    <p className="font-medium text-blue-900">₹{expense.amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Date:</span>
                    <p className="font-medium text-blue-900">
                      {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Vendor:</span>
                    <p className="font-medium text-blue-900">{expense.vendor || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Category:</span>
                    <p className="font-medium text-blue-900">{expense.categoryName || 'Uncategorized'}</p>
                  </div>
                </div>
              </div>

              {/* Approval Notes Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes
                  <span className="text-gray-500 font-normal ml-1">(Optional)</span>
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes about this approval decision, reasons for approval/rejection, or additional comments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  These notes will be visible to the expense submitter and included in the approval history.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleApproval('approved')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  {processing ? (
                    <LoadingSpinner size={16} className="mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve Expense
                </Button>
                <Button
                  onClick={() => handleApproval('rejected')}
                  disabled={processing}
                  variant="destructive"
                  className="flex-1"
                >
                  {processing ? (
                    <LoadingSpinner size={16} className="mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject Expense
                </Button>
              </div>

              {/* Admin Notice */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                <strong>Admin Notice:</strong> This action will immediately update the expense status and notify relevant parties. 
                Approved expenses will be included in financial reporting. Rejected expenses can be resubmitted after modification.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Action Available Notice */}
      {mode === 'edit' && expense.approvalStatus === 'pending' && !isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-6 text-gray-500">
              <Shield className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">Administrative Privileges Required</p>
              <p className="text-sm mt-1">Only administrators can approve or reject expense submissions.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-600" />
              Approval History
            </h3>
            {approvalHistory.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullHistory(!showFullHistory)}
              >
                {showFullHistory ? 'Show Less' : 'Show All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size={20} className="mr-2" />
              <span className="text-gray-500 text-sm">Loading history...</span>
            </div>
          ) : approvalHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <History className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No History Available</p>
              <p className="text-sm mt-1">Approval history will appear here as actions are taken.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
                
                {(showFullHistory ? approvalHistory : approvalHistory.slice(0, 3)).map((entry, index) => (
                  <div key={entry.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${getActionColor(entry.action)}`}>
                      {getActionIcon(entry.action)}
                    </div>
                    
                    {/* Timeline content */}
                    <div className="flex-1 min-w-0">
                      <div className={`p-4 rounded-lg border ${getActionColor(entry.action)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {entry.action === 'created' ? 'Expense Created' :
                             entry.action === 'approved' ? 'Expense Approved' :
                             entry.action === 'rejected' ? 'Expense Rejected' :
                             entry.action === 'modified' ? 'Expense Modified' :
                             entry.action === 'submitted' ? 'Expense Submitted' :
                             entry.action}
                          </h4>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {formatTimestamp(entry.timestamp)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        {entry.performer && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <User className="h-3 w-3" />
                            <span>By: {entry.performer}</span>
                          </div>
                        )}
                        
                        {entry.previousStatus && entry.newStatus && (
                          <div className="text-sm text-gray-600 mb-2">
                            Status changed from <span className="font-medium capitalize">{entry.previousStatus}</span> to{' '}
                            <span className="font-medium capitalize">{entry.newStatus}</span>
                          </div>
                        )}
                        
                        {entry.notes && (
                          <div className="mt-2 p-2 bg-white/50 rounded text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-3 w-3 mt-0.5 text-gray-500" />
                              <span className="leading-relaxed">{entry.notes}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {!showFullHistory && approvalHistory.length > 3 && (
                  <div className="text-center py-4 text-gray-500">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullHistory(true)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Show {approvalHistory.length - 3} more entries
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Future Enhancement Notice */}
              {approvalHistory.length > 0 && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 border-t">
                  <strong>Note:</strong> This history shows major approval milestones. 
                  Future enhancements will include detailed audit trails, modification tracking, and automated workflow events.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseApprovalTab;
