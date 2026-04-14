import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'privacyMode';

/**
 * Hook centralizado para controle do modo de privacidade.
 * Garante sincronização em tempo real entre TODAS as páginas da SPA.
 * 
 * Usa useSyncExternalStore para reatividade consistente — quando o usuário
 * alterna o modo no Dashboard, PaymentsPage, ReportsPage ou PlansPage,
 * TODOS os componentes montados atualizam instantaneamente.
 */

let cachedValue: boolean | null = null;

function getSnapshot(): boolean {
  if (cachedValue === null) {
    cachedValue = localStorage.getItem(STORAGE_KEY) === 'true';
  }
  return cachedValue;
}

function subscribe(callback: () => void): () => void {
  // Listen for changes from OTHER tabs/windows
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedValue = e.newValue === 'true';
      callback();
    }
  };

  // Listen for changes from THIS tab (custom event)
  const handleLocal = () => {
    cachedValue = localStorage.getItem(STORAGE_KEY) === 'true';
    callback();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('privacyModeChanged', handleLocal);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('privacyModeChanged', handleLocal);
  };
}

export function usePrivacyMode(): [boolean, () => void] {
  const privacyMode = useSyncExternalStore(subscribe, getSnapshot);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    cachedValue = next;
    localStorage.setItem(STORAGE_KEY, String(next));
    // Notify ALL components in the same tab
    window.dispatchEvent(new Event('privacyModeChanged'));
  }, []);

  return [privacyMode, toggle];
}
