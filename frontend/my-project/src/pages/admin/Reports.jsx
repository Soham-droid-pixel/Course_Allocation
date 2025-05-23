import { useState } from 'react'
import { downloadReport } from '../../services/api'

function Reports() {
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const data = await downloadReport('latest', selectedFormat)
      // Handle file download
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `allocation-report.${selectedFormat}`
      a.click()
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Allocation Reports</h2>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>

          <button
            onClick={handleDownload}
            disabled={loading}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary disabled:opacity-50"
          >
            {loading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Reports