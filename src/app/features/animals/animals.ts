import { inject, Injectable, linkedSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/service/auth';

export type AnimalType = 'Chien' | 'Chat' | 'Autre';
export interface AnimalResponse {
  id: number;
  name: string;
  species_name: string;
  estimated_age_months: number | null;
  sex: 'M' | 'F' | 'unknown';
  behavior: string;
  refuge_name?: string | null;
  is_adoptable: boolean;
  status?: string;
  primary_photo?: string | null;
  photos?: readonly { id: number; image: string; is_primary: boolean; order: number }[];
}

export interface Animal {
  readonly id: number;
  readonly name: string;
  readonly age: string;
  readonly gender: 'Mâle' | 'Femelle' | 'Inconnu';
  readonly type: AnimalType;
  readonly species: string;
  readonly images: readonly string[];
  readonly refuge: string;
  readonly character: string;
  readonly adoptable: boolean;
  readonly adoptionStatus: string;
}

function animalFromResponse(data: AnimalResponse): Animal {
  const months = data.estimated_age_months;
  const species = data.species_name.trim();
  const name = species.toLocaleLowerCase('fr');
  return {
    id: data.id, name: data.name, species,
    age: months == null ? 'Âge non renseigné' : `${months} mois`,
    gender: data.sex === 'M' ? 'Mâle' : data.sex === 'F' ? 'Femelle' : 'Inconnu',
    type: ['chien', 'chiens', 'dog'].includes(name) ? 'Chien' : ['chat', 'chats', 'cat'].includes(name) ? 'Chat' : 'Autre',
    images: data.photos ? data.photos.map(photo => photo.image).filter(Boolean) : data.primary_photo ? [data.primary_photo] : [],
    refuge: data.refuge_name || 'Refuge non renseigné',
    character: data.behavior || 'Comportement non renseigné',
    adoptable: data.is_adoptable,
    adoptionStatus: data.is_adoptable ? 'Disponible à l’adoption' : data.status === 'adopted' ? 'Adopté' : 'Indisponible à l’adoption',
  };
}

@Injectable({ providedIn: 'root' })
export class Animals {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  // Local favorites belong to the current session and reset when it changes.
  readonly favorites = linkedSignal({ source: this.auth.tokens, computation: (): ReadonlySet<number> => new Set() });

  list() {
    return this.http.get<AnimalResponse[]>(`${environment.apiUrl}/animals/adoptable/`).pipe(map(items => items.map(animalFromResponse)));
  }

  detail(id: string) {
    return this.http.get<AnimalResponse>(`${environment.apiUrl}/animals/${id}/`).pipe(map(animalFromResponse));
  }

  toggleFavorite(id: number): void {
    this.favorites.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}
