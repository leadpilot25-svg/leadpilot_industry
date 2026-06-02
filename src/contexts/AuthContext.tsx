import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Profile, Role } from '../types/auth'

interface AuthContextValue {
  session:            Session | null
  user:               User | null
  profile:            Profile | null
  role:               Role | null
  loading:            boolean
  onboardingComplete: boolean
  signIn:             (email: string, password: string) => Promise<void>
  signOut:            () => Promise<void>
  isRole:             (...roles: Role[]) => boolean
  refreshProfile:     (userId: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    if (!supabaseConfigured) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.warn('[AuthContext] fetchProfile error:', error.message)
      setProfile(null)
      return
    }

    if (!data) {
      console.warn('[AuthContext] fetchProfile: no profile row found')
      setProfile(null)
      return
    }

    setProfile(data as Profile)
  }, [])

  const fetchProfileRef = useRef(fetchProfile)
  useEffect(() => { fetchProfileRef.current = fetchProfile }, [fetchProfile])

  const refreshProfile = useCallback(async (userId: string): Promise<void> => {
    await fetchProfileRef.current(userId)
  }, [])

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }


    // onAuthStateChange is the ONLY source of truth for the session.
    // getSession() is NOT called — in Supabase JS v2 it competes for the
    // same internal auth mutex that onAuthStateChange holds during
    // INITIAL_SESSION dispatch, causing getSession() to never resolve.
    //
    // onAuthStateChange fires INITIAL_SESSION synchronously on registration
    // when a session already exists, delivering the session without any
    // additional call. All subsequent events (SIGNED_IN, SIGNED_OUT,
    // TOKEN_REFRESHED) are delivered through the same channel.
    //
    // The handler is synchronous so registration completes instantly.
    // All async work (profile fetch, setLoading) runs in setTimeout(0)
    // so it executes after the registration call stack fully unwinds.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {

        setSession(s)
        setUser(s?.user ?? null)

        const userId = s?.user?.id ?? null

        setTimeout(() => {
          if (userId) {
            fetchProfileRef.current(userId)
              .catch(e => console.error('[AuthContext] fetchProfile threw:', e))
              .finally(() => {
                setLoading(false)
              })
          } else {
            setProfile(null)
            setLoading(false)
          }
        }, 0)
      },
    )


    // If INITIAL_SESSION never fires (no existing session, cold start),
    // set a safety timeout so the app does not hang on the loading screen.
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.warn('[AuthContext] safety timeout — no session event received, clearing loading')
        setLoading(false)
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  const isRole = useCallback(
    (...roles: Role[]) => (profile ? roles.includes(profile.role) : false),
    [profile],
  )

  const onboardingComplete = profile !== null && profile.tenant_id !== null

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role:               profile?.role ?? null,
        loading,
        onboardingComplete,
        signIn,
        signOut,
        isRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
