import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    return {
      pendingUserCount: 0,
      setPendingUserCount: () => {},
      openPendingUsersModal: null,
      setOpenPendingUsersModal: () => {},
      openManageUsersModal: null,
      setOpenManageUsersModal: () => {},
      openSystemStatusModal: null,
      setOpenSystemStatusModal: () => {}
    };
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [openPendingUsersModal, setOpenPendingUsersModal] = useState(null);
  const [openManageUsersModal, setOpenManageUsersModal] = useState(null);
  const [openSystemStatusModal, setOpenSystemStatusModal] = useState(null);

  const handleOpenPendingUsers = useCallback(() => {
    if (openPendingUsersModal) {
      openPendingUsersModal();
    }
  }, [openPendingUsersModal]);

  const handleOpenManageUsers = useCallback(() => {
    if (openManageUsersModal) {
      openManageUsersModal();
    }
  }, [openManageUsersModal]);

  const handleOpenSystemStatus = useCallback(() => {
    if (openSystemStatusModal) {
      openSystemStatusModal();
    }
  }, [openSystemStatusModal]);

  const value = {
    pendingUserCount,
    setPendingUserCount,
    openPendingUsersModal: handleOpenPendingUsers,
    setOpenPendingUsersModal,
    openManageUsersModal: handleOpenManageUsers,
    setOpenManageUsersModal,
    openSystemStatusModal: handleOpenSystemStatus,
    setOpenSystemStatusModal
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
