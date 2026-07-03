import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://xkbiskddqswpuggxxhan.supabase.co";
const SUPABASE_KEY = "sb_publishable_rnnnt1h1KLfAnnYXLKHCtg_bIoWEIv4";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEY = "cabinet.memberId";

const STATUSES = [
  { key: "consultation", label: "En consultation", hint: "Occupée, ne pas déranger" },
  { key: "cabinet", label: "Au cabinet", hint: "Sur place, disponible" },
  { key: "absente", label: "Absente", hint: "Pas au cabinet" },
];

const COLORS = [
  "#D96C93", "#B84A6E", "#E58579", "#E3A063", "#A34D74",
  "#7FA588", "#6BA3A8", "#7C8FC9", "#9B7EC4", "#8A5A96",
];

const $ = (id) => document.getElementById(id);

let members = [];
let meId = localStorage.getItem(STORAGE_KEY);
let editingId = null; // null = création, sinon édition de ce profil
let selectedColor = null;
let channel = null;

/* ==================== Données ==================== */

async function fetchMembers() {
  const { data, error } = await supabase
    .from("cabinet_members")
    .select("*")
    .order("name");
  if (error) {
    toast("Connexion impossible… nouvel essai bientôt");
    return;
  }
  members = data;
  // Profil supprimé côté serveur → retour à l'accueil
  if (meId && !members.some((m) => m.id === meId)) {
    localStorage.removeItem(STORAGE_KEY);
    meId = null;
  }
  render();
}

async function setStatus(status) {
  const me = members.find((m) => m.id === meId);
  if (!me || me.status === status) return;
  const previous = { status: me.status, updated_at: me.updated_at };
  me.status = status;
  me.updated_at = new Date().toISOString();
  render(); // optimiste
  const { error } = await supabase
    .from("cabinet_members")
    .update({ status })
    .eq("id", meId);
  if (error) {
    Object.assign(me, previous);
    render();
    toast("Échec de l'enregistrement, réessayez");
  }
}

async function saveProfile(name, color) {
  if (editingId) {
    const { error } = await supabase
      .from("cabinet_members")
      .update({ name, color })
      .eq("id", editingId);
    return error;
  }
  const { data, error } = await supabase
    .from("cabinet_members")
    .insert({ name, color, status: "cabinet" })
    .select()
    .single();
  if (!error) {
    meId = data.id;
    localStorage.setItem(STORAGE_KEY, meId);
  }
  return error;
}

/* ==================== Temps réel ==================== */

function subscribe() {
  channel = supabase
    .channel("cabinet-members")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cabinet_members" },
      fetchMembers
    )
    .subscribe();
}

function ensureLive() {
  fetchMembers();
  if (channel && channel.state !== "joined" && channel.state !== "joining") {
    supabase.removeChannel(channel);
    subscribe();
  }
}

// iOS suspend la connexion quand l'app passe en arrière-plan
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") ensureLive();
});
window.addEventListener("pageshow", ensureLive);
window.addEventListener("online", ensureLive);
setInterval(fetchMembers, 45000); // filet de sécurité
setInterval(renderTimes, 30000); // « depuis X min » qui vieillit

/* ==================== Rendu ==================== */

function show(viewId) {
  for (const v of document.querySelectorAll(".view")) v.hidden = v.id !== viewId;
}

function render() {
  if (!meId) return renderWelcome();
  renderBoard();
}

function renderWelcome() {
  show("view-welcome");
  const block = $("existing-profiles");
  const list = $("profile-list");
  list.innerHTML = "";
  block.hidden = members.length === 0;
  for (const m of members) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "profile-btn";
    btn.append(avatar(m), document.createTextNode(m.name), chip("›"));
    btn.addEventListener("click", () => {
      meId = m.id;
      localStorage.setItem(STORAGE_KEY, meId);
      render();
    });
    li.append(btn);
    list.append(li);
  }
}

function chip(text) {
  const s = document.createElement("span");
  s.className = "chev";
  s.textContent = text;
  return s;
}

function avatar(member) {
  const s = document.createElement("span");
  s.className = "avatar";
  s.style.background = member.color;
  s.textContent = [...member.name.trim()][0].toUpperCase();
  return s;
}

function renderForm() {
  show("view-form");
  const me = editingId ? members.find((m) => m.id === editingId) : null;
  $("form-title").textContent = me ? "Modifier mon profil" : "Bienvenue !";
  $("btn-save").textContent = me ? "Enregistrer" : "C'est parti";
  $("input-name").value = me ? me.name : "";
  selectedColor = me ? me.color : null;
  $("form-error").hidden = true;

  const grid = $("color-grid");
  grid.innerHTML = "";
  const taken = new Set(
    members.filter((m) => m.id !== editingId).map((m) => m.color)
  );
  for (const color of COLORS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.style.background = color;
    b.style.color = color;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(color === selectedColor));
    b.setAttribute("aria-label", "Couleur");
    if (taken.has(color)) b.style.opacity = ".28";
    b.addEventListener("click", () => {
      selectedColor = color;
      for (const sw of grid.children)
        sw.setAttribute("aria-checked", String(sw === b));
    });
    grid.append(b);
  }
}

function renderBoard() {
  const me = members.find((m) => m.id === meId);
  if (!me) return renderWelcome();
  show("view-board");

  $("board-date").textContent = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const onSite = members.filter((m) => m.status !== "absente").length;
  const busy = members.filter((m) => m.status === "consultation").length;
  $("board-summary").innerHTML =
    `${onSite} sur place` + (busy ? `<br>${busy} en consultation` : "");

  const av = $("me-avatar");
  av.replaceWith(Object.assign(avatar(me), { id: "me-avatar" }));
  $("me-name").textContent = me.name;

  const picker = $("status-picker");
  picker.innerHTML = "";
  for (const st of STATUSES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "status-option";
    b.dataset.status = st.key;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(me.status === st.key));
    b.innerHTML = `<span class="check">✓</span>${st.label}`;
    b.addEventListener("click", () => setStatus(st.key));
    picker.append(b);
  }

  const order = { consultation: 0, cabinet: 1, absente: 2 };
  const team = members
    .filter((m) => m.id !== meId)
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "fr"));

  const list = $("team-list");
  list.innerHTML = "";
  $("team-empty").hidden = team.length > 0;
  for (const m of team) {
    const li = document.createElement("li");
    li.className = "team-row";
    const info = document.createElement("div");
    info.className = "team-info";
    info.innerHTML =
      `<p class="team-name"></p><p class="team-since" data-since="${m.updated_at}"></p>`;
    info.querySelector(".team-name").textContent = m.name;
    const pill = document.createElement("span");
    pill.className = "status-pill";
    pill.dataset.status = m.status;
    pill.innerHTML = `<span class="dot"></span>${STATUSES.find((s) => s.key === m.status).label}`;
    li.append(avatar(m), info, pill);
    list.append(li);
  }
  renderTimes();
}

function renderTimes() {
  for (const el of document.querySelectorAll("[data-since]")) {
    el.textContent = since(el.dataset.since);
  }
}

function since(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `depuis ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `depuis ${hours} h`;
  return `depuis ${new Date(iso).toLocaleDateString("fr-FR", { weekday: "long" })}`;
}

/* ==================== Toast ==================== */

let toastTimer = null;
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

/* ==================== Événements ==================== */

$("btn-create").addEventListener("click", () => {
  editingId = null;
  renderForm();
});

$("btn-edit").addEventListener("click", () => {
  editingId = meId;
  renderForm();
});

$("btn-form-back").addEventListener("click", render);

$("btn-switch").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  meId = null;
  render();
});

$("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("input-name").value.trim();
  const errorEl = $("form-error");
  if (!name) return;
  if (!selectedColor) {
    errorEl.textContent = "Choisissez votre couleur 🎨";
    errorEl.hidden = false;
    return;
  }
  $("btn-save").disabled = true;
  const error = await saveProfile(name, selectedColor);
  $("btn-save").disabled = false;
  if (error) {
    errorEl.textContent =
      error.code === "23505"
        ? "Ce prénom est déjà pris — ajoutez une initiale ?"
        : "Impossible d'enregistrer, vérifiez la connexion.";
    errorEl.hidden = false;
    return;
  }
  editingId = null;
  await fetchMembers();
});

/* ==================== Démarrage ==================== */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

render(); // affichage immédiat pendant le chargement
fetchMembers();
subscribe();
