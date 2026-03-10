'use client';

import { useState, useEffect } from 'react';
import SubscriptionModal from '@/app/ui/subscription-modal';

export default function DashboardClient() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem('hasSeenSubscriptionModal');
    if (!hasSeenModal) {
      setShowModal(true);
      sessionStorage.setItem('hasSeenSubscriptionModal', 'true');
    }
  }, []);

  return (
    <SubscriptionModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    />
  );
}