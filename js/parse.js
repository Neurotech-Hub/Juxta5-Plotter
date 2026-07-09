/* CSV ingest, merge, and validation, plus shared timezone helpers. */

const TZ_ABBR = {
  "America/New_York": "ET",
  "America/Chicago": "CT",
};

// Returns "YYYY-MM-DD HH:mm:ss" in the given timezone — the string format
// Plotly treats as a plain (timezone-less) date, so axes render in local time.
function unixToTzString(unix, tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(unix * 1000));
  const p = {};
  for (const { type, value } of parts) p[type] = value;
  // en-CA with hour12:false can emit "24" for midnight
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
}

// Human-readable datetime, e.g. "Jul 9, 2026, 2:19:34 PM"
function formatUnix(unix, tz, opts) {
  return new Intl.DateTimeFormat("en-US", Object.assign({
    timeZone: tz,
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
  }, opts)).format(new Date(unix * 1000));
}

function classifyFile(filename) {
  const base = filename.split("/").pop().toUpperCase();
  if (base.startsWith("JXV")) return "jxv";
  if (base.startsWith("JXB")) return "jxb";
  if (base.startsWith("JXS")) return "jxs";
  return null;
}

function parseCsvFile(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => resolve(results.data),
      error: () => resolve([]),
    });
  });
}

// Parses a FileList/array of File objects into merged, sorted datasets.
// Returns { jxv, jxb, jxs, fileCounts, warnings, error, deviceId }
async function ingestFiles(files) {
  const data = { jxv: [], jxb: [], jxs: [] };
  const fileCounts = { jxv: 0, jxb: 0, jxs: 0 };
  const warnings = [];

  for (const file of files) {
    const type = classifyFile(file.name);
    if (!type) {
      warnings.push(`Ignored "${file.name}" — filename must start with JXV, JXB, or JXS.`);
      continue;
    }
    const rows = await parseCsvFile(file);
    if (rows.length === 0) {
      warnings.push(`Skipped "${file.name}" — empty or unparseable.`);
      continue;
    }
    fileCounts[type] += 1;
    data[type].push(...rows);
  }

  // Coerce numeric columns and drop rows without a valid unix timestamp
  const coerce = (rows, numericCols) => rows
    .map((r) => {
      const out = Object.assign({}, r);
      for (const col of numericCols) out[col] = Number(r[col]);
      return out;
    })
    .filter((r) => Number.isFinite(r.unix) && r.unix > 0);

  data.jxv = coerce(data.jxv, ["unix", "motion", "batt_v", "temp_c"]);
  data.jxb = coerce(data.jxb, ["unix", "rssi"]);
  data.jxs = coerce(data.jxs, ["unix"]);

  for (const type of ["jxv", "jxb", "jxs"]) {
    data[type].sort((a, b) => a.unix - b.unix);
  }

  // Single-observer validation: collect distinct IDs across JXB observer_id
  // and JXS device_id (they refer to the same device).
  const ids = new Set();
  for (const r of data.jxb) if (r.observer_id) ids.add(r.observer_id);
  for (const r of data.jxs) if (r.device_id) ids.add(r.device_id);

  let error = null;
  if (ids.size > 1) {
    error = `Files span multiple devices (${[...ids].sort().join(", ")}). ` +
      `Please upload files from a single device at a time.`;
  }

  // Prefer device_id from JXS, fall back to observer_id from JXB
  const jxsId = data.jxs.find((r) => r.device_id)?.device_id;
  const jxbId = data.jxb.find((r) => r.observer_id)?.observer_id;
  const deviceId = jxsId || jxbId || null;

  return { jxv: data.jxv, jxb: data.jxb, jxs: data.jxs, fileCounts, warnings, error, deviceId };
}
