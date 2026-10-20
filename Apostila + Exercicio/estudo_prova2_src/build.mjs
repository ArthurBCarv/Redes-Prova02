import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const jsDir = path.join(root, 'src/js');
const js = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort().map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS contém </script');
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; media-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="color-scheme" content="light dark">
<meta name="description" content="Plataforma interativa e offline de estudo para a Prova 2 de Redes de Computadores">
<title>Redes Prova 2</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23C2562F'/%3E%3Cpath d='M12 6v5M7 16v-2h10v2' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E">
<style>
${css}
</style>
</head>
<body>
<noscript><p style="padding:24px;font-family:system-ui">Esta plataforma precisa de JavaScript habilitado (funciona totalmente offline).</p></noscript>
<script>
"use strict";
${js}
</script>
</body>
</html>
`;
const out = process.argv[2] || path.join(root, 'dist/estudo_prova2.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('built', out, (html.length / 1024).toFixed(1) + ' KB');
