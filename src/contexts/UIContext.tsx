import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type NotificationType = 'error' | 'info' | 'success';

interface UIContextData {
  notification: { message: string; type: NotificationType } | null;
  confirmModal: { isOpen: boolean; title: string; message: string; onConfirm: () => void } | null;
  showNotification: (message: string, type?: NotificationType) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;
}

const UIContext = createContext<UIContextData>({} as UIContextData);

export function UIProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  }, []);

  const closeConfirm = useCallback(() => setConfirmModal(null), []);

  return (
    <UIContext.Provider value={{ notification, confirmModal, showNotification, showConfirm, closeConfirm }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
