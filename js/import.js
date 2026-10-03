function xmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function textsIn(xml) {
  const clean = String(xml || "").replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  const parts = [];
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match;
  while ((match = re.exec(clean))) parts.push(xmlDecode(match[1]));
  return parts.join("");
}

function u16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function findEocd(bytes) {
  const min = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  return -1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Этот браузер не открывает Excel. Открой книгу в Safari.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(bytes) {
  const eocd = findEocd(bytes);
  if (eocd < 0) throw new Error("Файл не похож на таблицу Excel.");
  const count = u16(bytes, eocd + 10);
  let offset = u32(bytes, eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (u32(bytes, offset) !== 0x02014b50) throw new Error("Файл Excel повреждён.");
    const method = u16(bytes, offset + 10);
    const compSize = u32(bytes, offset + 20);
    const nameLen = u16(bytes, offset + 28);
    const extraLen = u16(bytes, offset + 30);
    const commentLen = u16(bytes, offset + 32);
    const localOff = u32(bytes, offset + 42);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    offset += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    const dataOff = localOff + 30 + u16(bytes, localOff + 26) + u16(bytes, localOff + 28);
    const comp = bytes.subarray(dataOff, dataOff + compSize);
    if (method === 0) files.set(name, comp);
    else if (method === 8) files.set(name, await inflateRaw(comp));
  }
  return files;
}

function parseSharedStrings(xml) {
  const out = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = re.exec(xml))) out.push(textsIn(match[1]));
  return out;
}

function colIndex(ref) {
  const letters = String(ref || "").match(/[A-Z]+/);
  if (!letters) return 0;
  let n = 0;
  for (const ch of letters[0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function cellText(xml, shared) {
  const type = (xml.match(/\bt="([^"]+)"/) || [])[1] || "";
  if (type === "inlineStr") {
    const inline = xml.match(/<is\b[^>]*>([\s\S]*?)<\/is>/);
    return textsIn(inline ? inline[1] : "");
  }
  const value = xml.match(/<v[^>]*>([\s\S]*?)<\/v>/);
  if (!value) return "";
  const raw = xmlDecode(value[1]).trim();
  if (type === "s") return shared[Number(raw)] || "";
  return raw;
}

function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xml))) {
    const row = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[2]))) {
      const ref = (cellMatch[1].match(/\br="([^"]+)"/) || [])[1] || "";
      const text = cellText(cellMatch[1] + ">" + (cellMatch[2] || ""), shared).replace(/\r\n/g, "\n").trim();
      const index = colIndex(ref);
      while (row.length <= index) row.push("");
      row[index] = text;
    }
    if (row.some((cell) => cell)) rows.push(row);
  }
  return rows;
}

function decodeText(bytes) {
  const utf = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
  const bad = (utf.match(/\uFFFD/g) || []).length;
  if (bad > 2 && typeof TextDecoder === "function") {
    try { return new TextDecoder("windows-1251").decode(bytes); } catch (err) { /* keep utf-8 */ }
  }
  return utf;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const sample = lines.slice(0, 2000);
  const commas = (sample.match(/,/g) || []).length;
  const semis = (sample.match(/;/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;
  const delim = tabs > commas && tabs > semis ? "\t" : (semis > commas ? ";" : ",");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < lines.length; i++) {
    const ch = lines[i];
    if (quoted) {
      if (ch === '"') {
        if (lines[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((item) => item.some((value) => value));
}

function headerKind(text) {
  const raw = String(text || "").trim();
  if (raw.length > 40) return "";
  const s = raw.toLowerCase().replace(/ё/g, "е");
  if (!s) return "";
  if (/^(№|#|n|no|номер)$/.test(s)) return "num";
  if (/^(упражнени[ея]|exercise|название|движение)$/.test(s)) return "name";
  if (/^подх\s*[×xх]\s*повт|^повт\s*[×xх]\s*подх|^схема$/.test(s)) return "scheme";
  if (/^(подх(оды)?|подход(ы)?|sets?)$/.test(s)) return "sets";
  if (/^(повт(оры|орений)?|reps?)$/.test(s)) return "reps";
  if (/^rir$/.test(s)) return "rir";
  if (/^(отдых|rest|пауза)$/.test(s)) return "rest";
  if (/^(вес|weight|нагрузка)$/.test(s)) return "weight";
  if (/^(раздел|секция|section|блок)$/.test(s)) return "section";
  return "";
}

function sectionName(text) {
  const raw = String(text || "").trim();
  const s = raw.toLowerCase().replace(/ё/g, "е");
  if (/^разминк|^warm/.test(s)) return raw;
  if (/^основн|^main/.test(s)) return raw;
  if (/^заминка|^заминк|^cool/.test(s)) return raw;
  return "";
}

function prettyWorkoutTitle(text, index) {
  const raw = String(text || "").trim();
  const match = raw.match(/^(тренировка|workout|день|session|занятие)\s*(\d+)\b/i);
  if (match) {
    const word = match[1].toLowerCase();
    const title = word.charAt(0).toUpperCase() + word.slice(1);
    return title + " " + match[2];
  }
  return raw || ("Тренировка " + index);
}

function metaValue(rows, labelRe) {
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (!labelRe.test(String(row[c] || "").replace(/:$/, ""))) continue;
      for (let n = c + 1; n < row.length; n++) {
        const next = String(row[n] || "").trim();
        if (next) return next;
      }
    }
  }
  return "";
}

function guessMuscle(name) {
  const s = String(name || "").toLowerCase().replace(/ё/g, "е");
  const rules = [
    [/кардио|пульс/, null],
    [/задн(ей|яя) цеп/, { muscle: "hamstrings", label: "Задняя цепь" }],
    [/передн(ей|яя) цеп/, { muscles: ["chest", "quads"], label: "Грудь · квадрицепс" }],
    [/передн(ей|яя) линии|собака мордой|скручиван|dead bug|планка|пресс/, { muscle: "abs", label: "Пресс" }],
    [/присед.*грудн|грудн.*присед/, { muscles: ["quads", "back"], label: "Ноги · грудной отдел" }],
    [/грудн(ого|ой) отдел/, { muscle: "back", label: "Грудной отдел" }],
    [/сгибател(я|ей) бедра/, { muscle: "quads", label: "Сгибатели бедра" }],
    [/сгибание голени|бицепс бедра/, { muscle: "hamstrings", label: "Бицепс бедра" }],
    [/отведение бедра|ягодич|мостик/, { muscle: "glutes", label: "Ягодицы" }],
    [/разгибание голени|квадрицепс|присед|выпад/, { muscle: "quads", label: /выпад/.test(s) ? "Ноги" : "Квадрицепс" }],
    [/трицепс|разгибание рук/, { muscle: "triceps", label: "Трицепс" }],
    [/сгибание рук|\bбицепс\b/, { muscle: "biceps", label: "Бицепс" }],
    [/тяга|подтяг/, { muscle: "back", label: "Спина" }],
    [/приведение плеча|наклонн|грудь|грудн/, { muscle: "chest", label: "Грудь" }],
    [/отведение плеча|манжет|ротация плеча|плеч|дельт|вертикальный жим/, { muscle: "shoulders", label: "Плечи" }],
    [/спин|экстенз|позвоночник/, { muscle: "back", label: "Спина" }],
    [/икр/, { muscle: "calves", label: "Икры" }],
    [/ног|бедр/, { muscle: "legs", label: "Ноги" }]
  ];
  for (const [re, hit] of rules) {
    if (re.test(s)) return hit;
  }
  return null;
}

function withMuscle(ex) {
  const hit = guessMuscle(ex.name);
  if (!hit) return ex;
  if (hit.muscles) ex.muscles = hit.muscles;
  else ex.muscle = hit.muscle;
  if (hit.label) ex.muscleLabel = hit.label;
  return ex;
}

function programFromRows(rows, fileName) {
  const workouts = [];
  const usedTitleRows = new Set();
  rows.forEach((row, rowIndex) => {
    const nameCols = [];
    row.forEach((cell, index) => {
      if (headerKind(cell) === "name") nameCols.push(index);
    });
    if (!nameCols.length) return;
    nameCols.forEach((nameCol, blockIndex) => {
      const fields = { name: nameCol };
      const nextName = nameCols[blockIndex + 1] == null ? row.length : nameCols[blockIndex + 1];
      for (let c = nameCol + 1; c < nextName && c < nameCol + 8; c++) {
        const kind = headerKind(row[c]);
        if (kind && kind !== "name" && fields[kind] == null) fields[kind] = c;
      }
      if (nameCol > 0 && headerKind(row[nameCol - 1]) === "num") fields.num = nameCol - 1;
      const blockStart = fields.num == null ? nameCol : fields.num;
      let title = "";
      for (let r = rowIndex - 1; r >= 0 && r >= rowIndex - 4; r--) {
        const above = rows[r] || [];
        for (let c = blockStart; c <= nameCol; c++) {
          const text = String(above[c] || "").trim();
          if (text.length <= 40 && /^(тренировка|workout|день|session|занятие)\b/i.test(text)) {
            title = text;
            usedTitleRows.add(r);
            break;
          }
        }
        if (title) break;
      }
      const exercises = [];
      let section = "";
      for (let r = rowIndex + 1; r < rows.length; r++) {
        const line = rows[r] || [];
        if (line.some((cell) => headerKind(cell) === "name")) break;
        const atStart = String(line[blockStart] || "").trim();
        const atName = String(line[fields.name] || "").trim();
        const sectionCell = sectionName(atStart) || sectionName(atName);
        if (sectionCell && !atName) { section = sectionCell; continue; }
        if (sectionName(atName) && atName.length < 40) { section = sectionName(atName); continue; }
        if (!atName || atName.length > 140 || (atName.length > 80 && atName.includes(". "))) continue;
        const schemeCell = fields.scheme == null ? "" : String(line[fields.scheme] || "").trim();
        const setsCell = fields.sets == null ? "" : String(line[fields.sets] || "").trim();
        const repsCell = fields.reps == null ? "" : String(line[fields.reps] || "").trim();
        let scheme = schemeCell;
        if (!scheme && (setsCell || repsCell)) {
          scheme = setsCell && repsCell && !/[×xх]/.test(setsCell) ? setsCell + "×" + repsCell : (setsCell || repsCell);
        }
        const ex = { name: atName, scheme: scheme };
        if (section) ex.section = section;
        ["rir", "rest", "weight"].forEach((key) => {
          if (fields[key] == null) return;
          const value = String(line[fields[key]] || "").trim();
          if (value) ex[key] = value;
        });
        exercises.push(withMuscle(ex));
      }
      if (exercises.length) {
        workouts.push({
          title: prettyWorkoutTitle(title, workouts.length + 1),
          exercises: exercises
        });
      }
    });
  });

  const notes = [];
  rows.forEach((row, rowIndex) => {
    if (usedTitleRows.has(rowIndex)) return;
    const filled = row.map((cell) => String(cell || "").trim()).filter(Boolean);
    if (filled.length !== 1) return;
    const heading = filled[0];
    if (heading.length > 60 || headerKind(heading) || sectionName(heading)) return;
    if (/программа тренировок|^клиент$|^период$|^цель$/i.test(heading.replace(/:$/, ""))) return;
    const next = rows[rowIndex + 1] || [];
    const body = next.map((cell) => String(cell || "").trim()).filter(Boolean).join("\n");
    if (body.length < 40) return;
    notes.push({ title: heading.replace(/:$/, ""), exercises: [], text: body });
  });

  const title = metaValue(rows, /^клиент$/i) || fileTitle(fileName);
  const subtitle = metaValue(rows, /^период$/i);
  return { title: title, subtitle: subtitle, workouts: workouts.concat(notes) };
}

function fileTitle(fileName) {
  const base = String(fileName || "").replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  return base || "Тренировки";
}

function programFromLooseText(text, fileName) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const exercises = [];
  lines.forEach((line) => {
    if (line.length > 140 || /^(упражнение|exercise|название)\b/i.test(line)) return;
    const match = line.match(/^(?:\d+[\).\]]\s*)?(.+?)(?:\s{2,}|[,;|]\s*|\s+[-–—]\s+)(\d+\s*[×xх]\s*.+|(\d+)\s*(?:мин|сек).*)$/i);
    if (match && match[1].trim().length > 1) {
      exercises.push(withMuscle({ name: match[1].trim(), scheme: match[2].trim() }));
      return;
    }
    if (lines.length <= 40 && line.length > 2 && line.length < 80 && /[A-Za-zА-Яа-яЁё]/.test(line)) {
      exercises.push(withMuscle({ name: line.replace(/^\d+[\).\]]\s*/, "") }));
    }
  });
  if (!exercises.length) return null;
  return { title: fileTitle(fileName), subtitle: "", workouts: [{ title: "Тренировка 1", exercises: exercises }] };
}

function programFromJson(data, fileName) {
  if (validProgram(data)) return data;
  const list = Array.isArray(data) ? data : (data && Array.isArray(data.exercises) ? data.exercises : null);
  if (!list) return null;
  const exercises = list.filter((item) => item && typeof item === "object" && item.name).map((item) => withMuscle({
    name: String(item.name),
    section: item.section || "",
    scheme: item.scheme || "",
    rir: item.rir || "",
    rest: item.rest || "",
    weight: item.weight || "",
    muscle: item.muscle,
    muscles: item.muscles,
    muscleLabel: item.muscleLabel
  }));
  if (!exercises.length) return null;
  return {
    title: (data && data.title) || fileTitle(fileName),
    subtitle: (data && data.subtitle) || "",
    workouts: [{ title: "Тренировка 1", exercises: exercises }]
  };
}

async function sheetsFromXlsx(bytes) {
  const files = await unzip(bytes);
  const sharedFile = files.get("xl/sharedStrings.xml");
  const shared = sharedFile ? parseSharedStrings(new TextDecoder().decode(sharedFile)) : [];
  const names = [...files.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  names.sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)));
  if (!names.length) throw new Error("В файле нет листа Excel. Сохрани таблицу как .xlsx.");
  return names.map((name) => parseSheet(new TextDecoder().decode(files.get(name)), shared));
}

async function programFromBuffer(fileName, bytes) {
  const name = String(fileName || "");
  const zip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = bytes.length > 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf;
  if (ole) throw new Error("Старый .xls не читается. Сохрани таблицу как .xlsx.");
  if (zip) {
    const sheets = await sheetsFromXlsx(bytes);
    const merged = { title: "", subtitle: "", workouts: [] };
    sheets.forEach((rows) => {
      const program = programFromRows(rows, name);
      if (!merged.title) merged.title = program.title;
      if (!merged.subtitle) merged.subtitle = program.subtitle;
      merged.workouts.push(...program.workouts);
    });
    if (!validProgram(merged)) throw new Error("В таблице не нашлось упражнений. Нужны столбцы «Упражнение» и «Подх × повт».");
    return merged;
  }
  const text = decodeText(bytes).trim();
  if (text.startsWith("{") || text.startsWith("[")) {
    let data;
    try { data = JSON.parse(text); } catch (err) { throw new Error("JSON повреждён."); }
    const program = programFromJson(data, name);
    if (!program || !validProgram(program)) throw new Error("В JSON нет упражнений.");
    return program;
  }
  const table = parseCsv(text);
  const fromTable = programFromRows(table, name);
  if (validProgram(fromTable)) return fromTable;
  const loose = programFromLooseText(text, name);
  if (loose && validProgram(loose)) return loose;
  throw new Error("Файл не разобран. Подойдёт Excel, CSV или JSON со списком упражнений.");
}

async function readProgramFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return programFromBuffer(file.name, bytes);
}
