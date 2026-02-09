import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { ProfileStoreService, ProfileSocial, ProfileData } from '../../../services/profile-store.service';
import { ToastService } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { ModalComponent } from '../../ui/modal/modal.component';

@Component({
  selector: 'app-user-info-card',
  imports: [
    InputFieldComponent,
    ButtonComponent,
    LabelComponent,
    ModalComponent
],
  templateUrl: './user-info-card.component.html',
  styles: ``
})
export class UserInfoCardComponent implements OnInit, OnDestroy {
  constructor(
    public modal: ModalService,
    private profileStore: ProfileStoreService,
    private toastService: ToastService
  ) {}

  isOpen = false;

  user: InfoDraft = this.emptyDraft();
  draft: InfoDraft = this.emptyDraft();

  private subscription = new Subscription();

  ngOnInit(): void {
    const initial = this.toInfoDraft(this.profileStore.getProfile());
    this.user = initial;
    this.draft = this.cloneInfoDraft(initial);
    this.subscription.add(
      this.profileStore.profile$.subscribe(profile => {
        this.user = this.toInfoDraft(profile);
        if (!this.isOpen) {
          this.draft = this.cloneInfoDraft(this.user);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openModal() {
    this.draft = this.cloneInfoDraft(this.user);
    this.isOpen = true;
  }

  closeModal() { this.isOpen = false; }

  handleSave() {
    this.profileStore.updateProfile({
      firstName: this.draft.firstName,
      lastName: this.draft.lastName,
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

  setField(field: keyof Omit<InfoDraft, 'social'>, value: string | number): void {
    this.draft[field] = String(value);
  }

  private toInfoDraft(profile: ProfileData): InfoDraft {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio,
      social: { ...profile.social }
    };
  }

  private cloneInfoDraft(draft: InfoDraft): InfoDraft {
    return { ...draft, social: { ...draft.social } };
  }

  private emptyDraft(): InfoDraft {
    return {
      firstName: '',
      lastName: '',
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

type InfoDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  social: ProfileSocial;
};
