import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { downloadReport } from '../../services/api'

function Reports() {
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      await downloadReport('872981a6-f7fc-4c9d-9479-c7d57135dfb2', selectedFormat)
      toast.success('Report downloaded successfully')
    } catch (error) {
      const message = error.message.includes('incomplete') 
        ? 'Cannot download report: Allocation is incomplete - all courses must have students'
        : error.message
      setError(message)
      toast.error(message)
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
          </select>

          <button
            onClick={handleDownload}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports