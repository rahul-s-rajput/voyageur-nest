import React, { useEffect, useState } from 'react';
import { AlertTriangle, GitMerge, Loader2, X } from 'lucide-react';
import { GuestProfileService } from '../services/guestProfileService';
import type { DuplicateCandidate, GuestProfile, MergeResult } from '../types/guest';

interface GuestDuplicateAlertProps {
  profile: GuestProfile;
  onClose: () => void;
  onMerged?: (result: MergeResult) => void;
}

export const GuestDuplicateAlert: React.FC<GuestDuplicateAlertProps> = ({ profile, onClose, onMerged }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const dups = await GuestProfileService.findDuplicatesForProfile(profile.id);
        if (!active) return;
        setCandidates(dups);
        const initial: Record<string, boolean> = {};
        dups.forEach(d => { if (d.score >= 0.7) initial[d.profile.id] = true; });
        setSelected(initial);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load duplicates');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [profile.id]);

  const toggleAll = (value: boolean) => {
    const all: Record<string, boolean> = {};
    candidates.forEach(c => { all[c.profile.id] = value; });
    setSelected(all);
  };

  const doMerge = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id);
    if (!ids.length) return;
    try {
      setMerging(true);
      const res = await GuestProfileService.mergeGuestProfiles(profile.id, ids);
      onMerged?.(res);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to merge profiles');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-amber-600 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Possible Duplicates for {profile.name}</h3>
              <p className="text-amber-100 text-sm">Review and merge duplicate guest profiles</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-amber-500 rounded-md hover:bg-amber-400" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-amber-700">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Finding duplicates…</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-10">
              <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No likely duplicates found for this guest.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Select profiles to merge into <span className="font-semibold">{profile.name}</span>.</p>
                <div className="flex items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      onChange={(e) => toggleAll(e.target.checked)}
                      checked={candidates.every(c => selected[c.profile.id])}
                    />
                    <span>Select all</span>
                  </label>
                </div>
              </div>

              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                {candidates.map(c => (
                  <li key={c.profile.id} className="p-4 flex items-start gap-4">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!selected[c.profile.id]}
                      onChange={(e) => setSelected(prev => ({ ...prev, [c.profile.id]: e.target.checked }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{c.profile.name}</p>
                          <div className="text-sm text-gray-600 space-x-3">
                            {c.profile.email && <span>{c.profile.email}</span>}
                            {c.profile.phone && <span>{c.profile.phone}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.score >= 0.8 ? 'bg-red-100 text-red-800' : c.score >= 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Score {(c.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {c.reasons?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.reasons.map((r, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Primary profile: <span className="font-medium">{profile.name}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              disabled={merging || !Object.values(selected).some(Boolean)}
              onClick={doMerge}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                merging || !Object.values(selected).some(Boolean) ? 'bg-amber-300' : 'bg-amber-600 hover:bg-amber-700'
              }`}
              title="Merge selected into primary"
            >
              {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
              <span>{merging ? 'Merging…' : 'Merge Selected'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
