export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'benevole' | 'veterinaire' | 'refuge';
}
