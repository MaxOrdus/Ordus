# Ordus - Functional Vibrancy Legal Practice Management

A next-generation legal practice management software built with vibrant design principles and intelligent workflows. This application implements the "Functional Vibrancy" architectural blueprint, combining beautiful UI/UX with deep legal functionality.

## Features

### Authentication & User Management ✅
- ✅ Login/Signup pages with role selection
- ✅ Role-based access control (RBAC)
- ✅ User activity tracking
- ✅ Session management

### Ontario PI Practice Features ✅
- ✅ **SABS Workflow Management** - Complete workflow based on AB Manual
  - OCF form tracking (OCF-1, OCF-3, OCF-18)
  - Category management (MIG, Non-MIG, CAT)
  - LAT application management
  - Treatment gap detection
  - File opening memo template
  - Client review form template
- ✅ **Tort Litigation Management**
  - Dual-rail timeline visualization
  - Undertakings tracking
  - Pre-trial/trial management
  - Settlement negotiation tracker
- ✅ **Evidence Management**
  - Medical evidence matrix
  - Expert reports manager (Rule 53.03 compliance)
  - Document organization
- ✅ **Financial Management**
  - Settlement calculator
  - SABS/Tort hydraulic calculator
  - Disbursement tracking with burn rate analysis
  - Settlement offer tracking

## Features

### Phase 1: Core Foundation ✅
- ✅ **Functional Vibrancy Design System** - Vibrant color palette with glassmorphism effects
- ✅ **Global Navigation Rail** - Fixed left sidebar with smooth animations
- ✅ **Split-View Navigator** - Fluid interface for list/detail navigation (with resizable divider)
- ✅ **Case Pulse Visualization** - Interactive card-based view showing case health and urgency
- ✅ **Command Palette** - Spotlight-style quick navigation (⌘K)
- ✅ **Dashboard** - Real-time case velocity and health metrics

### Phase 2: Intelligence Layer ✅
- ✅ **SABS vs. Tort Dual-Rail Timeline** - Visual timeline showing parallel SABS/Tort workflows
- ✅ **Treatment Gap Detector** - Automated detection and alerts for treatment gaps
- ✅ **Settlement Calculator** - Reverse-engineering calculator for settlement negotiations
- ✅ **Mobile "Court Mode"** - High-contrast mobile interface with offline detection and geofencing
- ✅ **SABS Workflow Checklist** - Comprehensive checklist based on AB Manual with checkboxes
- ✅ **SABS Timeline** - Chronological workflow visualization
- ✅ **File Opening Memo** - Template for case intake documentation
- ✅ **Client Review Form** - Template for regular client check-ins
- ✅ **OCF Form Tracker** - Track OCF-1, OCF-3, OCF-18 with automatic deadline calculations
- ✅ **LAT Application Manager** - Manage License Appeal Tribunal applications
- ✅ **Expert Reports Manager** - Track expert reports with Rule 53.03 compliance
- ✅ **Undertakings Module** - Manage discovery undertakings
- ✅ **Medical Evidence Matrix** - Visual grid of medical records by provider
- ✅ **Pre-Trial Manager** - Trial preparation checklist and deadline tracking

### Phase 3: Engagement Layer ✅
- ✅ **Billable Streak mechanics** - Activity ring with streak tracking
- ✅ **Case Velocity Stream Graphs** - Visual pipeline of cases through stages
- ✅ **Automated Workflows** - Task generation from deadlines, treatment gaps, and case events
- ✅ **Email Reminders** - Scheduled reminders for critical deadlines
- ✅ **Activity Tracking** - User activity logging system
- ✅ **Role-Based Access Control** - Permissions for Lawyer, Law Clerk, Legal Assistant, AB Coordinator

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm start
```

## Design System

### Color Palette
- **Deep Indigo** (#2A2F4F) - Structural base, navigation
- **Electric Teal** (#00D2D3) - Primary actions, active states
- **Living Coral** (#FF6B6B) - Critical alerts, stalled cases
- **Vapor** (#F4F6F8) - Canvas background
- **Violet-to-Cyan Gradient** - Data visualization

### Key Design Principles
1. **Functional Vibrancy** - Color as semantic layer, not decoration
2. **Glassmorphism** - Translucent surfaces for context preservation
3. **Kinetic Typography** - Dynamic text animations
4. **Immersive Scrolling** - Continuous, fluid navigation
5. **Micro-interactions** - Satisfying feedback loops

## Project Structure

```
ordus/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── navigation/       # Navigation components
│   ├── dashboard/        # Dashboard visualizations
│   └── command-palette/  # Command palette
├── lib/                  # Utilities
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## Development Roadmap

See the architectural blueprint document for detailed implementation phases and specifications.

## License

Proprietary - All rights reserved

