const fs = require("fs");
const path = require("path");

const root = __dirname;
const source = fs.readFileSync(path.join(root, "js/figures.js"), "utf8")
  + "\n"
  + fs.readFileSync(path.join(root, "js/render.js"), "utf8");
const api = new Function(source + "\nreturn { renderChapters, validProgram, esc };")();
const program = JSON.parse(fs.readFileSync(path.join(root, "data/program.json"), "utf8"));

if (!api.validProgram(program)) {
  throw new Error("data/program.json is not a valid program");
}

const css = fs.readFileSync(path.join(root, "css/app.css"), "utf8");
const importer = fs.readFileSync(path.join(root, "js/import.js"), "utf8");
const client = fs.readFileSync(path.join(root, "js/client.js"), "utf8");
const json = JSON.stringify(program).replace(/</g, "\\u003c");
const chapters = api.renderChapters(program);

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0e0d0b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Тренировки">
<title>${api.esc(program.title || "Тренировки")}</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<style>
${css}
</style>
</head>
<body>
<div class="book">
  <header class="cover">
    <p class="kicker">Книга тренировок</p>
    <h1 id="book-title">${api.esc(program.title || "Тренировки")}</h1>
    <p class="subtitle" id="book-sub">${api.esc(program.subtitle || "")}</p>
  </header>
  <main id="chapters">
    ${chapters}
  </main>
  <footer class="colophon">
    <label class="load">Загрузить программу
      <input id="file" type="file">
    </label>
    <button id="reset" class="linkish" type="button" hidden>Вернуть пример</button>
    <p id="status"></p>
    <p class="fine">Excel, CSV или JSON. Файл остаётся на телефоне.</p>
  </footer>
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
