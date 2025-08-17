import React, { useEffect, useState } from 'react';
import { notificationService, type NotificationConfig, type NotificationType } from '../services/notificationService';

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'email_parsed', label: 'New Email Parsed (OTA)' },
  { value: 'booking_event', label: 'Booking Events (New/Modify/Cancel)' },
  { value: 'expense_event', label: 'Expense Events (Approve/Reject)' },
  { value: 'budget_event', label: 'Budget Events (Create/Update/Delete)' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'alert', label: 'Alerts' },
  { value: 'update', label: 'Other Updates' },
];

export default function NotificationSettings({ propertyId }: { propertyId: string }) {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const list = await notificationService.getNotificationConfigs(propertyId);
      setConfigs(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [propertyId]);

  const ensureConfig = async (type: NotificationType) => {
    const exists = configs.find(c => c.type === type);
    if (exists) return exists;
    const created = await notificationService.createNotificationConfig({
      propertyId,
      platform: 'all',
      type,
      enabled: true,
      schedule: null as any,
      conditions: null as any,
      channels: { inApp: true, email: false, sms: false },
      message: { title: 'Notification', body: 'An event occurred', priority: 'medium' }
    });
    setConfigs(prev => [created, ...prev]);
    return created;
  };

  const toggleChannel = async (cfg: NotificationConfig, key: 'inApp'|'email'|'sms') => {
    const next = { ...cfg.channels, [key]: !cfg.channels[key] };
    const updated = await notificationService.updateNotificationConfig(cfg.id, { channels: next });
    setConfigs(prev => prev.map(c => c.id === cfg.id ? updated : c));
  };

  const toggleEnabled = async (cfg: NotificationConfig) => {
    const updated = await notificationService.updateNotificationConfig(cfg.id, { enabled: !cfg.enabled });
    setConfigs(prev => prev.map(c => c.id === cfg.id ? updated : c));
  };

  const onEnableClick = async (type: NotificationType, cfg?: NotificationConfig) => {
    if (!cfg) {
      await ensureConfig(type);
      return;
    }
    await toggleEnabled(cfg);
  };

  const onChannelClick = async (type: NotificationType, key: 'inApp'|'email'|'sms', cfg?: NotificationConfig) => {
    let c = cfg;
    if (!c) {
      c = await ensureConfig(type);
      // If creating a fresh config and user clicked In‑app, it is already true by default; don't flip it off.
      if (key === 'inApp' && c.channels.inApp) return;
    }
    await toggleChannel(c, key);
  };

  // Templates are fixed by code/db; only allow enable/disable and channels.

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Notification Settings</h3>
        <p className="text-sm text-gray-600">Control channels and templates per notification type</p>
      </div>
      <div className="p-4 space-y-4">
        {NOTIFICATION_TYPES.map(({ value, label }) => {
          const cfg = configs.find(c => c.type === value);
          const title = cfg?.message?.title || '';
          const body = cfg?.message?.body || '';
          return (
            <div key={value} className="border rounded-md">
              <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                <div className="font-medium">{label}</div>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-2 py-1 text-xs rounded border ${cfg?.enabled ? 'bg-green-50 text-green-700' : ''}`}
                    onClick={() => onEnableClick(value, cfg)}
                  >{cfg?.enabled ? 'Enabled' : 'Enable'}</button>
                  <button
                    className={`px-2 py-1 text-xs rounded border ${cfg?.channels?.inApp ? 'bg-blue-50 text-blue-700' : ''}`}
                    onClick={() => onChannelClick(value, 'inApp', cfg)}
                  >In‑app</button>
                  <button
                    className={`px-2 py-1 text-xs rounded border ${cfg?.channels?.email ? 'bg-blue-50 text-blue-700' : ''}`}
                    onClick={() => onChannelClick(value, 'email', cfg)}
                  >Email</button>
                  <button
                    className={`px-2 py-1 text-xs rounded border ${cfg?.channels?.sms ? 'bg-blue-50 text-blue-700' : ''}`}
                    onClick={() => onChannelClick(value, 'sms', cfg)}
                  >SMS</button>
                </div>
              </div>
              <div className="p-3 text-xs text-gray-500">This notification uses default templates.</div>
            </div>
          );
        })}
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
      </div>
    </div>
  );
}


