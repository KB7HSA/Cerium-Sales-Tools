import { Component, OnDestroy, OnInit } from '@angular/core';
import { InputFieldComponent } from './../../form/input/input-field.component';
import { ModalService } from '../../../services/modal.service';
import { ProfileStoreService, ProfileSocial, ProfileData } from '../../../services/profile-store.service';
import { ToastService } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-user-meta-card',
  imports: [
    ModalComponent,
    InputFieldComponent,
    ButtonComponent
],
  templateUrl: './user-meta-card.component.html',
  styles: ``
})
export class UserMetaCardComponent implements OnInit, OnDestroy {
  constructor(
    public modal: ModalService,
    private profileStore: ProfileStoreService,
    private toastService: ToastService
  ) {}

  isOpen = false;

  user: MetaDraft = this.emptyDraft();
  draft: MetaDraft = this.emptyDraft();

  private subscription = new Subscription();

  ngOnInit(): void {
    const initial = this.toMetaDraft(this.profileStore.getProfile());
    this.user = initial;
    this.draft = this.cloneMetaDraft(initial);
    this.subscription.add(
      this.profileStore.profile$.subscribe(profile => {
        this.user = this.toMetaDraft(profile);
        if (!this.isOpen) {
          this.draft = this.cloneMetaDraft(this.user);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openModal() {
    this.draft = this.cloneMetaDraft(this.user);
    this.isOpen = true;
  }

  closeModal() { this.isOpen = false; }

  handleSave() {
    this.profileStore.updateProfile({
      firstName: this.draft.firstName,
      lastName: this.draft.lastName,
      role: this.draft.role,
      location: this.draft.location,
      avatar: this.draft.avatar,
      email: this.draft.email,
      phone: this.draft.phone,
      bio: this.draft.bio,
      social: { ...this.draft.social }
    });
    this.toastService.success('Profile saved.');
    this.closeModal();
  }

  setSocialField(field: keyof ProfileSocial, value: string | number): void {
    this.draft.social[field] = String(value);
  }

  setField(field: keyof Omit<MetaDraft, 'social'>, value: string | number): void {
    this.draft[field] = String(value);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastService.error('Please select an image file.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        this.draft.avatar = result;
      }
    };
    reader.readAsDataURL(file);
  }

  private toMetaDraft(profile: ProfileData): MetaDraft {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      location: profile.location,
      avatar: profile.avatar,
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio,
      social: { ...profile.social }
    };
  }

  private cloneMetaDraft(draft: MetaDraft): MetaDraft {
    return { ...draft, social: { ...draft.social } };
  }

  private emptyDraft(): MetaDraft {
    return {
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
      }
    };
  }
}

type MetaDraft = {
  firstName: string;
  lastName: string;
  role: string;
  location: string;
  avatar: string;
  email: string;
  phone: string;
  bio: string;
  social: ProfileSocial;
};
