import type { UserEditRequestWithUser } from "@/types";

export interface WhitelistUser {
  email: string;
  role_id: number;
  name: string | null;
  phone: string | null;
  ashram: string | null;
  temple: string | null;
  purpose: string | null;
  authority_name: string | null;
  authority_relationship: string | null;
  authority_email: string | null;
  created_at: string;
  roles: {
    name: string;
  } | null;
}

export interface ActiveUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  ashram: string | null;
  temple: string | null;
  purpose: string | null;
  authority_name: string | null;
  authority_relationship: string | null;
  authority_email: string | null;
  role_id: number;
  created_at: string;
  avatar_url?: string | null;
  roles: {
    name: string;
  } | null;
}

export type { UserEditRequestWithUser };
