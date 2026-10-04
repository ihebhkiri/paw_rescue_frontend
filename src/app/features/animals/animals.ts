import { Injectable, signal } from '@angular/core';

export type AnimalType = 'Chien' | 'Chat' | 'Autre';
export interface Animal {
  readonly id: string;
  readonly name: string;
  readonly age: string;
  readonly gender: 'Mâle' | 'Femelle';
  readonly type: AnimalType;
  readonly images: readonly string[];
  readonly vaccinated: boolean;
  readonly sterilized: boolean;
  readonly sociable: boolean;
  readonly description: string;
  readonly location: string;
  readonly health: string;
  readonly character: string;
  readonly compatibility: string;
}

// Local demonstration catalogue; no adoption or account requests are sent.
const ANIMALS: readonly Animal[] = [
  { id: 'max', name: 'Max', age: '2 ans', gender: 'Mâle', type: 'Chien', images: ['assets/images/animals/max.webp', 'assets/images/animals/max-garden.webp'], vaccinated: true, sterilized: true, sociable: true, description: "Max est un chien très affectueux, il aime les promenades et s'entend bien avec les autres animaux. Il est calme, joueur et toujours heureux de rencontrer de nouvelles personnes.", location: 'Tunis, Tunisie', health: 'En bonne santé', character: 'Calme, joueur, affectueux', compatibility: 'Chiens, chats, enfants' },
  { id: 'luna', name: 'Luna', age: '1 an', gender: 'Femelle', type: 'Chat', images: ['assets/images/animals/luna.webp'], vaccinated: true, sterilized: true, sociable: true, description: 'Luna est une petite chatte curieuse et douce. Elle aime les moments de calme et les jeux, et recherche un foyer attentionné.', location: 'Tunis, Tunisie', health: 'En bonne santé', character: 'Douce, curieuse, calme', compatibility: 'Chats, enfants' },
  { id: 'rocky', name: 'Rocky', age: '3 ans', gender: 'Mâle', type: 'Chien', images: ['assets/images/animals/rocky.webp'], vaccinated: true, sterilized: true, sociable: true, description: 'Rocky est un compagnon plein de vie. Il adore les balades et les jeux en plein air, et apprécie la compagnie de sa famille.', location: 'Tunis, Tunisie', health: 'En bonne santé', character: 'Énergique, joueur, fidèle', compatibility: 'Chiens, enfants' },
  { id: 'mimi', name: 'Mimi', age: '2 ans', gender: 'Femelle', type: 'Chat', images: ['assets/images/animals/mimi.webp'], vaccinated: true, sterilized: true, sociable: true, description: 'Mimi est une chatte affectueuse qui aime se reposer au soleil. Elle apprécie un environnement paisible et les caresses.', location: 'Tunis, Tunisie', health: 'En bonne santé', character: 'Affectueuse, calme', compatibility: 'Chats, enfants' },
  { id: 'leo', name: 'Léo', age: '1 an', gender: 'Mâle', type: 'Chien', images: ['assets/images/animals/max.webp'], vaccinated: true, sterilized: false, sociable: true, description: 'Léo aime découvrir de nouveaux endroits et jouer. Il recherche une famille disponible pour partager ses promenades.', location: 'Tunis, Tunisie', health: 'En bonne santé', character: 'Joueur, curieux', compatibility: 'Chiens, enfants' },
  { id: 'nala', name: 'Nala', age: '2 ans', gender: 'Femelle', type: 'Chat', images: ['assets/images/animals/luna.webp'], vaccinated: true, sterilized: true, sociable: true, description: 'Nala est une chatte attentive et tranquille. Elle recherche un foyer chaleureux où prendre ses marques à son rythme.', location: 'Tunis, Tunisie', health: 'En bonne santé', character: 'Calme, attentive', compatibility: 'Chats' },
];

@Injectable({ providedIn: 'root' })
export class Animals {
  readonly all = ANIMALS;
  readonly favorites = signal<ReadonlySet<string>>(new Set(['max']));

  find(id: string): Animal | undefined { return this.all.find(animal => animal.id === id); }

  toggleFavorite(id: string): void {
    if (!this.find(id)) return;
    this.favorites.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}
