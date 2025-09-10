import React, {useState} from 'react'
import {Route, Routes, useLocation} from 'react-router-dom'
import {ToastProvider} from './contexts/ToastContext'
import {ThemeProvider} from './contexts/ThemeContext'
import Sidebar from './components/Sidebar'
import Breadcrumbs from './components/ui/Breadcrumbs'
import ErrorBoundary from './components/ErrorBoundary'
import KeyboardShortcuts from './components/ui/KeyboardShortcuts'
import QueueStatusNotification from './components/QueueStatusNotification'
import Dashboard from './pages/Dashboard'
import Cameras from './pages/Cameras'
import CameraDetail from './pages/CameraDetail'
import Images from './pages/Images'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import SystemManagement from './pages/SystemManagement'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} currentPath={location.pathname} />

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile header */}
              <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Main content */}
              <main className="flex-1 overflow-y-auto p-6">
                <Breadcrumbs />
                                 <Routes>
                   <Route path="/" element={<Dashboard />} />
                   <Route path="/cameras" element={<Cameras />} />
                   <Route path="/cameras/:id" element={<CameraDetail />} />
                   <Route path="/cameras/:id/images" element={<CameraDetail defaultTab="images" />} />
                   <Route path="/images" element={<Images />} />
                   <Route path="/analytics" element={<Analytics />} />
                   <Route path="/settings" element={<Settings />} />
                   <Route path="/system" element={<SystemManagement />} />
                 </Routes>
              </main>

              {/* Keyboard Shortcuts */}
              <KeyboardShortcuts />
              
              {/* Queue Status Notification */}
              <QueueStatusNotification />
            </div>
          </div>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
