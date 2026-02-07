// Server component wrapper for case detail page
import CaseDetailClient from './CaseDetailClient'

// Generate static params for build (required for output: export)
export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

// Server component that renders the client component
export default function CaseDetailPage() {
  return <CaseDetailClient />
}
