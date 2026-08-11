import React, { createContext, useContext, useState, useEffect } from 'react';

const DRAFTS_STORAGE_KEY = 'erp_form_drafts';

const DraftsContext = createContext(null);

export function DraftsProvider({ children }) {
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse drafts from localStorage', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.error('Failed to save drafts to localStorage', e);
    }
  }, [drafts]);

  const saveDraft = ({ formType, formLabel, title, data, targetPath, draftId }) => {
    const id = draftId || `draft_${formType}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    setDrafts(prev => {
      const existingIdx = prev.findIndex(d => d.id === id);
      const newDraftItem = {
        id,
        formType,
        formLabel: formLabel || formType.toUpperCase(),
        title: title || `${formLabel} Draft`,
        data,
        targetPath: targetPath || `/${formType}s/new`,
        updatedAt: timestamp
      };

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = newDraftItem;
        return next;
      } else {
        return [newDraftItem, ...prev];
      }
    });

    return id;
  };

  const deleteDraft = (draftId) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const getDrafts = (formType) => {
    if (!formType) return drafts;
    return drafts.filter(d => d.formType === formType);
  };

  const getDraft = (draftId) => {
    return drafts.find(d => d.id === draftId);
  };

  const clearDraft = (draftId) => {
    if (draftId) {
      deleteDraft(draftId);
    }
  };

  const draftCount = drafts.length;

  return (
    <DraftsContext.Provider
      value={{
        drafts,
        saveDraft,
        deleteDraft,
        getDrafts,
        getDraft,
        clearDraft,
        draftCount
      }}
    >
      {children}
    </DraftsContext.Provider>
  );
}

export function useDrafts() {
  const context = useContext(DraftsContext);
  if (!context) {
    throw new Error('useDrafts must be used within a DraftsProvider');
  }
  return context;
}
