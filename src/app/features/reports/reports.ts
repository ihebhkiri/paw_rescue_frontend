import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { environment } from '../../../environments/environment';
import { CurrentUser } from '../../auth/models/current-user.model';

export interface Coordinates { latitude: number; longitude: number; }
export interface ReportDetail extends Coordinates {
  id: number;
  reporter: number;
  created_at?: string;
  species_name: string;
  type: 'stray' | 'injured';
  description: string;
  severity: string;
  address_text: string;
  status: string;
  distance_km: number | null;
  photos: { id: number; image: string }[];
  mission: { can_accept?: boolean; type?: 'rescue' | 'transport' | 'medical_emergency'; created_at?: string; completed_at?: string | null; id: number; status: string; accepted_at: string | null; assigned_to_me: boolean; response: string | null } | null;
}

export function statusLabel(status: string): string {
  return ({ pending: 'En attente', assigned: 'Assigné', accepted: 'Prise en charge', open: 'Disponible',
    in_progress: 'En cours', en_route: 'En route', on_site: 'Sur place', rescued: 'Secouru', completed: 'Terminée',
    closed: 'Clôturé', cancelled: 'Annulée', rejected: 'Rejeté' } as Record<string, string>)[status] ?? status;
}

export function mapsUrl(point: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}&travelmode=driving`;
}

export async function currentPosition(): Promise<Coordinates> {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') throw new Error('GPS refusé');
  }
  const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) throw new Error('GPS invalide');
  return { latitude: coords.latitude, longitude: coords.longitude };
}

@Injectable({ providedIn: 'root' })
export class Reports {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<ReportDetail[]>(`${environment.apiUrl}/reports/`); }
  detail(id: string) { return this.http.get<ReportDetail>(`${environment.apiUrl}/reports/${id}/`); }
  create(data: FormData) { return this.http.post<ReportDetail>(`${environment.apiUrl}/reports/`, data); }
  respond(id: number, response: 'accepted' | 'refused') {
    return this.http.post(`${environment.apiUrl}/missions/${id}/response/`, { response });
  }
  complete(id: number) {
    return this.http.post<{ status: 'completed'; completed_at: string }>(`${environment.apiUrl}/missions/${id}/complete/`, { outcome: 'rescued' });
  }
  updatePosition(position: Coordinates) {
    return this.http.patch<CurrentUser>(`${environment.authApiUrl}/me/`, { profile: position });
  }
}
