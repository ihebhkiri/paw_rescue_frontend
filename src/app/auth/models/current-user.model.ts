export interface CurrentUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: 'citoyen' | 'benevole' | 'veterinaire' | 'refuge' | 'admin';
  photo: string | null;
  profile: { is_available?: boolean; name?: string; address?: string; governorate?: string; latitude?: number | null; longitude?: number | null } | null;
}
