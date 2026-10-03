export type UserRole = 'VOLUNTEER' | 'VETERINARIAN' | 'SHELTER';
export type BackendRole = 'benevole' | 'veterinaire' | 'refuge';

export function toBackendRole(role: UserRole): BackendRole {
  switch (role) {
    case 'VETERINARIAN': return 'veterinaire';
    case 'SHELTER': return 'refuge';
    case 'VOLUNTEER': return 'benevole';
  }
}
