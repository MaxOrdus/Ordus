'use client'

import * as React from 'react'
import { GlobalNavRail } from '@/components/navigation/GlobalNavRail'
import { SplitViewNavigator, ListItem } from '@/components/navigation/SplitViewNavigator'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Phone, MapPin, Briefcase, Plus, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { getClients, ClientRecord } from '@/lib/db/clients'

interface ClientListItem extends ListItem {
  email?: string
  phone?: string
  address?: string
  caseCount: number
  totalValue: number
}

function transformToListItem(client: ClientRecord): ClientListItem {
  return {
    id: client.id,
    title: client.name,
    subtitle: client.notes || 'Client',
    email: client.email,
    phone: client.phone,
    address: client.address,
    caseCount: client.caseCount || 0,
    totalValue: client.totalValue || 0,
    status: 'fresh',
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clients, setClients] = React.useState<ClientListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = React.useState<string | undefined>()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch clients
  React.useEffect(() => {
    async function fetchClients() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const data = await getClients()
        const transformed = data.map(transformToListItem)
        setClients(transformed)

        if (transformed.length > 0 && !selectedClientId) {
          setSelectedClientId(transformed[0].id)
        }
      } catch (err: any) {
        console.error('Error fetching clients:', err)
        setError(err.message || 'Failed to load clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [user])

  const filteredClients = React.useMemo(() => {
    if (!searchQuery) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.subtitle?.toLowerCase().includes(query)
    )
  }, [searchQuery, clients])

  const selectedClient = filteredClients.find((c) => c.id === selectedClientId)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderClientDetail = (client: ClientListItem) => (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-2">
            {client.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{client.subtitle}</p>
        </div>
        <Badge variant="outline">{client.caseCount} {client.caseCount === 1 ? 'case' : 'cases'}</Badge>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${client.email}`} className="text-electric-teal hover:underline">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${client.phone}`} className="text-electric-teal hover:underline">
                {client.phone}
              </a>
            </div>
          )}
          {client.address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-1" />
              <span className="text-gray-700 dark:text-gray-300">{client.address}</span>
            </div>
          )}
          {!client.email && !client.phone && !client.address && (
            <p className="text-gray-500 text-sm">No contact information available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-electric-teal">{client.caseCount}</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-electric-teal">
              ${client.totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => router.push(`/cases?clientId=${client.id}`)}>
          View Cases
        </Button>
        {client.email && (
          <Button variant="secondary" onClick={() => window.location.href = `mailto:${client.email}`}>
            Send Email
          </Button>
        )}
        <Button variant="ghost">Edit Client</Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-vapor dark:bg-deep-indigo">
      <GlobalNavRail activeItem="clients" onItemClick={(id) => {
        if (id === 'clients') return
        router.push(id === 'dashboard' ? '/' : `/${id}`)
      }} />

      <main className="flex-1 ml-20 h-full flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-deep-indigo dark:text-vapor mb-1">Clients</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? 'Loading...' : `${filteredClients.length} ${filteredClients.length === 1 ? 'client' : 'clients'}`}
            </p>
          </div>
          <Button onClick={() => alert('New client form coming soon!')}>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </div>

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
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <User className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-deep-indigo dark:text-vapor mb-2">No clients yet</h3>
              <p className="text-gray-500 mb-4">Add your first client to get started</p>
              <Button onClick={() => alert('New client form coming soon!')}>
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
            </div>
          ) : (
            <SplitViewNavigator
              items={filteredClients}
              selectedId={selectedClientId}
              onSelect={(item) => setSelectedClientId(item.id)}
              renderDetail={selectedClient ? () => renderClientDetail(selectedClient) : undefined}
              searchPlaceholder="Search clients..."
              emptyMessage="No clients found"
              onFilter={(query) => setSearchQuery(query)}
            />
          )}
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  )
}
