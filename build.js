const fs = require("fs");
const path = require("path");

const root = __dirname;
const source = fs.readFileSync(path.join(root, "js/figures.js"), "utf8")
  + "\n"
  + fs.readFileSync(path.join(root, "js/render.js"), "utf8");
const api = new Function(source + "\nreturn { renderChapters, renderDay, validProgram, esc };")();
const program = JSON.parse(fs.readFileSync(path.join(root, "data/program.json"), "utf8"));

if (!api.validProgram(program)) {
  throw new Error("data/program.json is not a valid program");
}

const css = fs.readFileSync(path.join(root, "css/app.css"), "utf8");
const importer = fs.readFileSync(path.join(root, "js/import.js"), "utf8");
const client = fs.readFileSync(path.join(root, "js/client.js"), "utf8");
const json = JSON.stringify(program).replace(/</g, "\\u003c");

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#a9a093">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Heft">
<title>Heft</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="apple-touch-startup-image" href="./splash.png">
<style>
${css}
</style>
</head>
<body>
<input id="file" class="file-pick" type="file">
<div class="gate" id="gate">
  <p class="gate-name">Heft</p>
  <label class="orb" for="file">
    <span>Загрузить</span>
    <span>программу</span>
  </label>
  <p class="gate-copy">Она проанализирует ваш файл тренировки и составит расписание и шаги.</p>
  <p class="status" data-status></p>
</div>
<div class="book">
  <div class="topbar">
    <p class="brand">Heft</p>
    <button id="edit" class="corner" type="button">Изменить</button>
  </div>
  <nav id="days" class="days"></nav>
  <header class="cover">
    <h1 id="book-title">${api.esc(program.title || "Тренировки")}</h1>
    <p class="subtitle" id="book-sub">${api.esc(program.subtitle || "")}</p>
  </header>
  <main id="day-page"></main>
  <footer class="colophon">
    <label class="load" for="file">Загрузить программу</label>
    <button id="reset" class="linkish" type="button" hidden>Убрать программу</button>
    <p class="status" data-status></p>
    <p class="fine">Excel, CSV или JSON. Файл остаётся на телефоне.</p>
  </footer>
</div>
<div class="editor" id="editor">
  <div class="topbar">
    <p class="brand">Heft</p>
    <button id="done" class="corner" type="button">Готово</button>
  </div>
  <div id="edit-fields"></div>
  <button id="add-day" class="add-day" type="button">Добавить день</button>
</div>
<script type="application/json" id="default-program">${json}</script>
<script>
${source}
${importer}
${client}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "index.html"), html);
console.log("wrote index.html", html.length);
