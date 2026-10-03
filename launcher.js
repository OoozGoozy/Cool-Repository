(() => {
  "use strict";

  const grid = document.getElementById("gameGrid");
  const details = document.getElementById("details");
  const status = document.getElementById("status");
  const searchInput = document.getElementById("gameSearch");
  const clearSearch = document.getElementById("clearSearch");

  let games = [];
  let selectedId = null;

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
    // The folder name is ALWAYS the game's id.
    return `games/${encodeURIComponent(game.id)}/index.html`;
  }

  function renderCard(game) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "game-card";
    button.dataset.id = game.id;
    button.setAttribute("aria-label", `Select ${game.name}`);

    const image = document.createElement("img");
    image.className = "thumbnail";
    image.alt = "";
    image.loading = "lazy";
    image.src = safeText(game.thumbnail);

    const fallback = document.createElement("div");
    fallback.className = "thumbnail-fallback";
    fallback.textContent = "▶";
    fallback.hidden = true;

    image.addEventListener("error", () => {
      image.hidden = true;
      fallback.hidden = false;
    });

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = game.name;

    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = safeText(game.description, "No description available.");

    body.append(title, description);
    button.append(image, fallback, body);

    button.addEventListener("click", () => selectGame(game.id));
    return button;
  }

  function filterGames() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = games.filter(game => {
        const name = safeText(game.name).toLowerCase();
        const id = safeText(game.id).toLowerCase();
        const description = safeText(game.description).toLowerCase();

        return (
            !query ||
            name.includes(query) ||
            id.includes(query) ||
            description.includes(query)
        );
    });

    grid.innerHTML = "";

    if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "no-results";

        const heading = document.createElement("h2");
        heading.textContent = "No games found";

        const message = document.createElement("p");
        message.textContent =
            `Nothing matched "${searchInput.value.trim()}".`;

        empty.append(heading, message);
        grid.appendChild(empty);

        setStatus("0 games found");
        return;
    }

    filtered.forEach(game => {
        grid.appendChild(renderCard(game));
    });

    setStatus(
        query
            ? `${filtered.length} of ${games.length} games`
            : `${games.length} game${games.length === 1 ? "" : "s"} available`
    );

    if (
        selectedId &&
        filtered.some(game => game.id === selectedId)
    ) {
        selectGame(selectedId);
    } else {
        selectGame(filtered[0].id);
    }
  }

  function selectGame(id) {
    const game = games.find(item => item.id === id);
    if (!game) return;

    selectedId = id;

    document.querySelectorAll(".game-card").forEach(card => {
      card.classList.toggle("selected", card.dataset.id === id);
    });

    details.innerHTML = "";

    if (game.thumbnail) {
      const image = document.createElement("img");
      image.className = "details-image";
      image.alt = "";
      image.src = game.thumbnail;
      image.addEventListener("error", () => image.remove());
      details.appendChild(image);
    }

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
    play.textContent = "▶  Play Game";

    play.addEventListener("click", () => {
      // This is the actual launcher:
      // games/<selected game id>/index.html
      window.location.href = gamePath(game);
    });

    details.append(title, description, meta, play);
  }

  function showError(message) {
    grid.innerHTML = "";
    details.innerHTML = `
      <div class="error">
        <div>
          <h2>Launcher Error</h2>
          <p>${message}</p>
        </div>
      </div>
    `;
  }

  async function loadGames() {
    try {
      const response = await fetch("games.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`games.json returned HTTP ${response.status}.`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("games.json must contain an array.");
      }

      games = data.filter(validGame);

      if (games.length === 0) {
        throw new Error("No valid games were found in games.json.");
      }

      filterGames();
    } catch (error) {
      console.error(error);
      setStatus("Failed to load games");
      showError("Could not load games.json. Make sure the launcher is being served through GitHub Pages and that games.json is in the repository root.");
    }
  }

  searchInput.addEventListener("input", filterGames);

clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    filterGames();
    searchInput.focus();
});

  loadGames();
})();
