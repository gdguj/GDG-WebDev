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

  const questionCounter = document.getElementById("questionCounter");

  function updateCounter() {
    if (!questionCounter) return;
    const count = questionsContainer.querySelectorAll(".question-item").length;
    questionCounter.textContent = count + " / 25";
    questionCounter.style.background = count === 25 ? "#22c55e" : (count > 25 ? "#ef4444" : "#3674d8");
  }

  addQuestionBtn.addEventListener("click", () => {
    addQuestionItem();
    renderQuestionIndices();
    updateCounter();
  });

  questionsContainer.addEventListener("click", async (event) => {
    const uploadBtn = event.target.closest("[data-upload-target]");
    if (!uploadBtn) {
      return;
    }

    const targetField = String(uploadBtn.dataset.uploadTarget || "").trim();
    const questionItem = uploadBtn.closest(".question-item");
    if (!questionItem || !targetField) {
      return;
    }

    await uploadImageForField(questionItem, targetField, uploadBtn);
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

      showSuccessPopup();
    } catch (error) {
      showStatus(normalizeSaveError(error.message), "error");
    } finally {
      saveGameBtn.disabled = false;
      saveGameBtn.textContent = "حفظ اللعبة";
    }
  });

  function showSuccessPopup() {
    // إنشاء الـ overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed","inset:0","background:rgba(0,0,0,0.45)",
      "display:flex","align-items:center","justify-content:center",
      "z-index:9999","direction:rtl"
    ].join(";");

    const box = document.createElement("div");
    box.style.cssText = [
      "background:#fff","border-radius:18px","padding:40px 36px 32px",
      "text-align:center","max-width:360px","width:90%",
      "box-shadow:0 8px 40px rgba(0,0,0,0.18)"
    ].join(";");

    const icon = document.createElement("div");
    icon.textContent = "✅";
    icon.style.cssText = "font-size:3rem;margin-bottom:14px";

    const title = document.createElement("h2");
    title.textContent = "تم إنشاء اللعبة بنجاح!";
    title.style.cssText = "font-size:1.3rem;font-weight:800;color:#1a1a1a;margin:0 0 8px";

    const sub = document.createElement("p");
    sub.textContent = "يمكنك الآن مشاركة لعبتك مع الآخرين.";
    sub.style.cssText = "font-size:0.95rem;color:#555;margin:0 0 24px";

    const btn = document.createElement("button");
    btn.textContent = "حسناً";
    btn.style.cssText = [
      "background:#0078BF","color:#fff","border:none","border-radius:10px",
      "padding:12px 36px","font-size:1rem","font-weight:700",
      "cursor:pointer","width:100%"
    ].join(";");
    btn.addEventListener("click", () => {
      window.location.href = "my-games.html";
    });

    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(sub);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  addQuestionItem();
  renderQuestionIndices();
  updateCounter();

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
    const questions = questionItems.map((item, index) => {
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

  const LETTER_GRID_SIZE = 25; // شبكة 5×5
  const SURVEY_MIN_QUESTIONS = 2; // اللعبة = جولتين على الأقل
  const SURVEY_OPTIONS_PER_QUESTION = 10; // عدد مربعات الإجابات في لعبة الاستبيان

  function collectLetterData() {
    const questionItems = Array.from(questionsContainer.querySelectorAll(".question-item"));

    if (questionItems.length !== LETTER_GRID_SIZE) {
      throw new Error(
        "عدد الأسئلة يجب أن يكون " + LETTER_GRID_SIZE + " بالضبط (شبكة 5×5). " +
        "حالياً لديك " + questionItems.length + " سؤال."
      );
    }

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

    return { questions };
  }

  function collectSurveyData() {
    const questionItems = Array.from(questionsContainer.querySelectorAll(".question-item"));

    if (questionItems.length < SURVEY_MIN_QUESTIONS) {
      throw new Error("لعبة الاستبيان تعتبر جولتين، لذلك يجب إدخال سؤالين على الأقل.");
    }

    const questions = questionItems.map((item, index) => {
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

      if (answers.length !== SURVEY_OPTIONS_PER_QUESTION) {
        throw new Error(
          "السؤال رقم " +
            (index + 1) +
            " يجب أن يحتوي " +
            SURVEY_OPTIONS_PER_QUESTION +
            " خيارات بالضبط (بعدد مربعات اللعبة)."
        );
      }

      return { question, answers };
    });

    return { questions };
  }

  function getValue(scope, fieldName) {
    const element = scope.querySelector('[data-field="' + fieldName + '"]');
    return String((element && element.value) || "").trim();
  }

  async function uploadImageForField(questionItem, fieldName, uploadBtn) {
    const fileInput = questionItem.querySelector('[data-upload-file="' + fieldName + '"]');
    const urlInput = questionItem.querySelector('[data-field="' + fieldName + '"]');
    const statusSlot = questionItem.querySelector('[data-upload-status="' + fieldName + '"]');

    if (!fileInput || !urlInput) {
      return;
    }

    const selectedFile = fileInput.files && fileInput.files[0];
    if (!selectedFile) {
      setUploadStatus(statusSlot, "اختاري صورة أولاً.", "error");
      return;
    }

    const auth = getAuthData();
    if (!auth || !auth.token) {
      window.location.href = "auth.html?redirect=" + encodeURIComponent(window.location.pathname.split("/").pop() || "");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    const initialText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = "جاري الرفع...";
    setUploadStatus(statusSlot, "يتم رفع الصورة إلى Cloudinary...", "info");

    try {
      const response = await fetch("/api/uploads/image", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + auth.token,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success || !result.data || !result.data.url) {
        throw new Error(result.message || "فشل رفع الصورة.");
      }

      urlInput.value = result.data.url;
      fileInput.value = "";
      setUploadStatus(statusSlot, "تم رفع الصورة وتعبئة الرابط بنجاح.", "success");
    } catch (error) {
      setUploadStatus(statusSlot, error.message || "حدث خطأ أثناء الرفع.", "error");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = initialText;
    }
  }

  function setUploadStatus(slot, message, type) {
    if (!slot) {
      return;
    }

    slot.textContent = message;
    slot.style.color = type === "error"
      ? "#ea4335"
      : type === "success"
        ? "#16a34a"
        : "#6b7280";
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
        updateCounter();
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

      const currentCount = answersWrap.querySelectorAll(".answer-item").length;
      if (currentCount >= SURVEY_OPTIONS_PER_QUESTION) {
        return;
      }

      const answerNode = answerTemplate.content.firstElementChild.cloneNode(true);
      const removeAnswerBtn = answerNode.querySelector("[data-remove-answer]");

      if (removeAnswerBtn) {
        removeAnswerBtn.addEventListener("click", () => {
          answerNode.remove();
          syncAnswerControls();
        });
      }

      answersWrap.appendChild(answerNode);
      syncAnswerControls();
    };

    const syncAnswerControls = () => {
      const count = answersWrap.querySelectorAll(".answer-item").length;
      addAnswerBtn.disabled = count >= SURVEY_OPTIONS_PER_QUESTION;
      addAnswerBtn.title = addAnswerBtn.disabled
        ? "وصلت للحد المطلوب: " + SURVEY_OPTIONS_PER_QUESTION + " خيارات"
        : "إضافة إجابة";
    };

    addAnswerBtn.addEventListener("click", addAnswerItem);
    for (let i = 0; i < SURVEY_OPTIONS_PER_QUESTION; i += 1) {
      addAnswerItem();
    }
    syncAnswerControls();
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

  function normalizeSaveError(message) {
    const raw = String(message || "").trim();

    if (!raw) {
      return "حدث خطأ أثناء حفظ اللعبة. حاولي مرة أخرى.";
    }

    if (
      raw.includes("createdBy.userId is invalid") ||
      raw.includes("createdBy.accountId is invalid")
    ) {
      return "تعذر حفظ اللعبة بسبب مشكلة في بيانات الحساب. سجلي خروج ثم ادخلي مرة أخرى.";
    }

    if (raw.includes("Must be authenticated") || raw.includes("401")) {
      return "يجب تسجيل الدخول أولاً قبل حفظ اللعبة.";
    }

    return raw;
  }
})();