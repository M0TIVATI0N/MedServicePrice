import { createContext, useContext, useState, ReactNode } from 'react';
import { ServiceOffer } from '../lib/api';

interface CompareContextType {
  compareItems: ServiceOffer[];
  toggleCompare: (offer: ServiceOffer) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<ServiceOffer[]>([]);

  const toggleCompare = (offer: ServiceOffer) => {
    setCompareItems((prev) => {
      const exists = prev.find((item) => item.clinic_id === offer.clinic_id && item.service_id === offer.service_id);
      if (exists) {
        return prev.filter((item) => item.clinic_id !== offer.clinic_id || item.service_id !== offer.service_id);
      }
      if (prev.length >= 3) {
        alert('Можно сравнить не более 3-х услуг.');
        return prev;
      }
      return [...prev, offer];
    });
  };

  const clearCompare = () => setCompareItems([]);

  return (
    <CompareContext.Provider value={{ compareItems, toggleCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
