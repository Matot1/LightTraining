(function () {
  const dayPage = document.getElementById("day-page");
  const daysEl = document.getElementById("days");
  const daysScroll = document.getElementById("days-scroll");
  const daysThumb = document.getElementById("days-thumb");
  const addDayBtn = document.getElementById("add-day");
  const titleEl = document.getElementById("book-title");
  const subEl = document.getElementById("book-sub");
  const fileInput = document.getElementById("file");
  const resetBtn = document.getElementById("reset");
  const editBtn = document.getElementById("edit");
  const doneBtn = document.getElementById("done");
  const editFields = document.getElementById("edit-fields");
  const statuses = document.querySelectorAll("[data-status]");
  const KEY = "light-training-program-v2";
  let program = null;
  let selectedDay = 0;

  function setStatus(text, ok) {
    statuses.forEach((el) => {
      el.classList.toggle("ok", Boolean(ok));
      el.textContent = text || "";
    });
  }

  function showBook() {
    document.body.classList.remove("is-editing");
    document.body.classList.add("has-program");
    resetBtn.hidden = false;
  }

  function showGate() {
    document.body.classList.remove("has-program", "is-editing");
    resetBtn.hidden = true;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(program)); } catch (err) { /* private mode */ }
  }

  function textField(label, value, onInput, tall) {
    const wrap = document.createElement("label");
    wrap.className = "edit-field";
    const cap = document.createElement("span");
    cap.className = "edit-label";
    cap.textContent = label;
    const box = document.createElement("textarea");
    box.className = "edit-box";
    const lines = String(value || "").split("\n").length;
    box.rows = tall ? Math.min(8, Math.max(3, lines)) : Math.min(4, lines);
    box.value = value || "";
    box.addEventListener("input", () => {
      onInput(box.value);
      save();
    });
    wrap.append(cap, box);
    return wrap;
  }

  function filled(value) {
    const text = typeof value === "string" ? value.trim() : "";
    return text && text !== "—";
  }

  function openEditor() {
    if (!program) return;
    editFields.replaceChildren();
    editFields.append(
      textField("Имя", program.title, (value) => { program.title = value; }),
      textField("Недели", program.subtitle, (value) => { program.subtitle = value; })
    );
    program.workouts.forEach((workout) => {
      const group = document.createElement("section");
      group.className = "edit-group";
      group.append(textField("Тренировка", workout.title, (value) => { workout.title = value; }));
      if (typeof workout.text === "string") {
        group.append(textField("Текст", workout.text, (value) => { workout.text = value; }, true));
      }
      (workout.exercises || []).forEach((ex) => {
        if (!ex || typeof ex !== "object") return;
        const block = document.createElement("div");
        block.className = "edit-block";
        block.append(textField("Упражнение", ex.name, (value) => { ex.name = value; }));
        if (filled(ex.section)) block.append(textField("Раздел", ex.section, (value) => { ex.section = value; }));
        if (filled(ex.scheme) || ex.name) block.append(textField("Подходы", ex.scheme, (value) => { ex.scheme = value; }));
        if (filled(ex.muscleLabel)) block.append(textField("Мышцы", ex.muscleLabel, (value) => { ex.muscleLabel = value; }));
        if (filled(ex.rir)) block.append(textField("RIR", ex.rir, (value) => { ex.rir = value; }));
        if (filled(ex.rest)) block.append(textField("Отдых", ex.rest, (value) => { ex.rest = value; }));
        if (filled(ex.weight)) block.append(textField("Вес", ex.weight, (value) => { ex.weight = value; }));
        group.append(block);
      });
      editFields.append(group);
    });
    document.body.classList.add("is-editing");
    window.scrollTo(0, 0);
  }

  function addDay() {
    if (!program) return;
    const n = program.workouts.length + 1;
    program.workouts.push({
      title: "День " + n,
      exercises: [{ name: "Новое упражнение", scheme: "" }]
    });
    selectedDay = program.workouts.length - 1;
    save();
    openEditor();
  }

  function closeEditor() {
    document.body.classList.remove("is-editing");
    if (program) paint(program);
    window.scrollTo(0, 0);
  }

  function bindImages(root) {
    root.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => img.remove());
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function layoutDeck(deck) {
    if (reduceMotion) return;
    const cards = Array.from(deck.querySelectorAll(".lens-card"));
    if (!cards.length) return;
    const view = deck.getBoundingClientRect();
    if (view.width < 40) return;
    const center = view.left + view.width / 2;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const maxDistance = cardWidth + 20;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distance = Math.min(center - cardCenter, maxDistance);
      const ratio = (maxDistance - Math.abs(distance)) / maxDistance;
      const progress = Math.min(1, Math.max(0, ratio));
      const top = card.querySelector(".lens-top");
      const topH = top ? top.getBoundingClientRect().height : 188;
      const offset = topH - progress * topH;
      const body = card.querySelector(".lens-body");
      if (body) body.style.transform = "translateY(" + (-offset) + "px)";
    });
  }

  function bindDecks(root) {
    root.querySelectorAll("[data-deck]").forEach((deck) => {
      if (deck.dataset.bound === "1") return;
      deck.dataset.bound = "1";
      deck.addEventListener("scroll", () => layoutDeck(deck), { passive: true });
      const next = deck.parentElement && deck.parentElement.querySelector(".deck-next");
      if (next) {
        next.addEventListener("click", () => {
          const card = deck.querySelector(".lens-card");
          if (!card) return;
          const step = card.getBoundingClientRect().width + 20;
          const max = deck.scrollWidth - deck.clientWidth;
          const target = deck.scrollLeft >= max - 8 ? 0 : deck.scrollLeft + step;
          deck.scrollTo({ left: target, behavior: "smooth" });
        });
      }
      deck.addEventListener("keydown", (event) => {
        const card = deck.querySelector(".lens-card");
        if (!card) return;
        const step = card.getBoundingClientRect().width + 20;
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        deck.scrollBy({ left: event.key === "ArrowRight" ? step : -step, behavior: "smooth" });
      });
      layoutDeck(deck);
    });
  }

  function placeDaysThumb() {
    if (!daysEl || !daysScroll || !daysThumb) return;
    const overflow = daysEl.scrollWidth - daysEl.clientWidth;
    daysScroll.hidden = overflow <= 8;
    if (overflow <= 8) return;
    const width = Math.max(28, daysScroll.clientWidth * (daysEl.clientWidth / daysEl.scrollWidth));
    const max = Math.max(0, daysScroll.clientWidth - width);
    const left = (daysEl.scrollLeft / overflow) * max;
    daysThumb.style.width = width + "px";
    daysThumb.style.transform = "translateX(" + left + "px)";
  }

  function renderDayButtons() {
    daysEl.replaceChildren();
    (program.workouts || []).forEach((workout, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day" + (index === selectedDay ? " on" : "");
      button.textContent = workout.title || ("День " + (index + 1));
      button.addEventListener("click", () => {
        selectedDay = index;
        renderDayButtons();
        showSelectedDay();
      });
      daysEl.append(button);
    });
    requestAnimationFrame(placeDaysThumb);
  }

  function showSelectedDay() {
    const workouts = program && program.workouts || [];
    if (!workouts.length) {
      dayPage.innerHTML = "";
      return;
    }
    if (selectedDay >= workouts.length) selectedDay = 0;
    dayPage.innerHTML = renderDay(workouts[selectedDay]);
    bindImages(dayPage);
    bindDecks(dayPage);
    requestAnimationFrame(() => {
      dayPage.querySelectorAll("[data-deck]").forEach(layoutDeck);
    });
  }

  function paint(next) {
    program = next;
    if (selectedDay >= (program.workouts || []).length) selectedDay = 0;
    titleEl.textContent = program.title || "Тренировки";
    subEl.textContent = program.subtitle || "";
    document.title = "Heft";
    renderDayButtons();
    showSelectedDay();
  }

  daysEl.addEventListener("scroll", placeDaysThumb, { passive: true });

  window.addEventListener("resize", () => {
    dayPage.querySelectorAll("[data-deck]").forEach(layoutDeck);
    placeDaysThumb();
  });

  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (validProgram(data)) {
        paint(data);
        showBook();
      }
    }
  } catch (err) {
    /* Quick Look and private mode have no storage. The printed book stays. */
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    setStatus("Читаю файл…", false);
    try {
      const data = await readProgramFile(file);
      if (!validProgram(data)) throw new Error("Файл не разобран. Подойдёт Excel, CSV или JSON со списком упражнений.");
      localStorage.setItem(KEY, JSON.stringify(data));
      selectedDay = 0;
      paint(data);
      showBook();
      const count = data.workouts.reduce((sum, workout) => sum + workout.exercises.filter((ex) => ex && ex.name).length, 0);
      setStatus("Разобрано: " + data.workouts.length + " " + plural(data.workouts.length, "тренировка", "тренировки", "тренировок")
        + (count ? ", " + count + " " + plural(count, "упражнение", "упражнения", "упражнений") : ""), true);
    } catch (err) {
      setStatus((err && err.message) || "Файл не разобран. Подойдёт Excel, CSV или JSON со списком упражнений.", false);
    }
    fileInput.value = "";
  });

  resetBtn.addEventListener("click", () => {
    try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
    program = null;
    selectedDay = 0;
    setStatus("");
    showGate();
  });

  editBtn.addEventListener("click", openEditor);
  doneBtn.addEventListener("click", closeEditor);
  addDayBtn.addEventListener("click", addDay);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
