import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navigation from './Navigation'
import ProtectedRoute from './ProtectedRoute'
import { AuthErrorBoundary } from './AuthErrorBoundary'
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  requireAuth?: boolean
  showNavigation?: boolean
  showBreadcrumbs?: boolean
}

interface BreadcrumbItem {
  name: string
  href?: string
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []
  
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Convert segment to readable name
    let name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    // Handle specific route names
    switch (segment) {
      case 'admin':
        name = 'Dashboard'
        break
      case 'manual-updates':
        name = 'Manual Updates'
        break
      case 'menu':
        name = 'Menu Management'
        break
      case 'reports':
        name = 'Reports & Analytics'
        break
      default:
        break
    }
    
    breadcrumbs.push({
      name,
      href: index === segments.length - 1 ? undefined : currentPath
    })
  })
  
  return breadcrumbs
}

export default function AdminLayout({
  children,
  title = 'Admin Dashboard',
  description,
  requireAuth = true,
  showNavigation = true,
  showBreadcrumbs = true
}: AdminLayoutProps) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  
  const breadcrumbs = generateBreadcrumbs(location.pathname)
  
  // SEO meta tags
  React.useEffect(() => {
    document.title = `${title} | Voyageur Nest Admin`
    
    // Set meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', description)
    }
    
    // Set noindex for admin pages
    let metaRobots = document.querySelector('meta[name="robots"]')
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.setAttribute('name', 'robots')
      document.head.appendChild(metaRobots)
    }
    metaRobots.setAttribute('content', 'noindex, nofollow')
  }, [title, description])

  const content = (
    <AuthErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {showNavigation && <Navigation />}

        <div className="flex-1 flex flex-col">
          {/* Breadcrumbs */}
          {showBreadcrumbs && breadcrumbs.length > 1 && (
            <div className="bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="flex py-3" aria-label="Breadcrumb">
                  <ol className="inline-flex items-center space-x-1 md:space-x-3">
                    <li className="inline-flex items-center">
                      <a
                        href="/admin"
                        className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1"
                      >
                        <HomeIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                        Dashboard
                      </a>
                    </li>
                    {breadcrumbs.slice(1).map((crumb, index) => (
                      <li key={index}>
                        <div className="flex items-center">
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                          {crumb.href ? (
                            <a
                              href={crumb.href}
                              className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1"
                            >
                              {crumb.name}
                            </a>
                          ) : (
                            <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 px-2 py-1">
                              {crumb.name}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    {title}
                  </h1>
                  {description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {description}
                    </p>
                  )}
                </div>
                
                {/* User Info */}
                {isAuthenticated && user && (
                  <div className="mt-4 flex md:mt-0 md:ml-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Welcome back, {user.adminProfile?.full_name || user.email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-center">Loading...</p>
            </div>
          </div>
        )}
      </div>
    </AuthErrorBoundary>
  )

  if (requireAuth) {
    return (
      <ProtectedRoute requireAdmin={true}>
        {content}
      </ProtectedRoute>
    )
  }

  return content
}

// Specialized layouts for different admin sections
export function DashboardLayout({ children, ...props }: Omit<AdminLayoutProps, 'title'>) {
  return (
    <AdminLayout 
      title="Dashboard" 
      description="Restaurant management overview and key metrics"
      {...props}
    >
      {children}
    </AdminLayout>
  )
}

export function BookingsLayout({ children, ...props }: Omit<AdminLayoutProps, 'title'>) {
  return (
    <AdminLayout 
      title="Bookings Management" 
      description="Manage reservations, check-ins, and guest information"
      {...props}
    >
      {children}
    </AdminLayout>
  )
}

export function MenuLayout({ children, ...props }: Omit<AdminLayoutProps, 'title'>) {
  return (
    <AdminLayout 
      title="Menu Management" 
      description="Manage menu items, categories, and pricing"
      {...props}
    >
      {children}
    </AdminLayout>
  )
}

export function ExpensesLayout({ children, ...props }: Omit<AdminLayoutProps, 'title'>) {
  return (
    <AdminLayout 
      title="Expenses Management" 
      description="Track and manage business expenses"
      {...props}
    >
      {children}
    </AdminLayout>
  )
}

export function ReportsLayout({ children, ...props }: Omit<AdminLayoutProps, 'title'>) {
  return (
    <AdminLayout 
      title="Reports & Analytics" 
      description="Business insights and performance analytics"
      {...props}
    >
      {children}
    </AdminLayout>
  )
}

export function SettingsLayout({ children, ...props }: Omit<AdminLayoutProps, 'title'>) {
  return (
    <AdminLayout 
      title="Settings" 
      description="System configuration and preferences"
      {...props}
    >
      {children}
    </AdminLayout>
  )
}
