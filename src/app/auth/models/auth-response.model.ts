export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface SignupResponse {
  user: {
    id: number;
    profile?: { verification_status?: string } | null;
  };
  detail?: string;
  access?: string;
  refresh?: string;
}
