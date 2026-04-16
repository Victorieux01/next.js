import { cache } from 'react';
import { auth } from '@/auth';

// Deduplicates auth() so layout + page share one JWT verification per request
export const getSession = cache(auth);
