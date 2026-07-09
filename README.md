# Juxta Plotter

A lightweight, client-side plotting utility for Juxta wireless wearable device data. Drop the daily CSV exports from a device into the page and get interactive plots, a system event table, and a shareable text summary. Everything runs in the browser — no server, no data leaves your machine.

## Supported files

Each Juxta device exports up to three CSVs per day, classified by filename prefix:

| Prefix | Contents | Columns |
|---|---|---|
| `JXV` | Vitals time series | `unix, motion, batt_v, temp_c` |
| `JXB` | Bluetooth peer sightings | `unix, observer_id, peer_id, rssi` |
| `JXS` | System / lifecycle events | `unix, event, device_id, subject_id, experiment, fw_version, scan_interval_s, adv_interval_s, vitals_interval_s, ble_name` |

You can drop multiple days of files at once — same-type files are merged and sorted by timestamp. Files must all come from a single device; mixed devices trigger a warning.

## What it shows

- **Activity plot** — motion counts over time
- **Battery & temperature plot** — dual y-axis line chart
- **BLE peer timeline** — one row per unique peer, each observation colored by RSSI
- **System events table** — JXS events with timezone-converted timestamps
- **Summary card** — device ID, experiment duration, battery delta, peer observation counts, motion/temperature stats, and event counts, with a click-to-copy button for easy sharing

A timezone dropdown (Eastern by default, Central optional) converts all timestamps.

## Running locally

It's a static site — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, go to **Pages** and set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site will be live at `https://<your-username>.github.io/<repo-name>/`.

No build step is required; PapaParse and Plotly.js load from CDN.
