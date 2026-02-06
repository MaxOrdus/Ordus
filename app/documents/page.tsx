'use client'

import * as React from 'react'
import { DashboardLayout, PageHeader, PageContent } from '@/components/layout/DashboardLayout'
import { SplitViewNavigator, ListItem } from '@/components/navigation/SplitViewNavigator'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Eye, Calendar, File, Upload, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { getDocuments, DocumentRecord } from '@/lib/db/documents'

interface DocumentListItem extends ListItem {
  caseId?: string
  type: string
  uploadedAt: string
  size?: number
  url: string
  caseName?: string
}

function transformToListItem(doc: DocumentRecord): DocumentListItem {
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.type,
    caseId: doc.caseId,
    type: doc.type,
    uploadedAt: doc.createdAt,
    size: doc.fileSize,
    url: doc.filePath,
    status: 'fresh',
    caseName: doc.case?.title,
  }
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [documents, setDocuments] = React.useState<DocumentListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = React.useState<string | undefined>()
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch documents
  React.useEffect(() => {
    async function fetchDocuments() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const data = await getDocuments()
        const transformed = data.map(transformToListItem)
        setDocuments(transformed)

        if (transformed.length > 0 && !selectedDocId) {
          setSelectedDocId(transformed[0].id)
        }
      } catch (err: any) {
        console.error('Error fetching documents:', err)
        setError(err.message || 'Failed to load documents')
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [user])

  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery) return documents
    const query = searchQuery.toLowerCase()
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.type.toLowerCase().includes(query) ||
        d.subtitle?.toLowerCase().includes(query) ||
        d.caseName?.toLowerCase().includes(query)
    )
  }, [searchQuery, documents])

  const selectedDoc = filteredDocuments.find((d) => d.id === selectedDocId)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderDocumentDetail = (doc: DocumentListItem) => (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-2">
            {doc.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{doc.subtitle}</p>
        </div>
        <Badge variant="outline">{doc.type}</Badge>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Uploaded: </span>
            <span className="font-medium">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <File className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Size: </span>
            <span className="font-medium">{formatFileSize(doc.size)}</span>
          </div>
          {doc.caseName && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Case: </span>
              <span className="font-medium">{doc.caseName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Placeholder */}
      <Card variant="glass" className="min-h-[500px]">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Document preview will appear here
            </p>
            <p className="text-sm text-gray-500 mt-2">
              PDF viewer integration coming in Phase 2
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button>
          <Eye className="w-4 h-4 mr-2" />
          View Full Screen
        </Button>
        <Button variant="secondary">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button variant="ghost">Add Note</Button>
      </div>
    </div>
  )

  const subtitle = loading 
    ? 'Loading...' 
    : `${filteredDocuments.length} ${filteredDocuments.length === 1 ? 'document' : 'documents'}`

  return (
    <DashboardLayout activeNavId="documents">
      <div className="h-full flex flex-col">
        <PageHeader
          title="Documents"
          subtitle={subtitle}
          actions={
            <Button onClick={() => alert('Upload document form coming soon!')}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          }
        />

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-electric-teal" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertCircle className="w-12 h-12 text-living-coral mb-4" />
              <p className="text-living-coral mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-electric-teal hover:underline"
              >
                Try again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-deep-indigo dark:text-vapor mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-4">Upload your first document to get started</p>
              <Button onClick={() => alert('Upload document form coming soon!')}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          ) : (
            <SplitViewNavigator
              items={filteredDocuments}
              selectedId={selectedDocId}
              onSelect={(item) => setSelectedDocId(item.id)}
              renderDetail={selectedDoc ? () => renderDocumentDetail(selectedDoc) : undefined}
              searchPlaceholder="Search documents..."
              emptyMessage="No documents found"
              onFilter={(query) => setSearchQuery(query)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
