import React from 'react';

export interface EmailImportItem {
  id: string;
  subject: string;
  propertyName?: string;
  confidence?: number;
  eventType?: 'new' | 'modified' | 'cancelled';
}

interface Props {
  items: EmailImportItem[];
  onPreview: (id: string) => void;
  onReparse?: (id: string) => void;
}

export const EmailImportsPanel: React.FC<Props> = ({ items, onPreview, onReparse }) => {
  if (!items?.length) {
    return (
      <div className="border rounded-md p-3 bg-white">
        <div className="text-sm text-gray-500">No email-sourced bookings detected yet.</div>
      </div>
    );
  }

  return (
    <div className="border rounded-md bg-white">
      <div className="px-3 py-2 border-b font-semibold text-gray-800">Email‑sourced bookings</div>
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">{item.subject}</div>
              <div className="text-xs text-gray-500 space-x-2">
                {item.propertyName && <span>Property: {item.propertyName}</span>}
                {typeof item.confidence === 'number' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">{Math.round(item.confidence * 100)}%</span>
                )}
                {item.eventType && <span>Type: {item.eventType}</span>}
              </div>
            </div>
            <div className="space-x-2">
              <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded" onClick={() => onPreview(item.id)}>Preview</button>
              {onReparse && (
                <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border" onClick={() => onReparse(item.id)}>Re-parse</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EmailImportsPanel; 