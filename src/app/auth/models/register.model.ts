import { FormControl } from '@angular/forms';

export type RegisterStep = 1 | 2 | 3 | 'confirmation' | 'created';

export interface VerificationField {
  name: string;
  label: string;
  placeholder: string;
  control: FormControl<string>;
  type?: 'tel' | 'email';
  options?: readonly string[];
}

export const ROLES = [
  { value: 'VOLUNTEER' as const, title: 'Bénévole', description: 'Je donne de mon temps' },
  { value: 'VETERINARIAN' as const, title: 'Vétérinaire', description: "Je soigne et j'accompagne" },
  { value: 'SHELTER' as const, title: 'Refuge / Association', description: 'Je gère un refuge ou une association' },
] as const;

export const GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir',
  'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
] as const;
