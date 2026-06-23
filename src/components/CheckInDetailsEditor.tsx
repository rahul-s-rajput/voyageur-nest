import React, { useState } from 'react';
import { Save, XCircle, Trash2, Plus, Upload, X } from 'lucide-react';
import { CheckInData, CheckInFormData } from '../types/checkin';
import { StorageService } from '../lib/storage';
import { EnhancedFileValidator } from '../utils/fileValidator';
import { useNotification } from './NotificationContainer';

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

  // Additional guests (kept separate from `form` since it's an array). Each
  // guest's uploaded ID photos (idPhotoUrls) are preserved through edits.
  type GuestRow = CheckInData['additionalGuests'][number];
  const { showError } = useNotification();
  const [guests, setGuests] = useState<GuestRow[]>((data.additionalGuests || []).map(g => ({ ...g })));
  const [uploadingGuest, setUploadingGuest] = useState<number | null>(null);
  const updateGuest = (i: number, patch: Partial<GuestRow>) =>
    setGuests(prev => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const addGuest = () => setGuests(prev => [...prev, { name: '', age: undefined, isAdult: false }]);
  const removeGuest = (i: number) => setGuests(prev => prev.filter((_, idx) => idx !== i));

  const addGuestPhotos = async (i: number, files: FileList) => {
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      const res = await EnhancedFileValidator.validateFile(file, {
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      });
      if (res.valid) valid.push(file);
      else showError('File rejected', `${file.name}: ${res.error || 'Invalid file'}`);
    }
    if (!valid.length) return;
    setUploadingGuest(i);
    try {
      const results = await StorageService.uploadFiles(valid, data.id);
      const urls = results.filter(r => r.success).map(r => r.url).filter(Boolean) as string[];
      if (urls.length) {
        setGuests(prev => prev.map((g, idx) => (idx === i ? { ...g, idPhotoUrls: [...(g.idPhotoUrls || []), ...urls] } : g)));
      }
    } catch (e: any) {
      showError('Upload failed', e?.message || 'Could not upload the ID photo.');
    } finally {
      setUploadingGuest(null);
    }
  };

  const removeGuestPhoto = (i: number, photoIdx: number) =>
    setGuests(prev => prev.map((g, idx) =>
      idx === i ? { ...g, idPhotoUrls: (g.idPhotoUrls || []).filter((_, j) => j !== photoIdx) } : g));

  const handleSave = () => {
    const cleanGuests = guests
      .filter(g => (g.name || '').trim() !== '')
      .map(g => ({
        name: g.name.trim(),
        age: g.age,
        isAdult: !!g.isAdult,
        ...(g.idPhotoUrls && g.idPhotoUrls.length ? { idPhotoUrls: g.idPhotoUrls } : {}),
      }));
    const guestPhotoUrls = cleanGuests.flatMap(g => g.idPhotoUrls || []);
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
      additionalGuests: cleanGuests,
      // Keep the booking-level gallery in sync so newly added guest photos are
      // viewable there too (existing primary photos are preserved).
      id_photo_urls: Array.from(new Set([...(data.id_photo_urls || []), ...guestPhotoUrls])),
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

      {/* Additional Guests */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-indigo-900">Additional Guests</h4>
          <button
            type="button"
            onClick={addGuest}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Guest
          </button>
        </div>
        {guests.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No additional guests.</p>
        ) : (
          <div className="space-y-2">
            {guests.map((g, i) => (
              <div key={i} className="bg-white rounded-md border border-gray-200 p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={g.name}
                    onChange={e => updateGuest(i, { name: e.target.value })}
                    placeholder="Guest name"
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min={0}
                    value={g.age ?? ''}
                    onChange={e => updateGuest(i, { age: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="Age"
                    className="w-[72px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeGuest(i)}
                    aria-label="Remove guest"
                    className="p-2 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!g.isAdult} onChange={e => updateGuest(i, { isAdult: e.target.checked })} />
                  Adult
                </label>

                {/* Per-guest ID photos */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(g.idPhotoUrls || []).map((url, pi) => (
                    <div key={pi} className="relative">
                      <img
                        src={url}
                        alt={`ID ${pi + 1}`}
                        className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(url, '_blank')}
                      />
                      <button
                        type="button"
                        onClick={() => removeGuestPhoto(i, pi)}
                        aria-label="Remove photo"
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs border border-dashed border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 ${uploadingGuest === i ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}>
                    {uploadingGuest === i
                      ? <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />
                      : <Upload className="w-3.5 h-3.5" />}
                    {uploadingGuest === i ? 'Uploading…' : 'Add ID'}
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploadingGuest === i}
                      onChange={e => { if (e.target.files?.length) addGuestPhotos(i, e.target.files); e.target.value = ''; }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
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
