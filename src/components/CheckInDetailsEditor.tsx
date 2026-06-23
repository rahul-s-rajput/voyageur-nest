import React, { useState } from 'react';
import { Save, XCircle } from 'lucide-react';
import { CheckInData, CheckInFormData } from '../types/checkin';

interface CheckInDetailsEditorProps {
  data: CheckInData;
  saving: boolean;
  onCancel: () => void;
  onSave: (updates: Partial<CheckInFormData>) => void;
}

const ID_TYPES: { value: CheckInData['idType']; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'ration_card', label: 'Ration Card' },
  { value: 'other', label: 'Other' },
];

const PURPOSES: { value: CheckInData['purposeOfVisit']; label: string }[] = [
  { value: 'leisure', label: 'Leisure' },
  { value: 'business', label: 'Business' },
  { value: 'family', label: 'Family' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

const PREFERENCE_FIELDS: { key: keyof CheckInData['preferences']; label: string }[] = [
  { key: 'wakeUpCall', label: 'Wake-up Call' },
  { key: 'newspaper', label: 'Newspaper' },
  { key: 'extraTowels', label: 'Extra Towels' },
  { key: 'extraPillows', label: 'Extra Pillows' },
  { key: 'roomService', label: 'Room Service' },
  { key: 'doNotDisturb', label: 'Do Not Disturb' },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
  label,
  className = '',
  children,
}) => (
  <div className={className}>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);

/**
 * Inline editor for the core guest-submitted check-in fields so staff can
 * correct incorrect/incomplete info before checking the guest in. Additional
 * guests and ID photos are managed separately in the parent and are not
 * touched here.
 */
export const CheckInDetailsEditor: React.FC<CheckInDetailsEditorProps> = ({
  data,
  saving,
  onCancel,
  onSave,
}) => {
  const [form, setForm] = useState({
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    phone: data.phone || '',
    dateOfBirth: data.dateOfBirth || '',
    nationality: data.nationality || '',
    idType: data.idType || 'passport',
    idNumber: data.idNumber || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    country: data.country || '',
    zipCode: data.zipCode || '',
    emergencyContactName: data.emergencyContactName || '',
    emergencyContactPhone: data.emergencyContactPhone || '',
    emergencyContactRelation: data.emergencyContactRelation || '',
    purposeOfVisit: data.purposeOfVisit || 'leisure',
    arrivalDate: data.arrivalDate || '',
    departureDate: data.departureDate || '',
    roomNumber: data.roomNumber || '',
    numberOfGuests: data.numberOfGuests ?? 1,
    specialRequests: data.specialRequests || '',
    preferences: {
      wakeUpCall: !!data.preferences?.wakeUpCall,
      newspaper: !!data.preferences?.newspaper,
      extraTowels: !!data.preferences?.extraTowels,
      extraPillows: !!data.preferences?.extraPillows,
      roomService: !!data.preferences?.roomService,
      doNotDisturb: !!data.preferences?.doNotDisturb,
    },
  });

  const set = (key: keyof typeof form, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const togglePref = (key: keyof CheckInData['preferences']) =>
    setForm(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: !prev.preferences[key] },
    }));

  const handleSave = () => {
    onSave({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality || undefined,
      idType: form.idType,
      idNumber: form.idNumber || undefined,
      address: form.address,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
      zipCode: form.zipCode || undefined,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      emergencyContactRelation: form.emergencyContactRelation,
      purposeOfVisit: form.purposeOfVisit,
      arrivalDate: form.arrivalDate,
      departureDate: form.departureDate,
      roomNumber: form.roomNumber,
      numberOfGuests: Number(form.numberOfGuests) || 1,
      specialRequests: form.specialRequests || undefined,
      preferences: form.preferences,
    });
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Personal Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name">
            <input className={inputClass} value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          </Field>
          <Field label="Last Name">
            <input className={inputClass} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputClass} value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Nationality">
            <input className={inputClass} value={form.nationality} onChange={e => set('nationality', e.target.value)} />
          </Field>
          <Field label="ID Type">
            <select className={inputClass} value={form.idType} onChange={e => set('idType', e.target.value)}>
              {ID_TYPES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="ID Number">
            <input className={inputClass} value={form.idNumber} onChange={e => set('idNumber', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Address */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-3">Address Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Street" className="sm:col-span-2">
            <input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} />
          </Field>
          <Field label="City">
            <input className={inputClass} value={form.city} onChange={e => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <input className={inputClass} value={form.state} onChange={e => set('state', e.target.value)} />
          </Field>
          <Field label="Country">
            <input className={inputClass} value={form.country} onChange={e => set('country', e.target.value)} />
          </Field>
          <Field label="Zip Code">
            <input className={inputClass} value={form.zipCode} onChange={e => set('zipCode', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-900 mb-3">Emergency Contact</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input className={inputClass} value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} />
          </Field>
          <Field label="Relationship" className="sm:col-span-2">
            <input className={inputClass} value={form.emergencyContactRelation} onChange={e => set('emergencyContactRelation', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Visit Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 mb-3">Visit Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Purpose">
            <select className={inputClass} value={form.purposeOfVisit} onChange={e => set('purposeOfVisit', e.target.value)}>
              {PURPOSES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Room Number">
            <input className={inputClass} value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} />
          </Field>
          <Field label="Arrival Date">
            <input type="date" className={inputClass} value={form.arrivalDate} onChange={e => set('arrivalDate', e.target.value)} />
          </Field>
          <Field label="Departure Date">
            <input type="date" className={inputClass} value={form.departureDate} onChange={e => set('departureDate', e.target.value)} />
          </Field>
          <Field label="Number of Guests">
            <input type="number" min={1} className={inputClass} value={form.numberOfGuests} onChange={e => set('numberOfGuests', e.target.value)} />
          </Field>
          <Field label="Special Requests" className="sm:col-span-2">
            <textarea rows={2} className={inputClass} value={form.specialRequests} onChange={e => set('specialRequests', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Service Preferences</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PREFERENCE_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                className="mr-2"
                checked={form.preferences[key]}
                onChange={() => togglePref(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Save Check-in Details'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 flex items-center justify-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-60"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CheckInDetailsEditor;
