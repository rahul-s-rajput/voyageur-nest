import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { CheckInFormData, CheckInFormProps } from '../types/checkin';
import { StorageService } from '../lib/storage';
import { EnhancedFileValidator } from '../utils/fileValidator';
import { ServerRateLimiter } from '../services/serverRateLimiter';
import { SecureLogger } from '../utils/secureLogger';
import { ErrorHandler } from '../utils/errorHandler';
import { useNotification } from './NotificationContainer';
import { GuestProfileService } from '../services/guestProfileService';
import type { GuestProfile } from '../types/guest';
import {
  STR,
  PURPOSES,
  RELATIONSHIPS,
  langFromCode,
  type Lang,
} from './checkin/checkinStrings';
import { Upload, X, Plus, ArrowRight, AlertCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import DateField from './checkin/DateField';

// ── Design tokens (Himalayan Boutique) ──────────────────────────────────────
const C = {
  pine: '#1f3a30',
  pineHover: '#274a3d',
  pineAccent: '#2f5446',
  sectionSub: '#355c4c',
  card: '#fffdf9',
  sand: '#faf6ec',
  border: '#e4dbca',
  borderSubtle: '#ece3d2',
  dashed: '#cdbf9f',
  label: '#5a4f40',
  muted: '#9a8e78',
  asterisk: '#9a6a2f',
  errText: '#a8431f',
  cream: '#f3eedf',
};

interface ExtraProps {
  /** Booking reference shown in the sticky form header, e.g. "520/391". */
  bookingRef?: string;
  /** True when the guest is updating an already-submitted check-in. */
  isUpdate?: boolean;
}

// Block characters that would make a "number of guests"/"age" non-integer.
const blockNonInteger = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
};

// NOTE: these are defined at module scope (not inside CheckInForm). Defining
// components inside the render body creates a new component *type* every render,
// which makes React remount the whole subtree on each keystroke/toggle — that
// caused the form to jump to the top when the "Adult" checkbox was clicked.
const Section: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section style={{ marginBottom: 26 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
      <span style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: C.pine, color: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 13px 'Spectral','Noto Sans Devanagari',serif` }}>{n}</span>
      <h2 style={{ margin: 0, font: `600 19px/1 'Spectral','Noto Sans Devanagari',serif`, color: C.pine }}>{title}</h2>
    </div>
    {children}
  </section>
);

// Native <select> with a custom chevron + hover/focus (via .vn-select CSS).
const SelectWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'relative' }}>
    {children}
    <ChevronDown size={16} color={C.muted} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
  </div>
);

export const CheckInForm: React.FC<CheckInFormProps & ExtraProps> = ({
  bookingId,
  onSubmit,
  initialData,
  isSubmitting = false,
  language = 'en',
  onLanguageChange,
  externalErrorHandling = false,
  bookingRef,
  isUpdate = false,
}) => {
  const lang: Lang = langFromCode(language);
  const t = STR[lang];

  const { showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [idError, setIdError] = useState(false);
  const [guestIdErrors, setGuestIdErrors] = useState<Record<string, boolean>>({});
  const [idPhotos, setIdPhotos] = useState<File[]>([]);
  // Per-guest adult ID photos, keyed by the field-array row id (stable across reorders).
  const [guestPhotos, setGuestPhotos] = useState<Record<string, File[]>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setMatchedGuest] = useState<GuestProfile | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CheckInFormData>({
    defaultValues: initialData || {
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', nationality: '',
      idType: 'passport', idNumber: '', address: '', city: '', state: '', country: '', zipCode: '',
      emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
      purposeOfVisit: 'leisure', arrivalDate: '', departureDate: '', roomNumber: '', numberOfGuests: 1,
      additionalGuests: [], specialRequests: '',
      preferences: { wakeUpCall: false, newspaper: false, extraTowels: false, extraPillows: false, roomService: false, doNotDisturb: false },
      termsAccepted: false, marketingConsent: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'additionalGuests' });

  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData, reset]);

  // ── ID photo upload (magic-number validation via EnhancedFileValidator) ────
  const MAX_FILES = 6;
  const MAX_PER_GUEST = 4;
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const validateFiles = useCallback(async (incoming: File[], currentCount: number, max: number): Promise<File[]> => {
    if (currentCount + incoming.length > max) {
      showError('Too many files', `You can upload at most ${max} files here.`);
      return [];
    }
    const valid: File[] = [];
    for (const file of incoming) {
      const res = await EnhancedFileValidator.validateFile(file, { maxFileSize: 5 * 1024 * 1024, allowedTypes: acceptedTypes });
      if (res.valid) valid.push(file);
      else showError('File rejected', `${file.name}: ${res.error || 'Invalid file'}`);
    }
    return valid;
  }, [showError]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const valid = await validateFiles(Array.from(files), idPhotos.length, MAX_FILES);
    if (valid.length) { setIdPhotos(prev => [...prev, ...valid]); setIdError(false); }
  }, [idPhotos.length, validateFiles]);

  const addGuestFiles = useCallback(async (rowId: string, files: FileList | File[]) => {
    const valid = await validateFiles(Array.from(files), (guestPhotos[rowId] || []).length, MAX_PER_GUEST);
    if (valid.length) {
      setGuestPhotos(prev => ({ ...prev, [rowId]: [...(prev[rowId] || []), ...valid] }));
      setGuestIdErrors(prev => ({ ...prev, [rowId]: false }));
    }
  }, [guestPhotos, validateFiles]);

  const removeGuestFile = (rowId: string, idx: number) =>
    setGuestPhotos(prev => ({ ...prev, [rowId]: (prev[rowId] || []).filter((_, j) => j !== idx) }));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ── Automatic guest-profile matching (unchanged behaviour) ─────────────────
  const findMatchingGuest = async (email: string, phone: string): Promise<GuestProfile | null> => {
    if (!email && !phone) return null;
    try {
      if (email) {
        const r = await GuestProfileService.searchGuestProfiles({ search: email, limit: 5, offset: 0 });
        const m = r.find(g => g.email?.toLowerCase() === email.toLowerCase());
        if (m) return m;
      }
      if (phone) {
        const r = await GuestProfileService.searchGuestProfiles({ search: phone, limit: 5, offset: 0 });
        const m = r.find(g => g.phone === phone);
        if (m) return m;
      }
      return null;
    } catch (e) {
      console.error('Error finding matching guest:', e);
      return null;
    }
  };

  const onFormSubmit = async (data: CheckInFormData) => {
    setShowSummary(false);

    // ID-photo requirements: primary guest (new check-ins) + every adult guest.
    let uploadsOk = true;
    const needPrimaryId = !isUpdate && idPhotos.length === 0;
    setIdError(needPrimaryId);
    if (needPrimaryId) uploadsOk = false;

    const newGuestErrors: Record<string, boolean> = {};
    (data.additionalGuests || []).forEach((g, idx) => {
      const rowId = fields[idx]?.id;
      if (!rowId || !g.isAdult) return;
      const hasId = (guestPhotos[rowId]?.length || 0) > 0 || (g.idPhotoUrls?.length || 0) > 0;
      if (!hasId) { newGuestErrors[rowId] = true; uploadsOk = false; }
    });
    setGuestIdErrors(newGuestErrors);

    if (!uploadsOk) { setShowSummary(true); return; }

    const identifier = bookingId || data.email || 'anonymous';
    const userAgent = navigator.userAgent;
    try {
      setSubmitting(true);

      const rateLimitCheck = await ServerRateLimiter.checkRateLimit('checkin-submission', identifier, undefined, userAgent);
      if (!rateLimitCheck.allowed) {
        const retryTime = rateLimitCheck.retryAfter || 60;
        showError('Rate Limit Exceeded', rateLimitCheck.message || `Please wait ${retryTime} seconds before submitting again.`);
        return;
      }

      SecureLogger.info('Check-in form submission started', {
        hasIdPhotos: idPhotos.length > 0,
        guestCount: data.additionalGuests?.length || 0,
      });

      // Resolve / create guest profile (non-fatal on failure).
      let guestProfileId: string | null = null;
      try {
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        const existingGuest = await findMatchingGuest(data.email, data.phone);
        if (existingGuest) {
          guestProfileId = existingGuest.id;
          setMatchedGuest(existingGuest);
          await GuestProfileService.updateGuestProfile({
            id: existingGuest.id, name: fullName, email: data.email, phone: data.phone,
            address: data.address, city: data.city, state: data.state, country: data.country,
          });
        } else {
          const newGuest = await GuestProfileService.createGuestProfile({
            name: fullName, email: data.email, phone: data.phone, address: data.address,
            city: data.city, state: data.state, country: data.country,
            email_marketing_consent: false, sms_marketing_consent: false, data_retention_consent: true,
          });
          guestProfileId = newGuest.id;
        }
      } catch (guestError) {
        SecureLogger.warn('Guest profile creation/update failed', {
          error: guestError instanceof Error ? guestError.message : 'Unknown error',
        });
      }

      // Upload ID photos (main + per-adult-guest), then submit.
      try {
        let mainUrls: string[] = [];
        if (idPhotos.length > 0) {
          const ur = await StorageService.uploadFiles(idPhotos, data.id || '');
          mainUrls = ur.filter(r => r.success).map(r => r.url).filter(Boolean) as string[];
        }

        const guestsOut = await Promise.all((data.additionalGuests || []).map(async (g, idx) => {
          const rowId = fields[idx]?.id;
          const gFiles = rowId ? guestPhotos[rowId] : undefined;
          const base: { name: string; age?: number; isAdult: boolean; idPhotoUrls?: string[] } = {
            name: g.name, age: g.age, isAdult: !!g.isAdult,
          };
          if (g.isAdult && gFiles && gFiles.length) {
            const ur = await StorageService.uploadFiles(gFiles, data.id || '');
            base.idPhotoUrls = ur.filter(r => r.success).map(r => r.url).filter(Boolean) as string[];
          } else if (g.idPhotoUrls?.length) {
            base.idPhotoUrls = g.idPhotoUrls;
          }
          return base;
        }));

        // Surface every ID photo in the booking-level gallery staff already review.
        const allIdUrls = [...mainUrls, ...guestsOut.flatMap(g => g.idPhotoUrls || [])];
        const { idPhotos: _omit, ...submissionData } = data;
        await onSubmit({ ...submissionData, termsAccepted: true, additionalGuests: guestsOut, id_photo_urls: allIdUrls, guest_profile_id: guestProfileId } as any);
        await ServerRateLimiter.recordAttempt('checkin-submission', identifier, true, undefined, userAgent);
      } catch (uploadError) {
        await ServerRateLimiter.recordAttempt('checkin-submission', identifier, false, undefined, userAgent);
        throw uploadError;
      }
    } catch (error) {
      await ServerRateLimiter.recordAttempt('checkin-submission', identifier, false, undefined, userAgent);
      const handledError = ErrorHandler.handle(error, 'checkin-form-submission', { action: 'form-submit' });
      if (!externalErrorHandling) {
        showError('Submission Failed', handledError.userMessage);
      } else {
        throw handledError;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isSubmitting || submitting;

  // ── Small presentational helpers ───────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block', font: `600 12.5px/1.3 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`,
    color: C.label, margin: '0 0 6px',
  };
  const reqMark = <span style={{ color: C.asterisk }}> *</span>;
  const cls = (err?: boolean) => `vn-field${err ? ' vn-field--error' : ''}`;

  const fieldError = (msg?: string) =>
    msg ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: C.errText }}>
        <AlertCircle size={13} />
        <span style={{ font: `500 12px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif` }}>{msg}</span>
      </div>
    ) : null;

  const langToggle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${C.border}`, borderRadius: 999, padding: 4 }}>
      <button type="button" onClick={() => onLanguageChange?.('en')} style={{ border: 'none', cursor: 'pointer', padding: '6px 13px', borderRadius: 999, font: `600 13px 'Hanken Grotesk',sans-serif`, color: lang === 'en' ? C.cream : C.pineAccent, background: lang === 'en' ? C.pineAccent : 'transparent' }}>English</button>
      <button type="button" onClick={() => onLanguageChange?.('hi')} style={{ border: 'none', cursor: 'pointer', padding: '6px 13px', borderRadius: 999, font: `600 13px 'Noto Sans Devanagari',sans-serif`, color: lang === 'hi' ? C.cream : C.pineAccent, background: lang === 'hi' ? C.pineAccent : 'transparent' }}>हिन्दी</button>
    </div>
  );

  return (
    <div style={{ flex: 1, minWidth: 0, fontFamily: `'Hanken Grotesk','Noto Sans Devanagari',system-ui,sans-serif` }}>
      {/* Sticky form header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 6, background: C.card, padding: '20px 28px 14px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div style={{ font: `400 12.5px/1 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.muted }}>
              {t.bkFor} {bookingRef ? `#${bookingRef}` : ''}
            </div>
            <div style={{ font: `600 14px/1.3 'Spectral','Noto Sans Devanagari',serif`, color: C.pine, marginTop: 5 }}>{t.subtitle}</div>
          </div>
          {langToggle}
        </div>
      </div>

      <div style={{ padding: '22px 28px 36px' }}>
        {showSummary && (
          <div style={{ display: 'flex', gap: 11, alignItems: 'center', background: '#f9ece6', border: '1px solid #eccbbb', borderRadius: 12, padding: '13px 15px', marginBottom: 22 }}>
            <AlertTriangle size={18} color={C.errText} style={{ flex: 'none' }} />
            <span style={{ font: `600 14px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#8c3a1c' }}>{t.val.summary}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit, () => setShowSummary(true))} noValidate>
          {/* 1 Personal */}
          <Section n={1} title={t.s.personal}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[18px] gap-y-[15px]">
              <div>
                <label style={labelStyle}>{t.f.first.l}{reqMark}</label>
                <input className={cls(!!errors.firstName)} placeholder={t.f.first.p} autoComplete="given-name" {...register('firstName', { required: t.val.required })} />
                {fieldError(errors.firstName?.message as string)}
              </div>
              <div>
                <label style={labelStyle}>{t.f.last.l}{reqMark}</label>
                <input className={cls(!!errors.lastName)} placeholder={t.f.last.p} autoComplete="family-name" {...register('lastName', { required: t.val.required })} />
                {fieldError(errors.lastName?.message as string)}
              </div>
              <div>
                <label style={labelStyle}>{t.f.email.l}{reqMark}</label>
                <input className={cls(!!errors.email)} type="email" inputMode="email" placeholder={t.f.email.p} autoComplete="email" {...register('email', { required: t.val.required, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.val.email } })} />
                {fieldError(errors.email?.message as string)}
              </div>
              <div>
                <label style={labelStyle}>{t.f.phone.l}{reqMark}</label>
                <input className={cls(!!errors.phone)} type="tel" inputMode="tel" placeholder={t.f.phone.p} autoComplete="tel" {...register('phone', { required: t.val.required, pattern: { value: /^[+()\-\s0-9]{6,}$/, message: t.val.phone } })} />
                {fieldError(errors.phone?.message as string)}
              </div>
              <div>
                <label style={labelStyle}>{t.f.dob.l}</label>
                <DateField
                  value={watch('dateOfBirth')}
                  onChange={(v) => setValue('dateOfBirth', v, { shouldDirty: true })}
                  placeholder={t.f.dob.p}
                  lang={lang}
                  maxToday
                />
              </div>
              <div>
                <label style={labelStyle}>{t.f.nat.l}{reqMark}</label>
                <input className={cls(!!errors.nationality)} placeholder={t.f.nat.p} {...register('nationality', { required: t.val.required })} />
                {fieldError(errors.nationality?.message as string)}
              </div>
            </div>
          </Section>

          {/* 2 ID Verification */}
          <Section n={2} title={t.s.id}>
            <label style={labelStyle}>{t.up.title}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{ border: `1.5px dashed ${dragOver ? C.pineAccent : C.dashed}`, borderRadius: 14, background: dragOver ? '#f3efe1' : C.sand, padding: 26, textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: C.borderSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Upload size={22} color={C.sectionSub} strokeWidth={1.7} />
              </div>
              <div style={{ font: `600 14.5px/1.4 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#3a3329' }}>{t.up.drop}</div>
              <div style={{ font: `400 12.5px/1.4 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.muted, marginTop: 5 }}>{t.up.hint}</div>
              {idPhotos.length > 0 && (
                <div className="flex flex-wrap gap-[10px] justify-center mt-4" onClick={(e) => e.stopPropagation()}>
                  {idPhotos.map((file, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 11px 8px 9px' }}>
                      <div style={{ width: 30, height: 38, borderRadius: 5, background: 'linear-gradient(135deg,#dfe9e2,#cdbf9f)' }} />
                      <span style={{ font: `500 12.5px/1 'Hanken Grotesk',sans-serif`, color: '#3a3329', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <button type="button" aria-label={t.ui.remove} onClick={() => setIdPhotos(prev => prev.filter((_, j) => j !== i))} style={{ width: 18, height: 18, borderRadius: '50%', background: '#f0e7d6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={11} color="#7a6f5c" strokeWidth={2.4} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
            {idError && fieldError(t.val.idRequired)}
          </Section>

          {/* 3 Address */}
          <Section n={3} title={t.s.address}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-[18px] gap-y-[15px]">
              <div className="sm:col-span-2 lg:col-span-4">
                <label style={labelStyle}>{t.f.addr.l}{reqMark}</label>
                <input className={cls(!!errors.address)} placeholder={t.f.addr.p} autoComplete="street-address" {...register('address', { required: t.val.required })} />
                {fieldError(errors.address?.message as string)}
              </div>
              <div><label style={labelStyle}>{t.f.city.l}</label><input className="vn-field" placeholder={t.f.city.p} {...register('city')} /></div>
              <div><label style={labelStyle}>{t.f.state.l}</label><input className="vn-field" placeholder={t.f.state.p} {...register('state')} /></div>
              <div><label style={labelStyle}>{t.f.country.l}</label><input className="vn-field" placeholder={t.f.country.p} {...register('country')} /></div>
              <div><label style={labelStyle}>{t.f.zip.l}</label><input className="vn-field" inputMode="numeric" placeholder={t.f.zip.p} {...register('zipCode')} /></div>
            </div>
          </Section>

          {/* 4 Emergency Contact */}
          <Section n={4} title={t.s.emergency}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-[18px] gap-y-[15px]">
              <div><label style={labelStyle}>{t.f.ecName.l}</label><input className="vn-field" placeholder={t.f.ecName.p} {...register('emergencyContactName')} /></div>
              <div><label style={labelStyle}>{t.f.ecPhone.l}</label><input className="vn-field" type="tel" inputMode="tel" placeholder={t.f.ecPhone.p} {...register('emergencyContactPhone')} /></div>
              <div>
                <label style={labelStyle}>{t.f.ecRel.l}</label>
                <SelectWrap>
                  <select className="vn-field vn-select" {...register('emergencyContactRelation')}>
                    <option value="">{t.f.ecRel.p}</option>
                    {RELATIONSHIPS.map(o => <option key={o.value} value={o.value}>{lang === 'hi' ? o.hi : o.en}</option>)}
                  </select>
                </SelectWrap>
              </div>
            </div>
          </Section>

          {/* 5 Visit Details */}
          <Section n={5} title={t.s.visit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-[18px] gap-y-[15px]">
              <div>
                <label style={labelStyle}>{t.f.purpose.l}</label>
                <SelectWrap>
                  <select className="vn-field vn-select" {...register('purposeOfVisit')}>
                    {PURPOSES.map(o => <option key={o.value} value={o.value}>{lang === 'hi' ? o.hi : o.en}</option>)}
                  </select>
                </SelectWrap>
              </div>
              <div>
                <label style={labelStyle}>{t.f.guestsNum.l}{reqMark}</label>
                <input className={cls(!!errors.numberOfGuests)} type="number" inputMode="numeric" min={1} step={1} onKeyDown={blockNonInteger} {...register('numberOfGuests', { valueAsNumber: true, validate: v => (typeof v === 'number' && Number.isInteger(v) && v >= 1) || t.val.guestsMin })} />
                {fieldError(errors.numberOfGuests?.message as string)}
              </div>
              <div><label style={labelStyle}>{t.f.room.l}</label><input className="vn-field vn-field--muted" readOnly {...register('roomNumber')} /></div>
              <div><label style={labelStyle}>{t.f.arrival.l}</label><input className="vn-field vn-field--muted" type="date" readOnly {...register('arrivalDate')} /></div>
              <div><label style={labelStyle}>{t.f.departure.l}</label><input className="vn-field vn-field--muted" type="date" readOnly {...register('departureDate')} /></div>
            </div>
          </Section>

          {/* 6 Additional Guests */}
          <Section n={6} title={t.s.guests}>
            {fields.map((field, i) => {
              const isAdult = !!watch(`additionalGuests.${i}.isAdult` as const);
              const gFiles = guestPhotos[field.id] || [];
              return (
                <div key={field.id} style={{ position: 'relative', border: `1px solid ${C.borderSubtle}`, borderRadius: 12, background: C.sand, padding: '13px 13px 14px', marginBottom: 10 }}>
                  <button type="button" onClick={() => remove(i)} aria-label={t.ui.remove} style={{ position: 'absolute', top: 11, right: 11, width: 25, height: 25, border: 'none', borderRadius: 7, background: '#f0e7d6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} color="#a05a4a" strokeWidth={2.2} />
                  </button>
                  <div className="flex gap-[10px] items-start" style={{ paddingRight: 30 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ ...labelStyle, fontSize: 11, margin: '0 0 5px' }}>{t.f.gName.l}</label>
                      <input className="vn-field vn-guestfield" placeholder={t.f.gName.p} {...register(`additionalGuests.${i}.name` as const)} />
                    </div>
                    <div style={{ flex: 'none', width: 84 }}>
                      <label style={{ ...labelStyle, fontSize: 11, margin: '0 0 5px' }}>{t.f.gAge.l}</label>
                      <input className="vn-field vn-guestfield" type="number" inputMode="numeric" min={0} step={1} onKeyDown={blockNonInteger} placeholder={t.f.gAge.p} {...register(`additionalGuests.${i}.age` as const, { valueAsNumber: true })} />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, cursor: 'pointer' }}>
                    <input type="checkbox" className="w-[16px] h-[16px] accent-[#2f5446]" {...register(`additionalGuests.${i}.isAdult` as const)} />
                    <span style={{ font: `500 12.5px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.label }}>{t.ui.gAdult}</span>
                  </label>

                  {isAdult && (
                    <div
                      onClick={() => document.getElementById(`gfile-${field.id}`)?.click()}
                      style={{ marginTop: 10, border: `1.5px dashed ${C.dashed}`, borderRadius: 10, background: '#fff', padding: 12, textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Upload size={16} color={C.sectionSub} strokeWidth={1.8} />
                        <span style={{ font: `600 12.5px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#3a3329' }}>{t.ui.gUpload}</span>
                      </div>
                      <div style={{ font: `400 11px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.muted, marginTop: 3 }}>{t.up.hint}</div>
                      {gFiles.length > 0 && (
                        <div className="flex flex-wrap gap-[8px] justify-center mt-2" onClick={(e) => e.stopPropagation()}>
                          {gFiles.map((file, pi) => (
                            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.sand, border: `1px solid ${C.border}`, borderRadius: 9, padding: '6px 9px 6px 7px' }}>
                              <div style={{ width: 24, height: 30, borderRadius: 4, background: 'linear-gradient(135deg,#dfe9e2,#cdbf9f)' }} />
                              <span style={{ font: `500 11.5px/1 'Hanken Grotesk',sans-serif`, color: '#3a3329', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                              <button type="button" aria-label={t.ui.remove} onClick={() => removeGuestFile(field.id, pi)} style={{ width: 17, height: 17, borderRadius: '50%', background: '#f0e7d6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={10} color="#7a6f5c" strokeWidth={2.4} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input id={`gfile-${field.id}`} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.length) addGuestFiles(field.id, e.target.files); e.target.value = ''; }} />
                    </div>
                  )}
                  {isAdult && guestIdErrors[field.id] && fieldError(t.val.guestId)}
                </div>
              );
            })}
            <button type="button" onClick={() => append({ name: '', age: undefined, isAdult: false })} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: `1px dashed ${C.dashed}`, borderRadius: 9, padding: '9px 14px', color: C.sectionSub, font: `600 13px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, cursor: 'pointer' }}>
              <Plus size={15} color={C.sectionSub} /> {t.ui.addGuest}
            </button>
          </Section>

          {/* Submit */}
          <section style={{ borderTop: `1px solid ${C.borderSubtle}`, paddingTop: 22 }}>
            <button type="submit" disabled={busy} style={{ width: '100%', height: 54, border: 'none', borderRadius: 12, background: busy ? C.pineHover : C.pine, color: C.cream, font: `600 16px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              {busy ? (
                <>
                  <span style={{ width: 19, height: 19, borderRadius: '50%', border: '2.4px solid rgba(243,238,223,.4)', borderTopColor: C.cream, display: 'inline-block' }} className="animate-spin" />
                  {t.ui.submitting}
                </>
              ) : (
                <>
                  {isUpdate ? t.ui.update : t.ui.submit}
                  <ArrowRight size={18} color={C.cream} />
                </>
              )}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
};

export default CheckInForm;
