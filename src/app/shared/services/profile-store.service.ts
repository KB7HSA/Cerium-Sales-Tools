import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  firstName: 'Kevin',
  lastName: 'Heide',
  role: 'Team Manager',
  location: 'Arizona, United States',
  avatar: '/images/user/owner.jpg',
  email: 'randomuser@pimjo.com',
  phone: '+09 363 398 46',
  bio: 'Team Manager',
  social: {
    facebook: 'https://www.facebook.com/PimjoHQ',
    x: 'https://x.com/PimjoHQ',
    linkedin: 'https://www.linkedin.com/company/pimjo',
    instagram: 'https://instagram.com/PimjoHQ'
  },
  address: {
    country: 'United States.',
    cityState: 'Phoenix, Arizona, United States.',
    postalCode: 'ERT 2489',
    taxId: 'AS4568384'
  }
};

@Injectable({
  providedIn: 'root'
})
export class ProfileStoreService {
  private readonly profileSubject = new BehaviorSubject<ProfileData>(this.load());
  readonly profile$ = this.profileSubject.asObservable();

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
