import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PreviewModeContextType {
  isPreviewMode: boolean;
  enablePreviewMode: () => void;
  disablePreviewMode: () => void;
}

const PreviewModeContext = createContext<PreviewModeContextType | undefined>(undefined);

const PREVIEW_MODE_KEY = 'app:preview_mode';

export function PreviewModeProvider({ children }: { children: ReactNode }) {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(() => {
    // Only allow preview mode in development/preview environments
    const isDevEnv =
      window.location.hostname.includes('lovableproject.com') ||
      window.location.hostname.includes('lovable.app') ||
      window.location.hostname === 'localhost';
    
    if (!isDevEnv) return false;
    
    // Check URL param first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true') {
      localStorage.setItem(PREVIEW_MODE_KEY, 'true');
      return true;
    }
    
    return localStorage.getItem(PREVIEW_MODE_KEY) === 'true';
  });

  // Listen for URL changes to detect ?preview=true
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true' && !isPreviewMode) {
      localStorage.setItem(PREVIEW_MODE_KEY, 'true');
      setIsPreviewMode(true);
    }
  }, []);

  function enablePreviewMode() {
    localStorage.setItem(PREVIEW_MODE_KEY, 'true');
    setIsPreviewMode(true);
  }

  function disablePreviewMode() {
    localStorage.removeItem(PREVIEW_MODE_KEY);
    setIsPreviewMode(false);
  }

  return (
    <PreviewModeContext.Provider value={{ isPreviewMode, enablePreviewMode, disablePreviewMode }}>
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  const context = useContext(PreviewModeContext);
  if (context === undefined) {
    throw new Error('usePreviewMode must be used within a PreviewModeProvider');
  }
  return context;
}
