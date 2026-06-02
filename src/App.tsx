import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage'
import { OnboardingPage } from './pages/onboarding/OnboardingPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { AdminPage } from './pages/admin/AdminPage'
import { LeadsListPage } from './pages/leads/LeadsListPage'
import { AddLeadPage } from './pages/leads/AddLeadPage'
import { EditLeadPage } from './pages/leads/EditLeadPage'
import { LeadDetailPage } from './pages/leads/LeadDetailPage'
import { AgentsPage } from './pages/agents/AgentsPage'
import { ImportLeadsPage } from './pages/leads/ImportLeadsPage'
import { FollowupsPage } from './pages/followups/FollowupsPage'
import { WorkspaceSettingsPage } from './pages/settings/WorkspaceSettingsPage'
import { CustomFieldsPage }         from './pages/settings/CustomFieldsPage'
import { WhatsAppTemplatesPage }    from './pages/settings/WhatsAppTemplatesPage'
import { PipelinePage }             from './pages/pipeline/PipelinePage'
import { TravelWorkspace }    from './pages/industry/TravelWorkspace'
import { TaxiWorkspace }      from './pages/industry/TaxiWorkspace'
import { InsuranceWorkspace } from './pages/industry/InsuranceWorkspace'
import { EducationWorkspace } from './pages/industry/EducationWorkspace'
import { MarketingWorkspace } from './pages/industry/MarketingWorkspace'
import { TarotWorkspace }     from './pages/industry/TarotWorkspace'
import { CoachingWorkspace }  from './pages/industry/CoachingWorkspace'

const router = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────────────────
  { path: '/login',              element: <LoginPage />           },
  { path: '/forgot-password',    element: <ForgotPasswordPage />  },
  { path: '/auth/reset-password',element: <ResetPasswordPage />   },
  { path: '/auth/accept-invite', element: <AcceptInvitePage /> },

  // ── Onboarding ───────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute requiresOnboarding={false} />,
    children: [{ path: '/onboarding', element: <OnboardingPage /> }],
  },

  // ── Authenticated + onboarding complete (all roles) ──────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard',          element: <DashboardPage />    },
      { path: '/leads',              element: <LeadsListPage />    },
      { path: '/leads/new',          element: <AddLeadPage />      },
      { path: '/leads/import',       element: <ImportLeadsPage />  },
      { path: '/leads/:id',          element: <LeadDetailPage />   },
      { path: '/leads/:id/edit',     element: <EditLeadPage />     },
      { path: '/followups',          element: <FollowupsPage />    },
      { path: '/pipeline',           element: <PipelinePage />     },
      { path: '/industry/travel',    element: <TravelWorkspace />   },
      { path: '/industry/taxi',      element: <TaxiWorkspace />     },
      { path: '/industry/insurance', element: <InsuranceWorkspace /> },
      { path: '/industry/education', element: <EducationWorkspace /> },
      { path: '/industry/marketing', element: <MarketingWorkspace /> },
      { path: '/industry/tarot',     element: <TarotWorkspace />    },
      { path: '/industry/coaching',  element: <CoachingWorkspace /> },
    ],
  },

  // ── Client admin + super admin only ──────────────────────────────────────
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'client_admin']} />,
    children: [
      { path: '/agents',             element: <AgentsPage />       },
      { path: '/settings',           element: <WorkspaceSettingsPage /> },
      { path: '/settings/custom-fields',       element: <CustomFieldsPage /> },
      { path: '/settings/whatsapp-templates',   element: <WhatsAppTemplatesPage /> },
    ],
  },

  // ── Super admin ──────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [{ path: '/admin', element: <AdminPage /> }],
  },

  // ── Defaults ─────────────────────────────────────────────────────────────
  { path: '/',  element: <Navigate to="/dashboard" replace /> },
  { path: '*',  element: <Navigate to="/dashboard" replace /> },
])

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}