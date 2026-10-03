(() => {
  "use strict";

  const grid = document.getElementById("gameGrid");
  const details = document.getElementById("details");
  const status = document.getElementById("status");
  const searchInput = document.getElementById("gameSearch");
  const clearSearch = document.getElementById("clearSearch");
  const dotsEl = document.getElementById("dots");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const clock = document.getElementById("clock");

  const PAGE_SIZE = 12; // 4x3 on desktop, 3x4 on mobile

  let games = [];
  let filtered = [];
  let selectedId = null;
  let page = 0;

  function setStatus(message) {
    status.textContent = message;
  }

  function safeText(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
  }

  function validGame(game) {
    return game &&
      typeof game === "object" &&
      typeof game.id === "string" &&
      /^[a-zA-Z0-9_-]+$/.test(game.id) &&
      typeof game.name === "string";
  }

  function gamePath(game) {
    const entry = game.entry || "index.html";
    return `games/${encodeURIComponent(game.id)}/${entry}`;
  }

  function launch(game) {
    window.location.href = gamePath(game);
  }

  /* ---------- clock ---------- */
  function tickClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  /* ---------- bottom screen ---------- */
  function renderCard(game) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "game-card";
    button.dataset.id = game.id;
    button.setAttribute("aria-label", game.name);

    const wrap = document.createElement("span");
    wrap.className = "thumb-wrap";

    const fallback = document.createElement("span");
    fallback.className = "thumbnail-fallback";
    fallback.textContent = "▶";

    if (game.thumbnail) {
      const image = document.createElement("img");
      image.className = "thumbnail";
      image.alt = "";
      image.loading = "lazy";
      image.src = safeText(game.thumbnail);
      image.addEventListener("error", () => image.replaceWith(fallback));
      wrap.appendChild(image);
    } else {
      wrap.appendChild(fallback);
    }

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = game.name;

    button.append(wrap, title);

    // First tap selects, second tap on the selected icon opens it (like the 3DS).
    button.addEventListener("click", () => {
      if (selectedId === game.id) launch(game);
      else selectGame(game.id);
    });
    return button;
  }

  function totalPages() {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }

  function renderGrid() {
    grid.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "no-results";
      const heading = document.createElement("h2");
      heading.textContent = "No games found";
      const message = document.createElement("p");
      message.textContent = `Nothing matched "${searchInput.value.trim()}".`;
      empty.append(heading, message);
      grid.appendChild(empty);
    } else {
      const slice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      slice.forEach(game => grid.appendChild(renderCard(game)));
      // empty slots, like the blank squares on the 3DS menu
      for (let i = slice.length; i < PAGE_SIZE; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        grid.appendChild(slot);
      }
    }

    renderPager();
    highlight();
  }

  function renderPager() {
    const pages = totalPages();
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= pages - 1;

    dotsEl.innerHTML = "";
    if (pages < 2) return;
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot" + (i === page ? " active" : "");
      dot.setAttribute("aria-label", `Page ${i + 1}`);
      dot.addEventListener("click", () => goToPage(i));
      dotsEl.appendChild(dot);
    }
    dotsEl.removeAttribute("aria-hidden");
  }

  function highlight() {
    grid.querySelectorAll(".game-card").forEach(card => {
      card.classList.toggle("selected", card.dataset.id === selectedId);
    });
  }

  function goToPage(n) {
    page = Math.min(Math.max(n, 0), totalPages() - 1);
    const slice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    renderGrid();
    if (slice.length && !slice.some(g => g.id === selectedId)) selectGame(slice[0].id);
  }

  function filterGames() {
    const query = searchInput.value.trim().toLowerCase();

    filtered = games.filter(game => {
      return !query ||
        safeText(game.name).toLowerCase().includes(query) ||
        safeText(game.id).toLowerCase().includes(query) ||
        safeText(game.description).toLowerCase().includes(query);
    });

    page = 0;

    if (filtered.length === 0) {
      setStatus("0 games found");
      selectedId = null;
      renderGrid();
      renderEmptyDetails();
      return;
    }

    setStatus(
      query
        ? `${filtered.length} of ${games.length} games`
        : `${games.length} game${games.length === 1 ? "" : "s"}`
    );

    const keep = filtered.findIndex(g => g.id === selectedId);
    if (keep === -1) selectedId = filtered[0].id;
    else page = Math.floor(keep / PAGE_SIZE);

    renderGrid();
    renderDetails(games.find(g => g.id === selectedId));
  }

  function selectGame(id) {
    const game = games.find(item => item.id === id);
    if (!game) return;

    selectedId = id;

    const index = filtered.findIndex(g => g.id === id);
    const targetPage = Math.floor(index / PAGE_SIZE);
    if (index !== -1 && targetPage !== page) {
      page = targetPage;
      renderGrid();
    } else {
      highlight();
    }

    renderDetails(game);
  }

  /* ---------- top screen ---------- */
  function renderEmptyDetails() {
    details.innerHTML = "";
    const box = document.createElement("div");
    box.className = "empty";
    const inner = document.createElement("div");
    const h = document.createElement("h2");
    h.textContent = "No game selected";
    const p = document.createElement("p");
    p.textContent = "Try a different search.";
    inner.append(h, p);
    box.appendChild(inner);
    details.appendChild(box);
  }

  function renderDetails(game) {
    if (!game) return;
    details.innerHTML = "";

    const fallback = document.createElement("div");
    fallback.className = "details-fallback";
    fallback.textContent = "▶";

    if (game.thumbnail) {
      const image = document.createElement("img");
      image.className = "details-image";
      image.alt = "";
      image.src = game.thumbnail;
      image.addEventListener("error", () => image.replaceWith(fallback));
      details.appendChild(image);
    } else {
      details.appendChild(fallback);
    }

    const text = document.createElement("div");
    text.className = "details-text";

    const title = document.createElement("h2");
    title.textContent = game.name;

    const description = document.createElement("p");
    description.textContent = safeText(game.description, "No description available.");

    const meta = document.createElement("div");
    meta.className = "meta";
    if (game.version) {
      const version = document.createElement("span");
      version.className = "badge";
      version.textContent = `Version ${game.version}`;
      meta.appendChild(version);
    }
    const idBadge = document.createElement("span");
    idBadge.className = "badge";
    idBadge.textContent = `ID: ${game.id}`;
    meta.appendChild(idBadge);

    const play = document.createElement("button");
    play.type = "button";
    play.className = "play";
    play.textContent = "Start";
    play.addEventListener("click", () => launch(game));

    text.append(title, description, meta, play);
    details.appendChild(text);
  }

  function showError(message) {
    grid.innerHTML = "";
    details.innerHTML = "";
    const box = document.createElement("div");
    box.className = "error";
    const inner = document.createElement("div");
    const h = document.createElement("h2");
    h.textContent = "Launcher Error";
    const p = document.createElement("p");
    p.textContent = message;
    inner.append(h, p);
    box.appendChild(inner);
    details.appendChild(box);
  }

  async function loadGames() {
    try {
      const response = await fetch("games.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`games.json returned HTTP ${response.status}.`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("games.json must contain an array.");

      games = data.filter(validGame);
      if (games.length === 0) throw new Error("No valid games were found in games.json.");

      filterGames();
    } catch (error) {
      console.error(error);
      setStatus("Failed to load games");
      showError("Could not load games.json. Make sure the launcher is being served through GitHub Pages and that games.json is in the repository root.");
    }
  }

  /* ---------- events ---------- */
  searchInput.addEventListener("input", filterGames);

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    filterGames();
    searchInput.focus();
  });

  prevBtn.addEventListener("click", () => goToPage(page - 1));
  nextBtn.addEventListener("click", () => goToPage(page + 1));

  // Keyboard: arrows move the cursor, Enter opens, Q/E (L/R) flip pages.
  document.addEventListener("keydown", event => {
    if (event.target === searchInput || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!filtered.length) return;

    const index = Math.max(0, filtered.findIndex(g => g.id === selectedId));
    const cols = window.matchMedia("(max-width: 640px)").matches ? 3 : 4;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };

    if (event.key in moves) {
      event.preventDefault();
      const next = Math.min(Math.max(index + moves[event.key], 0), filtered.length - 1);
      selectGame(filtered[next].id);
    } else if (event.key === "Enter" && event.target.tagName !== "BUTTON") {
      launch(filtered[index]);
    } else if (event.key.toLowerCase() === "q") {
      goToPage(page - 1);
    } else if (event.key.toLowerCase() === "e") {
      goToPage(page + 1);
    }
  });

  tickClock();
  setInterval(tickClock, 15000);
  loadGames();
})();