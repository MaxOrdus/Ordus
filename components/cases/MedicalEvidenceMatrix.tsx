'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MedicalProvider } from '@/types/pi-case'
import { cn } from '@/lib/utils'

interface MedicalEvidenceMatrixProps {
  providers: MedicalProvider[]
  caseId: string
  onRequestRecords?: (providerId: string) => void
}

export function MedicalEvidenceMatrix({
  providers,
  caseId,
  onRequestRecords,
}: MedicalEvidenceMatrixProps) {
  // Get unique years from all providers
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

  const getProviderStatus = (provider: MedicalProvider, year: number) => {
    if (!provider.lastRecordDate) return 'missing'
    
    const recordYear = new Date(provider.lastRecordDate).getFullYear()
    if (recordYear === year) return 'obtained'
    if (recordYear < year && provider.recordsObtained) return 'obtained'
    
    // Check for gaps
    if (provider.gapDetected) {
      const gapStart = provider.gapStartDate ? new Date(provider.gapStartDate).getFullYear() : null
      const gapEnd = provider.gapEndDate ? new Date(provider.gapEndDate).getFullYear() : null
      
      if (gapStart && gapEnd && year >= gapStart && year <= gapEnd) {
        return 'gap'
      }
    }
    
    return 'missing'
  }

  const getCellColor = (status: string) => {
    switch (status) {
      case 'obtained':
        return 'bg-green-500/20 border-green-500'
      case 'gap':
        return 'bg-living-coral/20 border-living-coral animate-pulse-slow'
      default:
        return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
    }
  }

  const getCellIcon = (status: string) => {
    switch (status) {
      case 'obtained':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'gap':
        return <AlertCircle className="w-4 h-4 text-living-coral" />
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <Card variant="glass" className="p-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Medical Evidence Matrix</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Track medical records by provider and year. Click red cells to request missing records.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Generate AOD
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Records Obtained</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-living-coral" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Gap Detected</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Missing</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 font-semibold text-deep-indigo dark:text-vapor sticky left-0 bg-vapor dark:bg-deep-indigo z-10">
                  Provider
                </th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="text-center p-2 font-semibold text-deep-indigo dark:text-vapor min-w-[80px]"
                  >
                    {year}
                  </th>
                ))}
                <th className="text-center p-2 font-semibold text-deep-indigo dark:text-vapor">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider, index) => (
                <motion.tr
                  key={provider.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <td className="p-3 sticky left-0 bg-vapor dark:bg-deep-indigo z-10">
                    <div>
                      <p className="font-medium text-deep-indigo dark:text-vapor">
                        {provider.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{provider.type}</p>
                    </div>
                  </td>
                  {years.map((year) => {
                    const status = getProviderStatus(provider, year)
                    const isGap = status === 'gap'
                    const isMissing = status === 'missing'

                    return (
                      <td key={year} className="p-2 text-center">
                        <motion.button
                          onClick={() => {
                            if ((isGap || isMissing) && onRequestRecords) {
                              onRequestRecords(provider.id)
                            }
                          }}
                          className={cn(
                            'w-full h-12 rounded-lg border-2 flex items-center justify-center transition-all',
                            getCellColor(status),
                            (isGap || isMissing) && 'cursor-pointer hover:scale-110',
                            isGap && 'animate-pulse-slow'
                          )}
                          whileHover={isGap || isMissing ? { scale: 1.1 } : {}}
                          whileTap={isGap || isMissing ? { scale: 0.95 } : {}}
                        >
                          {getCellIcon(status)}
                        </motion.button>
                      </td>
                    )
                  })}
                  <td className="p-2">
                    {!provider.recordsObtained && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRequestRecords?.(provider.id)}
                      >
                        Request
                      </Button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {providers.filter((p) => p.recordsObtained).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Providers with Records</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-living-coral">
              {providers.filter((p) => p.gapDetected).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Gaps Detected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-500">
              {providers.filter((p) => !p.recordsObtained).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Missing Records</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

