'use client';

import { createContext, useContext, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { driver, type Driver } from 'driver.js';

import { getAvailableTours, getTourById } from './registry';

type TourContextValue = {
  availableTours: ReturnType<typeof getAvailableTours>;
  startTour: (tourId: string) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const availableTours = useMemo(() => getAvailableTours(pathname), [pathname]);

  function startTour(tourId: string) {
    const tour = getTourById(tourId);
    if (!tour) {
      return;
    }

    if (driverRef.current) {
      driverRef.current.destroy();
    }

    driverRef.current = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.48,
      stagePadding: 8,
      nextBtnText: 'Tiếp',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Xong',
      progressText: '{{current}} / {{total}}',
      steps: tour.steps
    });

    driverRef.current.drive();
  }

  return (
    <TourContext.Provider value={{ availableTours, startTour }}>{children}</TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used inside TourProvider');
  }

  return context;
}
