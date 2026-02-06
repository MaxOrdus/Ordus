# Ordus Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### 3. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
ordus/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Dashboard (home)
│   ├── cases/page.tsx           # Cases management
│   ├── documents/page.tsx        # Document viewer
│   ├── time/page.tsx            # Time tracking
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── ui/                      # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── badge.tsx
│   ├── navigation/
│   │   ├── GlobalNavRail.tsx    # Left sidebar navigation
│   │   └── SplitViewNavigator.tsx # List/detail split view
│   ├── dashboard/
│   │   ├── CasePulseVisualization.tsx # Case health heatmap
│   │   ├── BillableStreak.tsx    # Activity ring widget
│   │   └── CaseVelocityStream.tsx # Stream graph
│   ├── command-palette/
│   │   └── CommandPalette.tsx    # ⌘K quick actions
│   └── onboarding/
│       └── MigrationWizard.tsx   # Data import wizard
├── lib/
│   ├── utils.ts                 # Utility functions
│   └── constants.ts             # App constants
├── types/
│   └── index.ts                 # TypeScript definitions
└── public/                       # Static assets
```

## Key Features Implemented

### ✅ Phase 1: Core Foundation

1. **Functional Vibrancy Design System**
   - Vibrant color palette (Electric Teal, Living Coral, Deep Indigo)
   - Glassmorphism effects with backdrop blur
   - Kinetic animations with Framer Motion
   - Dark mode support

2. **Global Navigation Rail**
   - Fixed left sidebar (80px width)
   - Smooth hover animations
   - Active state indicators
   - Command palette trigger button

3. **Split-View Navigator**
   - Fluid list/detail interface
   - Resizable divider
   - Immersive scrolling
   - Real-time search filtering

4. **Dashboard Visualizations**
   - Case Pulse Heatmap (bubble chart)
   - Billable Streak (activity ring)
   - Case Velocity Stream Graph
   - Quick stats cards

5. **Command Palette**
   - ⌘K / Ctrl+K shortcut
   - Glassmorphic overlay
   - Keyboard navigation
   - Quick actions

6. **Additional Pages**
   - Cases management with split view
   - Documents viewer
   - Time tracking with timer

## Design Tokens

### Colors
- **Deep Indigo** (`#2A2F4F`) - Navigation, structural elements
- **Electric Teal** (`#00D2D3`) - Primary actions, active states
- **Living Coral** (`#FF6B6B`) - Critical alerts, stalled cases
- **Vapor** (`#F4F6F8`) - Canvas background

### Typography
- Font: Inter (via Next.js Google Fonts)
- Headings: Bold, large sizes
- Body: Regular weight, readable sizes

### Animations
- Spring physics for natural motion
- 200-300ms transitions for responsiveness
- Micro-interactions on hover/tap

## Keyboard Shortcuts

- `⌘K` / `Ctrl+K` - Open Command Palette
- `Esc` - Close modals/palette
- `↑` / `↓` - Navigate command palette
- `Enter` - Select command

## Next Steps (Phase 2)

1. **SABS vs. Tort Integration**
   - Dual-rail timeline component
   - Benefit tracking
   - Deductible calculations

2. **Treatment Gap Detector**
   - Health rhythm calendar
   - Automated gap alerts
   - Client communication triggers

3. **Settlement Calculator**
   - Reverse-engineering Colossus
   - Interactive sliders
   - Negotiation zone visualization

4. **Mobile Court Mode**
   - Geofencing detection
   - Offline caching
   - Digital binder interface

## Development Notes

- All components are client-side (`'use client'`) for interactivity
- Framer Motion handles all animations
- Recharts used for data visualization
- TypeScript for type safety
- Tailwind CSS for styling

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Type Errors
```bash
# Regenerate TypeScript definitions
npm run build
```

