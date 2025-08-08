import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Settings,
  History,
  X
} from 'lucide-react';
import { reminderService, ReminderRule, ReminderExecution } from '../../services/reminderService';
import { toast } from 'react-hot-toast';

interface ReminderManagementProps {
  propertyId: string;
}

interface ReminderFormData {
  name: string;
  description: string;
  platform: 'booking.com' | 'gommt' | 'all';
  enabled: boolean;
  triggerType: 'schedule' | 'condition' | 'event';
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
  scheduleTime?: string;
  scheduleDays?: number[];
  conditionType?: 'pending_updates' | 'time_since_update' | 'upcoming_deadline' | 'booking_count';
  conditionOperator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  conditionValue?: number;
  conditionUnit?: 'minutes' | 'hours' | 'days';
  actionType: 'notification' | 'checklist' | 'bulk_format' | 'email' | 'sms';
  notificationTitle?: string;
  notificationMessage?: string;
  notificationPriority?: 'low' | 'medium' | 'high' | 'urgent';
  notificationChannels?: string[];
}

const defaultFormData: ReminderFormData = {
  name: '',
  description: '',
  platform: 'all',
  enabled: true,
  triggerType: 'schedule',
  scheduleFrequency: 'daily',
  scheduleTime: '09:00',
  scheduleDays: [1, 2, 3, 4, 5],
  actionType: 'notification',
  notificationPriority: 'medium',
  notificationChannels: ['in-app']
};

export const ReminderManagement: React.FC<ReminderManagementProps> = ({ propertyId }) => {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [executions, setExecutions] = useState<ReminderExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [formData, setFormData] = useState<ReminderFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('rules');

  useEffect(() => {
    loadRules();
  }, [propertyId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rulesData = await reminderService.getReminderRules(propertyId);
      setRules(rulesData);
    } catch (error) {
      console.error('Error loading reminder rules:', error);
      toast.error('Failed to load reminder rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: ReminderRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      platform: rule.platform,
      enabled: rule.enabled,
      triggerType: rule.trigger.type,
      scheduleFrequency: rule.trigger.schedule?.frequency,
      scheduleTime: rule.trigger.schedule?.time,
      scheduleDays: rule.trigger.schedule?.days,
      conditionType: rule.trigger.condition?.type,
      conditionOperator: rule.trigger.condition?.operator,
      conditionValue: rule.trigger.condition?.value,
      conditionUnit: rule.trigger.condition?.unit,
      actionType: rule.action.type,
      notificationTitle: rule.action.notification?.title,
      notificationMessage: rule.action.notification?.message,
      notificationPriority: rule.action.notification?.priority,
      notificationChannels: rule.action.notification?.channels
    });
    setIsDialogOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      const ruleData = {
        propertyId,
        name: formData.name,
        description: formData.description,
        platform: formData.platform,
        enabled: formData.enabled,
        trigger: {
          type: formData.triggerType,
          ...(formData.triggerType === 'schedule' && {
            schedule: {
              frequency: formData.scheduleFrequency!,
              time: formData.scheduleTime!,
              days: formData.scheduleDays,
              timezone: 'UTC'
            }
          }),
          ...(formData.triggerType === 'condition' && {
            condition: {
              type: formData.conditionType!,
              operator: formData.conditionOperator!,
              value: formData.conditionValue!,
              unit: formData.conditionUnit
            }
          })
        },
        action: {
          type: formData.actionType,
          ...(formData.actionType === 'notification' && {
            notification: {
              title: formData.notificationTitle!,
              message: formData.notificationMessage!,
              priority: formData.notificationPriority!,
              channels: formData.notificationChannels!
            }
          })
        }
      };

      if (editingRule) {
        await reminderService.updateReminderRule(editingRule.id, ruleData);
        toast.success('Reminder rule updated successfully');
      } else {
        await reminderService.createReminderRule(ruleData);
        toast.success('Reminder rule created successfully');
      }

      setIsDialogOpen(false);
      loadRules();
    } catch (error) {
      console.error('Error saving reminder rule:', error);
      toast.error('Failed to save reminder rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this reminder rule?')) return;

    try {
      await reminderService.deleteReminderRule(ruleId);
      toast.success('Reminder rule deleted successfully');
      loadRules();
    } catch (error) {
      console.error('Error deleting reminder rule:', error);
      toast.error('Failed to delete reminder rule');
    }
  };

  const handleToggleRule = async (rule: ReminderRule) => {
    try {
      await reminderService.updateReminderRule(rule.id, { enabled: !rule.enabled });
      toast.success(`Reminder rule ${rule.enabled ? 'disabled' : 'enabled'}`);
      loadRules();
    } catch (error) {
      console.error('Error toggling reminder rule:', error);
      toast.error('Failed to toggle reminder rule');
    }
  };

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case 'booking.com': return 'bg-blue-100 text-blue-800';
      case 'gommt': return 'bg-green-100 text-green-800';
      case 'all': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTriggerDescription = (rule: ReminderRule) => {
    if (rule.trigger.type === 'schedule' && rule.trigger.schedule) {
      const schedule = rule.trigger.schedule;
      const days = schedule.days?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
      return `${schedule.frequency} at ${schedule.time}${days ? ` on ${days}` : ''}`;
    }
    
    if (rule.trigger.type === 'condition' && rule.trigger.condition) {
      const condition = rule.trigger.condition;
      return `When ${condition.type.replace('_', ' ')} ${condition.operator} ${condition.value}${condition.unit ? ` ${condition.unit}` : ''}`;
    }
    
    return rule.trigger.type;
  };

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reminder Management</h2>
          <p className="text-gray-600">Automate notifications and actions for manual updates</p>
        </div>
        <button 
          onClick={handleCreateRule} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Reminder
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-4 w-4" />
            Rules
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="h-4 w-4" />
            History
          </button>
        </nav>
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-4 mt-6">
          {rules.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reminder rules</h3>
                <p className="text-gray-600 mb-4">Create your first reminder rule to automate notifications and actions.</p>
                <button 
                  onClick={handleCreateRule}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create First Reminder
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformBadgeColor(rule.platform)}`}>
                            {rule.platform}
                          </span>
                          {rule.action.notification && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeColor(rule.action.notification.priority)}`}>
                              {rule.action.notification.priority}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              rule.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rule.enabled ? "Active" : "Inactive"}
                            </span>
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={() => handleToggleRule(rule)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{rule.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTriggerDescription(rule)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Bell className="h-4 w-4" />
                            {rule.action.type}
                          </div>
                          {rule.lastTriggered && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Last: {new Date(rule.lastTriggered).toLocaleDateString()}
                            </div>
                          )}
                          {rule.nextScheduled && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Next: {new Date(rule.nextScheduled).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <p className="text-gray-600">Execution history will be displayed here.</p>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingRule ? 'Edit Reminder Rule' : 'Create Reminder Rule'}
                  </h3>
                  <button
                    onClick={() => setIsDialogOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter rule name"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="platform" className="block text-sm font-medium text-gray-700">Platform</label>
                      <select
                        id="platform"
                        value={formData.platform}
                        onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="all">All Platforms</option>
                        <option value="booking.com">Booking.com</option>
                        <option value="gommt">GoMMT</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter rule description"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trigger Type</label>
                    <select
                      value={formData.triggerType}
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as any })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="schedule">Schedule</option>
                      <option value="condition">Condition</option>
                      <option value="event">Event</option>
                    </select>
                  </div>

                  {formData.triggerType === 'schedule' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Frequency</label>
                          <select
                            value={formData.scheduleFrequency}
                            onChange={(e) => setFormData({ ...formData, scheduleFrequency: e.target.value as any })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Time</label>
                          <input
                            type="time"
                            value={formData.scheduleTime}
                            onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      {formData.scheduleFrequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Days of Week</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {dayOptions.map((day) => (
                              <label key={day.value} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={formData.scheduleDays?.includes(day.value) || false}
                                  onChange={(e) => {
                                    const days = formData.scheduleDays || [];
                                    if (e.target.checked) {
                                      setFormData({ ...formData, scheduleDays: [...days, day.value] });
                                    } else {
                                      setFormData({ ...formData, scheduleDays: days.filter(d => d !== day.value) });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.triggerType === 'condition' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Condition Type</label>
                        <select
                          value={formData.conditionType}
                          onChange={(e) => setFormData({ ...formData, conditionType: e.target.value as any })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="pending_updates">Pending Updates</option>
                          <option value="time_since_update">Time Since Update</option>
                          <option value="upcoming_deadline">Upcoming Deadline</option>
                          <option value="booking_count">Booking Count</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Operator</label>
                          <select
                            value={formData.conditionOperator}
                            onChange={(e) => setFormData({ ...formData, conditionOperator: e.target.value as any })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="gt">Greater than</option>
                            <option value="gte">Greater than or equal</option>
                            <option value="lt">Less than</option>
                            <option value="lte">Less than or equal</option>
                            <option value="eq">Equal to</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Value</label>
                          <input
                            type="number"
                            value={formData.conditionValue || ''}
                            onChange={(e) => setFormData({ ...formData, conditionValue: parseInt(e.target.value) })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit</label>
                          <select
                            value={formData.conditionUnit}
                            onChange={(e) => setFormData({ ...formData, conditionUnit: e.target.value as any })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action Type</label>
                    <select
                      value={formData.actionType}
                      onChange={(e) => setFormData({ ...formData, actionType: e.target.value as any })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="notification">Notification</option>
                      <option value="checklist">Generate Checklist</option>
                      <option value="bulk_format">Bulk Format</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>

                  {formData.actionType === 'notification' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                          type="text"
                          value={formData.notificationTitle || ''}
                          onChange={(e) => setFormData({ ...formData, notificationTitle: e.target.value })}
                          placeholder="Notification title"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                          value={formData.notificationMessage || ''}
                          onChange={(e) => setFormData({ ...formData, notificationMessage: e.target.value })}
                          placeholder="Notification message"
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <select
                          value={formData.notificationPriority}
                          onChange={(e) => setFormData({ ...formData, notificationPriority: e.target.value as any })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-700">Enable this rule</label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {editingRule ? 'Update' : 'Create'} Rule
                </button>
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};