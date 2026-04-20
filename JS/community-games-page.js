//mock data for community games

const communityGames = [
  {
    id: 1,
    type: "Word Game",
    creator: "حسناء",
    questionsCount: 15,
    createdAt: "2026-04-10"
  },
  {
    id: 2,
    type: "Image Game",
    creator: "عبدالله",
    questionsCount: 20,
    createdAt: "2026-04-09"
  },
  {
    id: 3,
    type: "Family Feud",
    creator: "نور",
    questionsCount: 12,
    createdAt: "2026-04-08"
  },
  {
    id: 4,
    type: "Word Game",
    creator: "علي",
    questionsCount: 10,
    createdAt: "2026-04-06"
  },
  {
    id: 5,
    type: "Image Game",
    creator: "فارس",
    questionsCount: 18,
    createdAt: "2026-03-30"
  },
  {
    id: 6,
    type: "Family Feud",
    creator: "سامي",
    questionsCount: 15,
    createdAt: "2026-03-25"
  },
  {
    id: 7,
    type: "Word Game",
    creator: "ريم",
    questionsCount: 20,
    createdAt: "2026-03-20"
  },
  {
    id: 8,
    type: "Image Game",
    creator: "هالة",
    questionsCount: 22,
    createdAt: "2026-03-18"
  },
  {
    id: 9,
    type: "Family Feud",
    creator: "عمر",
    questionsCount: 25,
    createdAt: "2026-03-15"
  }
];


const gamesContainer = document.getElementById("gamesContainer");
const typeFilterValue = document.getElementById("typeFilterValue");
const sortFilterValue = document.getElementById("sortFilterValue");
const filterDropdowns = Array.from(document.querySelectorAll("[data-filter-dropdown]"));
const validGameIds = new Set(communityGames.map((game) => String(game.id)));
const gameCardsById = new Map();
const filterState = {
  type: "all",
  sort: "newest"
};
const filterLabels = {
  type: {
    all: "كل الألعاب",
    image: "لعبة الصور",
    word: "لعبة الحروف",
    family: "Family Feud"
  },
  sort: {
    newest: "الأحدث",
    oldest: "الأقدم"
  }
};
const filterTypeMap = {
  image: "Image Game",
  word: "Word Game",
  family: "Family Feud"
};

let renderQueue = Promise.resolve();

function formatArabicDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function getGameIdentity(type) {
  const normalizedType = typeof type === "string" ? type.trim() : "";

  if (normalizedType === "Image Game") {
    return {
      cardClass: "game-card--image",
      title: "لعبة الصور",
      iconSrc: "../Images/image-game.png",
      iconAlt: "أيقونة لعبة الصور"
    };
  }

  if (normalizedType === "Family Feud") {
    return {
      cardClass: "game-card--family",
      title: "لعبة Family Feud",
      iconSrc: "../Images/family-feud.png",
      iconAlt: "أيقونة لعبة Family Feud"
    };
  }

  if (normalizedType === "Word Game") {
    return {
      cardClass: "game-card--word",
      title: "لعبة الحروف",
      iconSrc: "../Images/letters-game.png",
      iconAlt: "أيقونة لعبة الحروف"
    };
  }

  return {
    cardClass: "game-card--general",
    title: "لعبة",
    iconSrc: "../Images/letters-game.png",
    iconAlt: "أيقونة لعبة"
  };
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

function createDetailRow(iconClass, label, value) {
  const detail = createElement("div", "game-card__detail");
  const icon = createElement("i", iconClass);
  const content = createElement("span");
  const labelSpan = createElement("span", "game-card__label", `${label}:`);

  icon.setAttribute("aria-hidden", "true");

  content.append(labelSpan, document.createTextNode(` ${value}`));
  detail.append(icon, content);

  return detail;
}

function createGameCard(game) {
  const { cardClass, title, iconSrc, iconAlt } = getGameIdentity(game.type);
  const article = createElement("article", `game-card game-card--interactive ${cardClass}`);
  const top = createElement("div", "game-card__top");
  const iconWrapper = createElement("span", "game-card__icon");
  const iconImage = createElement("img");
  const heading = createElement("h3", "game-card__type", title);
  const body = createElement("div", "game-card__body");
  const creator = createElement("p", "game-card__meta", `بواسطة ${game.creator}`);
  const details = createElement("div", "game-card__details");

  article.dataset.id = String(game.id);
  article.dataset.type = game.type;
  article.dataset.createdAt = game.createdAt;
  article.setAttribute("role", "button");
  article.setAttribute("tabindex", "0");
  article.setAttribute("aria-label", title);

  iconWrapper.setAttribute("aria-hidden", "true");
  iconImage.src = iconSrc;
  iconImage.alt = iconAlt;
  iconWrapper.appendChild(iconImage);

  top.append(iconWrapper, heading);

  details.append(
    createDetailRow("fa-solid fa-circle-question", "عدد الأسئلة", String(game.questionsCount)),
    createDetailRow("fa-regular fa-calendar", "تاريخ الإنشاء", formatArabicDate(game.createdAt))
  );

  body.append(creator, details);
  article.append(top, body);

  return article;
}

function createEmptyState() {
  const emptyState = createElement("div", "empty-state");
  const message = createElement("p", "empty-state__text", "لا توجد ألعاب متاحة حالياً");

  emptyState.appendChild(message);

  return emptyState;
}

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function parseCreatedAt(dateString) {
  const time = new Date(dateString).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getFilteredAndSortedGames() {
  const filteredGames = communityGames.filter((game) => {
    if (filterState.type === "all") {
      return true;
    }

    return game.type === filterTypeMap[filterState.type];
  });

  filteredGames.sort((leftGame, rightGame) => {
    const leftDate = parseCreatedAt(leftGame.createdAt);
    const rightDate = parseCreatedAt(rightGame.createdAt);

    return filterState.sort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
  });

  return filteredGames;
}

function removeEmptyState() {
  if (!gamesContainer) {
    return;
  }

  const emptyState = gamesContainer.querySelector(".empty-state");

  if (emptyState) {
    emptyState.remove();
  }
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function updateFilterValueText(group) {
  if (group === "type" && typeFilterValue) {
    typeFilterValue.textContent = filterLabels.type[filterState.type];
  }

  if (group === "sort" && sortFilterValue) {
    sortFilterValue.textContent = filterLabels.sort[filterState.sort];
  }
}

function syncSelectedOptions(group) {
  document.querySelectorAll(`.filter-dropdown__option[data-filter-group="${group}"]`).forEach((option) => {
    const isSelected = option.dataset.value === filterState[group];
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function closeDropdown(dropdown) {
  if (!dropdown) {
    return;
  }

  dropdown.classList.remove("is-open");
  const trigger = dropdown.querySelector(".filter-dropdown__trigger");

  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
}

function closeAllDropdowns(exceptDropdown) {
  filterDropdowns.forEach((dropdown) => {
    if (dropdown !== exceptDropdown) {
      closeDropdown(dropdown);
    }
  });
}

function initializeGameCardMap() {
  communityGames.forEach((game) => {
    gameCardsById.set(String(game.id), createGameCard(game));
  });
}

function renderInitialGames() {
  if (!gamesContainer) {
    return;
  }

  clearContainer(gamesContainer);

  const fragment = document.createDocumentFragment();

  getFilteredAndSortedGames().forEach((game) => {
    const card = gameCardsById.get(String(game.id));

    if (card) {
      fragment.appendChild(card);
    }
  });

  if (!fragment.childNodes.length) {
    gamesContainer.appendChild(createEmptyState());
    return;
  }

  gamesContainer.appendChild(fragment);
}

async function updateDisplayedGames() {
  if (!gamesContainer) {
    return;
  }

  const nextGames = getFilteredAndSortedGames();
  const nextIds = new Set(nextGames.map((game) => String(game.id)));
  const currentCards = Array.from(gamesContainer.querySelectorAll(".game-card"));
  const currentIds = new Set(currentCards.map((card) => card.dataset.id));
  const cardsToHide = currentCards.filter((card) => !nextIds.has(card.dataset.id));
  const firstRects = new Map();

  currentCards.forEach((card) => {
    if (nextIds.has(card.dataset.id)) {
      firstRects.set(card.dataset.id, card.getBoundingClientRect());
    }
  });

  if (cardsToHide.length) {
    cardsToHide.forEach((card) => {
      card.classList.add("game-card--exiting");
      card.setAttribute("aria-hidden", "true");
      card.setAttribute("tabindex", "-1");
    });

    await wait(180);

    cardsToHide.forEach((card) => {
      card.remove();
      card.classList.remove("game-card--exiting");
      card.removeAttribute("aria-hidden");
      card.setAttribute("tabindex", "0");
    });
  }

  removeEmptyState();

  if (!nextGames.length) {
    gamesContainer.appendChild(createEmptyState());
    return;
  }

  const enteringCards = [];

  nextGames.forEach((game) => {
    const card = gameCardsById.get(String(game.id));

    if (!card) {
      return;
    }

    if (!currentIds.has(String(game.id))) {
      enteringCards.push(card);
    }

    gamesContainer.appendChild(card);
  });

  const visibleCards = Array.from(gamesContainer.querySelectorAll(".game-card"));

  visibleCards.forEach((card) => {
    const firstRect = firstRects.get(card.dataset.id);

    if (!firstRect) {
      card.style.transition = "none";
      card.style.opacity = "0";
      card.style.transform = "translateY(8px)";
      return;
    }

    const lastRect = card.getBoundingClientRect();
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;

    if (deltaX || deltaY) {
      card.style.transition = "none";
      card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  });

  gamesContainer.offsetHeight;

  requestAnimationFrame(() => {
    visibleCards.forEach((card) => {
      card.style.transition = "";
      card.style.opacity = "";
      card.style.transform = "";
    });
  });

  if (enteringCards.length) {
    window.setTimeout(() => {
      enteringCards.forEach((card) => {
        card.style.transition = "";
      });
    }, 250);
  }
}

function queueDisplayedGamesUpdate() {
  renderQueue = renderQueue.then(() => updateDisplayedGames());
  return renderQueue;
}

function applyFilterSelection(group, value) {
  if (!Object.prototype.hasOwnProperty.call(filterState, group) || filterState[group] === value) {
    closeAllDropdowns();
    return;
  }

  filterState[group] = value;
  updateFilterValueText(group);
  syncSelectedOptions(group);
  closeAllDropdowns();
  queueDisplayedGamesUpdate();
}

function attachDropdownEvents() {
  if (!filterDropdowns.length) {
    return;
  }

  filterDropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".filter-dropdown__trigger");

    if (!trigger) {
      return;
    }

    trigger.addEventListener("click", () => {
      const shouldOpen = !dropdown.classList.contains("is-open");
      closeAllDropdowns(dropdown);
      dropdown.classList.toggle("is-open", shouldOpen);
      trigger.setAttribute("aria-expanded", String(shouldOpen));
    });
  });

  document.addEventListener("click", (event) => {
    const option = event.target.closest(".filter-dropdown__option");

    if (option) {
      applyFilterSelection(option.dataset.filterGroup, option.dataset.value);
      return;
    }

    const clickedDropdown = event.target.closest("[data-filter-dropdown]");

    if (!clickedDropdown) {
      closeAllDropdowns();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllDropdowns();
    }
  });
}

//validate game id
function getValidatedGameId(card) {
  if (!card) {
    return null;
  }

  const rawId = typeof card.dataset.id === "string" ? card.dataset.id.trim() : "";

  if (!rawId || !validGameIds.has(rawId)) {
    return null;
  }

  return rawId;
}

//navigate to the selected game using its id
function handleGameCardSelection(card) {
  const selectedId = getValidatedGameId(card);

  if (!selectedId) {
    return;
  }

  console.log("Selected community game id:", selectedId);

  const destination = new URL("questions.html", window.location.href);
  destination.searchParams.set("id", selectedId);
  window.location.href = destination.toString();
}

function attachGameCardEvents() {
  if (!gamesContainer) {
    return;
  }

  gamesContainer.addEventListener("click", (event) => {
    const card = event.target.closest(".game-card--interactive");

    if (!card || !gamesContainer.contains(card)) {
      return;
    }

    handleGameCardSelection(card);
  });

  gamesContainer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const card = event.target.closest(".game-card--interactive");

    if (!card || !gamesContainer.contains(card)) {
      return;
    }

    event.preventDefault();
    handleGameCardSelection(card);
  });
}

initializeGameCardMap();
renderInitialGames();
updateFilterValueText("type");
updateFilterValueText("sort");
syncSelectedOptions("type");
syncSelectedOptions("sort");
attachDropdownEvents();
attachGameCardEvents();
