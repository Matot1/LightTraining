(function () {
  const chapters = document.getElementById("chapters");
  const titleEl = document.getElementById("book-title");
  const subEl = document.getElementById("book-sub");
  const fileInput = document.getElementById("file");
  const resetBtn = document.getElementById("reset");
  const status = document.getElementById("status");
  const KEY = "light-training-program-v2";

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

  function paint(program) {
    titleEl.textContent = program.title || "Тренировки";
    subEl.textContent = program.subtitle || "";
    document.title = program.title || "Тренировки";
    chapters.innerHTML = renderChapters(program);
    bindImages(chapters);
    bindDecks(chapters);
  }

  bindImages(chapters);
  bindDecks(chapters);

  chapters.addEventListener("toggle", (event) => {
    const details = event.target;
    if (!details.open) return;
    details.querySelectorAll("[data-deck]").forEach((deck) => {
      requestAnimationFrame(() => layoutDeck(deck));
    });
  });

  window.addEventListener("resize", () => {
    chapters.querySelectorAll("[data-deck]").forEach(layoutDeck);
  });

  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (validProgram(data)) {
        paint(data);
        resetBtn.hidden = false;
      }
    }
  } catch (err) {
    /* Quick Look and private mode have no storage. The printed book stays. */
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    status.classList.remove("ok");
    status.textContent = "Читаю файл…";
    try {
      const data = await readProgramFile(file);
      if (!validProgram(data)) throw new Error("Файл не разобран. Подойдёт Excel, CSV или JSON со списком упражнений.");
      localStorage.setItem(KEY, JSON.stringify(data));
      paint(data);
      resetBtn.hidden = false;
      const count = data.workouts.reduce((sum, workout) => sum + workout.exercises.filter((ex) => ex && ex.name).length, 0);
      status.classList.add("ok");
      status.textContent = "Разобрано: " + data.workouts.length + " " + plural(data.workouts.length, "тренировка", "тренировки", "тренировок")
        + (count ? ", " + count + " " + plural(count, "упражнение", "упражнения", "упражнений") : "");
    } catch (err) {
      status.classList.remove("ok");
      status.textContent = (err && err.message) || "Файл не разобран. Подойдёт Excel, CSV или JSON со списком упражнений.";
    }
    fileInput.value = "";
  });

  resetBtn.addEventListener("click", () => {
    try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
    location.hash = "";
    location.reload();
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
