import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { ProfileStoreService, ProfileAddress, ProfileData } from '../../../services/profile-store.service';
import { ToastService } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { ModalComponent } from '../../ui/modal/modal.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-address-card',
  imports: [
    InputFieldComponent,
    ButtonComponent,
    LabelComponent,
    ModalComponent,
    FormsModule
],
  templateUrl: './user-address-card.component.html',
  styles: ``
})
export class UserAddressCardComponent implements OnInit, OnDestroy {
  constructor(
    public modal: ModalService,
    private profileStore: ProfileStoreService,
    private toastService: ToastService
  ) {}

  isOpen = false;

  address: AddressDraft = this.emptyDraft();
  draft: AddressDraft = this.emptyDraft();

  private subscription = new Subscription();

  ngOnInit(): void {
    const initial = this.toAddressDraft(this.profileStore.getProfile());
    this.address = { ...initial };
    this.draft = { ...initial };
    this.subscription.add(
      this.profileStore.profile$.subscribe(profile => {
        this.address = this.toAddressDraft(profile);
        if (!this.isOpen) {
          this.draft = { ...this.address };
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openModal() {
    this.draft = { ...this.address };
    this.isOpen = true;
  }

  closeModal() { this.isOpen = false; }

  handleSave() {
    this.profileStore.updateProfile({
      address: { ...this.draft }
    });
    this.toastService.success('Profile saved.');
    this.closeModal();
  }

  setField(field: keyof AddressDraft, value: string | number): void {
    this.draft[field] = String(value);
  }

  private toAddressDraft(profile: ProfileData): AddressDraft {
    return { ...profile.address };
  }

  private emptyDraft(): AddressDraft {
    return {
      country: '',
      cityState: '',
      postalCode: '',
      taxId: ''
    };
  }
}

type AddressDraft = ProfileAddress;
