import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notificationService, type Notification as AppNotification } from '../services/notificationService';
import Notification, { NotificationProps } from './Notification';

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationProps, 'id' | 'onClose'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<NotificationProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationProps = {
      ...notification,
      id,
      onClose: removeNotification
    };
    setNotifications(prev => [...prev, newNotification]);
  }, [removeNotification]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string) => {
    showNotification({ type: 'error', title, message });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    showNotification({ type: 'warning', title, message });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  const contextValue: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  // Global realtime subscription: show toast anywhere in the app when a notification row is inserted
  useEffect(() => {
    // NOTE: NotificationCenter already subscribes and shows browser notifications
    // We only need to show toasts here, not create another subscription
    // The subscription happens in NotificationCenter which is rendered in the header
    
    // Just ensure browser notification permission is requested
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch {
          // ignore
        }
      }
    }
    
    const mapPriorityToType = (n: AppNotification): NotificationProps['type'] => {
      if (n.priority === 'urgent') return 'error';
      if (n.priority === 'high') return 'warning';
      return 'info';
    };
    
    // Use a more robust singleton pattern
    const windowWithSubscription = window as any;
    
    // Create a unique key for this component instance
    const instanceKey = 'notificationContainer_' + Math.random().toString(36).substr(2, 9);
    
    // Track this instance
    if (!windowWithSubscription.__notificationContainerInstances) {
      windowWithSubscription.__notificationContainerInstances = new Set();
    }
    windowWithSubscription.__notificationContainerInstances.add(instanceKey);
    
    // Only the first instance should create the subscription
    if (windowWithSubscription.__notificationContainerInstances.size === 1) {
      console.log('[NotificationContainer] Creating global notification subscription');
      
      const unsubscribe = notificationService.subscribeToNotifications(undefined, (n) => {
        console.log('[NotificationContainer] Showing toast notification for:', n.id, n.title);
        showNotification({
          type: mapPriorityToType(n),
          title: n.title,
          message: n.message
        });
        
        // Also show browser notification since NotificationCenter is disabled
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(n.title, {
              body: n.message,
              icon: '/favicon.ico',
              tag: n.id
            });
          } catch (e) {
            console.warn('[NotificationContainer] Failed to show browser notification:', e);
          }
        }
      });
      
      windowWithSubscription.__notificationContainerUnsubscribe = unsubscribe;
    }
    
    return () => {
      // Remove this instance
      windowWithSubscription.__notificationContainerInstances.delete(instanceKey);
      
      // If this was the last instance, clean up the subscription
      if (windowWithSubscription.__notificationContainerInstances.size === 0) {
        console.log('[NotificationContainer] Removing global notification subscription');
        if (windowWithSubscription.__notificationContainerUnsubscribe) {
          windowWithSubscription.__notificationContainerUnsubscribe();
          delete windowWithSubscription.__notificationContainerUnsubscribe;
        }
      }
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <Notification key={notification.id} {...notification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;