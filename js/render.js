function plural(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

function roman(n) {
  const map = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
  return map[n] || String(n);
}

function validProgram(data) {
  return Boolean(data && Array.isArray(data.workouts) && data.workouts.length
    && data.workouts.every((workout) => workout && typeof workout.title === "string" && Array.isArray(workout.exercises)));
}

function cleanMeta(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text === "—") return "";
  return text;
}

function parseScheme(scheme) {
  const raw = String(scheme || "").trim();
  if (!raw) return { kind: "empty" };
  if (raw.includes("+") || /разм/i.test(raw)) return { kind: "block", text: raw };
  const match = raw.match(/^(\d+)\s*[×xх]\s*(.+)$/);
  if (match) return { kind: "simple", n: Number(match[1]), reps: match[2].trim() };
  return { kind: "block", text: raw };
}

function workingSets(ex) {
  if (typeof ex.sets === "number" && isFinite(ex.sets)) return ex.sets;
  const scheme = String(ex.scheme || ex.sets || "");
  const plus = scheme.match(/\+\s*(\d+)\s*[×xх]/);
  if (plus) return Number(plus[1]);
  const first = scheme.match(/(\d+)\s*[×xх]/);
  return first ? Number(first[1]) : 0;
}

function setsCount(ex) {
  return workingSets(ex);
}

function safeSrc(src) {
  if (typeof src !== "string") return "";
  const value = src.trim();
  if (!value || value.length > 2000000) return "";
  if (value.startsWith("images/") || value.startsWith("./images/") || value.startsWith("/images/")) return value;
  if (value.startsWith("data:image/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return value;
  } catch (err) {
    return "";
  }
  return "";
}

function imagesBlock(ex) {
  const raw = ex.images ?? ex.image ?? [];
  const list = (Array.isArray(raw) ? raw : [raw]).map(safeSrc).filter(Boolean);
  if (!list.length) return "";
  return `<div class="shots">${list.map((src) => `<img src="${esc(src)}" alt="${esc(ex.name || "Упражнение")}">`).join("")}</div>`;
}

function spoiler(ex) {
  const shots = imagesBlock(ex);
  const diagram = shots ? "" : diagramBlock(ex.diagram);
  const cues = Array.isArray(ex.cues) ? ex.cues.filter((cue) => typeof cue === "string" && cue.trim()) : [];
  if (!shots && !diagram && !cues.length) return "";
  const cuesHtml = cues.length
    ? `<ul class="cues">${cues.map((cue) => `<li>${esc(cue)}</li>`).join("")}</ul>`
    : "";
  return `<details class="spoiler">
    <summary><span>Как выполнять</span><span class="mark" aria-hidden="true"></span></summary>
    <div class="how">${shots}${diagram}${cuesHtml}</div>
  </details>`;
}

function muscleIds(ex) {
  const list = Array.isArray(ex.muscles) && ex.muscles.length ? ex.muscles : [ex.muscle];
  return list.map(normMuscle).filter(Boolean);
}

function schemeOf(ex) {
  return parseScheme(ex.scheme || (ex.sets != null ? `${ex.sets}${ex.reps ? "×" + ex.reps : ""}` : ""));
}

function exerciseHtml(ex, index, total) {
  const ids = muscleIds(ex);
  const label = muscleLabel(ex);
  const scheme = schemeOf(ex);
  const bits = [];
  if (scheme.kind === "simple") bits.push(plural(scheme.n, "подход", "подхода", "подходов"));
  const rir = cleanMeta(ex.rir);
  const rest = cleanMeta(ex.rest);
  const weight = cleanMeta(ex.weight);
  if (weight) bits.push("вес " + weight);
  if (rir) bits.push("RIR " + rir);
  if (rest) bits.push("отдых " + rest);
  const prescription = scheme.kind === "simple"
    ? `<p class="prescription"><span class="n">${esc(String(scheme.n))}</span><span class="r">× ${esc(scheme.reps)}</span></p>`
    : (scheme.kind === "block" ? `<p class="scheme">${esc(scheme.text)}</p>` : "");
  const kicker = [ex.section, total ? `${index + 1} / ${total}` : ""].filter(Boolean).join(" · ");
  const plainTop = scheme.kind === "block" ? scheme.text : (scheme.kind === "simple" ? `${scheme.n} × ${scheme.reps}` : (ex.section || ""));
  const top = ids.length
    ? `<div class="lens-top">${atlasSvg(ids)}</div>`
    : `<div class="lens-top lens-top-plain"><p>${esc(plainTop)}</p></div>`;
  return `<article class="lens-card">
    ${top}
    <div class="lens-body">
      ${kicker ? `<p class="lens-kicker">${esc(kicker)}</p>` : ""}
      <h2>${esc(ex.name || "Упражнение")}</h2>
      ${label ? `<p class="muscle">${esc(label)}</p>` : ""}
      ${prescription}
      ${bits.length ? `<p class="word">${esc(bits.join(" · "))}</p>` : ""}
      ${spoiler(ex)}
    </div>
  </article>`;
}

function deckHtml(exercises) {
  return `<div class="deck-clip"><div class="deck" data-deck tabindex="0">${exercises.map((ex, index) => exerciseHtml(ex, index, exercises.length)).join("")}</div></div><p class="deck-hint">Листай карточки вбок</p>`;
}

function renderDay(workout) {
  if (!workout) return "";
  const exercises = (workout.exercises || []).filter((ex) => ex && typeof ex === "object" && ex.name);
  const notes = typeof workout.text === "string"
    ? workout.text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p class="note">${esc(line)}</p>`).join("")
    : "";
  const title = `<h2 class="day-title">${esc(workout.title || "День")}</h2>`;
  const cards = exercises.length ? deckHtml(exercises) : (notes ? "" : `<p class="info">В этом дне пока нет упражнений.</p>`);
  return title + notes + cards;
}

function renderChapters(program) {
  return program.workouts.map((workout, index) => {
    const exercises = workout.exercises.filter((ex) => ex && typeof ex === "object" && ex.name);
    const totalSets = exercises.reduce((sum, ex) => sum + setsCount(ex), 0);
    const bits = [`${exercises.length} ${plural(exercises.length, "упражнение", "упражнения", "упражнений")}`];
    if (totalSets) bits.push(`${totalSets} ${plural(totalSets, "подход", "подхода", "подходов")}`);
    const info = typeof workout.info === "string" && workout.info.trim()
      ? `<p class="info">${esc(workout.info.trim())}</p>`
      : "";
    const notes = typeof workout.text === "string"
      ? workout.text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p class="note">${esc(line)}</p>`).join("")
      : "";
    const body = exercises.length
      ? deckHtml(exercises)
      : (notes ? "" : `<p class="info">В этой тренировке пока нет упражнений.</p>`);
    const count = exercises.length ? bits.join(" · ") : "";
    return `<article class="chapter">
      <details>
        <summary>
          <span class="num">${roman(index + 1)}</span>
          <span class="titles">
            <span class="name">${esc(workout.title)}</span>
            <span class="count">${esc(count)}</span>
          </span>
          <span class="mark" aria-hidden="true"></span>
        </summary>
        <div class="page">${info}${notes}${body}</div>
      </details>
    </article>`;
  }).join("");
}
