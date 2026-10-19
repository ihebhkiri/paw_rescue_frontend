import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Coordinates } from '../reports/reports';

export interface Shelter {
  id: number; name: string; address: string; governorate: string; description: string;
  latitude: number | null; longitude: number | null; logo: string | null; distance_km: number | null;
}

export function shelterMap(shelter: Shelter): string {
  const query = shelter.latitude !== null && shelter.longitude !== null
    ? `${shelter.latitude},${shelter.longitude}` : `${shelter.name} ${shelter.address} ${shelter.governorate}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

@Injectable({ providedIn: 'root' })
export class Shelters {
  private readonly http = inject(HttpClient);
  list(point?: Coordinates) {
    return this.http.get<Shelter[]>(`${environment.apiUrl}/shelters/`, { params: point ? { latitude: point.latitude, longitude: point.longitude } : {} });
  }
}
