import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AnimalResponse } from '../animals/animals';

export type AdoptionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AdoptionAction = 'approve' | 'reject' | 'cancel';
export const ADOPTION_LABELS: Record<AdoptionStatus, string> = {
  pending: 'En attente', approved: 'Acceptée', rejected: 'Refusée', cancelled: 'Annulée',
};
export interface AdoptionRequest {
  id: number;
  animal: number;
  animal_details: AnimalResponse;
  applicant: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role?: string;
  applicant_photo?: string | null;
  refuge: number;
  refuge_name: string;
  message: string;
  status: AdoptionStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string;
  can_review: boolean;
  can_cancel: boolean;
}

@Injectable({ providedIn: 'root' })
export class Adoptions {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/adoptions/`;

  list(animal?: number) {
    return this.http.get<AdoptionRequest[]>(this.url, { params: animal === undefined ? {} : { animal } });
  }
  detail(id: string) { return this.http.get<AdoptionRequest>(`${this.url}${id}/`); }
  create(animal: number, message: string) { return this.http.post<AdoptionRequest>(this.url, { animal, message }); }
  decide(id: number, action: AdoptionAction) { return this.http.post<AdoptionRequest>(`${this.url}${id}/${action}/`, {}); }
}
