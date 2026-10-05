(function () {
  const dayPage = document.getElementById("day-page");
  const daysEl = document.getElementById("days");
  const daysScroll = document.getElementById("days-scroll");
  const daysThumb = document.getElementById("days-thumb");
  const addDayBtn = document.getElementById("add-day");
  const titleEl = document.getElementById("book-title");
  const subEl = document.getElementById("book-sub");
  const manualBtn = document.getElementById("manual");
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

  function textField(label, value, onInput, tall, placeholder, extra) {
    extra = extra || {};
    const wrap = document.createElement("label");
    wrap.className = "edit-field";
    const cap = document.createElement("span");
    cap.className = "edit-label";
    cap.textContent = label;
    const box = document.createElement("textarea");
    box.className = "edit-box";
    const lines = String(value || "").split("\n").length;
    box.rows = tall ? Math.min(8, Math.max(3, lines)) : Math.min(4, Math.max(1, lines));
    box.value = value || "";
    if (placeholder) box.placeholder = placeholder;
    if (extra.max) box.maxLength = extra.max;
    let prev = box.value;
    box.addEventListener("input", () => {
      if (extra.max && box.value.length > extra.max) box.value = box.value.slice(0, extra.max);
      if (extra.scheme && /^\d$/.test(box.value) && !prev.startsWith(box.value + "×")) {
        box.value = box.value + "×";
        box.setSelectionRange(box.value.length, box.value.length);
      }
      prev = box.value;
      onInput(box.value);
      save();
    });
    wrap.append(cap, box);
    if (extra.hint) {
      const hint = document.createElement("span");
      hint.className = "edit-hint";
      hint.textContent = extra.hint;
      wrap.append(hint);
    }
    return wrap;
  }

  function blankExercise(section) {
    return {
      name: "",
      section: section,
      scheme: "",
      muscleLabel: "",
      rir: "",
      rest: "",
      weight: ""
    };
  }

  function blankDay(n) {
    return {
      title: "День " + n,
      text: "",
      exercises: [
        blankExercise("Разминка"),
        blankExercise("Основная часть"),
        blankExercise("Заминка"),
        blankExercise("Кардио")
      ]
    };
  }

  function openEditor(options) {
    if (!program) return;
    const keepScroll = options && options.keepScroll;
    const scrollY = window.scrollY;
    editFields.replaceChildren();
    editFields.append(
      textField("Имя", program.title, (value) => { program.title = value; }),
      textField("Недели", program.subtitle, (value) => { program.subtitle = value; }, false, "6–8 недель")
    );
    program.workouts.forEach((workout) => {
      if (!Array.isArray(workout.exercises)) workout.exercises = [];
      const group = document.createElement("section");
      group.className = "edit-group";
      group.append(
        textField("Тренировка", workout.title, (value) => { workout.title = value; }, false, "День 1"),
        textField("Текст", workout.text || "", (value) => { workout.text = value; }, true, "Заметка к этому дню", { max: 128 })
      );
      workout.exercises.forEach((ex) => {
        if (!ex || typeof ex !== "object") return;
        const block = document.createElement("div");
        block.className = "edit-block";
        block.append(
          textField("Упражнение", ex.name, (value) => { ex.name = value; }, false, "Название"),
          textField("Раздел", ex.section, (value) => { ex.section = value; }, false, "Разминка, Основная часть, Заминка, Кардио"),
          textField("Подходы", ex.scheme, (value) => { ex.scheme = value; }, false, "3×10", { scheme: true }),
          textField("Группа мышц", ex.muscleLabel, (value) => { ex.muscleLabel = value; }),
          textField("RIR", ex.rir, (value) => { ex.rir = value; }, false, "2", {
            hint: "Повторы в запасе: сколько раз ты ещё смог бы сделать упражнение. 2 значит, что остановился, но сил хватило бы ещё на два."
          }),
          textField("Отдых, сек", ex.rest, (value) => { ex.rest = value; }, false, "90"),
          textField("Вес", ex.weight, (value) => { ex.weight = value; })
        );
        group.append(block);
      });
      const adds = document.createElement("div");
      adds.className = "edit-adds";
      [
        ["+ Разминка", "Разминка", "warm"],
        ["+ Основная часть", "Основная часть", "main"],
        ["+ Заминка", "Заминка", "cool"],
        ["+ Кардио", "Кардио", "cardio"]
      ].forEach(([label, section, part]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "edit-add";
        button.dataset.part = part;
        button.textContent = label;
        button.addEventListener("click", () => {
          workout.exercises.push(blankExercise(section));
          save();
          openEditor({ keepScroll: true });
        });
        adds.append(button);
      });
      group.append(adds);
      editFields.append(group);
    });
    document.body.classList.add("is-editing");
    if (keepScroll) window.scrollTo(0, scrollY);
    else window.scrollTo(0, 0);
  }

  function startManual() {
    if (!program) {
      program = { title: "", subtitle: "", workouts: [blankDay(1)] };
      selectedDay = 0;
      save();
    }
    openEditor();
  }

  function addDay() {
    if (!program) return;
    program.workouts.push(blankDay(program.workouts.length + 1));
    selectedDay = program.workouts.length - 1;
    save();
    openEditor();
  }

  function closeEditor() {
    document.body.classList.remove("is-editing");
    if (program && validProgram(program)) {
      save();
      paint(program);
      showBook();
    } else {
      showGate();
    }
    window.scrollTo(0, 0);
  }

  function bindImages(root) {
    root.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => img.remove());
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function partColor(part) {
    if (part === "warm") return "#2fbf4f";
    if (part === "cool" || part === "cardio") return "#e23d3d";
    return "#f5c400";
  }

  function syncRule(deck) {
    const cover = document.querySelector(".cover");
    if (!cover) return;
    const cards = deck ? Array.from(deck.querySelectorAll(".lens-card")) : [];
    if (!cards.length) {
      cover.style.setProperty("--rule", "#f5c400");
      cover.style.setProperty("--rule-b", "#f5c400");
      cover.style.setProperty("--mix", "0%");
      return;
    }
    const view = deck.getBoundingClientRect();
    const center = view.left + view.width / 2;
    const points = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { color: partColor(card.dataset.part), x: rect.left + rect.width / 2 };
    }).sort((a, b) => a.x - b.x);
    let left = points[0];
    let right = points[0];
    if (center <= points[0].x) {
      left = right = points[0];
    } else if (center >= points[points.length - 1].x) {
      left = right = points[points.length - 1];
    } else {
      for (let i = 0; i < points.length - 1; i++) {
        if (points[i].x <= center && points[i + 1].x >= center) {
          left = points[i];
          right = points[i + 1];
          break;
        }
      }
    }
    const span = right.x - left.x;
    const mix = span > 1 ? ((center - left.x) / span) * 100 : 0;
    cover.style.setProperty("--rule", left.color);
    cover.style.setProperty("--rule-b", right.color);
    cover.style.setProperty("--mix", Math.round(mix * 10) / 10 + "%");
  }

  function nudgeWeight(current, dir) {
    if (current == null) return dir > 0 ? 0.5 : null;
    const next = Math.round((current + dir * 0.5) * 100) / 100;
    return next < 0.5 ? null : next;
  }

  function paintWeight(box, ex) {
    const valueBtn = box.querySelector("[data-weight-value]");
    if (!valueBtn) return;
    const n = parseWeight(ex.weight);
    box.classList.toggle("is-empty", n == null);
    valueBtn.textContent = n == null ? "Указать" : formatWeight(n);
  }

  function bindWeights(root) {
    const workout = program && program.workouts && program.workouts[selectedDay];
    if (!workout) return;
    root.querySelectorAll("[data-weight]").forEach((box) => {
      const source = Number(box.dataset.weight);
      const ex = workout.exercises && workout.exercises[source];
      if (!ex) return;
      const dec = box.querySelector("[data-weight-dec]");
      const inc = box.querySelector("[data-weight-inc]");
      const valueBtn = box.querySelector("[data-weight-value]");
      function write(n) {
        ex.weight = n == null ? "" : formatWeight(n);
        save();
        paintWeight(box, ex);
      }
      dec.addEventListener("click", () => write(nudgeWeight(parseWeight(ex.weight), -1)));
      inc.addEventListener("click", () => write(nudgeWeight(parseWeight(ex.weight), 1)));
      valueBtn.addEventListener("click", () => {
        if (box.querySelector(".weight-input")) return;
        const input = document.createElement("input");
        input.className = "weight-input";
        input.inputMode = "decimal";
        input.enterKeyHint = "done";
        input.setAttribute("aria-label", "Вес, кг");
        const current = parseWeight(ex.weight);
        input.value = current == null ? "" : formatWeight(current);
        let cancel = false;
        valueBtn.hidden = true;
        valueBtn.after(input);
        input.focus();
        input.select();
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            input.blur();
          } else if (event.key === "Escape") {
            cancel = true;
            input.blur();
          }
        });
        input.addEventListener("blur", () => {
          if (!cancel) write(parseWeight(input.value));
          input.remove();
          valueBtn.hidden = false;
          paintWeight(box, ex);
        });
      });
    });
  }

  function layoutDeck(deck) {
    syncRule(deck);
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
    bindWeights(dayPage);
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

  manualBtn.addEventListener("click", startManual);
  editBtn.addEventListener("click", openEditor);
  doneBtn.addEventListener("click", closeEditor);
  addDayBtn.addEventListener("click", addDay);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
