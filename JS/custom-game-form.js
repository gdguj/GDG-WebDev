(function customGameFormPage() {
  const body = document.body;
  const gameType = String(body.dataset.gameType || "").trim();

  const gameTitleInput = document.getElementById("gameTitle");
  const gameDescriptionInput = document.getElementById("gameDescription");
  const questionsContainer = document.getElementById("questionsContainer");
  const addQuestionBtn = document.getElementById("addQuestionBtn");
  const saveGameBtn = document.getElementById("saveGameBtn");
  const saveStatus = document.getElementById("saveStatus");

  if (!gameType || !questionsContainer || !addQuestionBtn || !saveGameBtn || !saveStatus) {
    return;
  }

  addQuestionBtn.addEventListener("click", () => {
    addQuestionItem();
    renderQuestionIndices();
  });

  saveGameBtn.addEventListener("click", async () => {
    clearStatus();

    const title = String(gameTitleInput.value || "").trim();
    const description = String(gameDescriptionInput.value || "").trim();

    if (!title) {
      showStatus("اكتب اسم اللعبة أولاً.", "error");
      return;
    }

    let data;
    try {
      data = collectGameData();
    } catch (error) {
      showStatus(error.message || "تأكد من تعبئة الحقول المطلوبة.", "error");
      return;
    }

    const auth = getAuthData();
    if (!auth || !auth.user || !auth.token) {
      window.location.href = "auth.html?redirect=" + encodeURIComponent(window.location.pathname.split("/").pop() || "");
      return;
    }

    const payload = {
      gameType,
      title,
      description,
      createdBy: {
        userId: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
      },
      data,
    };

    saveGameBtn.disabled = true;
    saveGameBtn.textContent = "جاري الحفظ...";

    try {
      const response = await fetch("/api/custom-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + auth.token,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "فشل حفظ اللعبة.");
      }

      showStatus("تم حفظ اللعبة بنجاح. رقم اللعبة: " + result.gameId, "success");
    } catch (error) {
      showStatus(error.message || "حدث خطأ أثناء الحفظ.", "error");
    } finally {
      saveGameBtn.disabled = false;
      saveGameBtn.textContent = "حفظ اللعبة";
    }
  });

  addQuestionItem();
  renderQuestionIndices();

  function getAuthData() {
    const token = localStorage.getItem("gdgAuthToken") || sessionStorage.getItem("gdgAuthToken");
    const rawUser = localStorage.getItem("gdgCurrentUser") || sessionStorage.getItem("gdgCurrentUser");

    if (!token || !rawUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(rawUser);
      const id = parsedUser.id || parsedUser._id || parsedUser.userId;
      const name = parsedUser.name;
      const email = parsedUser.email;

      if (!id || !name || !email) {
        return null;
      }

      return {
        token,
        user: { id, name, email },
      };
    } catch (error) {
      return null;
    }
  }

  function collectGameData() {
    if (gameType === "image_guessing") {
      return collectImageData();
    }
    if (gameType === "letter_cells") {
      return collectLetterData();
    }
    if (gameType === "survey_game") {
      return collectSurveyData();
    }

    throw new Error("نوع اللعبة غير مدعوم.");
  }

  function collectImageData() {
    const questionItems = Array.from(questionsContainer.querySelectorAll(".question-item"));
    const questions = questionItems.map((item) => {
      const imageOne = getValue(item, "imageOne");
      const imageTwo = getValue(item, "imageTwo");
      const answer = getValue(item, "answer");
      const hint = getValue(item, "hint");

      if (!imageOne || !imageTwo || !answer) {
        throw new Error("في لعبة الصور يجب تعبئة رابطي الصورتين والإجابة لكل سؤال.");
      }

      return { imageOne, imageTwo, answer, hint };
    });

    if (!questions.length) {
      throw new Error("أضف سؤالاً واحداً على الأقل.");
    }

    return { questions };
  }

  function collectLetterData() {
    const questionItems = Array.from(questionsContainer.querySelectorAll(".question-item"));
    const questions = questionItems.map((item) => {
      const letter = getValue(item, "letter");
      const question = getValue(item, "question");
      const answer = getValue(item, "answer");

      if (!letter || !question || !answer) {
        throw new Error("في لعبة الحروف يجب تعبئة الحرف والسؤال والإجابة لكل عنصر.");
      }

      return {
        letter: letter.charAt(0),
        question,
        answer,
      };
    });

    if (!questions.length) {
      throw new Error("أضف سؤالاً واحداً على الأقل.");
    }

    return { questions };
  }

  function collectSurveyData() {
    const questionItems = Array.from(questionsContainer.querySelectorAll(".question-item"));
    const questions = questionItems.map((item) => {
      const question = getValue(item, "question");
      const answerItems = Array.from(item.querySelectorAll(".answer-item"));

      if (!question) {
        throw new Error("كل سؤال استبيان يجب أن يحتوي نص السؤال.");
      }

      const answers = answerItems.map((answerItem) => {
        const text = getValue(answerItem, "answerText");
        const pointsRaw = getValue(answerItem, "points");
        const points = Number(pointsRaw);

        if (!text || !Number.isFinite(points) || points <= 0) {
          throw new Error("في الاستبيان: كل إجابة تحتاج نصاً ونقاطاً أكبر من صفر.");
        }

        return { text, points };
      });

      if (answers.length < 2) {
        throw new Error("كل سؤال استبيان يحتاج إجابتين على الأقل.");
      }

      return { question, answers };
    });

    if (!questions.length) {
      throw new Error("أضف سؤالاً واحداً على الأقل.");
    }

    return { questions };
  }

  function getValue(scope, fieldName) {
    const element = scope.querySelector('[data-field="' + fieldName + '"]');
    return String((element && element.value) || "").trim();
  }

  function addQuestionItem() {
    const templateId =
      gameType === "image_guessing"
        ? "imageQuestionTemplate"
        : gameType === "letter_cells"
          ? "letterQuestionTemplate"
          : "surveyQuestionTemplate";

    const template = document.getElementById(templateId);
    if (!template) {
      return;
    }

    const node = template.content.firstElementChild.cloneNode(true);

    const removeBtn = node.querySelector("[data-remove-question]");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        node.remove();
        renderQuestionIndices();
      });
    }

    if (gameType === "survey_game") {
      bindSurveyAnswers(node);
    }

    questionsContainer.appendChild(node);
  }

  function bindSurveyAnswers(questionNode) {
    const addAnswerBtn = questionNode.querySelector("[data-add-answer]");
    const answersWrap = questionNode.querySelector("[data-answers-wrap]");

    if (!addAnswerBtn || !answersWrap) {
      return;
    }

    const addAnswerItem = () => {
      const answerTemplate = document.getElementById("surveyAnswerTemplate");
      if (!answerTemplate) {
        return;
      }

      const answerNode = answerTemplate.content.firstElementChild.cloneNode(true);
      const removeAnswerBtn = answerNode.querySelector("[data-remove-answer]");

      if (removeAnswerBtn) {
        removeAnswerBtn.addEventListener("click", () => {
          answerNode.remove();
        });
      }

      answersWrap.appendChild(answerNode);
    };

    addAnswerBtn.addEventListener("click", addAnswerItem);
    addAnswerItem();
    addAnswerItem();
  }

  function renderQuestionIndices() {
    const rows = Array.from(questionsContainer.querySelectorAll(".question-item"));
    rows.forEach((row, index) => {
      const indexSlot = row.querySelector("[data-question-index]");
      if (indexSlot) {
        indexSlot.textContent = String(index + 1);
      }
    });
  }

  function showStatus(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = "status " + type;
  }

  function clearStatus() {
    saveStatus.textContent = "";
    saveStatus.className = "status";
  }
})();