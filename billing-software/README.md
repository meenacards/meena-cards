# Meena Cards Billing (Electron)

Desktop billing/POS application for Meena Cards.

## Prerequisites

- Windows 10 or Windows 11 (64-bit)
- Node.js 20+ (LTS recommended)
- pnpm 10+

## Install Dependencies

Run from project root:

```powershell
pnpm install
```

If pnpm blocks build scripts, approve them:

```powershell
pnpm approve-builds
```

## Run in Development

```powershell
pnpm start
```

## Build for Windows x64

Before building, generate/update the Windows icon file from the logo:

```powershell
pnpm make:icon
```

### 1. Create unpacked app (quick packaging test)

```powershell
pnpm pack:win
```

Output folder:

- dist\win-unpacked\

### 2. Create Windows installer (NSIS .exe)

```powershell
pnpm build:win
```

Output folder:

- dist\

Typical artifacts:

- Meena Cards Billing Setup <version>.exe
- latest.yml (if generated)

## Build Configuration

Configured in package.json under:

- scripts: make:icon, pack:win, build:win
- build: Electron Builder config
  - target: win x64
  - installer: NSIS
  - output directory: dist
  - icon: public/icon.ico

## Notes

- This project uses public/logo.png in UI and public/icon.ico for Windows installer/taskbar/search icon.
- If Windows still shows an old icon, unpin the app from taskbar, uninstall old build, install the new build, then pin again.

## Printing

- Invoice printing is configured for direct native printing (no browser preview popup) from the Billing screen.
- Default print size is thermal-style 80mm width via Electron print options.
- If no physical printer is connected, use Microsoft Print to PDF as a virtual printer for simulation/testing.

## Troubleshooting

### Electron binary issue

If Electron fails to launch after dependency changes:

```powershell
pnpm approve-builds electron
pnpm install --force
```

### Packaging script blocked

If build tools are blocked by pnpm:

```powershell
pnpm approve-builds
```

Then run build again:

```powershell
pnpm build:win
```
