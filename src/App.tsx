import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, IndustryRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage'
import { OnboardingPage } from './pages/onboarding/OnboardingPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { SuperAdminDashboard } from './pages/admin/SuperAdminDashboard'
import { TenantsPage }          from './pages/admin/TenantsPage'
import { CreateTenantWizard }   from './pages/admin/CreateTenantWizard'
import { PlatformSettingsPage } from './pages/admin/PlatformSettingsPage'
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
      // Industry workspace routes — each wrapped in IndustryRoute which
      // redirects to /dashboard if the tenant's business_type does not match.
      {
        path: '/industry/travel',
        element: <IndustryRoute industry="travel" />,
        children: [{ index: true, element: <TravelWorkspace /> }],
      },
      {
        path: '/industry/taxi',
        element: <IndustryRoute industry="taxi" />,
        children: [{ index: true, element: <TaxiWorkspace /> }],
      },
      {
        path: '/industry/insurance',
        element: <IndustryRoute industry="insurance" />,
        children: [{ index: true, element: <InsuranceWorkspace /> }],
      },
      {
        path: '/industry/education',
        element: <IndustryRoute industry="education" />,
        children: [{ index: true, element: <EducationWorkspace /> }],
      },
      {
        path: '/industry/marketing',
        element: <IndustryRoute industry="marketing" />,
        children: [{ index: true, element: <MarketingWorkspace /> }],
      },
      {
        path: '/industry/tarot',
        element: <IndustryRoute industry="tarot" />,
        children: [{ index: true, element: <TarotWorkspace /> }],
      },
      {
        path: '/industry/coaching',
        element: <IndustryRoute industry="coach" />,
        children: [{ index: true, element: <CoachingWorkspace /> }],
      },
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
    element: <ProtectedRoute allowedRoles={['super_admin']} requiresOnboarding={false} />,
    children: [
      { path: '/admin',                element: <SuperAdminDashboard /> },
      { path: '/admin/tenants',        element: <TenantsPage />         },
      { path: '/admin/tenants/new',    element: <CreateTenantWizard />  },
      { path: '/admin/settings',       element: <PlatformSettingsPage />},
    ],
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