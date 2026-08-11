import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrafts } from '../context/DraftsContext';

export function useUnsavedChanges({
  formType,
  formLabel,
  getFormTitle,
  getFormData,
  targetPath,
  onSaveForm
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState(null);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const { saveDraft, clearDraft } = useDrafts();
  const navigate = useNavigate();

  // Handle attempted navigation or cancel action
  const confirmExit = useCallback((targetUrl) => {
    if (isDirty) {
      setPendingNavigationPath(targetUrl || -1);
      setShowExitModal(true);
      return false; // Navigation blocked
    }
    return true; // Safe to navigate
  }, [isDirty]);

  // Handle browser tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in this form. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle link clicks (breadcrumbs, navbar, links) & browser back button when form is dirty
  useEffect(() => {
    if (!isDirty) return;

    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const url = new URL(anchor.href, window.location.origin);
          if (url.pathname !== window.location.pathname) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            confirmExit(url.pathname + url.search);
          }
        } catch (err) {
          // ignore invalid URLs
        }
      }
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      confirmExit(-1);
    };

    window.addEventListener('click', handleGlobalClick, true);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty, confirmExit]);

  // Execute actual navigation
  const executeNavigation = useCallback((path) => {
    if (path === -1) {
      navigate(-1);
    } else if (path) {
      navigate(path);
    }
  }, [navigate]);

  // User clicked "Save Form" in exit modal
  const handleSaveAndExit = async () => {
    setShowExitModal(false);
    if (onSaveForm) {
      const ok = await onSaveForm();
      if (ok) {
        if (currentDraftId) clearDraft(currentDraftId);
        setIsDirty(false);
        if (pendingNavigationPath) executeNavigation(pendingNavigationPath);
      }
    }
  };

  // User clicked "Save as Draft" in exit modal or form action bar
  const handleSaveDraft = (overrideNavigate = true) => {
    const data = getFormData ? getFormData() : {};
    const title = getFormTitle ? getFormTitle(data) : `${formLabel || formType} Draft`;
    
    const savedId = saveDraft({
      formType,
      formLabel,
      title,
      data,
      targetPath: targetPath || window.location.pathname,
      draftId: currentDraftId
    });

    setCurrentDraftId(savedId);
    setIsDirty(false);
    setShowExitModal(false);

    if (overrideNavigate) {
      if (pendingNavigationPath) {
        executeNavigation(pendingNavigationPath);
      } else {
        const listPath = targetPath ? targetPath.replace(/\/new$/, '') : -1;
        executeNavigation(listPath);
      }
    }
    return savedId;
  };

  // User clicked "Discard & Exit" in exit modal
  const handleDiscardAndExit = () => {
    if (currentDraftId) {
      clearDraft(currentDraftId);
      setCurrentDraftId(null);
    }
    setIsDirty(false);
    setShowExitModal(false);
    if (pendingNavigationPath) {
      executeNavigation(pendingNavigationPath);
    } else {
      const listPath = targetPath ? targetPath.replace(/\/new$/, '') : -1;
      executeNavigation(listPath);
    }
  };

  // User clicked "Keep Editing"
  const handleCancelExit = () => {
    setShowExitModal(false);
    setPendingNavigationPath(null);
  };

  return {
    isDirty,
    setIsDirty,
    showExitModal,
    confirmExit,
    handleSaveAndExit,
    handleSaveDraft,
    handleDiscardAndExit,
    handleCancelExit,
    currentDraftId,
    setCurrentDraftId,
    clearDraft
  };
}

export default useUnsavedChanges;
