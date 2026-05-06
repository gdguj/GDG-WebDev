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

  const LETTER_GRID_SIZE = 25; // شبكة 5×5
  const SURVEY_MIN_QUESTIONS = 2; // اللعبة = جولتين على الأقل
  const SURVEY_MAX_QUESTIONS = 2; // لا يسمح بأكثر من سؤالين
  const SURVEY_OPTIONS_PER_QUESTION = 10; // عدد مربعات الإجابات في لعبة الاستبيان

  const questionCounter = document.getElementById("questionCounter");

  function updateCounter() {
    if (!questionCounter) return;
    const count = questionsContainer.querySelectorAll(".question-item").length;
    const maxCount = gameType === "survey_game" ? SURVEY_MAX_QUESTIONS : LETTER_GRID_SIZE;
    questionCounter.textContent = count + " / " + maxCount;
    questionCounter.style.background = count > maxCount ? "#ef4444" : "#4285F4";
    questionCounter.style.color = "#fff";

    if (gameType === "survey_game") {
      addQuestionBtn.disabled = count >= SURVEY_MAX_QUESTIONS;
      addQuestionBtn.title = addQuestionBtn.disabled
        ? "تم الوصول للحد الأقصى: سؤالين فقط"
        : "إضافة سؤال آخر";
    }
  }

  addQuestionBtn.addEventListener("click", () => {
    if (gameType === "survey_game") {
      const currentCount = questionsContainer.querySelectorAll(".question-item").length;
      if (currentCount >= SURVEY_MAX_QUESTIONS) {
        showStatus("في لعبة الاستبيان يسمح بسؤالين فقط.", "error");
        updateCounter();
        return;
      }
    }

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
      "background:#4285F4","color:#fff","border:none","border-radius:10px",
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

  // ربط الأزرار على الأسئلة الموجودة مسبقاً في HTML
  Array.from(questionsContainer.querySelectorAll(".question-item")).forEach(function(node) {
    bindQuestionItemButtons(node);
    if (gameType === "survey_game") {
      bindSurveyAnswers(node);
    }
  });

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
        const answer = getValue(answerItem, "answerText");
        const keywordsRaw = getValue(answerItem, "answerKeywords");
        const pointsRaw = getValue(answerItem, "points");
        const points = Number(pointsRaw);

        if (!answer || !Number.isFinite(points) || points <= 0) {
          throw new Error("في الاستبيان: كل إجابة تحتاج نصاً ونقاطاً أكبر من صفر.");
        }

        const keywords = keywordsRaw
          ? Array.from(
              new Set(
                keywordsRaw
                  .split(/[,،]/)
                  .map((entry) => entry.trim())
                  .filter(Boolean)
              )
            ).filter((entry) => entry !== answer)
          : [];

        return { answer, keywords, points };
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

  function setValue(scope, fieldName, val) {
    const el = scope.querySelector('[data-field="' + fieldName + '"]');
    if (el) el.value = val;
  }

  /* ── Quick-fill: apply JSON array of 25 items ── */
  function applyLetterJson(arr) {
    if (!Array.isArray(arr) || arr.length !== 25) {
      showStatus("يجب أن يحتوي JSON على 25 عنصر بالضبط. عدد العناصر الحالي: " + (Array.isArray(arr) ? arr.length : "غير صحيح") + ".", "error");
      return;
    }
    questionsContainer.innerHTML = "";
    for (let i = 0; i < 25; i++) { addQuestionItem(); }
    renderQuestionIndices();
    updateCounter();
    const items = Array.from(questionsContainer.querySelectorAll(".question-item"));
    arr.forEach(function(data, i) {
      setValue(items[i], "letter", String(data.letter || "").charAt(0));
      setValue(items[i], "question", String(data.question || ""));
      setValue(items[i], "answer", String(data.answer || ""));
    });
    showStatus("تم تعبئة الـ 25 سؤال بنجاح.", "success");
  }

  /* ── Preset templates ── */
  function applyPreset(presetId) {
    const presets = {
      letters_basic: [
        {letter:"ا",question:"اكتب كلمة تبدأ بحرف الألف",answer:"أسد"},
        {letter:"ب",question:"اكتب كلمة تبدأ بحرف الباء",answer:"بيت"},
        {letter:"ت",question:"اكتب كلمة تبدأ بحرف التاء",answer:"تفاحة"},
        {letter:"ث",question:"اكتب كلمة تبدأ بحرف الثاء",answer:"ثعلب"},
        {letter:"ج",question:"اكتب كلمة تبدأ بحرف الجيم",answer:"جمل"},
        {letter:"ح",question:"اكتب كلمة تبدأ بحرف الحاء",answer:"حصان"},
        {letter:"خ",question:"اكتب كلمة تبدأ بحرف الخاء",answer:"خروف"},
        {letter:"د",question:"اكتب كلمة تبدأ بحرف الدال",answer:"دب"},
        {letter:"ذ",question:"اكتب كلمة تبدأ بحرف الذال",answer:"ذئب"},
        {letter:"ر",question:"اكتب كلمة تبدأ بحرف الراء",answer:"رمانة"},
        {letter:"ز",question:"اكتب كلمة تبدأ بحرف الزاي",answer:"زرافة"},
        {letter:"س",question:"اكتب كلمة تبدأ بحرف السين",answer:"سمكة"},
        {letter:"ش",question:"اكتب كلمة تبدأ بحرف الشين",answer:"شجرة"},
        {letter:"ص",question:"اكتب كلمة تبدأ بحرف الصاد",answer:"صقر"},
        {letter:"ض",question:"اكتب كلمة تبدأ بحرف الضاد",answer:"ضفدع"},
        {letter:"ط",question:"اكتب كلمة تبدأ بحرف الطاء",answer:"طاولة"},
        {letter:"ظ",question:"اكتب كلمة تبدأ بحرف الظاء",answer:"ظبي"},
        {letter:"ع",question:"اكتب كلمة تبدأ بحرف العين",answer:"عصفور"},
        {letter:"غ",question:"اكتب كلمة تبدأ بحرف الغين",answer:"غزال"},
        {letter:"ف",question:"اكتب كلمة تبدأ بحرف الفاء",answer:"فراشة"},
        {letter:"ق",question:"اكتب كلمة تبدأ بحرف القاف",answer:"قط"},
        {letter:"ك",question:"اكتب كلمة تبدأ بحرف الكاف",answer:"كتاب"},
        {letter:"ل",question:"اكتب كلمة تبدأ بحرف اللام",answer:"ليمون"},
        {letter:"م",question:"اكتب كلمة تبدأ بحرف الميم",answer:"منزل"},
        {letter:"ن",question:"اكتب كلمة تبدأ بحرف النون",answer:"نخلة"}
      ],
      letters_tech: [
        {letter:"ا",question:"برنامج يربط الأجهزة بالإنترنت",answer:"إنترنت"},
        {letter:"ب",question:"مجموعة تعليمات تنفذها الحاسوب",answer:"برنامج"},
        {letter:"ت",question:"عملية البحث عن أخطاء الكود وإصلاحها",answer:"تصحيح"},
        {letter:"ث",question:"الأداء الثانوي الذي يعمل في خلفية النظام",answer:"ثريد"},
        {letter:"ج",question:"جهاز يجمع شبكات متعددة معاً",answer:"جدار ناري"},
        {letter:"ح",question:"الحماية الرقمية للأنظمة من الهجمات",answer:"حماية"},
        {letter:"خ",question:"خطأ في الكود يسبب توقف البرنامج",answer:"خلل"},
        {letter:"د",question:"تخزين نسخة من البيانات للحماية",answer:"دعم احتياطي"},
        {letter:"ر",question:"لغة برمجة تستخدم كثيراً في تطوير الويب",answer:"ريأكت"},
        {letter:"ز",question:"زيادة قدرة السيرفر بإضافة موارد",answer:"زيادة القدرة"},
        {letter:"س",question:"خادم يستجيب لطلبات المستخدمين",answer:"سيرفر"},
        {letter:"ش",question:"واجهة تربط بين برنامجين",answer:"شبكة API"},
        {letter:"ص",question:"صيغة تبادل البيانات النصية الشائعة",answer:"صيغة JSON"},
        {letter:"ض",question:"ضغط الملفات لتقليل حجمها",answer:"ضغط"},
        {letter:"ط",question:"طبقة الأمان في الاتصالات المشفرة",answer:"طبقة SSL"},
        {letter:"ع",question:"العنوان الفريد لكل جهاز في الشبكة",answer:"عنوان IP"},
        {letter:"غ",question:"غياب الخادم وتوزيع المهام على عدة أجهزة",answer:"غير مركزي"},
        {letter:"ف",question:"فحص الكود للتأكد من صحته قبل النشر",answer:"فحص الكود"},
        {letter:"ق",question:"قاعدة تخزن البيانات بشكل منظم",answer:"قاعدة بيانات"},
        {letter:"ك",question:"كيف يختصر اسم CSS؟",answer:"كاسكاد"},
        {letter:"ل",question:"لغة تصف هيكل صفحة الويب",answer:"لغة HTML"},
        {letter:"م",question:"منهجية تطوير البرمجيات بالدورات القصيرة",answer:"منهجية Agile"},
        {letter:"ن",question:"نظام تتبع تغييرات الكود",answer:"نظام Git"},
        {letter:"ه",question:"هجوم يعترض الاتصالات بين طرفين",answer:"هجوم MITM"},
        {letter:"و",question:"واجهة المستخدم الرسومية",answer:"واجهة GUI"}
      ],
      letters_university: [
        {letter:"ا",question:"مكان يجلس فيه الطلاب للدراسة في الجامعة",answer:"أكاديمية"},
        {letter:"ب",question:"ما اسم الشهادة التي تحصل عليها بعد 4 سنوات جامعية؟",answer:"بكالوريوس"},
        {letter:"ت",question:"الاختبار الذي يأتي في نهاية الفصل الدراسي",answer:"تجميعي"},
        {letter:"ث",question:"ما كلمة تصف شيئاً ثابتاً في الجدول الدراسي؟",answer:"ثابت"},
        {letter:"ج",question:"توزيع الدرجات حسب الأداء في المقرر",answer:"جدول الدرجات"},
        {letter:"ح",question:"الحضور المطلوب لدخول الاختبار",answer:"حضور"},
        {letter:"خ",question:"خريطة المقررات الدراسية لكل تخصص",answer:"خطة دراسية"},
        {letter:"د",question:"الوثيقة التي تثبت إتمام الدراسة",answer:"دبلوم"},
        {letter:"ذ",question:"ذكر أسماء المصادر المستخدمة في البحث",answer:"ذكر المراجع"},
        {letter:"ر",question:"رسالة تُكتب لنيل درجة الماجستير",answer:"رسالة بحثية"},
        {letter:"ز",question:"زميل يساعدك في شرح المادة",answer:"زميل دراسة"},
        {letter:"س",question:"سنة التخرج من الجامعة",answer:"سنة أخيرة"},
        {letter:"ش",question:"الشهادة المصغرة التي تحصل عليها من دورة قصيرة",answer:"شهادة"},
        {letter:"ص",question:"الصفحة الأولى في البحث الأكاديمي",answer:"صفحة العنوان"},
        {letter:"ض",question:"ضرورة لإتمام المشروع الجامعي بنجاح",answer:"ضبط الوقت"},
        {letter:"ط",question:"طالب يساعد الدكتور في تدريس المادة",answer:"طالب دكتوراه"},
        {letter:"ع",question:"عرض تقديمي بين الطلاب في القاعة",answer:"عرض"},
        {letter:"غ",question:"غياب متكرر يؤثر على درجة الطالب",answer:"غياب"},
        {letter:"ف",question:"فترة التدريب الصيفي في الشركات",answer:"فترة تدريب"},
        {letter:"ق",question:"القاعة الكبيرة التي يلتقي فيها جميع الطلاب",answer:"قاعة"},
        {letter:"ك",question:"الكتاب الذي يضم المقرر الدراسي",answer:"كتاب جامعي"},
        {letter:"ل",question:"لقاء أسبوعي بين الطالب والمشرف",answer:"لقاء"},
        {letter:"م",question:"مرحلة الدراسة العليا بعد البكالوريوس",answer:"ماجستير"},
        {letter:"ن",question:"نتيجة الاختبار التي تظهر في البوابة",answer:"نتائج"},
        {letter:"ه",question:"هيئة التدريس في الجامعة",answer:"هيئة"}
      ]
    };
    if (!presets[presetId]) {
      showStatus("القالب غير موجود.", "error");
      return;
    }
    applyLetterJson(presets[presetId]);
  }

  /* ── Event listeners for quick-fill controls ── */
  (function bindQuickFillControls() {
    const applyJsonBtn = document.getElementById("applyJsonBtn");
    const letterJsonInput = document.getElementById("letterJsonInput");
    const applyPresetBtn = document.getElementById("applyPresetBtn");
    const templatePresetSelect = document.getElementById("templatePresetSelect");

    if (applyJsonBtn && letterJsonInput) {
      applyJsonBtn.addEventListener("click", function() {
        try {
          const arr = JSON.parse(letterJsonInput.value.trim());
          applyLetterJson(arr);
        } catch (e) {
          showStatus("صيغة JSON غير صحيحة. تأكد من الصيغة.", "error");
        }
      });
    }

    if (applyPresetBtn && templatePresetSelect) {
      applyPresetBtn.addEventListener("click", function() {
        const val = templatePresetSelect.value;
        if (!val) { showStatus("اختر قالباً من القائمة أولاً.", "error"); return; }
        applyPreset(val);
      });
    }
  })();

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
    if (gameType === "survey_game") {
      const currentCount = questionsContainer.querySelectorAll(".question-item").length;
      if (currentCount >= SURVEY_MAX_QUESTIONS) {
        return;
      }
    }

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

    bindQuestionItemButtons(node);

    if (gameType === "survey_game") {
      bindSurveyAnswers(node);
    }

    questionsContainer.appendChild(node);
  }

  function bindQuestionItemButtons(node) {
    const removeBtn = node.querySelector("[data-remove-question]");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        node.remove();
        renderQuestionIndices();
        updateCounter();
      });
    }

    const duplicateBtn = node.querySelector("[data-duplicate-row]");
    if (duplicateBtn) {
      duplicateBtn.addEventListener("click", () => {
        addQuestionItem();
        renderQuestionIndices();
        updateCounter();
        const allItems = Array.from(questionsContainer.querySelectorAll(".question-item"));
        const newItem = allItems[allItems.length - 1];
        setValue(newItem, "letter", getValue(node, "letter"));
        setValue(newItem, "question", getValue(node, "question"));
        setValue(newItem, "answer", getValue(node, "answer"));
      });
    }

    const clearBtn = node.querySelector("[data-clear-row]");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        setValue(node, "letter", "");
        setValue(node, "question", "");
        setValue(node, "answer", "");
      });
    }
  }

  function bindSurveyAnswers(questionNode) {
    const answersWrap = questionNode.querySelector("[data-answers-wrap]");

    if (!answersWrap) {
      return;
    }

    answersWrap.innerHTML = "";

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
      const pointsInput = answerNode.querySelector('[data-field="points"]');
      if (pointsInput) {
        pointsInput.value = String(SURVEY_OPTIONS_PER_QUESTION - currentCount);
      }
      answersWrap.appendChild(answerNode);
    };

    for (let i = 0; i < SURVEY_OPTIONS_PER_QUESTION; i += 1) {
      addAnswerItem();
    }
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