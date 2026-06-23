import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Mountain, Lock, Check, AlertTriangle } from 'lucide-react';
import { CheckInForm } from '../components/CheckInForm';
import { checkInService, bookingService } from '../lib/supabase';
import { propertyService } from '../services/propertyService';
import { CheckInFormData, CheckInData } from '../types/checkin';
import { Booking } from '../types/booking';
import { useNotification } from '../components/NotificationContainer';
import { STR, langFromCode, type Lang } from '../components/checkin/checkinStrings';

interface CheckInPageProps {
  language?: string;
}

const HERO_IMG = 'https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=1000&q=55';
const C = {
  pine: '#1f3a30',
  card: '#fffdf9',
  page: '#e7e2d6',
  cream: '#f3eedf',
  sand: '#faf6ec',
  borderSubtle: '#ece3d2',
  muted: '#9a8e78',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtRange = (ci?: string, co?: string): string => {
  const a = (ci || '').split('-');
  const b = (co || '').split('-');
  if (a.length !== 3 || b.length !== 3) return '';
  const d1 = +a[2], m1 = +a[1] - 1, d2 = +b[2], m2 = +b[1] - 1, y = b[0];
  return m1 === m2 ? `${d1}–${d2} ${MONTHS[m2]} ${y}` : `${d1} ${MONTHS[m1]} – ${d2} ${MONTHS[m2]} ${y}`;
};

export const CheckInPage: React.FC<CheckInPageProps> = ({ language = 'en' }) => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { showSuccess, showError } = useNotification();

  const [lang, setLang] = useState<Lang>(langFromCode(language));
  const [booking, setBooking] = useState<Booking | null>(null);
  const [propertyName, setPropertyName] = useState<string>('');
  const [existingCheckIn, setExistingCheckIn] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const t = STR[lang];

  const loadBookingData = useCallback(async () => {
    if (!bookingId) {
      setError('invalid');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const bookingData = await bookingService.getBookingById(bookingId);
      if (!bookingData) {
        setError('notfound');
        setLoading(false);
        return;
      }
      setBooking(bookingData);

      if (bookingData.propertyId) {
        try {
          const property = await propertyService.getPropertyById(bookingData.propertyId);
          if (property?.name) setPropertyName(property.name);
        } catch { /* non-fatal */ }
      }

      const checkInData = await checkInService.getCheckInDataByBookingId(bookingId);
      setExistingCheckIn(checkInData);
    } catch (e) {
      console.error('Error loading booking data:', e);
      setError('notfound');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { if (bookingId) loadBookingData(); }, [bookingId, loadBookingData]);

  const handleFormSubmit = async (formData: CheckInFormData) => {
    if (!bookingId) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      const result = existingCheckIn
        ? await checkInService.updateCheckInData(existingCheckIn.id, formData)
        : await checkInService.createCheckInData(bookingId, formData);
      if (result) {
        setExistingCheckIn(result);
        setSuccess(true);
        if (!existingCheckIn) showSuccess('Check-in Complete!', 'Your check-in has been submitted.');
      } else {
        throw new Error('Failed to save check-in data');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to submit check-in form. Please try again.';
      setSubmitError(msg);
      showError('Submission Failed', msg);
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const getInitialFormData = (b: Booking, ci?: CheckInData | null): CheckInFormData => ({
    firstName: ci?.firstName || b.guestName?.split(' ')[0] || '',
    lastName: ci?.lastName || b.guestName?.split(' ').slice(1).join(' ') || '',
    email: ci?.email || b.contactEmail || '',
    phone: ci?.phone || b.contactPhone || '',
    dateOfBirth: ci?.dateOfBirth || '',
    nationality: ci?.nationality || '',
    idType: ci?.idType || 'passport',
    idNumber: ci?.idNumber || '',
    address: ci?.address || '',
    city: ci?.city || '',
    state: ci?.state || '',
    country: ci?.country || '',
    zipCode: ci?.zipCode || '',
    emergencyContactName: ci?.emergencyContactName || '',
    emergencyContactPhone: ci?.emergencyContactPhone || '',
    emergencyContactRelation: ci?.emergencyContactRelation || '',
    purposeOfVisit: ci?.purposeOfVisit || 'leisure',
    arrivalDate: ci?.arrivalDate || b.checkIn || '',
    departureDate: ci?.departureDate || b.checkOut || '',
    roomNumber: ci?.roomNumber || b.roomNo || '',
    numberOfGuests: ci?.numberOfGuests || b.noOfPax || 1,
    additionalGuests: ci?.additionalGuests || [],
    specialRequests: ci?.specialRequests || b.specialRequests || '',
    preferences: ci?.preferences || { wakeUpCall: false, newspaper: false, extraTowels: false, extraPillows: false, roomService: false, doNotDisturb: false },
    termsAccepted: ci?.termsAccepted || false,
    marketingConsent: ci?.marketingConsent || false,
  });

  const name = propertyName || 'Voyageur Nest';
  const chips = booking
    ? [
        booking.roomNo ? (lang === 'hi' ? `कमरा ${booking.roomNo}` : `Room ${booking.roomNo}`) : '',
        fmtRange(booking.checkIn, booking.checkOut),
        `${booking.noOfPax || 1} ${lang === 'hi' ? 'अतिथि' : 'guests'}`,
      ].filter(Boolean)
    : [];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-10" style={{ background: C.page }}>
        <div className="w-12 h-12 rounded-full animate-spin" style={{ border: `3px solid ${C.borderSubtle}`, borderTopColor: '#2f5446' }} />
        <div className="text-center">
          <div style={{ font: `600 21px 'Spectral','Noto Sans Devanagari',serif`, color: C.pine }}>{name}</div>
          <div style={{ font: `400 14px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.muted, marginTop: 7 }}>{t.loading}</div>
        </div>
      </div>
    );
  }

  // ── Error (booking not found / invalid link) ────────────────────────────────
  if (error === 'notfound' || error === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.page }}>
        <div className="w-full max-w-[460px] text-center" style={{ background: C.card, borderRadius: 16, boxShadow: '0 1px 3px rgba(60,45,20,.12)', padding: '40px 36px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f6ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={30} color="#a8553b" strokeWidth={1.9} />
          </div>
          <h1 style={{ margin: 0, font: `600 27px 'Spectral','Noto Sans Devanagari',serif`, color: C.pine }}>{t.err.title}</h1>
          <p style={{ margin: '12px auto 0', maxWidth: 380, font: `400 14.5px/1.55 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#6e6353' }}>{t.err.body}</p>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,253,249,.86),rgba(255,253,249,.97)),url('${HERO_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="text-center max-w-[540px] px-6">
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: C.pine, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 10px 30px rgba(31,58,48,.3)' }}>
            <Check size={44} color={C.cream} strokeWidth={2.4} />
          </div>
          <h1 style={{ margin: 0, font: `600 44px/1.05 'Spectral','Noto Sans Devanagari',serif`, color: C.pine }}>{t.suc.title}</h1>
          <p style={{ margin: '18px auto 0', maxWidth: 440, font: `400 16px/1.6 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#6e6353' }}>{t.suc.body}</p>
          {booking && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginTop: 26, background: '#fff', border: `1px solid ${C.borderSubtle}`, borderRadius: 13, padding: '13px 22px', boxShadow: '0 1px 3px rgba(60,45,20,.06)' }}>
              <span style={{ font: `500 13px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.muted }}>{t.suc.ref}</span>
              <span style={{ width: 1, height: 18, background: C.borderSubtle }} />
              <span style={{ font: `600 16px 'Spectral','Noto Sans Devanagari',serif`, color: C.pine }}>
                {booking.folioNumber ? `#${booking.folioNumber}` : ''}{booking.roomNo ? ` · ${lang === 'hi' ? 'कमरा' : 'Room'} ${booking.roomNo}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Form (+ already-completed banner) ───────────────────────────────────────
  const heroAside = (
    <aside
      className="hidden lg:flex flex-col lg:sticky lg:top-0 lg:h-screen"
      style={{ flex: 'none', width: 404, color: C.cream, padding: '38px 36px', backgroundImage: `linear-gradient(180deg,rgba(24,46,38,.62),rgba(20,38,31,.92)),url('${HERO_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="flex items-center gap-[11px]">
        <div style={{ width: 34, height: 34, border: '1.5px solid rgba(243,238,223,.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mountain size={17} color={C.cream} strokeWidth={1.6} />
        </div>
        <span style={{ font: `500 12px/1 'Hanken Grotesk',sans-serif`, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(243,238,223,.85)' }}>Manali · HP</span>
      </div>
      <div style={{ paddingTop: 30 }}>
        <div style={{ font: `400 13px/1 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(243,238,223,.78)', marginBottom: 10 }}>{t.subtitle}</div>
        <h1 style={{ margin: 0, font: `600 52px/1.02 'Spectral','Noto Sans Devanagari',serif`, letterSpacing: '-.01em' }}>{name}</h1>
      </div>
      <div className="flex flex-wrap gap-2" style={{ marginTop: 22 }}>
        {chips.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(243,238,223,.13)', border: '1px solid rgba(243,238,223,.25)', borderRadius: 999, padding: '7px 13px', font: `500 12.5px/1 'Hanken Grotesk','Noto Sans Devanagari',sans-serif` }}>{c}</span>
        ))}
      </div>
      <div className="flex items-center gap-2" style={{ marginTop: 'auto', paddingTop: 26, color: 'rgba(243,238,223,.7)' }}>
        <Lock size={14} />
        <span style={{ font: `500 12px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif` }}>{t.secure}</span>
      </div>
    </aside>
  );

  const mobileHero = (
    <div className="lg:hidden" style={{ color: C.cream, padding: '20px 20px 22px', backgroundImage: `linear-gradient(180deg,rgba(24,46,38,.5),rgba(20,38,31,.9)),url('${HERO_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <span style={{ font: `500 11px/1 'Hanken Grotesk',sans-serif`, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,238,223,.85)' }}>Manali · HP</span>
      <h1 style={{ margin: '14px 0 0', font: `600 33px/1.05 'Spectral','Noto Sans Devanagari',serif` }}>{name}</h1>
      <div style={{ font: `400 12px/1 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(243,238,223,.8)', marginTop: 7 }}>{t.subtitle}</div>
      <div className="flex flex-wrap gap-[7px]" style={{ marginTop: 14 }}>
        {chips.map((c, i) => (
          <span key={i} style={{ background: 'rgba(243,238,223,.15)', border: '1px solid rgba(243,238,223,.25)', borderRadius: 999, padding: '6px 11px', font: `500 11.5px/1 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.cream }}>{c}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: C.page }}>
      <div className="lg:flex lg:min-h-screen" style={{ background: C.card }}>
        {heroAside}
        <main className="flex-1 min-w-0">
          {mobileHero}
          {submitError && (
            <div className="flex gap-[11px] items-center" style={{ background: '#f9ece6', borderBottom: '1px solid #eccbbb', padding: '14px 20px' }}>
              <AlertTriangle size={18} color="#a8431f" style={{ flex: 'none' }} />
              <span style={{ font: `600 14px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#8c3a1c' }}>{submitError}</span>
            </div>
          )}
          {existingCheckIn && (
            <div className="flex gap-[13px] items-start" style={{ background: '#eef3ec', borderBottom: '1px solid #d8e2d4', padding: '16px 20px' }}>
              <span style={{ flex: 'none', width: 32, height: 32, borderRadius: '50%', background: '#2f5446', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Check size={17} color={C.cream} strokeWidth={2.4} />
              </span>
              <div>
                <div style={{ font: `600 15px/1.35 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: C.pine }}>{t.alr.title}</div>
                <div style={{ font: `400 13px/1.45 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#4d5f51', marginTop: 4 }}>{t.alr.body}</div>
              </div>
            </div>
          )}
          {booking && (
            <CheckInForm
              language={lang}
              onLanguageChange={(code) => setLang(langFromCode(code))}
              onSubmit={handleFormSubmit}
              initialData={getInitialFormData(booking, existingCheckIn)}
              isSubmitting={submitting}
              bookingId={bookingId}
              bookingRef={booking.folioNumber || undefined}
              isUpdate={!!existingCheckIn}
              externalErrorHandling={true}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default CheckInPage;
