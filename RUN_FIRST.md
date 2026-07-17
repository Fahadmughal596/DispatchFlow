# Run This Project on Windows

Open PowerShell in the folder that contains `package.json`.

```powershell
Get-Item .\package.json
Set-ExecutionPolicy -Scope Process Bypass
.\SETUP_WINDOWS.ps1
corepack pnpm dev
```

Open:

```text
http://127.0.0.1:3000/portal/dashboard
```

If PowerShell says no `package.json` was found, you are one folder too high or in the wrong folder. Use:

```powershell
Get-ChildItem -Path . -Recurse -Filter package.json -ErrorAction SilentlyContinue |
Where-Object { $_.FullName -notmatch "node_modules|\\.next" } |
Select-Object -First 5 FullName
```

Then `cd` into the parent folder of the correct result.
