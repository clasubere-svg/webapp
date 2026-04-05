/* ============================================================
   MATCHING.JS — CampusFinds
   NOTE: DB returns columns lowercase: reporttype, imageurl etc.
   ============================================================ */

document.addEventListener("DOMContentLoaded", function() {
  var findBtn = document.querySelector(".ai-action-btn");
  if (findBtn) findBtn.addEventListener("click", findMatches);

  var uploadInput = document.querySelector(".ai-upload-btn input[type='file']");
  if (uploadInput) {
    uploadInput.addEventListener("change", async function() {
      if (!this.files[0]) return;
      alert("Running text-based AI matching on all items now.");
      await findMatches();
    });
  }

  findMatches();
});

async function findMatches() {
  var container = document.getElementById("matchContainer");
  if (!container) return;
  container.innerHTML = "<p style='opacity:0.6;text-align:center;margin-top:20px'>Analyzing items…</p>";

  var reports;
  try { reports = await getAllReports() || []; }
  catch(err) {
    container.innerHTML = "<p style='color:#f87171'>Failed to load: " + err.message + "</p>";
    return;
  }

  function getType(r) { return (r.reporttype || r.reportType || "").toLowerCase(); }
  function getImg(r)  { return r.imageurl || r.imageUrl || null; }

  var lostItems  = reports.filter(function(r){ return getType(r)==="lost"; });
  var foundItems = reports.filter(function(r){ return getType(r)==="found"; });

  container.innerHTML = "";
  var matchCount = 0;

  lostItems.forEach(function(lost) {
    foundItems.forEach(function(found) {
      var score = matchScore(lost, found);
      if (score < 1) return;
      matchCount++;

      var lostUser  = lost.User  || lost.user  || {};
      var foundUser = found.User || found.user || {};
      var lostImg   = getImg(lost);
      var foundImg  = getImg(found);

      var card = document.createElement("div");
      card.className = "match-card";
      card.innerHTML =
        "<div class='match-section'>" +
          "<h3>Lost Item</h3>" +
          (lostImg ? "<img src='" + escHtml(lostImg) + "' class='match-image' onerror=\"this.style.display='none'\">" : "") +
          "<p><b>" + escHtml(lost.item) + "</b></p>" +
          "<p style='font-size:13px;opacity:0.75'>" + escHtml(lost.location) + "</p>" +
          "<p style='font-size:12px;opacity:0.6'>by " + escHtml(lostUser.name || "Unknown") + "</p>" +
        "</div>" +
        "<div style='text-align:center;padding:10px'>" +
          "<div style='font-size:28px'>🔗</div>" +
          "<div style='font-size:12px;margin-top:4px;opacity:0.7'>" + scoreLabel(score) + "</div>" +
        "</div>" +
        "<div class='match-section'>" +
          "<h3>Found Item</h3>" +
          (foundImg ? "<img src='" + escHtml(foundImg) + "' class='match-image' onerror=\"this.style.display='none'\">" : "") +
          "<p><b>" + escHtml(found.item) + "</b></p>" +
          "<p style='font-size:13px;opacity:0.75'>" + escHtml(found.location) + "</p>" +
          "<p style='font-size:12px;opacity:0.6'>by " + escHtml(foundUser.name || "Unknown") + "</p>" +
        "</div>" +
        "<button class='match-btn' onclick=\"contactMatch('" +
          escHtml(lostUser.email||"") + "','" + escHtml(foundUser.email||"") + "')\">" +
          "📬 Possible Match — Contact" +
        "</button>";

      container.appendChild(card);
    });
  });

  if (matchCount === 0) {
    container.innerHTML = "<p style='opacity:0.6;margin-top:20px;text-align:center'>No matches found yet. Keep reporting items!</p>";
  }
}

function matchScore(lost, found) {
  var score = 0;
  if ((lost.category||"").toLowerCase()===(found.category||"").toLowerCase()) score++;
  if ((lost.location||"").toLowerCase()===(found.location||"").toLowerCase())  score++;
  var l = (lost.item||"").toLowerCase(), f = (found.item||"").toLowerCase();
  if (l && f && (l.includes(f)||f.includes(l))) score++;
  return score;
}
function scoreLabel(s) { return s>=3?"Strong Match ✅":s===2?"Likely Match 🟡":"Possible Match 🔵"; }

function contactMatch(le, fe) {
  var emails = [le,fe].filter(Boolean).join(", ");
  if (emails) {
    window.location.href = "mailto:"+emails+"?subject=CampusFinds%3A%20Potential%20Match&body=Hi%2C%20we%20found%20a%20potential%20match%20on%20CampusFinds.";
  } else { alert("Contact emails not available for these items."); }
}

function escHtml(str) {
  return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
