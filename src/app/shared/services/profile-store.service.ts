import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService, CurrentUser } from './auth.service';

export type ProfileSocial = {
  facebook: string;
  x: string;
  linkedin: string;
  instagram: string;
};

export type ProfileAddress = {
  country: string;
  cityState: string;
  postalCode: string;
  taxId: string;
};

export type ProfileData = {
  firstName: string;
  lastName: string;
  role: string;
  location: string;
  avatar: string;
  email: string;
  phone: string;
  bio: string;
  social: ProfileSocial;
  address: ProfileAddress;
};

const STORAGE_KEY = 'tailadmin.profile';

const defaultProfile: ProfileData = {
  firstName: '',
  lastName: '',
  role: '',
  location: '',
  avatar: '',
  email: '',
  phone: '',
  bio: '',
  social: {
    facebook: '',
    x: '',
    linkedin: '',
    instagram: ''
  },
  address: {
    country: '',
    cityState: '',
    postalCode: '',
    taxId: ''
  }
};

@Injectable({
  providedIn: 'root'
})
export class ProfileStoreService {
  private readonly profileSubject = new BehaviorSubject<ProfileData>(this.load());
  readonly profile$ = this.profileSubject.asObservable();
  
  private authService = inject(AuthService);

  constructor() {
    // Sync profile when auth user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.syncFromAuthUser(user);
      }
    });
  }

  /**
   * Sync profile data from the authenticated user (M365)
   */
  syncFromAuthUser(user: CurrentUser): void {
    const current = this.profileSubject.value;
    const nameParts = user.name.split(' ');
    const firstName = user.profile?.firstName || nameParts[0] || '';
    const lastName = user.profile?.lastName || nameParts.slice(1).join(' ') || '';
    
    const updated: ProfileData = {
      ...current,
      firstName,
      lastName,
      email: user.email,
      role: user.profile?.jobTitle || user.role || '',
      location: user.profile?.location || current.location,
      phone: user.profile?.phone || current.phone,
    };
    
    this.profileSubject.next(updated);
    this.save(updated);
  }

  getProfile(): ProfileData {
    return this.profileSubject.value;
  }

  updateProfile(patch: Partial<ProfileData>): void {
    const current = this.profileSubject.value;
    const next: ProfileData = {
      ...current,
      ...patch,
      social: { ...current.social, ...patch.social },
      address: { ...current.address, ...patch.address }
    };

    this.profileSubject.next(next);
    this.save(next);
  }

  private load(): ProfileData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultProfile;
      }
      const parsed = JSON.parse(raw) as Partial<ProfileData>;
      return {
        ...defaultProfile,
        ...parsed,
        social: { ...defaultProfile.social, ...parsed.social },
        address: { ...defaultProfile.address, ...parsed.address }
      };
    } catch {
      return defaultProfile;
    }
  }

  private save(profile: ProfileData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }
}
