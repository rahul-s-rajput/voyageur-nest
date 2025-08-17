import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Camera, Image as ImageIcon, FileText } from 'lucide-react';

interface ReceiptUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'camera' | 'gallery' | 'pdf') => void;
  allowPdf?: boolean; // Hide PDF option on mobile for photo-first UX
}

const OptionTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  ariaLabel?: string;
}> = ({ icon, label, description, onClick, ariaLabel }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gradient-to-b from-stone-50 to-white p-5 text-center shadow-sm hover:shadow-md active:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-800/20"
    >
      <div className="rounded-xl bg-neutral-100 p-3 group-hover:bg-neutral-200 transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-neutral-900">{label}</div>
        {description && (
          <div className="text-xs text-neutral-500 mt-0.5">{description}</div>
        )}
      </div>
    </button>
  );
};

const ReceiptUploadSheet: React.FC<ReceiptUploadSheetProps> = ({ open, onOpenChange, onSelect, allowPdf = true }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-none fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 rounded-t-3xl p-5 sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:rounded-2xl"
        aria-label="Add receipt"
      >
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-neutral-300" />
        <DialogHeader>
          <DialogTitle className="text-base">Add receipt</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-neutral-500 mt-1 mb-3">Photos only for fastest AI extraction • Max 10MB</p>
        <div className={`mt-1 grid ${allowPdf ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
          <OptionTile
            icon={<Camera className="h-7 w-7 text-neutral-700" />}
            label="Take Photo"
            description="Use camera"
            onClick={() => onSelect('camera')}
            ariaLabel="Take photo with camera"
          />
          <OptionTile
            icon={<ImageIcon className="h-7 w-7 text-neutral-700" />}
            label="Photos"
            description="From gallery"
            onClick={() => onSelect('gallery')}
            ariaLabel="Select photo from gallery"
          />
          {allowPdf && (
            <OptionTile
              icon={<FileText className="h-7 w-7 text-neutral-700" />}
              label="PDF"
              description="Upload file"
              onClick={() => onSelect('pdf')}
              ariaLabel="Upload PDF document"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptUploadSheet;
