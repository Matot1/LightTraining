function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

const MUSCLE_LABELS = {
  chest: "Грудь",
  back: "Спина",
  shoulders: "Плечи",
  biceps: "Бицепс",
  triceps: "Трицепс",
  abs: "Пресс",
  quads: "Квадрицепс",
  hamstrings: "Бицепс бедра",
  glutes: "Ягодицы",
  calves: "Икры",
  legs: "Ноги"
};

const MUSCLE_ALIAS = {
  pecs: "chest",
  chest: "chest",
  грудь: "chest",
  back: "back",
  lats: "back",
  спина: "back",
  shoulders: "shoulders",
  delts: "shoulders",
  плечи: "shoulders",
  biceps: "biceps",
  бицепс: "biceps",
  triceps: "triceps",
  трицепс: "triceps",
  abs: "abs",
  пресс: "abs",
  quads: "quads",
  квадрицепс: "quads",
  hamstrings: "hamstrings",
  "бицепс бедра": "hamstrings",
  glutes: "glutes",
  ягодицы: "glutes",
  calves: "calves",
  икры: "calves",
  legs: "legs",
  ноги: "legs"
};

const BODY = "M32 36 C22 38 16 46 16 56 L14 90 C14 97 19 101 25 98 L27 68 L31 62 L33 98 C29 108 27 122 29 140 L27 162 C27 166 31 168 35 168 L40 136 L45 168 C49 168 53 166 53 162 L51 140 C53 122 51 108 47 98 L49 62 L53 68 L55 98 C61 101 66 97 66 90 L64 56 C64 46 58 38 48 36 C42 32 38 32 32 36 Z";

let figureUid = 0;

function normMuscle(value) {
  if (typeof value !== "string") return "";
  const key = value.trim().toLowerCase();
  return MUSCLE_ALIAS[key] || key;
}

function expandMuscles(ids) {
  const out = new Set();
  ids.forEach((id) => {
    if (id === "legs") ["quads", "hamstrings", "glutes", "calves"].forEach((part) => out.add(part));
    else if (id) out.add(id);
  });
  return out;
}

function muscleLabel(ex) {
  if (ex && typeof ex.muscleLabel === "string" && ex.muscleLabel.trim()) return ex.muscleLabel.trim();
  const id = normMuscle(ex && ex.muscle);
  return MUSCLE_LABELS[id] || (ex && typeof ex.muscle === "string" ? ex.muscle : "");
}

function atlasSvg(ids) {
  const on = expandMuscles(ids.map(normMuscle));
  const n = ++figureUid;
  const hot = (id) => (on.has(id) ? "m on" : "m");
  const frontIds = ["chest", "abs", "shoulders", "biceps", "quads", "calves"];
  const backIds = ["back", "shoulders", "triceps", "glutes", "hamstrings", "calves"];
  const frontHot = frontIds.some((id) => on.has(id));
  const backHot = backIds.some((id) => on.has(id));

  function body(side) {
    const clip = side + n;
    const muscles = side === "f"
      ? `
        <ellipse class="${hot("shoulders")}" cx="22" cy="52" rx="8" ry="7"/>
        <ellipse class="${hot("shoulders")}" cx="58" cy="52" rx="8" ry="7"/>
        <ellipse class="${hot("chest")}" cx="40" cy="62" rx="14" ry="9"/>
        <ellipse class="${hot("biceps")}" cx="20" cy="78" rx="4.5" ry="10"/>
        <ellipse class="${hot("biceps")}" cx="60" cy="78" rx="4.5" ry="10"/>
        <ellipse class="${hot("abs")}" cx="40" cy="86" rx="6" ry="12"/>
        <ellipse class="${hot("quads")}" cx="35" cy="128" rx="6" ry="16"/>
        <ellipse class="${hot("quads")}" cx="45" cy="128" rx="6" ry="16"/>
        <ellipse class="${hot("calves")}" cx="33" cy="154" rx="4" ry="8"/>
        <ellipse class="${hot("calves")}" cx="47" cy="154" rx="4" ry="8"/>`
      : `
        <ellipse class="${hot("shoulders")}" cx="22" cy="52" rx="8" ry="7"/>
        <ellipse class="${hot("shoulders")}" cx="58" cy="52" rx="8" ry="7"/>
        <ellipse class="${hot("back")}" cx="40" cy="58" rx="10" ry="6"/>
        <ellipse class="${hot("back")}" cx="40" cy="76" rx="15" ry="12"/>
        <ellipse class="${hot("triceps")}" cx="19" cy="76" rx="4.5" ry="10"/>
        <ellipse class="${hot("triceps")}" cx="61" cy="76" rx="4.5" ry="10"/>
        <ellipse class="${hot("glutes")}" cx="34" cy="108" rx="7" ry="6"/>
        <ellipse class="${hot("glutes")}" cx="46" cy="108" rx="7" ry="6"/>
        <ellipse class="${hot("hamstrings")}" cx="35" cy="130" rx="5.5" ry="14"/>
        <ellipse class="${hot("hamstrings")}" cx="45" cy="130" rx="5.5" ry="14"/>
        <ellipse class="${hot("calves")}" cx="33" cy="154" rx="4" ry="8"/>
        <ellipse class="${hot("calves")}" cx="47" cy="154" rx="4" ry="8"/>`;
    return `<svg class="atlas" viewBox="0 0 80 176" role="img">
      <defs><clipPath id="${clip}"><path d="${BODY}"/></clipPath></defs>
      <g clip-path="url(#${clip})">
        <rect class="skin" x="0" y="0" width="80" height="176"/>
        ${muscles}
      </g>
      <path class="outline" d="${BODY}"/>
      <circle class="head" cx="40" cy="20" r="12"/>
    </svg>`;
  }

  const label = ids.map((id) => MUSCLE_LABELS[normMuscle(id)] || id).filter(Boolean).join(", ");
  return `<div class="plates" aria-label="${esc(label || "мышцы")}">
    <figure class="${frontHot ? "" : "dim"}">${body("f")}<figcaption>спереди</figcaption></figure>
    <figure class="${backHot ? "" : "dim"}">${body("b")}<figcaption>сзади</figcaption></figure>
  </div>`;
}

function polar(x, y, deg, len) {
  const r = (deg * Math.PI) / 180;
  return [Math.round((x + Math.cos(r) * len) * 10) / 10, Math.round((y + Math.sin(r) * len) * 10) / 10];
}

function pose(over) {
  return Object.assign({
    shoulder: [80, 40],
    torso: 78,
    torsoLen: 50,
    thigh: 96,
    thighLen: 42,
    shin: 82,
    shinLen: 40,
    foot: 175,
    arm: 80,
    armLen: 30,
    fore: 86,
    foreLen: 28,
    face: 180,
    support: "floor",
    bar: "hands"
  }, over);
}

function barEnds(x, y) {
  return `<path class="gold" d="M${x - 16} ${y} H${x + 16} M${x - 16} ${y - 7} V${y + 7} M${x + 16} ${y - 7} V${y + 7}"/>`;
}

function poseParts(cfg) {
  const S = cfg.shoulder;
  const hip = polar(S[0], S[1], cfg.torso, cfg.torsoLen);
  const knee = polar(hip[0], hip[1], cfg.thigh, cfg.thighLen);
  const ankle = polar(knee[0], knee[1], cfg.shin, cfg.shinLen);
  const toe = polar(ankle[0], ankle[1], cfg.foot, 16);
  const heel = polar(ankle[0], ankle[1], cfg.foot + 180, 7);
  const elbow = polar(S[0], S[1], cfg.arm, cfg.armLen);
  const wrist = polar(elbow[0], elbow[1], cfg.fore, cfg.foreLen);
  const headDir = cfg.headDir == null ? cfg.torso + 180 : cfg.headDir;
  const head = polar(S[0], S[1], headDir, cfg.headDist || 16);
  const nose = polar(head[0], head[1], cfg.face, 13);
  const pts = [S, hip, knee, ankle, toe, heel, elbow, wrist, head, nose, [head[0] - 12, head[1] - 12], [head[0] + 12, head[1] + 12]];

  let prop = "";
  if (cfg.support === "bench") {
    const y = Math.max(S[1], hip[1]) + 13;
    const x1 = Math.min(head[0], S[0]) - 16;
    const x2 = Math.max(hip[0], knee[0]) + 18;
    prop = `<path class="prop" d="M${x1} ${y} H${x2} M${x1 + 14} ${y} V${y + 16} M${x2 - 14} ${y} V${y + 16}"/>`;
    pts.push([x1, y], [x2, y + 16]);
  } else if (cfg.support === "incline") {
    const x1 = head[0] - 14;
    const y1 = S[1] + 16;
    const x2 = hip[0] + 16;
    const y2 = hip[1] + 12;
    prop = `<path class="prop" d="M${x1} ${y1} L${x2} ${y2} M${x1 + 8} ${y1 + 4} l-6 16 M${x2 - 10} ${y2} l6 16"/>`;
    pts.push([x1, y1], [x2, y2 + 16]);
  } else if (cfg.support === "seat") {
    const y = hip[1] + 6;
    const xBack = Math.max(hip[0], S[0]) + 8;
    const xFront = Math.min(knee[0], hip[0]) - 6;
    prop = `<path class="prop" d="M${xFront} ${y} H${xBack} V${S[1] - 4} M${xBack - 10} ${y} V${y + 18}"/>`;
    pts.push([xFront, y + 18], [xBack, S[1] - 4]);
  } else if (cfg.support === "press") {
    const seatY = hip[1] + 8;
    const plateX = Math.min(toe[0], ankle[0]) - 10;
    const plateTop = Math.min(toe[1], ankle[1], knee[1]) - 8;
    const plateBot = Math.max(toe[1], ankle[1], knee[1]) + 10;
    prop = `<path class="prop" d="M${hip[0] - 18} ${seatY} H${hip[0] + 22} M${S[0] + 2} ${S[1] + 6} L${hip[0] + 14} ${seatY}"/>`;
    prop += `<path class="gold" d="M${plateX} ${plateTop} L${plateX + 4} ${plateBot}"/>`;
    pts.push([hip[0] - 18, seatY], [S[0], S[1]], [plateX, plateTop], [plateX, plateBot]);
  } else {
    const y = Math.max(ankle[1], toe[1], heel[1]) + 3;
    const x1 = Math.min(toe[0], heel[0], head[0], wrist[0]) - 18;
    const x2 = Math.max(toe[0], heel[0], hip[0], wrist[0]) + 18;
    prop = `<path class="prop" d="M${x1} ${y} H${x2}"/>`;
    pts.push([x1, y], [x2, y]);
  }

  let bar = "";
  if (cfg.bar === "dumbbell") {
    const a = polar(wrist[0], wrist[1], 35, 9);
    const b = polar(wrist[0], wrist[1], 215, 9);
    pts.push(a, b);
    bar = `<path class="gold" d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}"/>`;
  } else if (cfg.bar === "back") {
    const x = S[0];
    const y = S[1] - 6;
    pts.push([x - 24, y - 10], [x + 24, y + 10]);
    bar = barEnds(x, y);
  } else if (cfg.bar !== "none") {
    const x = wrist[0];
    const y = wrist[1];
    pts.push([x - 24, y - 10], [x + 24, y + 10]);
    bar = barEnds(x, y);
  }

  const body = `<path class="ink" d="M${S[0]} ${S[1]} L${hip[0]} ${hip[1]} L${knee[0]} ${knee[1]} L${ankle[0]} ${ankle[1]} L${toe[0]} ${toe[1]} M${ankle[0]} ${ankle[1]} L${heel[0]} ${heel[1]}"/>
    <path class="ink" d="M${S[0]} ${S[1]} L${elbow[0]} ${elbow[1]} L${wrist[0]} ${wrist[1]}"/>
    <circle class="head" cx="${head[0]}" cy="${head[1]}" r="10"/>
    <path class="ink" d="M${head[0]} ${head[1]} L${nose[0]} ${nose[1]}"/>`;
  return { prop, body, bar, pts };
}

function viewBoxOf(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  pts.forEach((p) => {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  });
  const pad = 16;
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

function poseSvg(parts, viewBox) {
  return `<svg class="etch" viewBox="${viewBox}" role="img">${parts.prop}${parts.body}${parts.bar}</svg>`;
}

const POSES = {
  bench: {
    start: pose({ shoulder: [54, 72], torso: 8, torsoLen: 54, thigh: 50, thighLen: 28, shin: 105, shinLen: 22, foot: 20, arm: 88, armLen: 24, fore: -55, foreLen: 22, face: -90, support: "bench", bar: "hands" }),
    end: pose({ shoulder: [54, 72], torso: 8, torsoLen: 54, thigh: 50, thighLen: 28, shin: 105, shinLen: 22, foot: 20, arm: -78, armLen: 24, fore: -82, foreLen: 22, face: -90, support: "bench", bar: "hands" })
  },
  incline: {
    start: pose({ shoulder: [62, 78], torso: 28, torsoLen: 50, thigh: 70, thighLen: 30, shin: 110, shinLen: 24, foot: 20, arm: 100, armLen: 24, fore: -40, foreLen: 20, face: -70, support: "incline", bar: "dumbbell" }),
    end: pose({ shoulder: [62, 78], torso: 28, torsoLen: 50, thigh: 70, thighLen: 30, shin: 110, shinLen: 24, foot: 20, arm: -60, armLen: 24, fore: -70, foreLen: 20, face: -70, support: "incline", bar: "dumbbell" })
  },
  fly: {
    start: pose({ shoulder: [54, 74], torso: 10, torsoLen: 52, thigh: 52, thighLen: 28, shin: 108, shinLen: 22, foot: 20, arm: 115, armLen: 28, fore: 140, foreLen: 18, face: -90, support: "bench", bar: "dumbbell" }),
    end: pose({ shoulder: [54, 74], torso: 10, torsoLen: 52, thigh: 52, thighLen: 28, shin: 108, shinLen: 22, foot: 20, arm: -70, armLen: 26, fore: -50, foreLen: 18, face: -90, support: "bench", bar: "dumbbell" })
  },
  french: {
    start: pose({ shoulder: [58, 72], torso: 8, torsoLen: 52, thigh: 50, thighLen: 28, shin: 105, shinLen: 22, foot: 20, arm: -75, armLen: 24, fore: -15, foreLen: 22, face: -90, support: "bench", bar: "hands" }),
    end: pose({ shoulder: [58, 72], torso: 8, torsoLen: 52, thigh: 50, thighLen: 28, shin: 105, shinLen: 22, foot: 20, arm: -75, armLen: 24, fore: -80, foreLen: 22, face: -90, support: "bench", bar: "hands" })
  },
  pushdown: {
    start: pose({ arm: 55, armLen: 22, fore: 175, foreLen: 26, bar: "hands" }),
    end: pose({ arm: 62, armLen: 22, fore: 78, foreLen: 26, bar: "hands" })
  },
  row: {
    start: pose({ shoulder: [70, 78], torso: 18, torsoLen: 52, thigh: 70, thighLen: 36, shin: 100, shinLen: 34, foot: 175, arm: 95, armLen: 28, fore: 100, foreLen: 26, face: 200, support: "floor", bar: "hands" }),
    end: pose({ shoulder: [70, 78], torso: 18, torsoLen: 52, thigh: 70, thighLen: 36, shin: 100, shinLen: 34, foot: 175, arm: 10, armLen: 26, fore: 40, foreLen: 24, face: 200, support: "floor", bar: "hands" })
  },
  pulldown: {
    start: pose({ shoulder: [78, 62], torso: 70, thigh: 150, thighLen: 34, shin: 95, shinLen: 32, arm: -90, armLen: 26, fore: -90, foreLen: 24, support: "seat", bar: "hands" }),
    end: pose({ shoulder: [78, 62], torso: 70, thigh: 150, thighLen: 34, shin: 95, shinLen: 32, arm: -150, armLen: 24, fore: -110, foreLen: 24, support: "seat", bar: "hands" })
  },
  seatedrow: {
    start: pose({ shoulder: [96, 58], torso: 75, thigh: 168, thighLen: 36, shin: 100, shinLen: 30, foot: 175, arm: 185, armLen: 26, fore: 185, foreLen: 24, support: "seat", bar: "hands" }),
    end: pose({ shoulder: [96, 58], torso: 75, thigh: 168, thighLen: 36, shin: 100, shinLen: 30, foot: 175, arm: 20, armLen: 24, fore: 10, foreLen: 22, support: "seat", bar: "hands" })
  },
  curl: {
    start: pose({ arm: 70, armLen: 26, fore: 82, foreLen: 26, bar: "hands" }),
    end: pose({ arm: 68, armLen: 26, fore: 200, foreLen: 26, bar: "hands" })
  },
  hammer: {
    start: pose({ arm: 70, armLen: 26, fore: 82, foreLen: 26, bar: "dumbbell" }),
    end: pose({ arm: 68, armLen: 26, fore: 200, foreLen: 26, bar: "dumbbell" })
  },
  squat: {
    start: pose({ bar: "back", arm: 120, armLen: 20, fore: 230, foreLen: 18 }),
    end: pose({ shoulder: [86, 78], torso: 55, torsoLen: 44, thigh: 165, thighLen: 40, shin: 80, shinLen: 36, foot: 175, bar: "back", arm: 125, armLen: 18, fore: 220, foreLen: 16 })
  },
  rdl: {
    start: pose({ bar: "hands", arm: 78, fore: 84 }),
    end: pose({ shoulder: [74, 70], torso: 28, torsoLen: 52, thigh: 78, thighLen: 40, shin: 88, shinLen: 38, arm: 55, armLen: 26, fore: 70, foreLen: 26, face: 190, bar: "hands" })
  },
  legpress: {
    start: pose({ shoulder: [46, 86], torso: 18, torsoLen: 52, thigh: 248, thighLen: 34, shin: 196, shinLen: 28, foot: 180, face: -50, arm: 40, armLen: 20, fore: 16, foreLen: 16, support: "press", bar: "none" }),
    end: pose({ shoulder: [46, 86], torso: 18, torsoLen: 52, thigh: 198, thighLen: 44, shin: 198, shinLen: 40, foot: 190, face: -50, arm: 40, armLen: 20, fore: 16, foreLen: 16, support: "press", bar: "none" })
  },
  ohp: {
    start: pose({ shoulder: [84, 58], torso: 72, thigh: 100, shin: 84, arm: -20, armLen: 22, fore: 130, foreLen: 20, support: "seat", bar: "dumbbell" }),
    end: pose({ shoulder: [84, 58], torso: 72, thigh: 100, shin: 84, arm: -85, armLen: 24, fore: -80, foreLen: 22, support: "seat", bar: "dumbbell" })
  },
  lateral: {
    start: pose({ arm: 75, armLen: 24, fore: 80, foreLen: 22, bar: "dumbbell" }),
    end: pose({ arm: -15, armLen: 26, fore: -10, foreLen: 20, bar: "dumbbell" })
  }
};

function diagramBlock(name) {
  const item = POSES[name];
  if (!item) return "";
  const start = poseParts(item.start);
  const end = poseParts(item.end);
  const viewBox = viewBoxOf(start.pts.concat(end.pts));
  return `<div class="frames">
    <figure>${poseSvg(start, viewBox)}<figcaption>Старт</figcaption></figure>
    <figure>${poseSvg(end, viewBox)}<figcaption>Финиш</figcaption></figure>
  </div>`;
}
