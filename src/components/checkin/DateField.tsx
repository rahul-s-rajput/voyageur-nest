import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Lang } from './checkinStrings';

interface DateFieldProps {
  /** Value as YYYY-MM-DD (empty string = unset). */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  lang: Lang;
  /** Restrict selectable dates to today and earlier (for Date of Birth). */
  maxToday?: boolean;
}

const C = {
  pine: '#1f3a30',
  pineAccent: '#2f5446',
  border: '#e4dbca',
  borderSubtle: '#ece3d2',
  ink: '#26201a',
  label: '#5a4f40',
  muted: '#9a8e78',
  cream: '#f3eedf',
  card: '#fffdf9',
};

const MONTHS: Record<Lang, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
};
const WK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const STRINGS: Record<Lang, { clear: string; done: string }> = {
  en: { clear: 'Clear', done: 'Done' },
  hi: { clear: 'साफ़ करें', done: 'पूर्ण' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (v?: string): { y: number; m: number; d: number } | null => {
  if (!v) return null;
  const p = v.split('-');
  if (p.length !== 3) return null;
  const y = +p[0], m = +p[1] - 1, d = +p[2];
  if (!y || isNaN(m) || !d) return null;
  return { y, m, d };
};

export const DateField: React.FC<DateFieldProps> = ({ value, onChange, placeholder, lang, maxToday }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const sel = parse(value);
  const [view, setView] = useState(() => {
    if (sel) return { y: sel.y, m: sel.m };
    // Default view for a DOB: a couple of decades back so it's a short jump.
    return { y: today.getFullYear() - 25, m: today.getMonth() };
  });

  // Keep the view in sync when the value changes externally (e.g. form reset).
  useEffect(() => {
    if (sel) setView({ y: sel.y, m: sel.m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const currentYear = today.getFullYear();
  const years = useMemo(() => {
    const max = maxToday ? currentYear : currentYear + 5;
    const arr: number[] = [];
    for (let y = max; y >= currentYear - 120; y--) arr.push(y);
    return arr;
  }, [currentYear, maxToday]);

  const months = MONTHS[lang];
  const display = sel ? `${sel.d} ${months[sel.m]} ${sel.y}` : '';

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const isFuture = (d: number) => maxToday && new Date(view.y, view.m, d) > today;
  const isSelected = (d: number) => sel && sel.y === view.y && sel.m === view.m && sel.d === d;

  const step = (delta: number) => {
    let m = view.m + delta, y = view.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setView({ y, m });
  };

  const pick = (d: number) => {
    if (isFuture(d)) return;
    onChange(`${view.y}-${pad(view.m + 1)}-${pad(d)}`);
    setOpen(false);
  };

  const selSvg = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={open ? C.pineAccent : C.muted} strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );

  const calendar = (
    <div style={{ background: C.card, border: `1px solid ${C.borderSubtle}`, borderRadius: 16, boxShadow: '0 14px 38px rgba(60,45,20,.16)', padding: '16px 16px 14px' }}>
      {/* month / year + nav */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ position: 'relative', flex: 1 }}>
          <select
            value={view.m}
            onChange={(e) => setView(v => ({ ...v, m: +e.target.value }))}
            style={{ width: '100%', height: 36, padding: '0 28px 0 11px', appearance: 'none', border: `1px solid ${C.border}`, borderRadius: 9, background: '#fff', font: `600 13.5px 'Spectral','Noto Sans Devanagari',serif`, color: C.pine, cursor: 'pointer' }}
          >
            {months.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.muted }}>▾</span>
        </div>
        <div style={{ position: 'relative', width: 96 }}>
          <select
            value={view.y}
            onChange={(e) => setView(v => ({ ...v, y: +e.target.value }))}
            style={{ width: '100%', height: 36, padding: '0 24px 0 11px', appearance: 'none', border: `1px solid ${C.border}`, borderRadius: 9, background: '#fff', font: `600 13.5px 'Spectral',serif`, color: C.pine, cursor: 'pointer' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.muted }}>▾</span>
        </div>
        <button type="button" onClick={() => step(-1)} style={{ width: 32, height: 36, border: `1px solid ${C.borderSubtle}`, borderRadius: 9, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={15} color={C.label} /></button>
        <button type="button" onClick={() => step(1)} style={{ width: 32, height: 36, border: `1px solid ${C.borderSubtle}`, borderRadius: 9, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={15} color={C.label} /></button>
      </div>

      {/* weekday header */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {WK.map(d => <div key={d} style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 11px 'Hanken Grotesk',sans-serif`, color: '#b3a791' }}>{d}</div>)}
      </div>

      {/* days */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7,1fr)' }}>
        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`b${i}`} style={{ height: 38 }} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const future = isFuture(d);
          const selected = isSelected(d);
          return (
            <div key={d} style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={future}
                onClick={() => pick(d)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: future ? 'default' : 'pointer',
                  background: selected ? C.pine : 'transparent',
                  color: selected ? C.cream : future ? '#cdc3ad' : '#3a3329',
                  font: `${selected ? 600 : 500} 13px 'Hanken Grotesk',sans-serif`,
                }}
              >
                {d}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${C.borderSubtle}`, marginTop: 10, paddingTop: 12 }}>
        <span style={{ font: `600 12.5px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, color: '#7a6f5c' }}>{display}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => { onChange(''); }} style={{ height: 34, padding: '0 14px', border: `1px solid ${C.border}`, borderRadius: 9, background: '#fff', color: C.label, font: `600 12.5px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, cursor: 'pointer' }}>{STRINGS[lang].clear}</button>
          <button type="button" onClick={() => setOpen(false)} style={{ height: 34, padding: '0 18px', border: 'none', borderRadius: 9, background: C.pine, color: C.cream, font: `600 12.5px 'Hanken Grotesk','Noto Sans Devanagari',sans-serif`, cursor: 'pointer' }}>{STRINGS[lang].done}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="vn-field"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', color: display ? C.ink : C.muted, ...(open ? { borderColor: C.pineAccent, boxShadow: '0 0 0 3px rgba(47,84,70,.13)' } : {}) }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {display || placeholder || 'DD / MM / YYYY'}
        </span>
        {selSvg}
      </button>

      {open && (
        <>
          {/* mobile backdrop */}
          <div className="fixed inset-0 z-40 sm:hidden" style={{ background: 'rgba(31,46,38,.32)' }} onClick={() => setOpen(false)} />
          <div className="fixed inset-x-2 bottom-2 z-50 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:bottom-auto sm:mt-2 sm:w-[316px]">
            {calendar}
          </div>
        </>
      )}
    </div>
  );
};

export default DateField;
