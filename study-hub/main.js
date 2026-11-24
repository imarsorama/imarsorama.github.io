const ICONS = {
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  landmark: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  city: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  nucleus: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>',
  pulse: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  flask: '<path d="M10 2v6L4.5 18.5A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.8-3L14 8V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/>',
  hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  arrow: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
};

function svg(name, cls) {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

const state = { category: "all", query: "" };

const chipsEl = document.getElementById("chips");
const catalogEl = document.getElementById("catalog");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const footerEl = document.getElementById("footer-count");

function matches(app) {
  if (state.category !== "all" && app.category !== state.category) return false;
  if (!state.query) return true;
  const q = state.query.toLowerCase();
  return (app.name + " " + app.topic + " " + app.description)
    .toLowerCase()
    .includes(q);
}

function renderChips() {
  const counts = { all: APPS.length };
  for (const c of CATEGORIES) {
    counts[c.id] = APPS.filter((a) => a.category === c.id).length;
  }
  const chips = [{ id: "all", name: "All subjects" }, ...CATEGORIES];
  chipsEl.innerHTML = chips
    .map(
      (c) => `
      <button class="chip ${state.category === c.id ? "active" : ""}" data-cat="${c.id}" role="tab" aria-selected="${state.category === c.id}">
        ${c.name} <span class="chip-count">${counts[c.id]}</span>
      </button>`
    )
    .join("");
  chipsEl.querySelectorAll(".chip").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      render();
    })
  );
}

function appCard(app) {
  return `
    <a class="card cat-${app.category}" href="${app.url}" target="_blank" rel="noopener">
      <div class="card-top">
        <span class="card-icon">${svg(app.icon, "icon")}</span>
        <span class="card-topic">${app.topic}</span>
      </div>
      <h3 class="card-title">${app.name}</h3>
      <p class="card-desc">${app.description}</p>
      <span class="card-open">Open app ${svg("arrow", "arrow")}</span>
    </a>`;
}

function render() {
  renderChips();
  const visible = APPS.filter(matches);
  const sections = CATEGORIES.filter(
    (c) =>
      (state.category === "all" || state.category === c.id) &&
      visible.some((a) => a.category === c.id)
  );
  catalogEl.innerHTML = sections
    .map((c) => {
      const apps = visible.filter((a) => a.category === c.id);
      return `
        <section class="category cat-${c.id}">
          <div class="category-head">
            <span class="category-icon">${svg(c.icon, "icon")}</span>
            <div>
              <h2>${c.name}</h2>
              <p>${c.tagline}</p>
            </div>
            <span class="category-count">${apps.length} ${apps.length === 1 ? "app" : "apps"}</span>
          </div>
          <div class="grid">${apps.map(appCard).join("")}</div>
        </section>`;
    })
    .join("");
  emptyEl.hidden = visible.length > 0;
  footerEl.textContent = `${APPS.length} apps across ${CATEGORIES.length} subjects`;
}

searchEl.addEventListener("input", () => {
  state.query = searchEl.value.trim();
  render();
});

render();
