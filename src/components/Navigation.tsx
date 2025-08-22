import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

interface NavigationItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  requireAuth?: boolean
  requireAdmin?: boolean
  external?: boolean
}

const publicNavigation: NavigationItem[] = [
  { name: 'Menu', href: '/menu', icon: DocumentTextIcon },
  { name: 'Check-in', href: '/checkin', icon: ClipboardDocumentListIcon }
]

const adminNavigation: NavigationItem[] = [
  { 
    name: 'Dashboard', 
    href: '/admin', 
    icon: ChartBarIcon,
    requireAuth: true,
    requireAdmin: true
  },
  { 
    name: 'Bookings', 
    href: '/admin/bookings', 
    icon: DocumentTextIcon,
    requireAuth: true,
    requireAdmin: true
  },
  { 
    name: 'Menu Management', 
    href: '/admin/menu', 
    icon: DocumentTextIcon,
    requireAuth: true,
    requireAdmin: true
  },
  { 
    name: 'Expenses', 
    href: '/admin/expenses', 
    icon: CurrencyDollarIcon,
    requireAuth: true,
    requireAdmin: true
  },
  { 
    name: 'Reports', 
    href: '/admin/reports', 
    icon: ChartBarIcon,
    requireAuth: true,
    requireAdmin: true
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Cog6ToothIcon,
    requireAuth: true,
    requireAdmin: true
  }
]

export default function Navigation() {
  const { isAuthenticated, isAdmin, user, signOut, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-menu]')) {
        setUserMenuOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const isCurrentRoute = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const filteredNavigation = [
    ...publicNavigation,
    ...(isAuthenticated && isAdmin ? adminNavigation : [])
  ]

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-40" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex-shrink-0 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1"
              aria-label="Go to homepage"
            >
              <HomeIcon className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">Voyageur Nest</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const current = isCurrentRoute(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md ${
                    current
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-current={current ? 'page' : undefined}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" aria-hidden="true" />}
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            ) : isAuthenticated ? (
              <div className="relative" data-menu>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-2"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="Open user menu"
                >
                  {user?.adminProfile?.avatar_url ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.adminProfile.avatar_url}
                      alt={user.adminProfile.full_name || user.email || 'User'}
                    />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
                  )}
                  <span className="ml-2 text-gray-700 hidden lg:block">
                    {user?.adminProfile?.full_name || user?.email || 'Admin'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b">
                        <div className="font-medium">{user?.adminProfile?.full_name || 'Admin User'}</div>
                        <div className="text-xs">{user?.email}</div>
                      </div>
                      <Link
                        to="/admin/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                        role="menuitem"
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                        role="menuitem"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 inline mr-2" aria-hidden="true" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/admin/auth"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Admin Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200" data-menu>
          <div className="pt-2 pb-3 space-y-1 sm:px-3">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const current = isCurrentRoute(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block pl-3 pr-4 py-2 text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    current
                      ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-current={current ? 'page' : undefined}
                >
                  <div className="flex items-center">
                    {Icon && <Icon className="w-5 h-5 mr-3" aria-hidden="true" />}
                    {item.name}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Mobile User Section */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            {loading ? (
              <div className="px-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ) : isAuthenticated ? (
              <>
                <div className="flex items-center px-4">
                  {user?.adminProfile?.avatar_url ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={user.adminProfile.avatar_url}
                      alt={user.adminProfile.full_name || user.email || 'User'}
                    />
                  ) : (
                    <UserCircleIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user?.adminProfile?.full_name || 'Admin User'}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {user?.email}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Link
                    to="/admin/profile"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4">
                <Link
                  to="/admin/auth"
                  className="block w-full text-center px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Admin Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
