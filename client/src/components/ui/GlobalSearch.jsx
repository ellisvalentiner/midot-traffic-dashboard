import React, {useEffect, useRef, useState} from 'react'
import {BarChart3, Camera, Image, Search, X} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import {useToast} from '../../contexts/ToastContext'

const GlobalSearch = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { showInfo } = useToast()

  // Search data
  const [cameras, setCameras] = useState([])
  const [images, setImages] = useState([])
  const [analytics, setAnalytics] = useState([])

  useEffect(() => {
    // Load search data
    loadSearchData()

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const loadSearchData = async () => {
    try {
      // In a real app, you'd fetch this data
      // For now, we'll use mock data
      setCameras([
        { id: '1', name: 'I-94 at Jackson', type: 'camera', location: 'Jackson, MI' },
        { id: '2', name: 'I-75 at Detroit', type: 'camera', location: 'Detroit, MI' },
        { id: '3', name: 'US-23 at Ann Arbor', type: 'camera', location: 'Ann Arbor, MI' }
      ])

      setImages([
        { id: '1', name: 'Traffic Image', type: 'image', camera: 'I-94 at Jackson', timestamp: '2 hours ago' },
        { id: '2', name: 'Traffic Image', type: 'image', camera: 'I-75 at Detroit', timestamp: '1 hour ago' }
      ])

      setAnalytics([
        { id: '1', name: 'Traffic Volume Report', type: 'analytics', category: 'Reports', timestamp: 'Today' },
        { id: '2', name: 'Vehicle Count Analysis', type: 'analytics', category: 'Analysis', timestamp: 'Yesterday' }
      ])
    } catch (error) {
      console.error('Error loading search data:', error)
    }
  }

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)

    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 300))

      const allResults = []
      const query = searchQuery.toLowerCase()

      // Search cameras
      cameras.forEach(camera => {
        if (camera.name.toLowerCase().includes(query) ||
            camera.location.toLowerCase().includes(query)) {
          allResults.push({
            ...camera,
            searchType: 'camera',
            displayName: camera.name,
            subtitle: camera.location
          })
        }
      })

      // Search images
      images.forEach(image => {
        if (image.name.toLowerCase().includes(query) ||
            image.camera.toLowerCase().includes(query)) {
          allResults.push({
            ...image,
            searchType: 'image',
            displayName: image.name,
            subtitle: `${image.camera} • ${image.timestamp}`
          })
        }
      })

      // Search analytics
      analytics.forEach(analytic => {
        if (analytic.name.toLowerCase().includes(query) ||
            analytic.category.toLowerCase().includes(query)) {
          allResults.push({
            ...analytic,
            searchType: 'analytics',
            displayName: analytic.name,
            subtitle: `${analytic.category} • ${analytic.timestamp}`
          })
        }
      })

      setResults(allResults.slice(0, 10)) // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleResultClick = (result) => {
    setIsOpen(false)
    setQuery('')
    setResults([])

    // Navigate based on result type
    switch (result.searchType) {
      case 'camera':
        navigate(`/cameras/${result.id}`)
        showInfo(`Navigated to ${result.displayName}`)
        break
      case 'image':
        navigate(`/images`)
        showInfo(`Navigated to Images`)
        break
      case 'analytics':
        navigate(`/analytics`)
        showInfo(`Navigated to Analytics`)
        break
      default:
        break
    }
  }

  const getResultIcon = (type) => {
    switch (type) {
      case 'camera':
        return <Camera className="w-4 h-4 text-blue-500" />
      case 'image':
        return <Image className="w-4 h-4 text-green-500" />
      case 'analytics':
        return <BarChart3 className="w-4 h-4 text-purple-500" />
      default:
        return <Search className="w-4 h-4 text-gray-500" />
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}
        title="Search (Ctrl/Cmd + K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Search Input */}
        <div className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cameras, images, analytics..."
            className="flex-1 text-lg bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.searchType}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  {getResultIcon(result.searchType)}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {result.displayName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {result.subtitle}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 uppercase">
                    {result.searchType}
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or check your spelling</p>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Start typing to search</p>
              <p className="text-sm mt-1">Search across cameras, images, and analytics</p>
            </div>
          )}
        </div>

        {/* Search Tips */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Search tips: Use camera names, locations, or analysis types</span>
            <span>Press Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlobalSearch
