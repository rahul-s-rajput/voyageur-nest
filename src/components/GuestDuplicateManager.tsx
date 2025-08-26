import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GitMerge, Loader2, X } from 'lucide-react';
import { GuestProfileService } from '../services/guestProfileService';
import type { DuplicateCandidate, GuestProfile } from '../types/guest';

interface Cluster {
  primary: GuestProfile;
  duplicates: DuplicateCandidate[];
}

interface GuestDuplicateManagerProps {
  onClose: () => void;
  onMerged?: () => void;
}

export const GuestDuplicateManager: React.FC<GuestDuplicateManagerProps> = ({ onClose, onMerged }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({});
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await GuestProfileService.findDuplicateClusters(500);
        if (!active) return;
        setClusters(res);
        // Preselect high-confidence duplicates (score >= 0.7) per cluster
        const initSel: Record<string, Record<string, boolean>> = {};
        res.forEach(({ primary, duplicates }) => {
          initSel[primary.id] = {};
          duplicates.forEach(d => {
            if (d.score >= 0.7) initSel[primary.id][d.profile.id] = true;
          });
        });
        setSelected(initSel);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load duplicate clusters');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const totalSelected = useMemo(() => {
    return Object.values(selected).reduce((sum, map) => sum + Object.values(map).filter(Boolean).length, 0);
  }, [selected]);

  const toggleCluster = (primaryId: string, value: boolean) => {
    const cluster = clusters.find(c => c.primary.id === primaryId);
    if (!cluster) return;
    setSelected(prev => ({
      ...prev,
      [primaryId]: Object.fromEntries(cluster.duplicates.map(d => [d.profile.id, value]))
    }));
  };

  const toggleAll = (value: boolean) => {
    const next: Record<string, Record<string, boolean>> = {};
    clusters.forEach(c => {
      next[c.primary.id] = Object.fromEntries(c.duplicates.map(d => [d.profile.id, value]));
    });
    setSelected(next);
  };

  const mergeCluster = async (primaryId: string) => {
    const cluster = clusters.find(c => c.primary.id === primaryId);
    if (!cluster) return;
    const ids = Object.entries(selected[primaryId] || {}).filter(([, v]) => v).map(([id]) => id);
    if (!ids.length) return;
    try {
      setMerging(true);
      await GuestProfileService.mergeGuestProfiles(primaryId, ids);
      // Remove merged duplicates from UI
      setClusters(prev => prev.map(c => c.primary.id === primaryId ? {
        ...c,
        duplicates: c.duplicates.filter(d => !ids.includes(d.profile.id))
      } : c).filter(c => c.duplicates.length > 0));
      setSelected(prev => ({
        ...prev,
        [primaryId]: {}
      }));
      onMerged?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to merge selected duplicates');
    } finally {
      setMerging(false);
    }
  };

  const mergeAllSelected = async () => {
    // Build worklist of clusters with selections
    const work = clusters
      .map(c => ({
        primaryId: c.primary.id,
        ids: Object.entries(selected[c.primary.id] || {}).filter(([, v]) => v).map(([id]) => id)
      }))
      .filter(item => item.ids.length > 0);
    if (!work.length) return;

    try {
      setMerging(true);
      setProgress({ done: 0, total: work.length });
      for (let i = 0; i < work.length; i++) {
        const item = work[i];
        await GuestProfileService.mergeGuestProfiles(item.primaryId, item.ids);
        setProgress({ done: i + 1, total: work.length });
        // Update UI incrementally
        setClusters(prev => prev.map(c => c.primary.id === item.primaryId ? ({
          ...c,
          duplicates: c.duplicates.filter(d => !item.ids.includes(d.profile.id))
        }) : c).filter(c => c.duplicates.length > 0));
        setSelected(prev => ({ ...prev, [item.primaryId]: {} }));
      }
      onMerged?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to merge all selected duplicates');
    } finally {
      setMerging(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Duplicate Profiles Manager</h3>
              <p className="text-amber-100 text-sm">Review detected clusters and merge duplicates safely</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-amber-500 rounded-md hover:bg-amber-400" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-amber-700">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Scanning for duplicate clusters…</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-10">
              <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No duplicate clusters detected.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Detected <span className="font-semibold">{clusters.length}</span> clusters. Selected <span className="font-semibold">{totalSelected}</span> profiles to merge.
                </p>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} />
                  <span>Select all in all clusters</span>
                </label>
              </div>

              <ul className="space-y-4">
                {clusters.map(({ primary, duplicates }) => (
                  <li key={primary.id} className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Primary: {primary.name}</p>
                        <div className="text-sm text-gray-600 space-x-3">
                          {primary.email && <span>{primary.email}</span>}
                          {primary.phone && <span>{primary.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => toggleCluster(primary.id, e.target.checked)}
                            checked={duplicates.length > 0 && duplicates.every(d => selected[primary.id]?.[d.profile.id])}
                          />
                          <span>Select all in cluster</span>
                        </label>
                        <button
                          disabled={merging || !(selected[primary.id] && Object.values(selected[primary.id]).some(Boolean))}
                          onClick={() => mergeCluster(primary.id)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white ${
                            merging || !(selected[primary.id] && Object.values(selected[primary.id]).some(Boolean))
                              ? 'bg-amber-300'
                              : 'bg-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
                          <span>Merge Selected in Cluster</span>
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {duplicates.map(d => (
                        <div key={d.profile.id} className="p-4 flex items-start gap-4">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={!!selected[primary.id]?.[d.profile.id]}
                            onChange={(e) => setSelected(prev => ({
                              ...prev,
                              [primary.id]: { ...(prev[primary.id] || {}), [d.profile.id]: e.target.checked }
                            }))}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{d.profile.name}</p>
                                <div className="text-sm text-gray-600 space-x-3">
                                  {d.profile.email && <span>{d.profile.email}</span>}
                                  {d.profile.phone && <span>{d.profile.phone}</span>}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                d.score >= 0.8 ? 'bg-red-100 text-red-800' : d.score >= 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                Score {(d.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            {d.reasons?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {d.reasons.map((r, i) => (
                                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {progress.total > 0 ? (
              <span>Merging {progress.done}/{progress.total} clusters…</span>
            ) : (
              <span>Select profiles to merge. Merges move bookings and delete duplicates.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
              disabled={merging}
            >
              Close
            </button>
            <button
              disabled={merging || totalSelected === 0}
              onClick={mergeAllSelected}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                merging || totalSelected === 0 ? 'bg-amber-300' : 'bg-amber-600 hover:bg-amber-700'
              }`}
              title="Merge all selected across clusters"
            >
              {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
              <span>{merging ? 'Merging…' : 'Merge All Selected'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
