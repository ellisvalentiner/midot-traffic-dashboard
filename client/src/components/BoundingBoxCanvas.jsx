import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'

const BoundingBoxCanvas = ({
  imageSrc,
  boundingBoxes = [],
  imageWidth,
  imageHeight,
  className = '',
  showGrid = false  // Add option to show coordinate grid for debugging
}) => {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0, normalized: { x: 0, y: 0 } })

  // Vehicle type colors for bounding boxes - memoized
  const vehicleColors = useMemo(() => ({
    car: '#3B82F6',      // Blue
    truck: '#EF4444',    // Red
    motorcycle: '#10B981', // Green
    bus: '#F59E0B',      // Amber
    rv: '#8B5CF6',       // Purple
    emergency_vehicle: '#DC2626', // Red
    construction_vehicle: '#F97316', // Orange
    other_vehicle: '#6B7280' // Gray
  }), [])

  // Memoize the drawing function to prevent recreation
  const drawBoundingBoxes = useCallback((ctx, boxes, imgWidth, imgHeight, scaleX, scaleY) => {
    if (!boxes || boxes.length === 0) return

    boxes.forEach(box => {
      let x1, y1, x2, y2;

      // All coordinates are standardized to 0-1000 range
      // Convert normalized coordinates to display pixel coordinates with proper scaling
      x1 = (box.x_min / 1000) * imgWidth * scaleX;
      y1 = (box.y_min / 1000) * imgHeight * scaleY;
      x2 = (box.x_max / 1000) * imgWidth * scaleX;
      y2 = (box.y_max / 1000) * imgHeight * scaleY;

      const width = x2 - x1;
      const height = y2 - y1;

      // Get color for vehicle type
      const color = vehicleColors[box.vehicle_type.toLowerCase()] || vehicleColors.other_vehicle;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);

      // Draw label background
      const label = `${box.vehicle_type} (${Math.round((box.confidence_score || 0) * 100)}%)`;
      const labelWidth = ctx.measureText(label).width + 8;
      const labelHeight = 20;

      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(label, x1 + 4, y1 - 6);
    });
  }, [vehicleColors, canvasSize]);

  // Function to draw coordinate grid for debugging
  const drawCoordinateGrid = useCallback((ctx, imgWidth, imgHeight, scaleX, scaleY) => {
    if (!showGrid) return

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.lineWidth = 1

    // Draw grid lines every 100 normalized units (10% of image)
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * imgWidth * scaleX
      const y = (i / 10) * imgHeight * scaleY

      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, imgHeight * scaleY)
      ctx.stroke()

      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(imgWidth * scaleX, y)
      ctx.stroke()
    }

    // Add coordinate labels
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
    ctx.font = '10px Arial'
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * imgWidth * scaleX
      const y = (i / 10) * imgHeight * scaleY
      const normalizedValue = i * 100

      ctx.fillText(`${normalizedValue}`, x + 2, 12)
      ctx.fillText(`${normalizedValue}`, 2, y + 10)
    }
  }, [showGrid])

  // Add mouse coordinate tracking for debugging
  const handleMouseMove = useCallback((event) => {
    if (!canvasRef.current || !imageLoaded) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Convert to normalized coordinates (0-1000)
    const normalizedX = Math.round((x / canvas.width) * 1000)
    const normalizedY = Math.round((y / canvas.height) * 1000)

    setMouseCoords({ x, y, normalized: { x: normalizedX, y: normalizedY } })
  }, [imageLoaded])

  const handleMouseLeave = useCallback(() => {
    setMouseCoords({ x: 0, y: 0, normalized: { x: 0, y: 0 } })
  }, [])

  // Separate effect for image loading - only runs when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return

    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setCanvasSize({ width: img.width, height: img.height })
      setImageLoaded(true)
    }
    img.src = imageSrc
  }, [imageSrc])

  // Function to redraw canvas with proper scaling
  const redrawCanvas = useCallback(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Get the actual displayed size of the canvas container
    const container = canvas.parentElement
    const displayWidth = container.clientWidth
    const displayHeight = (displayWidth / canvasSize.width) * canvasSize.height

    // Calculate scale factors for proper coordinate mapping
    const scaleX = displayWidth / canvasSize.width
    const scaleY = displayHeight / canvasSize.height

    // Set canvas size to match display size for proper scaling
    canvas.width = displayWidth
    canvas.height = displayHeight

    // Clear canvas and draw image scaled to display size
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageRef.current, 0, 0, displayWidth, displayHeight)

    // Ensure the canvas element size matches the drawing size for proper display
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    // Draw bounding boxes with proper scaling
    drawBoundingBoxes(ctx, boundingBoxes, canvasSize.width, canvasSize.height, scaleX, scaleY)

    // Draw coordinate grid for debugging (if enabled)
    drawCoordinateGrid(ctx, canvasSize.width, canvasSize.height, scaleX, scaleY)
  }, [imageLoaded, canvasSize, boundingBoxes, drawBoundingBoxes, drawCoordinateGrid])

  // Effect for canvas drawing - only runs when necessary
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Add resize observer for responsive scaling
  useEffect(() => {
    if (!imageLoaded) return

    const resizeObserver = new ResizeObserver(() => {
      redrawCanvas()
    })

    if (canvasRef.current?.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [imageLoaded, redrawCanvas])

  if (!imageLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ minHeight: '200px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading image...</p>
        </div>
      </div>
    )
  }

  // If no bounding boxes, just show the image directly for better performance
  if (!boundingBoxes || boundingBoxes.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={imageSrc}
          alt="Traffic camera"
          className="max-w-full h-auto border border-gray-200 rounded-lg"
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto border border-gray-200 rounded-lg"
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Debug Controls */}
      <div className="mt-2 flex items-center space-x-2">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-2 py-1 text-xs rounded ${
            showGrid 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-gray-100 text-gray-700 border border-gray-300'
          } hover:opacity-80 transition-all`}
          title="Toggle coordinate grid for debugging"
        >
          {showGrid ? '🔴 Hide Grid' : '⚪ Show Grid'}
        </button>
        {showGrid && (
          <span className="text-xs text-gray-500">
            Grid shows normalized coordinates (0-1000) every 100 units
          </span>
        )}
        {mouseCoords.normalized.x > 0 && mouseCoords.normalized.y > 0 && (
          <span className="text-xs text-blue-600 font-mono">
            Mouse: ({mouseCoords.x}, {mouseCoords.y}) → Normalized: ({mouseCoords.normalized.x}, {mouseCoords.normalized.y})
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Types Detected:</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(vehicleColors).map(([type, color]) => {
            const hasType = boundingBoxes.some(box =>
              box.vehicle_type.toLowerCase() === type
            )
            if (!hasType) return null

            return (
              <div key={type} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-xs text-gray-700 capitalize">
                  {type.replace('_', ' ')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default React.memo(BoundingBoxCanvas)
