import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    return {
      pendingUserCount: 0,
      setPendingUserCount: () => {},
      bugReportCount: 0,
      setBugReportCount: () => {},
      openPendingUsersModal: null,
      setOpenPendingUsersModal: () => {},
      openManageUsersModal: null,
      setOpenManageUsersModal: () => {},
      openSystemStatusModal: null,
      setOpenSystemStatusModal: () => {},
      openManagePermissionsModal: null,
      setOpenManagePermissionsModal: () => {},
      openBugReportsModal: null,
      setOpenBugReportsModal: () => {}
    };
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [bugReportCount, setBugReportCount] = useState(0);
  const [openPendingUsersModal, setOpenPendingUsersModal] = useState(null);
  const [openManageUsersModal, setOpenManageUsersModal] = useState(null);
  const [openSystemStatusModal, setOpenSystemStatusModal] = useState(null);
  const [openManagePermissionsModal, setOpenManagePermissionsModal] = useState(null);
  const [openBugReportsModal, setOpenBugReportsModal] = useState(null);

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

  const handleOpenManagePermissions = useCallback(() => {
    if (openManagePermissionsModal) {
      openManagePermissionsModal();
    }
  }, [openManagePermissionsModal]);

  const handleOpenBugReports = useCallback(() => {
    if (openBugReportsModal) {
      openBugReportsModal();
    }
  }, [openBugReportsModal]);

  const value = {
    pendingUserCount,
    setPendingUserCount,
    bugReportCount,
    setBugReportCount,
    openPendingUsersModal: handleOpenPendingUsers,
    setOpenPendingUsersModal,
    openManageUsersModal: handleOpenManageUsers,
    setOpenManageUsersModal,
    openSystemStatusModal: handleOpenSystemStatus,
    setOpenSystemStatusModal,
    openManagePermissionsModal: handleOpenManagePermissions,
    setOpenManagePermissionsModal,
    openBugReportsModal: handleOpenBugReports,
    setOpenBugReportsModal
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
