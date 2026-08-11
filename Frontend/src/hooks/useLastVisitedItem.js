import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Custom hook to track, highlight, and scroll to the last visited item 
 * ONLY when navigating back directly from a detail page to a listing page.
 * Also preserves the active pagination page when returning.
 *
 * @param {string} pageKey Unique key for the entity/module (e.g. 'samples', 'pos', 'finishes', 'buyers')
 * @param {string|number|null} activeId Current active ID from useParams (null/undefined if on listing page)
 * @param {number} [currentPage] Active page number on listing page
 * @returns {object} { lastVisitedId, setHighlightRef, clearHighlight }
 */
export function useLastVisitedItem(pageKey, activeId, currentPage) {
  const storageKey = `last_visited_${pageKey}`;
  const pageStorageKey = `last_visited_page_${pageKey}`;
  
  const [lastVisitedId, setLastVisitedId] = useState(null);
  const highlightedRef = useRef(null);
  const scrolledRef = useRef(false);

  // 1. When on detail page (activeId present), save it to sessionStorage
  useEffect(() => {
    if (activeId && activeId !== 'new') {
      try {
        sessionStorage.setItem(storageKey, String(activeId));
      } catch (e) {
        console.error('Failed to save last visited item to sessionStorage:', e);
      }
    }
  }, [pageKey, activeId, storageKey]);

  // 2. When on listing page (!activeId), track currentPage in sessionStorage
  useEffect(() => {
    if (!activeId && currentPage !== undefined && currentPage !== null) {
      try {
        sessionStorage.setItem(pageStorageKey, String(currentPage));
      } catch (e) {
        // ignore
      }
    }
  }, [activeId, currentPage, pageStorageKey]);

  // 3. When on listing page (activeId absent), read lastVisitedId
  useEffect(() => {
    if (!activeId) {
      try {
        const savedId = sessionStorage.getItem(storageKey);
        if (savedId) {
          setLastVisitedId(savedId);
          scrolledRef.current = false;
        } else {
          setLastVisitedId(null);
        }
      } catch (e) {
        console.error('Failed to read last visited item from sessionStorage:', e);
      }
    } else {
      setLastVisitedId(null);
    }
  }, [pageKey, activeId, storageKey]);

  // 4. Auto-clear lastVisitedId state and sessionStorage after 3.5 seconds
  useEffect(() => {
    if (lastVisitedId && !activeId) {
      const timer = setTimeout(() => {
        setLastVisitedId(null);
        try {
          sessionStorage.removeItem(storageKey);
        } catch (e) {}
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [lastVisitedId, activeId, storageKey]);

  // 5. Callback ref to auto scroll highlighted element into view & consume storage
  const setHighlightRef = useCallback((node) => {
    if (node && !scrolledRef.current) {
      highlightedRef.current = node;
      scrolledRef.current = true;
      try {
        sessionStorage.removeItem(storageKey);
      } catch (e) {}
      setTimeout(() => {
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [storageKey]);

  // 6. Clear highlight manually
  const clearHighlight = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {}
    setLastVisitedId(null);
  }, [storageKey]);

  return {
    lastVisitedId,
    setHighlightRef,
    clearHighlight,
  };
}

export default useLastVisitedItem;
