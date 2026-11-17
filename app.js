(() => {
  "use strict";
  const STORAGE_KEY = "gestion_mpanazava_v1";
  const branches = ["Mavo", "Maitso", "Mena"];
  const $ = id => document.getElementById(id);
  const safeParse = raw => { try { return JSON.parse(raw); } catch { return null; } };
  let state = safeParse(localStorage.getItem(STORAGE_KEY)) || { members: [], activities: [] };
  let currentBranch = "Mavo";
  let currentKind = "Beazina";

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { alert("Espace de stockage insuffisant. Exporte tes données et libère de l'espace."); }
  };
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const countFor = branch => state.members.filter(m => m.branch === branch).length;

  function renderStats() {
    $("statTotal").textContent = state.members.length;
    $("statBeazina").textContent = state.members.filter(m => m.kind === "Beazina").length;
    $("statLeaders").textContent = state.members.filter(m => m.kind === "Mpiandraikitra").length;
    branches.forEach(b => {
      const el = $("count" + b);
      if (el) el.textContent = `${countFor(b)} membre${countFor(b) > 1 ? "s" : ""}`;
    });
  }

  function renderMembers() {
    $("branchHeading").textContent = "Branche " + currentBranch;
    document.querySelectorAll(".branch-card").forEach(btn => btn.classList.toggle("selected", btn.dataset.branch === currentBranch));
    document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.kind === currentKind));
    const query = $("search").value.trim().toLocaleLowerCase("fr");
    const list = state.members.filter(m => m.branch === currentBranch && m.kind === currentKind)
      .filter(m => `${m.lastName} ${m.firstName} ${m.dingana || ""}`.toLocaleLowerCase("fr").includes(query))
      .sort((a,b) => a.lastName.localeCompare(b.lastName, "fr"));
    $("memberList").innerHTML = list.length ? list.map(m => `
      <article class="member-row">
        <div><h3>${escapeHTML(m.lastName)} ${escapeHTML(m.firstName)}</h3>
          <p>${escapeHTML(m.kind)} · ${escapeHTML(m.branch)}${m.dingana ? " · Dingana : " + escapeHTML(m.dingana) : ""}</p>
          ${m.phone ? `<p>☎ ${escapeHTML(m.phone)}</p>` : ""}
        </div>
        <div class="member-actions">
          <button class="mini" data-action="edit" data-id="${m.id}">Modifier</button>
          ${m.kind === "Beazina" ? `<button class="mini" data-action="transfer" data-id="${m.id}">Transférer</button>` : ""}
          <button class="mini danger" data-action="delete" data-id="${m.id}">Supprimer</button>
        </div>
      </article>`).join("") : `<div class="empty">Aucun ${currentKind.toLocaleLowerCase("fr")} dans cette branche pour le moment.</div>`;
    renderStats();
  }

  function renderActivities() {
    const list = [...state.activities].sort((a,b) => (a.date || "").localeCompare(b.date || ""));
    $("activityList").innerHTML = list.length ? list.map(a => `
      <article class="activity-row"><div><h3>${escapeHTML(a.name)}</h3>
        <p>${escapeHTML(a.branch)} · ${escapeHTML(a.date)}${a.place ? " · " + escapeHTML(a.place) : ""}</p>
        ${a.description ? `<p>${escapeHTML(a.description)}</p>` : ""}
      </div><button class="mini danger" data-activity-delete="${a.id}">Supprimer</button></article>`).join("") : `<div class="empty">Aucune activité enregistrée.</div>`;
  }

  function openDialog(id) { $(id).showModal(); }
  function closeDialog(id) { $(id).close(); }
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => closeDialog(btn.dataset.close)));
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

  document.querySelectorAll(".branch-card").forEach(btn => btn.addEventListener("click", () => {
    currentBranch = btn.dataset.branch; $("search").value = ""; renderMembers();
  }));
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => { currentKind = btn.dataset.kind; renderMembers(); }));
  $("search").addEventListener("input", renderMembers);

  function resetMemberForm() {
    $("memberForm").reset(); $("memberId").value = "";
    $("memberDialogTitle").textContent = "Ajouter un membre";
  }
  $("newMember").addEventListener("click", () => { resetMemberForm(); openDialog("memberDialog"); });

  $("memberList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const member = state.members.find(m => m.id === btn.dataset.id);
    if (!member) return;
    if (btn.dataset.action === "edit") {
      resetMemberForm();
      $("memberDialogTitle").textContent = "Modifier le membre";
      Object.entries({memberId:"id",lastName:"lastName",firstName:"firstName",birthDate:"birthDate",parents:"parents",dingana:"dingana",talenta:"talenta",fanekena:"fanekena",phone:"phone",notes:"notes"}).forEach(([field,key]) => $(field).value = member[key] || "");
      openDialog("memberDialog");
    } else if (btn.dataset.action === "delete") {
      if (confirm(`Supprimer ${member.firstName} ${member.lastName} ?`)) {
        state.members = state.members.filter(m => m.id !== member.id); save(); renderMembers();
      }
    } else if (btn.dataset.action === "transfer") {
      const choices = branches.filter(b => b !== member.branch);
      const answer = prompt(`Transférer vers quelle branche ?\n${choices.join(" / ")}`, choices[0]);
      if (answer && choices.includes(answer.trim())) {
        member.branch = answer.trim(); save(); renderMembers();
      } else if (answer) alert("Branche invalide. Choisis Mavo, Maitso ou Mena.");
    }
  });

  $("memberForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = $("memberId").value;
    const old = state.members.find(m => m.id === id);
    const member = {
      id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      branch: old?.branch || currentBranch, kind: old?.kind || currentKind,
      lastName: $("lastName").value.trim(), firstName: $("firstName").value.trim(),
      birthDate: $("birthDate").value, parents: $("parents").value.trim(),
      dingana: $("dingana").value.trim(), talenta: $("talenta").value.trim(),
      fanekena: $("fanekena").value.trim(), phone: $("phone").value.trim(),
      notes: $("notes").value.trim()
    };
    if (!member.lastName || !member.firstName) return;
    if (old) Object.assign(old, member); else state.members.push(member);
    save(); closeDialog("memberDialog"); renderMembers();
  });

  $("newActivity").addEventListener("click", () => { $("activityForm").reset(); $("activityBranch").value = currentBranch; openDialog("activityDialog"); });
  $("activityForm").addEventListener("submit", e => {
    e.preventDefault();
    state.activities.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: $("activityName").value.trim(), branch: $("activityBranch").value,
      date: $("activityDate").value, place: $("activityPlace").value.trim(),
      description: $("activityDescription").value.trim()
    });
    save(); closeDialog("activityDialog"); renderActivities();
  });
  $("activityList").addEventListener("click", e => {
    const btn = e.target.closest("[data-activity-delete]");
    if (!btn) return;
    if (confirm("Supprimer cette activité ?")) {
      state.activities = state.activities.filter(a => a.id !== btn.dataset.activityDelete);
      save(); renderActivities();
    }
  });

  $("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({app:"Gestion Mpanazava",version:1,...state}, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "sauvegarde-gestion-mpanazava.json"; a.click(); URL.revokeObjectURL(url);
  });
  $("importData").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const imported = safeParse(await file.text());
      if (!imported || !Array.isArray(imported.members) || !Array.isArray(imported.activities)) throw new Error("Format invalide");
      if (!confirm("Remplacer les données actuelles par cette sauvegarde ?")) return;
      state = {members: imported.members.filter(m => branches.includes(m.branch) && ["Beazina","Mpiandraikitra"].includes(m.kind)), activities: imported.activities};
      save(); renderMembers(); renderActivities(); alert("Sauvegarde importée.");
    } catch { alert("Impossible de lire ce fichier de sauvegarde."); }
    finally { e.target.value = ""; }
  });

  renderMembers(); renderActivities();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
