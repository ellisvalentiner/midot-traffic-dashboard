import React from 'react'
import {Link, useLocation} from 'react-router-dom'
import {ChevronRight, Home} from 'lucide-react'

const Breadcrumbs = () => {
  const location = useLocation()

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x)
    const breadcrumbs = []

    // Always add home
    breadcrumbs.push({
      name: 'Dashboard',
      path: '/',
      icon: Home
    })

    // Add path segments
    pathnames.forEach((name, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`
      const displayName = getDisplayName(name, path)

      breadcrumbs.push({
        name: displayName,
        path,
        isLast: index === pathnames.length - 1
      })
    })

    return breadcrumbs
  }

  const getDisplayName = (name, path) => {
    // Map route names to display names
    const nameMap = {
      'cameras': 'Cameras',
      'images': 'Images',
      'analytics': 'Analytics',
      'settings': 'Settings'
    }

    // If it's a camera ID (numeric), show "Camera Details"
    if (path.includes('/cameras/') && /^\d+$/.test(name)) {
      return 'Camera Details'
    }

    return nameMap[name] || name.charAt(0).toUpperCase() + name.slice(1)
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.path}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}

          {breadcrumb.isLast ? (
            <span className="text-gray-900 font-medium">
              {breadcrumb.icon ? (
                <breadcrumb.icon className="w-4 h-4 inline mr-1" />
              ) : null}
              {breadcrumb.name}
            </span>
          ) : (
            <Link
              to={breadcrumb.path}
              className="hover:text-gray-700 transition-colors flex items-center"
            >
              {breadcrumb.icon ? (
                <breadcrumb.icon className="w-4 h-4 mr-1" />
              ) : null}
              {breadcrumb.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumbs
