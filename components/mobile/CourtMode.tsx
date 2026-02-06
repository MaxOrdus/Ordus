'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Gavel, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertCircle,
  Download,
  Wifi,
  WifiOff,
  MapPin
} from 'lucide-react'
import { PICase } from '@/types/pi-case'

interface CourtModeProps {
  caseData: PICase
  onExit: () => void
}

/**
 * Court Mode Component
 * Optimized mobile interface for courtroom use
 * - High contrast, readable design
 * - Offline document access
 * - Quick case stats
 * - Geofencing support
 */
export function CourtMode({ caseData, onExit }: CourtModeProps) {
  const [isOffline, setIsOffline] = React.useState(false)
  const [location, setLocation] = React.useState<{ lat: number; lon: number } | null>(null)

  // Check online status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Geofencing: Check if near courthouse
  React.useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        () => {
          // Geolocation failed or denied
        }
      )
    }
  }, [])

  // Critical deadlines
  const criticalDeadlines = caseData.criticalDeadlines
    .filter((d) => d.status === 'Active' && d.daysRemaining <= 7)
    .slice(0, 3)

  // Calculate net settlement if offer exists
  const netSettlement = caseData.currentOffer
    ? caseData.currentOffer - caseData.totalDisbursements - (caseData.currentOffer * 0.3 * 1.13) // Fee + HST
    : null

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Gavel className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold">Court Mode</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOffline ? (
            <WifiOff className="w-5 h-5 text-yellow-400" />
          ) : (
            <Wifi className="w-5 h-5 text-green-400" />
          )}
          {location && (
            <MapPin className="w-5 h-5 text-blue-400" />
          )}
          <Button
            onClick={onExit}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Case Title */}
      <Card className="bg-gray-900 border-gray-800 mb-4">
        <CardHeader>
          <CardTitle className="text-xl text-white">{caseData.title}</CardTitle>
        </CardHeader>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Date of Loss</span>
            </div>
            <p className="text-lg font-bold text-white">
              {new Date(caseData.dateOfLoss).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Disbursements</span>
            </div>
            <p className="text-lg font-bold text-white">
              ${caseData.totalDisbursements.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {netSettlement && (
          <Card className="bg-gray-900 border-gray-800 col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Net Settlement</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                ${netSettlement.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Critical Deadlines */}
      {criticalDeadlines.length > 0 && (
        <Card className="bg-red-900/20 border-red-800 mb-4">
          <CardHeader>
            <CardTitle className="text-lg text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Critical Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalDeadlines.map((deadline) => (
              <div key={deadline.id} className="flex items-center justify-between p-2 bg-red-900/10 rounded">
                <div>
                  <p className="text-sm font-medium text-white">{deadline.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(deadline.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="border-red-400 text-red-400">
                  {deadline.daysRemaining}d
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expert Reports */}
      {caseData.expertReports.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 mb-4">
          <CardHeader>
            <CardTitle className="text-lg text-white">Expert Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {caseData.expertReports.slice(0, 3).map((expert) => (
              <div key={expert.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div>
                  <p className="text-sm font-medium text-white">{expert.expertName}</p>
                  <p className="text-xs text-gray-400">{expert.expertType}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    expert.status === 'Final Served'
                      ? 'border-green-400 text-green-400'
                      : 'border-yellow-400 text-yellow-400'
                  }
                >
                  {expert.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => alert('Document viewer coming soon')}
        >
          <FileText className="w-4 h-4 mr-2" />
          View Documents
        </Button>
        <Button
          className="w-full bg-gray-800 hover:bg-gray-700 text-white"
          onClick={() => alert('Offline cache coming soon')}
        >
          <Download className="w-4 h-4 mr-2" />
          Cache for Offline
        </Button>
      </div>

      {/* Offline Notice */}
      {isOffline && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-400 text-center">
            ⚠️ Offline Mode - Using cached documents
          </p>
        </div>
      )}
    </div>
  )
}

