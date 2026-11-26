# Furniture ERP — Secure LAN & Git Workflow Guide

## 1. Core Architecture (Dev vs Live Separation)

Keep **two separate folders** so staff using the Live ERP are never affected while you code:

| Environment | Folder | Git Branch | How It Runs |
|---|---|---|---|
| **Development** | `C:\Users\User\Desktop\ERP Furniture` | `development` | `manage.py runserver` (`:8000`) + `npm run dev` (`:5173`) |
| **Live LAN Server** | `C:\ERP-Live` | `main` (only) | `scripts\start-lan-server.bat` (Waitress WSGI + WhiteNoise serving built `Frontend\dist`) |

Staff PCs on the office Wi-Fi/LAN simply open **`http://<SERVER-LAN-IP>:8000`** in their browser.
- **Zero CORS issues:** Frontend and `/api` + `/media` are served from the same origin (`:8000`).
- **Source code protected:** `Frontend` is served as a compiled production bundle (`Frontend/dist`), and `DEBUG=False` hides Python tracebacks.
- **No source-folder sharing needed:** Do **not** share `ERP Furniture` or `C:\ERP-Live` code folders over Windows Network Sharing.

---

## 2. One-Time Live LAN Setup

On the office server PC (run PowerShell **as Administrator** if enabling the firewall rule):

```powershell
cd "C:\Users\User\Desktop\ERP Furniture"
powershell -ExecutionPolicy Bypass -File .\scripts\setup-live-lan.ps1 -LiveDir "C:\ERP-Live" -ConfigureFirewall
```

What this does automatically:
1. Clones only the `main` branch into `C:\ERP-Live`.
2. Creates `C:\ERP-Live\Backend\venv` and installs `requirements.txt` (including `waitress`, `whitenoise`, `python-dotenv`).
3. Generates `C:\ERP-Live\Backend\.env` with a strong random `SECRET_KEY`, `DEBUG=False`, your LAN IP in `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`, and `DB_*` settings.
4. Runs `migrate`, `collectstatic`, `check`, and builds `Frontend\dist`.
5. Adds a Windows Firewall rule for TCP `8000` restricted to **Private / Domain** networks only (blocked on Public Wi-Fi).

Start the Live LAN server anytime by double-clicking:
- `C:\ERP-Live\scripts\start-lan-server.bat`

---

## 3. Daily Development → Live Release Workflow

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
   - `deploy-live.bat` automatically takes a full backup (`pg_dump` / `db.sqlite3`, `.env`, `media/`, and `repo.bundle`) before pulling `main`, migrating, and rebuilding `Frontend`.

---

## 4. Emergency Rollback

If a live update introduces a bug:

```powershell
cd C:\ERP-Live
powershell -ExecutionPolicy Bypass -File .\scripts\rollback-live.ps1 -TargetRef HEAD~1
```

If database migrations changed in the broken update, restore `postgres_backup.dump` (via `pg_restore`) or `db.sqlite3` from `C:\ERP-Backups\`.

---

## 5. Automated Daily Backups

`scripts\backup-erp.bat` safely snapshots:
- PostgreSQL database via `pg_dump -F c` (or `db.sqlite3` via SQLite online backup API)
- `Backend\.env`
- `Backend\media\` (or configured `MEDIA_ROOT`)
- Full offline Git history (`repo.bundle`)
- Keeps the newest 30 snapshots in `C:\ERP-Backups`

To automate daily backups (and/or auto-start the server on boot), use **Windows Task Scheduler**:
- **Daily Backup (e.g. 8:00 PM):** Action -> `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\ERP-Live\scripts\backup-erp.ps1"`
- **Auto-start Server at Boot:** Action -> `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\ERP-Live\scripts\start-lan-server.ps1"`

> **Off-PC Safety Rule:** Sync `C:\ERP-Backups` to an external USB hard drive, NAS, or encrypted cloud backup so a single PC failure never loses business data.

---

## 6. Optional: 100% Offline Git (Without GitHub)

If you ever want zero internet dependency even for Git:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-offline-git-remote.ps1 -BareRepoPath "D:\ERP-Git-Server\Furniture-ERP.git"
```
Then push to `lan` instead of `origin` and clone `C:\ERP-Live` from that bare repo path.
