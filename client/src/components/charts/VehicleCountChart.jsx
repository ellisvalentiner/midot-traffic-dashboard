import React, {useMemo} from 'react'
import {BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, TimeScale, Title, Tooltip} from 'chart.js'
import {Bar} from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import {format} from 'date-fns'
import {parseSQLiteDate} from '../../utils/dateUtils'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

// Helper function to round time to nearest configurable interval
const roundToInterval = (date, intervalMinutes = 10) => {
  const minutes = date.getMinutes()
  const roundedMinutes = Math.floor(minutes / intervalMinutes) * intervalMinutes
  const roundedDate = new Date(date)
  roundedDate.setMinutes(roundedMinutes, 0, 0)
  return roundedDate
}

// Helper function to calculate quintiles from an array of values
const calculateQuintiles = (values) => {
  if (values.length === 0) return [0, 0, 0, 0]

  // Filter out zero and missing values for meaningful quintile calculation
  const nonZeroValues = values.filter(value => value > 0 && value !== null && value !== undefined)

  if (nonZeroValues.length === 0) return [0, 0, 0, 0]

  const sorted = [...nonZeroValues].sort((a, b) => a - b)
  const n = sorted.length

  return [
    sorted[Math.floor(n * 0.2)], // 20th percentile
    sorted[Math.floor(n * 0.4)], // 40th percentile
    sorted[Math.floor(n * 0.6)], // 60th percentile
    sorted[Math.floor(n * 0.8)]  // 80th percentile
  ]
}

// Helper function to get color based on vehicle count quintile
// Uses a color scheme where higher traffic is visually problematic (blue -> yellow -> red)
const getColorByQuintile = (value, quintiles) => {
  // Handle zero/missing values with a neutral color
  if (value === 0 || value === null || value === undefined) {
    return '#F3F4F6' // Light gray for no traffic
  }

  if (value <= quintiles[0]) return '#DBEAFE' // Very light blue - lowest quintile (good)
  if (value <= quintiles[1]) return '#93C5FD' // Light blue - second quintile
  if (value <= quintiles[2]) return '#FDE047' // Yellow - third quintile (moderate concern)
  if (value <= quintiles[3]) return '#FB923C' // Orange - fourth quintile (concerning)
  return '#EF4444' // Red - highest quintile (problematic/heavy traffic)
}

const VehicleCountChart = ({
  data = [],
  title = 'Vehicle Count Over Time',
  height = 400,
  className = '',
  aggregationInterval = 600000 // Default to 10 minutes (600000 ms)
}) => {
  // Debug: Log the props received
  console.log('VehicleCountChart: Props received:', {
    data,
    dataLength: data?.length,
    title,
    height,
    className,
    aggregationInterval
  })

  // Calculate interval in minutes from milliseconds and ensure it's valid
  let calculatedIntervalMinutes = Math.floor(aggregationInterval / 60000)

  // Validate aggregation interval
  if (aggregationInterval < 60000 || aggregationInterval > 3600000) {
    console.error(`VehicleCountChart: Invalid aggregation interval: ${aggregationInterval}ms. Must be between 60000ms (1 minute) and 3600000ms (60 minutes). Using default 10 minutes.`)
    // Use default 10 minutes if invalid
    calculatedIntervalMinutes = 10
  }

  // Ensure interval is within bounds
  const intervalMinutes = Math.max(1, Math.min(60, calculatedIntervalMinutes))

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      console.log('VehicleCountChart: No data provided')
      return {
        labels: [],
        datasets: []
      }
    }

    console.log('VehicleCountChart: Processing data:', {
      dataLength: data.length,
      sampleItem: data[0],
      intervalMinutes,
      dataType: typeof data,
      isArray: Array.isArray(data)
    })

    // Process data with configurable aggregation interval
    let processedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Group data by time intervals
    const buckets = new Map()
    
    data.forEach((item, index) => {
      try {
        // Validate item structure
        if (!item || typeof item !== 'object') {
          console.log(`VehicleCountChart: Invalid item at index ${index}:`, item)
          errorCount++
          return
        }

        console.log(`VehicleCountChart: Processing item ${index}:`, {
          item: item,
          minute_bucket: item.minute_bucket,
          created_at: item.created_at,
          processed_at: item.processed_at,
          total_vehicles: item.total_vehicles,
          hasOwnProperty: {
            minute_bucket: item.hasOwnProperty('minute_bucket'),
            created_at: item.hasOwnProperty('created_at'),
            processed_at: item.hasOwnProperty('processed_at'),
            total_vehicles: item.hasOwnProperty('total_vehicles')
          }
        })

        // Use minute_bucket if available, otherwise fall back to created_at/processed_at
        const timestamp = parseSQLiteDate(item.minute_bucket || item.created_at || item.processed_at)
        if (!timestamp || isNaN(timestamp.getTime())) {
          console.log(`VehicleCountChart: Invalid timestamp at index ${index}:`, {
            minute_bucket: item.minute_bucket,
            created_at: item.created_at,
            processed_at: item.processed_at,
            parsed: timestamp,
            parseSQLiteDateResult: parseSQLiteDate(item.minute_bucket || item.created_at || item.processed_at)
          })
          errorCount++
          return
        }

        const roundedTime = roundToInterval(timestamp, intervalMinutes)
        const timeKey = roundedTime.getTime()

        if (!buckets.has(timeKey)) {
          buckets.set(timeKey, {
            time: roundedTime,
            vehicleCount: 0,
            count: 0
          })
        }

        const bucket = buckets.get(timeKey)
        const vehicleCount = item.total_vehicles || 0
        
        // Ensure vehicleCount is a valid number
        if (typeof vehicleCount === 'number' && !isNaN(vehicleCount) && vehicleCount >= 0) {
          bucket.vehicleCount += vehicleCount
          bucket.count += 1
          processedCount++
        } else {
          console.log(`VehicleCountChart: Invalid vehicle count at index ${index}:`, {
            vehicleCount,
            type: typeof vehicleCount,
            isNaN: isNaN(vehicleCount)
          })
          errorCount++
        }
      } catch (error) {
        console.log(`VehicleCountChart: Error processing item ${index}:`, error)
        errorCount++
      }
    })

    console.log('VehicleCountChart: Processing summary:', {
      processedCount,
      skippedCount,
      errorCount,
      bucketsSize: buckets.size
    })

    // Sort buckets by time
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b)
    
    console.log('VehicleCountChart: Sorted keys:', sortedKeys.slice(0, 5))
    
    // Extract labels and values
    const labels = sortedKeys.map(key => {
      const bucket = buckets.get(key)
      return format(bucket.time, 'HH:mm')
    })
    
    const values = sortedKeys.map(key => {
      const bucket = buckets.get(key)
      return bucket.vehicleCount
    })

    console.log('VehicleCountChart: Generated labels and values:', {
      labelsCount: labels.length,
      valuesCount: values.length,
      sampleLabels: labels.slice(0, 3),
      sampleValues: values.slice(0, 3)
    })

    // Calculate quintiles for color coding
    const quintiles = calculateQuintiles(values)

    return {
      labels,
      datasets: [{
        label: 'Vehicle Count',
        data: values,
        backgroundColor: values.map(value => getColorByQuintile(value, quintiles)),
        borderColor: values.map(value => getColorByQuintile(value, quintiles)),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }],
      quintiles
    }
  }, [data, intervalMinutes])

  const handleChartClick = (event, elements) => {
    if (elements && elements.length > 0 && chartData && chartData.datasets && chartData.datasets[0]) {
      const dataIndex = elements[0].index
      const dataset = chartData.datasets[0]
      
      if (dataset.data && dataset.data[dataIndex] !== undefined && chartData.labels && chartData.labels[dataIndex]) {
        const value = dataset.data[dataIndex]
        const label = chartData.labels[dataIndex]
        
        // You can add click handling logic here
        // For example, show a modal with detailed information
      }
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        position: 'top',
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => {
            try {
              // Get the time label from the chart data
              const dataIndex = context[0].dataIndex
              const chart = context[0].chart
              const timeLabel = chart.data.labels[dataIndex]

              if (!timeLabel || typeof timeLabel !== 'string') {
                return 'Invalid Time'
              }

              // Return the time label directly since it's already formatted
              return `Time: ${timeLabel}`
            } catch (error) {
              console.warn('Error formatting tooltip title:', error)
              return 'Invalid Time'
            }
          },
          afterTitle: (context) => {
            try {
              // Get the time label from the chart data
              const dataIndex = context[0].dataIndex
              const chart = context[0].chart
              const timeLabel = chart.data.labels[dataIndex]

              if (!timeLabel || typeof timeLabel !== 'string') {
                return 'Invalid Time'
              }

              // Return the time label with interval information
              return `${timeLabel} (${intervalMinutes}-min interval)`
            } catch (error) {
              console.warn('Error formatting tooltip subtitle:', error)
              return 'Invalid Time'
            }
          },
          label: (context) => {
            try {
              const value = context.parsed.y
              if (value === 0) {
                return '🚫 No Traffic Detected'
              }

              // Add traffic level indicator based on value
              let trafficLevel = ''
              const dataset = context.chart.data.datasets[0]
              const allValues = dataset.data.filter(v => v > 0)
              if (allValues.length > 0) {
                const quintiles = calculateQuintiles(allValues)
                if (value <= quintiles[0]) trafficLevel = ' (Very Low)'
                else if (value <= quintiles[1]) trafficLevel = ' (Low)'
                else if (value <= quintiles[2]) trafficLevel = ' (Moderate)'
                else if (value <= quintiles[3]) trafficLevel = ' (High)'
                else trafficLevel = ' (Very High)'
              }

              return `🚗 Vehicle Count: ${value}${trafficLevel}`
            } catch (error) {
              console.warn('Error formatting tooltip label:', error)
              return `🚗 Vehicle Count: ${context.parsed.y || 'Unknown'}`
            }
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: `Time (${intervalMinutes}-Minute Intervals)`,
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          maxTicksLimit: 8,
          maxRotation: 45
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Vehicle Count'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      bar: {
        borderWidth: 1,
        borderRadius: 4
      }
    },
    animation: {
      duration: 300
    }
  }

  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`} style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Data Available</div>
          <div className="text-sm">No vehicle detection data found for the selected time period.</div>
        </div>
      </div>
    )
  }

  // If chart data is empty after processing, show error state
  if (!chartData || !chartData.labels || chartData.labels.length === 0 || !chartData.datasets || chartData.datasets.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg border-2 border-dashed border-red-300 ${className}`} style={{ height }}>
        <div className="text-center text-red-500">
          <div className="text-lg font-medium mb-2">Data Processing Error</div>
          <div className="text-sm">Unable to process vehicle detection data. Check the console for details.</div>
        </div>
      </div>
    )
  }

  // Ensure we have valid dataset data
  const dataset = chartData.datasets[0]
  if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg border-2 border-dashed border-red-300 ${className}`} style={{ height }}>
        <div className="text-center text-red-500">
          <div className="text-lg font-medium mb-2">Data Structure Error</div>
          <div className="text-sm">Invalid chart data structure. Please check the data format.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div style={{ height, position: 'relative' }}>
        <Bar
          data={chartData}
          options={options}
          onClick={(event, elements) => {
            // You can add click handling logic here
            // For example, show a modal with detailed information
          }}
        />
      </div>

      {/* Custom Color Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="font-medium text-gray-700 dark:text-gray-300">Traffic Level:</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#F3F4F6' }}></div>
          <span className="text-gray-600 dark:text-gray-400">No Traffic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#DBEAFE' }}></div>
          <span className="text-blue-600 dark:text-blue-400">Very Low ✓</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#93C5FD' }}></div>
          <span className="text-blue-600 dark:text-blue-400">Low ✓</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#FDE047' }}></div>
          <span className="text-yellow-600 dark:text-yellow-400">Moderate ⚠️</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#FB923C' }}></div>
          <span className="text-orange-600 dark:text-orange-400">High ⚠️</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#EF4444' }}></div>
          <span className="text-red-600 dark:text-red-400">Very High ⚠️</span>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Raw Data: {data?.length || 0} items |
        Processed: {chartData.labels.length} time points, {dataset.data.length} values |
        Sample: {chartData.labels[0] || 'N/A'} - {dataset.data[0] || 'N/A'} vehicles
      </div>
    </div>
  )
}

export default VehicleCountChart
