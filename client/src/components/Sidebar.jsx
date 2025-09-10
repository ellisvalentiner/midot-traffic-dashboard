import React from 'react'
import {Link} from 'react-router-dom'
import {BarChart3, Camera, Home, Server, Settings, X} from 'lucide-react'
import ThemeToggle from './ui/ThemeToggle'
import GlobalSearch from './ui/GlobalSearch'

const Sidebar = ({ isOpen, setIsOpen, currentPath }) => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Traffic Monitoring', href: '/cameras', icon: Camera,
      subItems: [
        { name: 'Cameras', href: '/cameras' },
        { name: 'Images', href: '/images' }
      ]
    },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'System', href: '/system', icon: Server },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Camera className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">MIDOT Traffic</h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = currentPath === item.href ||
                (item.subItems && item.subItems.some(sub => currentPath === sub.href))

              return (
                <div key={item.name}>
                  <Link
                    to={item.href}
                    className={`
                      sidebar-item ${isActive ? 'active' : ''}
                    `}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>

                  {/* Sub-items */}
                  {item.subItems && isActive && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = currentPath === subItem.href
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={`
                              sidebar-item text-sm py-2 ${isSubActive ? 'active bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
                            `}
                            onClick={() => setIsOpen(false)}
                          >
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <GlobalSearch className="flex-1" />
            <ThemeToggle />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            <p>MIDOT Traffic Analysis</p>
            <p className="text-xs mt-1">v1.0.0</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
