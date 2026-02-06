'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Check, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { parseCSVFile, ParsedCaseData } from '@/lib/csv-parser-custom'
import { importCasesFromCSV } from '@/lib/csv-import-service'
import { extractTeamMembers, generateUserCreationSQL, TeamMemberInfo } from '@/lib/csv-team-extractor'
import { useAuth } from '@/components/auth/AuthProvider'

interface MigrationWizardProps {
  onComplete?: () => void
  onCancel?: () => void
}

export function MigrationWizard({ onComplete, onCancel }: MigrationWizardProps) {
  const { user } = useAuth()
  const [step, setStep] = React.useState(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [validCases, setValidCases] = React.useState<ParsedCaseData[]>([])
  const [invalidCases, setInvalidCases] = React.useState<Array<{ row: number; data: ParsedCaseData; errors: string[] }>>([])
  const [importStats, setImportStats] = React.useState<{ totalRows: number; validRows: number; invalidRows: number; skippedRows: number } | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [importResult, setImportResult] = React.useState<{ success: number; failed: number; errors: Array<{ row: number; error: string }>; teamMembers: TeamMemberInfo[]; unmatchedLawyers: string[] } | null>(null)
  const [extractedTeamMembers, setExtractedTeamMembers] = React.useState<TeamMemberInfo[]>([])
  const [importProgress, setImportProgress] = React.useState<{ current: number; total: number; percentage: number; currentCase: string } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setIsProcessing(true)

    try {
      // Parse CSV file
      const { valid, invalid, stats } = await parseCSVFile(uploadedFile)
      setValidCases(valid)
      setInvalidCases(invalid)
      setImportStats(stats)
      
      // Extract team members from valid cases
      const teamMembers = extractTeamMembers(valid)
      setExtractedTeamMembers(teamMembers)
      
      setStep(2)
    } catch (error: any) {
      alert(`Error parsing CSV: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!user?.firmId) {
      alert('Error: User not linked to a firm')
      return
    }

    setIsProcessing(true)
    setImportProgress({ current: 0, total: validCases.length, percentage: 0, currentCase: 'Starting import...' })
    try {
      const result = await importCasesFromCSV(validCases, user.firmId, (progress) => {
        // Use a small delay to ensure React can process the state update
        setTimeout(() => {
          setImportProgress(progress)
        }, 0)
      })
      setImportResult(result)
      setImportProgress(null)
      setStep(3)
    } catch (error: any) {
      alert(`Import failed: ${error.message}`)
      setImportProgress(null)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl mx-4"
      >
        <Card variant="elevated" className="p-8">
          {/* Step 1: File Upload */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-2">
                    Import Your Data
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Upload a CSV file to migrate your cases
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 mb-6 hover:border-electric-teal transition-colors">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-deep-indigo dark:text-vapor">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        CSV files only (max 10MB)
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Mapping Review */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-2">
                    Review Import Data
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We&apos;ve parsed your CSV file. Review the results below.
                  </p>
                  {importStats && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total Rows:</span> {importStats.totalRows}
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                          <span className="font-medium">Valid:</span> {importStats.validRows}
                        </div>
                        <div className="text-yellow-600 dark:text-yellow-400">
                          <span className="font-medium">Invalid:</span> {importStats.invalidRows}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Skipped:</span> {importStats.skippedRows}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Valid Cases Preview */}
                {validCases.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {validCases.length} valid case(s) ready to import
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-900/10">
                      {validCases.slice(0, 5).map((caseData, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">
                            {caseData.fileNumber ? `${caseData.clientName} - ${caseData.fileNumber}` : caseData.clientName}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            (DOL: {caseData.dateOfLoss})
                            {caseData.lawyerName && ` - Lawyer: ${caseData.lawyerName}`}
                          </span>
                        </div>
                      ))}
                      {validCases.length > 5 && (
                        <p className="text-xs text-gray-500">...and {validCases.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Invalid Cases */}
                {invalidCases.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">
                        {invalidCases.length} case(s) with errors (will be skipped)
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 bg-yellow-50/50 dark:bg-yellow-900/10">
                      {invalidCases.slice(0, 5).map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">Row {item.row}:</span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            {item.errors.join(', ')}
                          </span>
                        </div>
                      ))}
                      {invalidCases.length > 5 && (
                        <p className="text-xs text-gray-500">...and {invalidCases.length - 5} more errors</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Team Members Found */}
                {extractedTeamMembers.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <FileSpreadsheet className="w-5 h-5 text-electric-teal" />
                      <span className="font-medium text-deep-indigo dark:text-vapor">
                        {extractedTeamMembers.length} Team Member(s) Found in CSV
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-electric-teal/30 dark:border-electric-teal/20 rounded-lg p-3 bg-electric-teal/5 dark:bg-electric-teal/5">
                      {extractedTeamMembers.map((member, index) => (
                        <div key={index} className="text-sm flex items-center justify-between">
                          <div>
                            <span className="font-medium">{member.name}</span>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              ({member.role}) - {member.count} case(s)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 These team members will be matched to existing users or preserved in case notes if not found.
                    </p>
                  </div>
                )}

                {validCases.length === 0 && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      No valid cases found in CSV. Please check the file format.
                    </p>
                  </div>
                )}

                {/* Progress indicator during import */}
                {isProcessing && importProgress && (
                  <div className="mb-6 p-4 bg-electric-teal/10 border border-electric-teal/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-deep-indigo dark:text-vapor">
                        Importing cases... {importProgress.current} of {importProgress.total}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {importProgress.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className="bg-electric-teal h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Current: {importProgress.currentCase}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Estimated time: {Math.ceil((importProgress.total - importProgress.current) * 0.2 / 60)} minutes remaining
                    </p>
                  </div>
                )}

                <div className="flex gap-4 justify-end">
                  <Button variant="ghost" onClick={() => setStep(1)} disabled={isProcessing}>
                    Back
                  </Button>
                  <Button onClick={handleImport} isLoading={isProcessing} disabled={isProcessing}>
                    {isProcessing ? 'Importing...' : 'Import Data'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-electric-teal rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-deep-indigo dark:text-vapor mb-2">
                  Import {importResult?.failed === 0 ? 'Complete!' : 'Finished'}
                </h2>
                {importResult && (
                  <div className="mb-6 space-y-4">
                    <div className="space-y-2">
                      <p className="text-green-600 dark:text-green-400">
                        ✅ {importResult.success} case(s) imported successfully
                      </p>
                      {importResult.failed > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          ❌ {importResult.failed} case(s) failed to import
                        </p>
                      )}
                      {importResult.errors.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                          {importResult.errors.slice(0, 5).map((err, i) => (
                            <div key={i}>Row {err.row}: {err.error}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unmatched Lawyers */}
                    {importResult.unmatchedLawyers.length > 0 && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="font-medium text-yellow-800 dark:text-yellow-200">
                            {importResult.unmatchedLawyers.length} Team Member(s) Not Found in Database
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                          These names were preserved in case notes. Create users for them to enable proper case assignment.
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                          {importResult.unmatchedLawyers.map((name, i) => (
                            <div key={i} className="text-sm text-yellow-800 dark:text-yellow-200">
                              • {name}
                            </div>
                          ))}
                        </div>
                        {user?.firmId && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-yellow-700 dark:text-yellow-300 font-medium hover:text-yellow-800 dark:hover:text-yellow-200">
                              📋 Click to copy SQL for creating these users
                            </summary>
                            <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-800">
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                                {generateUserCreationSQL(importResult.teamMembers.filter(m => importResult.unmatchedLawyers.includes(m.name)), user.firmId || '')}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  if (!user.firmId) return
                                  const sql = generateUserCreationSQL(
                                    importResult.teamMembers.filter(m => importResult.unmatchedLawyers.includes(m.name)),
                                    user.firmId
                                  )
                                  navigator.clipboard.writeText(sql)
                                  alert('SQL copied to clipboard!')
                                }}
                              >
                                Copy SQL
                              </Button>
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <Button onClick={onComplete}>View Cases</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  )
}

