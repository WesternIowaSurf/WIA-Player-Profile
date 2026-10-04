
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

function initFilters(){
  [...new Set(players.map(p=>p.gradYear))].sort().forEach(y=>{
    year.innerHTML += `<option value="${y}">${y}</option>`;
  });
  [...new Set(players.map(p=>p.position))].sort().forEach(p=>{
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
      if(sortBy === "name") return a.name.localeCompare(b.name);
      const aNum = parseInt(a.jersey, 10);
      const bNum = parseInt(b.jersey, 10);
      const aVal = isNaN(aNum) ? Infinity : aNum;
      const bVal = isNaN(bNum) ? Infinity : bNum;
      return aVal - bVal;
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
  sortSelect.value = "jersey";
  render();
}

search.addEventListener("input",render);
year.addEventListener("change",render);
position.addEventListener("change",render);
sortSelect.addEventListener("change",render);

initFilters();
render();
