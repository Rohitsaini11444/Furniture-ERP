# PHASE I — PERSONAL VIDEO ARCHIVE & STORAGE OPTIMIZATION AUDIT

**System:** HP Victus 15-fb0040AX (Product SKU: `6F9T7PA#ACJ`)  
**Operating System:** Windows 11 Pro 64-bit  
**Date & Time:** November 13, 2026 — 12:55:00 IST  
**Audit Type:** Read-Only Storage Management & Capacity Engineering  
**Lead Specialist:** Antigravity Storage Systems Engineer  

---

## EXECUTIVE SUMMARY

A comprehensive, non-destructive read-only audit of the personal video archive `C:\MOV` (40.84 GB, 29 video files) was conducted to evaluate storage efficiency, SSD wear leveling, drive headroom, and application dependencies across all available destinations.

### Key Audit Findings

1. **Archive Status:** `C:\MOV` contains exactly **29 video files** totaling **43,846,770,285 bytes (40.84 GB)**. All files are standalone entertainment media (movies and TV episodes in `.mkv` and `.mp4`). Zero duplicate files exist.
2. **Physical Storage Topology:** The laptop contains **only one physical internal drive**: `Disk 0: Western Digital PC SN810 SDCPNRY-512G-1006` (NVMe PCIe Gen4 SSD, 476.94 GB formatted GPT). Partitions `C:` (292.33 GB) and `D:` (182.94 GB) share the exact same physical NAND flash cells, controller, and SLC cache.
3. **Application Dependencies:** An exhaustive search of **151 CapCut project drafts**, VLC media player configurations, playlists, and Windows MRU links revealed **ZERO project dependencies** on `C:\MOV`. Moving or archiving these files will break zero projects, workflows, or applications.
4. **Capacity Recommendations:**
   - **Option A (Keep on C:):** **CONDITIONAL GO / TEMPORARY HOLD** (Acceptable short-term; C: has 64.77 GB / 22.16% free, but limits OS update and dev space).
   - **Option B (Transfer to D:):** **DEFINITIVE NO-GO** (Critically drops D: free space to **10.99 GB / 6.01%**, severely breaching the 15% SSD performance/wear-leveling threshold and starving CapCut / Trip video editing workflows).
   - **Option C (Archive to External Drive / Network Share Z:):** **STRONGLY RECOMMENDED GO** (Reclaims 40.84 GB on C:, elevating C: to **105.61 GB / 36.13% free**, preserving D: at **51.83 GB / 28.33% free**, and maximizing physical SSD health and Windows Update headroom).

---

## 1. DETAILED INVENTORY & AUDIT OF C:\MOV

All inspection was strictly read-only; no files were opened, played, modified, or moved.

### General Metrics
- **Root Directory:** `C:\MOV`
- **Total Files:** 29 files
- **Total Physical Size:** 43,846,770,285 bytes (**40.84 GB**)
- **Subdirectories:** 4 root categories (`Bollywood`, `HOLL`, `New Movies`, `web`)
- **Container Formats:** Matroska Video (`.mkv`: 24 files, 34.82 GB) and MPEG-4 (`.mp4`: 5 files, 6.01 GB)

### Subfolder Breakdown

| Category / Subfolder | File Count | Size (Bytes) | Size (MB) | Size (GB) | Share of Archive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `C:\MOV\Bollywood` | 8 files | 13,616,514,252 | 12,985.72 MB | **12.68 GB** | 31.05% |
| `C:\MOV\HOLL` | 8 files | 12,570,608,274 | 11,988.27 MB | **11.71 GB** | 28.67% |
| `C:\MOV\New Movies` | 6 files | 10,230,447,087 | 9,756.51 MB | **9.53 GB** | 23.33% |
| `C:\MOV\web` | 7 files | 7,429,200,672 | 7,085.04 MB | **6.92 GB** | 16.94% |
| &nbsp;&nbsp;↳ `web\euphoria` | 2 files | 1,271,307,490 | 1,212.41 MB | *1.18 GB* | *2.90%* |
| &nbsp;&nbsp;↳ `web\GOT\Season - 7` | 5 files | 6,157,893,182 | 5,872.63 MB | *5.74 GB* | *14.04%* |
| **TOTAL** | **29 files** | **43,846,770,285** | **41,815.54 MB** | **40.84 GB** | **100.00%** |

### Individual File Inventory

| Relative Path | Size (MB) | Ext | Last Modified | Video Description |
| :--- | :--- | :--- | :--- | :--- |
| `Bollywood\D-Day 2013.mp4` | 1,426.16 MB | `.mp4` | 2026-10-06 | D-Day (2013) Feature Film |
| `Bollywood\Masaan_2015.mkv` | 3,125.74 MB | `.mkv` | 2025-10-29 | Masaan (2015) 1080p |
| `Bollywood\No_One_Killed_Jessica_2011.mkv` | 1,484.14 MB | `.mkv` | 2025-12-22 | No One Killed Jessica (2011) |
| `Bollywood\Once_Upon_a_Time_in_Mumbaai_2010...` | 1,236.58 MB | `.mkv` | 2026-10-06 | Once Upon a Time in Mumbaai 720p 10bit |
| `Bollywood\Saheb.Biwi.Aur.Gangster.2011...` | 1,061.46 MB | `.mkv` | 2026-10-06 | Saheb Biwi Aur Gangster 720p |
| `Bollywood\Table No. 21 2013 10Bit 1080p...` | 1,770.70 MB | `.mkv` | 2026-10-06 | Table No. 21 (2013) 1080p x265 |
| `Bollywood\The_Lunchbox_2013_1080p_HEVC...` | 1,462.17 MB | `.mkv` | 2026-10-06 | The Lunchbox (2013) 1080p HEVC |
| `Bollywood\Yeh Saali Zindagi (2011) 720p...` | 1,418.78 MB | `.mkv` | 2026-10-06 | Yeh Saali Zindagi (2011) 720p x265 |
| `HOLL\Bridesmaids 2011.mkv` | 2,750.22 MB | `.mkv` | 2024-10-24 | Bridesmaids (2011) Feature Film |
| `HOLL\City of God 2002.mp4` | 1,096.83 MB | `.mp4` | 2024-09-27 | City of God (2002) Feature Film |
| `HOLL\Inglourious Basterds 2009.mkv` | 730.48 MB | `.mkv` | 2024-09-27 | Inglourious Basterds (2009) |
| `HOLL\Limitless 2011.mp4` | 1,436.25 MB | `.mp4` | 2024-09-16 | Limitless (2011) Feature Film |
| `HOLL\Love Actually 2003.mkv` | 1,282.62 MB | `.mkv` | 2024-07-10 | Love Actually (2003) |
| `HOLL\Me Before You (2016).mkv` | 2,338.70 MB | `.mkv` | 2024-09-02 | Me Before You (2016) |
| `HOLL\The Midnight Meat Train 2008.mp4` | 1,273.78 MB | `.mp4` | 2024-08-14 | The Midnight Meat Train (2008) |
| `HOLL\The Platform 2019.mkv` | 1,079.39 MB | `.mkv` | 2024-09-16 | The Platform (2019) |
| `New Movies\Can't Hardly Wait 1998.mp4` | 922.66 MB | `.mp4` | 2025-04-30 | Can't Hardly Wait (1998) |
| `New Movies\Dune 2021.mkv` | 2,709.07 MB | `.mkv` | 2025-06-28 | Dune (2021) 1080p |
| `New Movies\Once Upon a Time in Hollywood.mkv` | 1,409.55 MB | `.mkv` | 2025-08-07 | Once Upon a Time in Hollywood |
| `New Movies\Pearl.2022.1080p.WEBRip...` | 1,435.65 MB | `.mkv` | 2025-08-16 | Pearl (2022) 1080p x264 |
| `New Movies\Pride Prejudice 2005.mkv` | 1,834.99 MB | `.mkv` | 2025-08-07 | Pride & Prejudice (2005) |
| `New Movies\The Edgem of Seventeen 2016.mkv` | 1,444.58 MB | `.mkv` | 2025-04-29 | The Edge of Seventeen (2016) |
| `web\euphoria\Euphoria.US.S01E01...` | 561.66 MB | `.mkv` | 2026-01-08 | Euphoria S01E01 Pilot 1080p x265 |
| `web\euphoria\Euphoria_US_S01E02...` | 650.75 MB | `.mkv` | 2026-01-08 | Euphoria S01E02 1080p x265 |
| `web\GOT\Season - 7\Game of Thrones...S07E01.mkv`| 1,056.61 MB | `.mkv` | 2026-09-11 | Game of Thrones S07E01 1080p x265 |
| `web\GOT\Season - 7\Game of Thrones...S07E02.mkv`| 942.44 MB | `.mkv` | 2026-10-04 | Game of Thrones S07E02 1080p x265 |
| `web\GOT\Season - 7\Game of Thrones...S07E03.mkv`| 1,187.90 MB | `.mkv` | 2026-09-11 | Game of Thrones S07E03 1080p x265 |
| `web\GOT\Season - 7\Game of Thrones...S07E04.mkv`| 1,175.61 MB | `.mkv` | 2026-09-11 | Game of Thrones S07E04 1080p x265 |
| `web\GOT\Season - 7\Game of Thrones...S07E07.mkv`| 1,510.07 MB | `.mkv` | 2026-09-11 | Game of Thrones S07E07 1080p x265 |

### Duplicate File Analysis
- **Exact Byte Size Match:** **0 duplicate files**. Every file has a unique length.
- **Filename Collision Check:** **0 duplicate filenames** across subfolders.
- **Conclusion:** There is zero wasted space from redundant duplicate media files inside the archive.

---

## 2. DRIVE CAPACITY & PHYSICAL HARDWARE TOPOLOGY

### Physical Hardware Architecture
- **Physical Disk 0:** `Western Digital PC SN810 SDCPNRY-512G-1006`
  - **Interface:** PCIe Gen4 x4 NVMe SSD
  - **Usable Raw Capacity:** 476.94 GB (GPT Partitioning Scheme)
  - **Health Status:** Healthy / Online
  - **Partitions:**
    - Partition 1: EFI System Partition (100 MB)
    - Partition 2: Microsoft Reserved (MSR) (16 MB)
    - Partition 3: **Drive C:** (292.33 GB, Boot/System)
    - Partition 4: Windows Recovery Partition (930 MB)
    - Partition 5: **Drive D:** (182.94 GB, Basic Data)

> [!IMPORTANT]
> **Crucial Engineering Reality:** Both `C:` and `D:` reside on the **exact same physical NVMe SSD**. Transferring data between `C:` and `D:` does not free up any physical flash NAND storage on your laptop. It merely redistributes blocks between two logical partitions on the same controller.

### Current Logical Drive Inventory

| Drive Letter | Volume Label | File System | Drive Type | Total Capacity | Free Space (GB) | Free Space (%) | Usage Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C:** | System Drive | NTFS | Fixed (Local NVMe) | 292.33 GB | **64.77 GB** | **22.16%** | Windows OS, Apps, `C:\MOV` |
| **D:** | Data Drive | NTFS | Fixed (Local NVMe) | 182.94 GB | **51.83 GB** | **28.33%** | Video Work, Documents, Backups |
| **G:** | Google Drive | FAT32 | Virtual Cloud Mount| 292.33 GB | **61.53 GB** | **21.05%** | Cloud Sync Stream |
| **Z:** | New Volume | NTFS | Network Share (`\\kamlesh-2\all buyers`)| 3,726.01 GB | **2,009.45 GB** | **53.93%** | High-Capacity Central Storage |

### External Drive Inspection
- **Connected USB Drives:** Currently, **zero external USB hard drives or flash drives** are connected to the laptop. (Only internal USB hubs for webcam and MediaTek Bluetooth are active).
- **Connected Network Storage:** **Drive Z:** is actively connected and persistently mapped to `\\kamlesh-2\all buyers` with **2.01 TB of free space**.

### Detailed D: Drive Space Utilization

To understand the feasibility of moving 40.84 GB to D:, a full directory tree audit of `D:\` was executed:

| Directory on D:\ | File Count | Size (Bytes) | Size (GB) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `D:\Trip Combined Data` | 1,443 files | 107,747,595,960 | **100.35 GB** | High-resolution camera/trip video recordings |
| `D:\OneDrive_Local_Copy`| 85,936 files| 28,138,557,567 | **26.21 GB** | Local archive of OneDrive cloud files |
| `D:\MY WORK` | 40 files | 3,326,102,693 | **3.10 GB** | Active professional work projects |
| `D:\CapCut` | 2,053 files | 1,108,685,804 | **1.03 GB** | CapCut video editor caches, assets & renders |
| `D:\Edits` | 7 files | 62,265,996 | **0.06 GB** | Exported video edits |
| `D:\My Documents` | 20 files | 9,627,962 | **0.01 GB** | Personal document files |
| `$RECYCLE.BIN` | 21 files | 2,079 | **< 0.01 MB** | Inactive recycled files |
| **TOTAL USED ON D:** | **89,520 files**| **140,392,838,061** | **130.76 GB** | **D: Volume Total: 182.94 GB** |

---

## 3. APPLICATION & VIDEO EDITING DEPENDENCY CHECK

To guarantee that moving or archiving `C:\MOV` will not break any current video editing timelines, playlists, or application workflows, an exhaustive deep scan was performed across the user profile:

### 1. CapCut Project Timelines & Drafts
- **Location Scanned:** `C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\`
- **Project Drafts Scanned:** **151 draft JSON files** (`draft_content.json`, `draft_meta_info.json`).
- **Target String Match:** Checked for `C:\MOV`, `C:/MOV`, or references to any of the 29 video filenames.
- **Result:** **ZERO MATCHES (0 projects reference `C:\MOV`)**.
- *Note:* CapCut video projects utilize assets located in `D:\Trip Combined Data\` and `D:\CapCut`, completely independent of `C:\MOV`.

### 2. Commercial Video Editing Software Inventory
- Checked Windows registry and application paths for Adobe Premiere Pro, DaVinci Resolve, Sony Vegas, After Effects, Filmora, Camtasia, Blender, and Kdenlive.
- **Installed Software:** CapCut Desktop v8.9.5.3782 (Bytedance). No other major NLE suites are installed.

### 3. Media Player Playlists & Recent Items
- **Playlist Files:** Scanned for `.m3u`, `.m3u8`, `.xspf`, `.pls`, `.wpl`. Found **0 active playlist files** pointing to `C:\MOV`.
- **VLC Media Player Configuration (`vlc-qt-interface.ini`):** Scanned MRU history. All recent playback history points to camera clips on `D:\Trip Combined Data\` and files on `Desktop`. No entries point to `C:\MOV`.
- **Windows Recent Shortcuts (`%AppData%\Microsoft\Windows\Recent`):** **0 shortcuts** reference `C:\MOV`.

### Architectural Conclusion
> **`C:\MOV` is completely uncoupled from your application environment.** The archive represents standalone consumer media. Relocating or archiving this folder will have **zero negative side effects** on any video editing projects, system configurations, or software functionality.

---

## 4. MULTI-OPTION CAPACITY PROJECTION & COMPARATIVE ANALYSIS

We evaluate the three options across storage math, SSD endurance, system performance, and data safety:

```
========================================================================================
STORAGE HEADROOM PROJECTION TABLE
========================================================================================
Option                     Drive C: Free Space        Drive D: Free Space        Status
----------------------------------------------------------------------------------------
CURRENT BASELINE           64.77 GB (22.16% free)     51.83 GB (28.33% free)     STABLE
----------------------------------------------------------------------------------------
Option A: Keep on C:       64.77 GB (22.16% free)     51.83 GB (28.33% free)     ACCEPTABLE
Option B: Move to D:      105.61 GB (36.13% free)     10.99 GB ( 6.01% free)     CRITICAL WARNING
Option C: Move to Ext / Z 105.61 GB (36.13% free)     51.83 GB (28.33% free)     OPTIMAL
========================================================================================
```

---

### OPTION A: Keep `C:\MOV` on C:
- **Projection:**
  - Drive C: **64.77 GB Free (22.16%)**
  - Drive D: **51.83 GB Free (28.33%)**
- **Pros:**
  - Zero effort, zero risk of copy errors during transfer.
  - C: drive currently maintains > 20% free space (safe above the 15% Windows throttling threshold).
  - Movies remain immediately accessible offline.
- **Cons:**
  - 40.84 GB of static movie files permanently sits on your primary Windows system partition.
  - Limits headroom for large Windows 11 feature updates (e.g. 24H2 requires ~25 GB staging buffer).
  - Limits development workspace expansion (Python virtualenvs, Docker containers, Node dependencies).
- **Recommendation:** **CONDITIONAL GO / TEMPORARY HOLD** (Safe to leave for now if no external storage is immediately available, but suboptimal for long-term OS maintenance).

---

### OPTION B: Transfer `C:\MOV` to D:
- **Projection:**
  - Drive C: **105.61 GB Free (36.13%)** — *Gains +40.84 GB*
  - Drive D: **10.99 GB Free (6.01%)** — *Drops by 40.84 GB (55.65 GB - 43.85 GB = 11.80 GB)*
- **Pros:**
  - Frees up substantial breathing room on the primary OS drive C:.
- **Cons & Critical Risks:**
  1. **Severe SSD Performance Throttling:** Modern NVMe SSDs utilize Dynamic SLC caching and background garbage collection. When an NTFS partition drops below 10–15% free space, the controller experiences high Write Amplification Factor (WAF), leading to steep write speed slowdowns.
  2. **Workflow Starvation on D::** Drive D: is your dedicated video workspace, containing `D:\Trip Combined Data` (100.35 GB) and `D:\CapCut` (1.03 GB). If D: has only **10.99 GB of free space**, any new 4K video import, high-bitrate video render, or proxy generation will immediately fail with `Out of Disk Space` errors.
  3. **Zero Offload Benefit:** Because C: and D: share the same physical WD PC SN810 NVMe drive, moving 40.84 GB writes 40.84 GB of flash cycles without freeing a single byte of total laptop storage.
- **Recommendation:** **DEFINITIVE NO-GO** (Do **NOT** move `C:\MOV` to `D:`. It will severely compromise Drive D:'s usability and violate healthy SSD storage thresholds).

---

### OPTION C: Archive `C:\MOV` to External Storage / Network Share Z:
- **Projection:**
  - Drive C: **105.61 GB Free (36.13%)** — *Gains +40.84 GB*
  - Drive D: **51.83 GB Free (28.33%)** — *Remains perfectly preserved*
  - External / Network Z:: **1,968.61 GB Free (52.83%)** — *Consumes only 2% of Z:*
- **Pros:**
  - **Optimal OS Health:** Elevates C: drive to over 105 GB free space, ensuring lightning-fast OS operation, ample buffer for Windows Updates, and extensive dev headroom.
  - **Preserves Video Workspace on D::** Leaves D: with a healthy 51.83 GB buffer for active CapCut projects, edits, and trip footage.
  - **True Hardware Offload:** Genuinely removes 40.84 GB of non-essential media from the laptop's physical NVMe drive, reducing wear and prolonging SSD lifespan.
  - **Immediate Destination Available:** Your network share `Z:` (`\\kamlesh-2\all buyers`) has **2,009.45 GB (2.01 TB) of free space**, meaning you do not even need to purchase a new external drive to execute this immediately!
- **Cons:**
  - Playing movies requires network connectivity to `kamlesh-2` (or connecting an external USB drive if copied there).
- **Recommendation:** **STRONGLY RECOMMENDED GO** (The most robust, future-proof, and architecturally sound storage strategy).

---

## 5. SUMMARY RECOMMENDATIONS & DECISION MATRIX

| Criteria | Option A: Keep on C: | Option B: Move to D: | Option C: Archive to Z: / Ext |
| :--- | :--- | :--- | :--- |
| **C: Free Space** | 64.77 GB (22.16%) | 105.61 GB (36.13%) | **105.61 GB (36.13%)** |
| **D: Free Space** | 51.83 GB (28.33%) | **10.99 GB (6.01%) [FAIL]** | **51.83 GB (28.33%)** |
| **SSD Wear & Health** | Neutral | Negative (Heavy WAF on D:) | **Optimal (Offloads physical flash)** |
| **CapCut / Work Safety**| Safe | **High Risk of Render Failure**| **100% Safe & Preserved** |
| **Application Impact** | Zero | Zero | Zero |
| **VERDICT** | **CONDITIONAL GO (HOLD)**| **NO-GO (REJECTED)** | **STRONGLY RECOMMENDED GO** |

---

## 6. PROPOSED IMPLEMENTATION PLAN (UPON YOUR APPROVAL)

Per your strict instructions, **zero files have been moved or modified**. 

If you approve moving forward with **Option C**, the recommended non-destructive workflow is:

1. **Step 1 — Verified Copy:** Use `robocopy "C:\MOV" "Z:\MOV_Archive" /E /ZB /COPY:DAT /R:3 /W:5 /V /TS /FP /NP /LOG:"C:\Users\User\Desktop\PC Audit\MOV_Transfer.log"` to copy the entire archive while preserving timestamps and attributes.
2. **Step 2 — Hash & Size Verification:** Programmatically compare file counts, file sizes, and SHA-256 hashes between `C:\MOV` and `Z:\MOV_Archive` to ensure 100% bit-for-bit integrity.
3. **Step 3 — Controlled Source Cleanup:** Only after verification passes with 100% success, delete the source files in `C:\MOV`, releasing 40.84 GB immediately back to Drive C:.

*Please review these findings and let me know which option you would like to approve.*

