//Community games loaded from backend

let communityGames = [];

const gamesContainer = document.getElementById("gamesContainer");
const typeFilterValue = document.getElementById("typeFilterValue");
const sortFilterValue = document.getElementById("sortFilterValue");
const filterDropdowns = Array.from(document.querySelectorAll("[data-filter-dropdown]"));
let validGameIds = new Set();
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
  image: "image_guessing",
  word: "letter_cells",
  family: "survey_game"
};

const gameTypeMap = {
  image_guessing: "لعبة الصور",
  letter_cells: "لعبة الحروف",
  survey_game: "Family Feud"
};

let renderQueue = Promise.resolve();

async function loadCommunityGames() {
  try {
    const response = await fetch("/api/custom-games/community");
    const result = await response.json();
    
    console.log("Community games response:", result);
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || "تعذر جلب الألعاب.");
    }
    
    communityGames = Array.isArray(result.games) ? result.games.map((game) => ({
      id: String(game._id),
      type: game.gameType,
      creator: game.createdBy?.name || "غير معروف",
      questionsCount: getQuestionsCount(game.data),
      createdAt: game.createdAt
    })) : [];
    
    console.log("Processed community games:", communityGames);
    
    validGameIds = new Set(communityGames.map((game) => String(game.id)));
    gameCardsById.clear();
    
    return true;
  } catch (error) {
    console.error("Error loading community games:", error);
    return false;
  }
}

function getQuestionsCount(data) {
  if (!data || !Array.isArray(data.questions)) {
    return 0;
  }
  return data.questions.length;
}

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

  if (normalizedType === "image_guessing") {
    return {
      cardClass: "game-card--image",
      title: "لعبة الصور",
      iconSrc: "../Images/image-game.png",
      iconAlt: "أيقونة لعبة الصور"
    };
  }

  if (normalizedType === "survey_game") {
    return {
      cardClass: "game-card--family",
      title: "Family Feud",
      iconSrc: "../Images/family-feud.png",
      iconAlt: "أيقونة Family Feud"
    };
  }

  if (normalizedType === "letter_cells") {
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

  const actionsDiv = createElement("div", "game-card__actions");
  const joinCodeBtn = createElement("button", "btn-join-code", "كود الانضمام");
  joinCodeBtn.setAttribute("type", "button");
  joinCodeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    showJoinCodeModal(game.id);
  });
  actionsDiv.appendChild(joinCodeBtn);

  body.append(creator, details, actionsDiv);
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

function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function showJoinCodeModal(gameId) {
  const joinCode = generateJoinCode();
  
  const modal = document.createElement('div');
  modal.className = 'join-code-modal';
  modal.innerHTML = 
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-content">' +
      '<div class="modal-header">' +
        '<h2>كود الانضمام</h2>' +
        '<button class="modal-close">&times;</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<p>شارك هذا الكود مع الآخرين للانضمام للعبة:</p>' +
        '<div class="join-code-display">' +
          '<code>' + escapeHtml(joinCode) + '</code>' +
          '<button class="btn-copy">نسخ</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
  
  const closeBtn = modal.querySelector('.modal-close');
  const backdrop = modal.querySelector('.modal-backdrop');
  const copyBtn = modal.querySelector('.btn-copy');
  
  const closeModal = function() {
    modal.remove();
  };
  
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  
  copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(joinCode).then(() => {
      copyBtn.textContent = 'تم النسخ!';
      setTimeout(() => {
        copyBtn.textContent = 'نسخ';
      }, 2000);
    });
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

// Load community games from backend
loadCommunityGames().then((success) => {
  if (success) {
    initializeGameCardMap();
    renderInitialGames();
  } else {
    if (gamesContainer) {
      gamesContainer.innerHTML = '<div class="empty-state"><p class="empty-state__text">تعذر تحميل الألعاب. يرجى المحاولة لاحقاً.</p></div>';
    }
  }
});
