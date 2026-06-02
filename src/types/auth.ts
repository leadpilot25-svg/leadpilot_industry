export type Role = 'super_admin' | 'client_admin' | 'agent'

export interface Profile {
  id: string
  user_id: string
  tenant_id: string | null
  role: Role
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}
