/* ============================================================
   SUPABASE CLIENT — CampusFinds
   All DB column names are LOWERCASE to match PostgreSQL behavior
   ============================================================ */
const SUPABASE_URL  = "https://ijfjkvwvkunhkipchfep.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZmprdnd2a3VuaGtpcGNoZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzE0MTMsImV4cCI6MjA4Nzk0NzQxM30.fp9KwwU9U1YahKZdThXf5gWkfkRsj8CS1KbUa5bVCS4";

/* ── Core REST helper ── */
async function sbFetch(path, method, body, prefer) {
  method = method || "GET";
  prefer = prefer || "return=representation";
  const headers = {
    "apikey":        SUPABASE_ANON,
    "Authorization": "Bearer " + SUPABASE_ANON,
    "Content-Type":  "application/json",
    "Prefer":        prefer,
  };
  const opts = { method: method, headers: headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, opts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Supabase " + res.status + ": " + errText);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ════════════════════════════════════════
   USERS
   Columns: id, name, email, passwordhash, contact, imageurl, createdat
   ════════════════════════════════════════ */
async function createUser(opts) {
  var name         = opts.name;
  var email        = opts.email;
  var passwordHash = opts.passwordHash;
  var imageUrl     = opts.imageUrl  || null;
  var contact      = opts.contact   || null;

  var rows = await sbFetch("User", "POST", {
    name:         name,
    email:        email,
    passwordhash: passwordHash,   // DB column: passwordhash
    imageurl:     imageUrl,       // DB column: imageurl
    contact:      contact,
    // createdat has DEFAULT NOW() — do NOT send it
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function getUserByEmail(email) {
  var rows = await sbFetch("User?email=eq." + encodeURIComponent(email) + "&limit=1");
  return (rows && rows[0]) || null;
}

/* ════════════════════════════════════════
   LOGIN HISTORY
   Columns: id, user_id, logintime
   ════════════════════════════════════════ */
async function logLogin(userId) {
  return sbFetch("LoginHistory", "POST",
    { user_id: userId },   // logintime has DEFAULT NOW()
    "return=minimal"
  );
}

/* ════════════════════════════════════════
   REPORTS
   Columns: id, user_id, item, description, category, location,
            reporttype, contact, imageurl, reporttime
   ════════════════════════════════════════ */
async function createReport(opts) {
  var rows = await sbFetch("Report", "POST", {
    user_id:     opts.userId,
    item:        opts.item,
    description: opts.description,
    category:    opts.category,
    location:    opts.location,
    reporttype:  opts.reportType,    // DB column: reporttype
    contact:     opts.contact  || null,
    imageurl:    opts.imageUrl || null, // DB column: imageurl
    // reporttime has DEFAULT NOW()
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function getAllReports() {
  try {
    // Try with FK join first
    return await sbFetch(
      "Report?order=reporttime.desc&select=*,User!Report_user_id_fkey(id,name,email,imageurl)"
    );
  } catch (_) {
    // Fallback: reports only, no user join
    var rows = await sbFetch("Report?order=reporttime.desc");
    return (rows || []).map(function(r) { return Object.assign({}, r, { User: null }); });
  }
}

async function updateReport(id, fields) {
  return sbFetch("Report?id=eq." + id, "PATCH",
    { item: fields.item, description: fields.description,
      category: fields.category, location: fields.location },
    "return=minimal"
  );
}

async function deleteReport(id) {
  return sbFetch("Report?id=eq." + id, "DELETE", null, "return=minimal");
}

/* ════════════════════════════════════════
   IMAGE UPLOAD  (Supabase Storage)
   ════════════════════════════════════════ */
async function uploadImage(file, bucket) {
  bucket = bucket || "item-images";
  var ext  = file.name.split(".").pop();
  var path = Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
  var res  = await fetch(
    SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + path,
    {
      method:  "POST",
      headers: {
        "apikey":        SUPABASE_ANON,
        "Authorization": "Bearer " + SUPABASE_ANON,
        "Content-Type":  file.type,
      },
      body: file,
    }
  );
  if (!res.ok) return null;
  return SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}

/* ════════════════════════════════════════
   SESSION  (localStorage)
   ════════════════════════════════════════ */
function setSession(user)  { localStorage.setItem("cf_user", JSON.stringify(user)); }
function getSession()      { try { return JSON.parse(localStorage.getItem("cf_user") || "null"); } catch(_){ return null; } }
function clearSession()    { localStorage.removeItem("cf_user"); }

/* ════════════════════════════════════════
   UPDATE USER IMAGE
   ════════════════════════════════════════ */
async function updateUserImage(userId, imageUrl) {
  return sbFetch("User?id=eq." + userId, "PATCH",
    { imageurl: imageUrl },
    "return=minimal"
  );
}
