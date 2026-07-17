# Run the refined Dispatcher side

## 1. Start MySQL
Open Laragon and click **Start All**. MySQL must be running.

## 2. Open PowerShell in this project
```powershell
cd "YOUR_EXTRACTED_PROJECT_PATH"
```

## 3. Confirm the correct folder
```powershell
Get-Item .\package.json
```

## 4. Install dependencies
```powershell
corepack enable
corepack pnpm install
```

## 5. Create `.env` when missing
```powershell
Copy-Item .env.example .env
notepad .env
```
Default Laragon MySQL example:
```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/dispatchflow_nextjs"
```

## 6. Prepare the database
```powershell
corepack pnpm prisma generate
corepack pnpm prisma db push
corepack pnpm run db:seed
```

## 7. Validate and run
```powershell
corepack pnpm run typecheck
corepack pnpm dev
```

Open:
- Login: `http://127.0.0.1:3000/login`
- Dispatcher dashboard: `http://127.0.0.1:3000/consultant/dashboard`

Demo dispatcher:
- Email: `dispatcher1@unionenterprises.pk`
- Password: `password`

## Dispatcher behavior
Dispatcher login goes directly to the dashboard. When the profile is incomplete, a profile popup appears over the dashboard. The dispatcher can choose **Complete later** and continue working.
