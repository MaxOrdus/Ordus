# Ordus Desktop App Build Guide

## 🖥️ Building Desktop Apps for Distribution

This guide shows you how to package Ordus as installable desktop apps for Mac, Windows, and Linux.

---

## 📦 Install Dependencies

```bash
cd Ordus
npm install
```

---

## 🚀 Build for Current Platform

### Development Mode (with hot reload)
```bash
npm run electron-dev
```

### Production Build
```bash
npm run electron-build
```

---

## 🎯 Build for Specific Platforms

### macOS (.dmg, .zip)
```bash
npm run electron-build:mac
```
Output: `dist/Ordus Legal-1.0.0.dmg`, `dist/Ordus Legal-1.0.0-mac.zip`

### Windows (.exe installer, portable)
```bash
npm run electron-build:win
```
Output: `dist/Ordus Legal Setup 1.0.0.exe`, `dist/Ordus Legal 1.0.0.exe` (portable)

### Linux (.AppImage, .deb, .rpm)
```bash
npm run electron-build:linux
```
Output: `dist/Ordus Legal-1.0.0.AppImage`, `dist/ordus-legal_1.0.0_amd64.deb`

### All Platforms at Once
```bash
npm run electron-build:all
```

---

## 📤 Distribute Your App

### GitHub Releases (Recommended)

1. Push to GitHub with proper version tag:
```bash
git add -A
git commit -m "Prepare v1.0.0 release"
git tag v1.0.0
git push origin v1.0.0
```

2. GitHub Actions will automatically build and attach installers to releases (if configured)

3. Or manually upload the files from `dist/` folder to GitHub Releases

### Direct Distribution

Share the files directly:
- **Mac**: `Ordus Legal-1.0.0.dmg` (drag to Applications)
- **Windows**: `Ordus Legal Setup 1.0.0.exe` (run installer)
- **Linux**: `Ordus Legal-1.0.0.AppImage` (make executable and run)

---

## 🔧 Before Building

### 1. Update Version
Edit `package.json` and update the version number:
```json
{
  "version": "1.0.0"
}
```

### 2. Configure Supabase
Ensure `.env.local` has your production Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### 3. Add App Icons (Optional)
Place icons in `electron/build/`:
- `icon.icns` - macOS (1024x1024)
- `icon.ico` - Windows (256x256)
- `icon.png` - Linux (512x512)

---

## 🔄 Auto-Updates

The app includes automatic update checking via GitHub Releases.

To enable:
1. Set up GitHub repository
2. Create releases with version tags
3. Update `build.publish` in `package.json` with your repo details

---

## 🐛 Troubleshooting

### Build fails on Mac
```bash
# Code signing issues (for distribution)
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run electron-build:mac
```

### Windows build on Mac/Linux
```bash
# Install Wine for Windows builds on Mac/Linux
brew install wine
npm run electron-build:win
```

### Linux build on Mac
```bash
# Install Docker for Linux builds on Mac
docker run --rm -v $(pwd):/project -w /project electronuserland/builder npm run electron-build:linux
```

---

## 📋 Quick Build Checklist

- [ ] Update version in `package.json`
- [ ] Configure production Supabase credentials
- [ ] Add app icons (optional)
- [ ] Run `npm run build` to test Next.js export
- [ ] Run `npm run electron-build:mac` (test locally)
- [ ] Create GitHub release with tag
- [ ] Upload build artifacts

---

## 🎉 You're Done!

Your Ordus app can now be installed on any desktop just like a native app!
