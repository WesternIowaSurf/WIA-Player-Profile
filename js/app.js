/*
=========================================================
LIVE DATA SOURCE
=========================================================
Player data is fetched from the "Public Roster" tab of the
Google Sheet, published to the web as CSV. That tab excludes
Timestamp and Date of Birth columns on purpose — do not point
this at a tab that includes those.

To add a player: just submit the Google Form. No code changes
needed. The page re-fetches the sheet on every page load.
=========================================================
*/
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSx0bwVsMUMcvbFEBE3SUbQkjjhA4Fs-2rKTyZLXoKma9mR_Pc5HSBqeBQZAsDjfHGYbQ-DnzXf4oHf/pub?gid=937735891&single=true&output=csv";

let players = [];

const grid = document.getElementById("playerGrid");
const search = document.getElementById("search");
const year = document.getElementById("year");
const position = document.getElementById("position");
const sortSelect = document.getElementById("sort");
const results = document.getElementById("results");
const empty = document.getElementById("empty");

function initials(name){
  return name.split(" ").map(n=>n[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
}

function lastName(name){
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function normalizeName(name){
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Minimal RFC4180-style CSV parser (handles quoted fields with commas/quotes)
function parseCSV(text){
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if(c === '"'){
        inQuotes = true;
      } else if(c === ","){
        row.push(field); field = "";
      } else if(c === "\n" || c === "\r"){
        if(c === "\r" && text[i+1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
  }
  if(field.length > 0 || row.length > 0){
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function buildPhotoLookup(){
  const lookup = {};
  const source = (typeof playerPhotos !== "undefined") ? playerPhotos : {};
  Object.keys(source).forEach(name=>{
    lookup[normalizeName(name)] = source[name];
  });
  return lookup;
}

async function loadPlayers(){
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if(!res.ok) throw new Error("Sheet fetch failed: " + res.status);
  const text = await res.text();
  const rows = parseCSV(text);
  if(rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const photoLookup = buildPhotoLookup();

  return rows.slice(1)
    .filter(row => row.some(cell => cell.trim() !== ""))
    .map(row=>{
      const obj = {};
      headers.forEach((h,i)=> obj[h] = (row[i] || "").trim());

      const name = obj["Name"] || "";
      return {
        name,
        gradYear: obj["Graduation Year"] || "",
        team: obj["Team"] || "",
        position: obj["Position"] || "",
        jersey: obj["Jersey"] || "",
        gpa: obj["GPA"] || "",
        school: obj["School"] || "",
        major: obj["Major"] || "",
        playerEmail: obj["Email"] || "",
        phone: obj["Phone"] || "",
        coach: obj["Coach"] || "",
        coachEmail: obj["Coach Email"] || "",
        film: obj["Film Link"] || "",
        image: photoLookup[normalizeName(name)] || ""
      };
    })
    .filter(p => p.name);
}

function initFilters(){
  year.innerHTML = '<option value="">All Graduation Years</option>';
  position.innerHTML = '<option value="">All Positions</option>';
  [...new Set(players.map(p=>p.gradYear))].filter(Boolean).sort().forEach(y=>{
    year.innerHTML += `<option value="${y}">${y}</option>`;
  });
  [...new Set(players.map(p=>p.position))].filter(Boolean).sort().forEach(p=>{
    position.innerHTML += `<option value="${p}">${p}</option>`;
  });
}

function render(){
  const q = search.value.trim().toLowerCase();
  const y = year.value;
  const pos = position.value;

  const filtered = players.filter(p=>{
    const haystack = `${p.name} ${p.team} ${p.position} ${p.school} ${p.major}`.toLowerCase();
    return (!q || haystack.includes(q)) &&
           (!y || p.gradYear === y) &&
           (!pos || p.position === pos);
  });

  const groups = {};
  filtered.forEach(p=>{
    if(!groups[p.team]) groups[p.team] = [];
    groups[p.team].push(p);
  });
  const teamNames = Object.keys(groups).sort();

  const sortBy = sortSelect.value;
  teamNames.forEach(team=>{
    groups[team].sort((a,b)=>{
      if(sortBy === "jersey"){
        const aNum = parseInt(a.jersey, 10);
        const bNum = parseInt(b.jersey, 10);
        const aVal = isNaN(aNum) ? Infinity : aNum;
        const bVal = isNaN(bNum) ? Infinity : bNum;
        return aVal - bVal;
      }
      return lastName(a.name).localeCompare(lastName(b.name));
    });
  });

  grid.innerHTML = teamNames.map(team=>`
    <div class="team-group">
      <div class="team-group-title">${team} <span class="team-group-count">(${groups[team].length})</span></div>
      <div class="grid">
        ${groups[team].map(p=>`
          <article class="card">
            <div class="jersey">${p.jersey ? "#" + p.jersey : ""}</div>
            <div class="card-top">
              ${
                p.image
                ? `<img class="avatar" src="${p.image}" alt="${p.name}">`
                : `<div class="avatar-fallback">${initials(p.name)}</div>`
              }
              <div class="card-top-text">
                <div class="class">CLASS OF ${p.gradYear}</div>
                <div class="name">${p.name}</div>
                <div class="position">${p.position} • ${p.team}</div>
              </div>
            </div>
            <div class="card-body">
              <div class="info-row"><span class="label">Jersey</span><span class="value">#${p.jersey || "—"}</span></div>
              <div class="info-row"><span class="label">School</span><span class="value">${p.school || "—"}</span></div>
              <div class="info-row"><span class="label">Academic Interest</span><span class="value">${p.major || "—"}</span></div>
            </div>
            <div class="card-actions">
              <button class="btn btn-primary" onclick="showProfile(${players.indexOf(p)})">View Profile</button>
              <a class="btn btn-secondary" href="mailto:${p.coachEmail}?subject=Recruiting Inquiry - ${encodeURIComponent(p.name)}">Contact Coach</a>
            </div>
          </article>
        `).join("")}
      </div>
    </div>
  `).join("");

  results.textContent = `${filtered.length} player${filtered.length===1?"":"s"}`;
  empty.style.display = filtered.length ? "none" : "block";
}

function showProfile(index){
  const p = players[index];
  document.getElementById("modalName").textContent = p.name;
  document.getElementById("modalMeta").textContent =
    `CLASS OF ${p.gradYear} • ${p.position} • ${p.team} • #${p.jersey || "—"}`;

  document.getElementById("modalAvatarWrap").innerHTML = p.image
    ? `<img class="modal-avatar" src="${p.image}" alt="${p.name}">`
    : `<div class="modal-avatar-fallback">${initials(p.name)}</div>`;

  document.getElementById("modalContent").innerHTML = `
    <div class="profile-grid">
      <div class="profile-section">
        <h3>Academic Profile</h3>
        <p><strong>School:</strong> ${p.school || "—"}<br>
        <strong>GPA:</strong> ${p.gpa || "—"}<br>
        <strong>Academic Interest:</strong> ${p.major || "—"}</p>
      </div>

      <div class="profile-section">
        <h3>Player Information</h3>
        <p><strong>Position:</strong> ${p.position}<br>
        <strong>Team:</strong> ${p.team}<br>
        <strong>Jersey:</strong> #${p.jersey || "—"}<br>
        <strong>Graduation:</strong> ${p.gradYear}</p>
      </div>

      <div class="profile-section">
        <h3>Player Contact</h3>
        <p>
          <a href="mailto:${p.playerEmail}">${p.playerEmail || "—"}</a><br>
          ${p.phone || "—"}
        </p>
      </div>

      <div class="profile-section">
        <h3>Club Coach</h3>
        <p>
          <strong>${p.coach}</strong><br>
          <a href="mailto:${p.coachEmail}">${p.coachEmail}</a>
        </p>
      </div>

      <div class="profile-section profile-full">
        <h3>Player Film</h3>
        ${
          p.film
          ? `<a class="film" href="${p.film}" target="_blank" rel="noopener">View Highlight / Game Film</a>`
          : `<p>Film link coming soon.</p>`
        }
      </div>
    </div>
  `;

  document.getElementById("modal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideModal(){
  document.getElementById("modal").classList.remove("show");
  document.body.style.overflow = "";
}

function closeModal(e){
  if(e.target.id === "modal") hideModal();
}

function clearFilters(){
  search.value = "";
  year.value = "";
  position.value = "";
  sortSelect.value = "lastname";
  render();
}

search.addEventListener("input",render);
year.addEventListener("change",render);
position.addEventListener("change",render);
sortSelect.addEventListener("change",render);

async function init(){
  grid.innerHTML = `<div class="loading-msg">Loading players…</div>`;
  try{
    players = await loadPlayers();
    initFilters();
    render();
  } catch(err){
    grid.innerHTML = `<div class="loading-msg">Couldn't load player data right now. Please refresh, or check back shortly.</div>`;
    console.error(err);
  }
}

init();
