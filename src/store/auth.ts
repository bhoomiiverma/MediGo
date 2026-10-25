import { create } from 'zustand';
import type { Profile, Facility, UserRole } from '@/types';
import { api, demoMode } from '@/lib/api';

interface AuthState {
  profile: Profile | null;
  facility: Facility | null;
  isAuthenticated: boolean;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (profile: Profile | null, facility: Facility | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  profile: null,
  facility: null,
  isAuthenticated: false,
  loading: true,
  demoMode: demoMode(),
  async signIn(email, password) {
    set({ loading: true });
    try {
      const { profile, facility } = await api.signIn(email, password);
      set({ profile, facility, isAuthenticated: true, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  async signOut() {
    set({ loading: true });
    try {
      await api.signOut();
    } catch {}
    set({ profile: null, facility: null, isAuthenticated: false, loading: false });
  },
  setSession(profile, facility) {
    set({ profile, facility, isAuthenticated: !!profile, loading: false });
  },
}));

export function requireRole(allowed: UserRole[]) {
  const { profile } = useAuth.getState();
  if (!profile) throw new Error('Not authenticated');
  if (!allowed.includes(profile.role)) throw new Error('Insufficient permissions');
  return profile;
}

export function requireFacility() {
  const { facility } = useAuth.getState();
  if (!facility) throw new Error('No facility assigned to your profile');
  return facility;
}
