'use client';

import { useState } from 'react';
import SubscriptionModal from '@/app/ui/subscription-modal';

export default function DashboardClient() {
  const [showModal, setShowModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSeenModal = sessionStorage.getItem('hasSeenSubscriptionModal');
    if (!hasSeenModal) {
      sessionStorage.setItem('hasSeenSubscriptionModal', 'true');
      return true;
    }
    return false;
  });

  return (
    <SubscriptionModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    />
  );
}