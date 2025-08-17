import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Check, XCircle, AlertCircle } from 'lucide-react';

interface ExpenseApprovalPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (notes: string) => Promise<void> | void;
  onReject: (notes: string) => Promise<void> | void;
  mode: 'approve' | 'reject';
  expenseAmount: number;
  expenseDate: string;
  vendor: string;
}

const ExpenseApprovalPopup: React.FC<ExpenseApprovalPopupProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  mode,
  expenseAmount,
  expenseDate,
  vendor
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'approve') {
        await onApprove(notes);
      } else {
        await onReject(notes);
      }
      setNotes('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error in approval action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="w-full max-w-none h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:h-auto sm:mx-auto sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                Approve Expense
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Reject Expense
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expense Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Amount:</span>
              <span className="text-lg font-semibold text-gray-900">₹{expenseAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Date:</span>
              <span className="text-sm text-gray-900">{expenseDate}</span>
            </div>
            {vendor && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Vendor:</span>
                <span className="text-sm text-gray-900">{vendor}</span>
              </div>
            )}
          </div>

          {/* Confirmation Message */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${
            mode === 'approve' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <AlertCircle className={`h-5 w-5 mt-0.5 ${
              mode === 'approve' ? 'text-green-600' : 'text-red-600'
            }`} />
            <div className="text-sm">
              <p className="font-medium mb-1">
                {mode === 'approve' 
                  ? 'Are you sure you want to approve this expense?' 
                  : 'Are you sure you want to reject this expense?'
                }
              </p>
              <p className="text-gray-600">
                {mode === 'approve' 
                  ? 'This action will mark the expense as approved and it will be processed for payment.' 
                  : 'This action will mark the expense as rejected and it will not be processed for payment.'
                }
              </p>
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <label htmlFor="approval-notes" className="text-sm font-medium text-gray-700">
              {mode === 'approve' ? 'Approval Notes' : 'Rejection Notes'} (Optional)
            </label>
            <Textarea
              id="approval-notes"
              placeholder={
                mode === 'approve' 
                  ? 'Add any notes about this approval...' 
                  : 'Add reason for rejection or feedback...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 sm:flex-none ${
              mode === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            ) : mode === 'approve' ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {mode === 'approve' ? 'Approve Expense' : 'Reject Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseApprovalPopup;
