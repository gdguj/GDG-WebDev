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
const validGameIds = new Set(communityGames.map((game) => String(game.id)));

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

function renderCommunityGames(games) {
  if (!gamesContainer) {
    return;
  }

  clearContainer(gamesContainer);

  if (!Array.isArray(games) || !games.length) {
    gamesContainer.appendChild(createEmptyState());
    return;
  }

  const fragment = document.createDocumentFragment();

  games.forEach((game) => {
    fragment.appendChild(createGameCard(game));
  });

  gamesContainer.appendChild(fragment);
}

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

renderCommunityGames(communityGames);
attachGameCardEvents();
