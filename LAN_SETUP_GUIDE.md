# Furniture ERP — Secure LAN & Git Workflow Guide

## 1. Core Architecture (Dev vs Live Separation)

Keep **two separate folders** so staff using the Live ERP are never affected while you code:

| Environment | Folder | Git Branch | How It Runs |
|---|---|---|---|
| **Development** | `C:\Users\User\Desktop\ERP Furniture` | `development` | `manage.py runserver` (`:8000`) + `npm run dev` (`:5173`) |
| **Live LAN Server** | `C:\ERP-Live` | `main` (only) | `scripts\start-lan-server.bat` (Waitress WSGI + WhiteNoise serving built `Frontend\dist`) |

Staff PCs on the office Wi-Fi/LAN simply open **`http://<SERVER-LAN-IP>:8000`** in their browser.
- **Zero CORS issues:** Frontend and `/api` + `/media` are served from the same origin (`:8000`).
- **Source code protected:** `Frontend` is served as a compiled production bundle (`Frontend/dist`), and `DJANGO_DEBUG=False` hides Python tracebacks.
- **No folder sharing needed:** Do **not** share your `ERP Furniture` or `C:\ERP-Live` source folders over Windows Network Sharing.

---

## 2. One-Time Git Cleanup (Important)

Run this once in your Dev folder to stop Git from tracking compiled `.pyc` files and `db.sqlite3` (without deleting your local files):

```powershell
git rm -r --cached Backend/core/__pycache__ Backend/erp/__pycache__
git rm --cached Backend/db.sqlite3
```

Then commit `.gitignore` and your setup changes on `development`.

---

## 3. One-Time Live LAN Setup

On the office server PC (run PowerShell **as Administrator** if enabling the firewall rule):

```powershell
cd "C:\Users\User\Desktop\ERP Furniture"
powershell -ExecutionPolicy Bypass -File .\scripts\setup-live-lan.ps1 -LiveDir "C:\ERP-Live" -ConfigureFirewall
```

What this does automatically:
1. Clones only the `main` branch into `C:\ERP-Live`.
2. Creates `C:\ERP-Live\Backend\venv` and installs `requirements.txt` (including `waitress`, `whitenoise`, `python-dotenv`).
3. Generates `C:\ERP-Live\Backend\.env` with a strong random `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, and your LAN IP in `DJANGO_ALLOWED_HOSTS`.
4. Runs `migrate`, `collectstatic`, `check`, and builds `Frontend\dist`.
5. Adds a Windows Firewall rule for TCP `8000` restricted to **Private / Domain** networks only (blocked on Public Wi-Fi).

> If you already have live data in `Backend\db.sqlite3` and `Backend\media\`, copy them once into `C:\ERP-Live\Backend\`.

Start the Live LAN server anytime by double-clicking:
- `C:\ERP-Live\scripts\start-lan-server.bat`

---

## 4. Daily Development → Live Release Workflow

1. **Develop & test** on `development` branch in your Dev folder.
2. **Commit & push `development`:**
   ```powershell
   git add -A
   git commit -m "Describe your change"
   git push origin development
   ```
3. **Promote tested code to `main`:**
   ```powershell
   git checkout main
   git pull origin main
   git merge development
   git push origin main
   git checkout development
   ```
4. **Update Live LAN Server:**
   - Stop `start-lan-server.bat` (`Ctrl+C`), run **`C:\ERP-Live\scripts\deploy-live.bat`**, and start `start-lan-server.bat` again.
   - `deploy-live.bat` automatically takes a full backup (`db.sqlite3`, `.env`, `media/`, and `repo.bundle`) before pulling `main`, migrating, and rebuilding `Frontend`.

---

## 5. Emergency Rollback

If a live update introduces a bug:

```powershell
cd C:\ERP-Live
powershell -ExecutionPolicy Bypass -File .\scripts\rollback-live.ps1 -TargetRef HEAD~1
```

If database migrations changed in the broken update, also restore `db.sqlite3` from the timestamped folder inside `C:\ERP-Backups\`.

---

## 6. Automated Daily Backups

`scripts\backup-erp.bat` safely snapshots:
- `db.sqlite3` using Python's online SQLite backup API (safe even while users are logged in)
- `Backend\.env`
- `Backend\media\`
- Full offline Git history (`repo.bundle`)
- Keeps the newest 30 snapshots in `C:\ERP-Backups`

To automate daily backups (and/or auto-start the server on boot), use **Windows Task Scheduler**:
- **Daily Backup (e.g. 8:00 PM):** Action -> `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\ERP-Live\scripts\backup-erp.ps1"`
- **Auto-start Server at Boot:** Action -> `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\ERP-Live\scripts\start-lan-server.ps1"`

> **Off-PC Safety Rule:** Keep `C:\ERP-Backups` synced to an external USB hard drive, NAS, or your private GitHub/cloud backup so a single PC failure never loses business data.

---

## 7. Optional: 100% Offline Git (Without GitHub)

If you ever want zero internet dependency even for Git:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-offline-git-remote.ps1 -BareRepoPath "D:\ERP-Git-Server\Furniture-ERP.git"
```
Then push to `lan` instead of `origin` and clone `C:\ERP-Live` from that bare repo path.
