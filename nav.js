// Budget buddy – ren Bakåt-logik (som nav.js i Stress control): inget DOM, ingen lagring, testas i Node (tools/tests/nav.node.mjs).
// Vanligt skript. Varje lager (en öppen ruta, markeringsläget) är ett steg i historiken:
//   opened  – ett lager öppnades: lägg ett steg (pushState).
//   closed  – ett lager stängdes i appen (Spara, Avbryt, ✕): gå tillbaka ett steg (history.back) och låt bli den popstate som följer.
//   popped  – Bakåt (popstate): returnerar lagret som ska stängas, 'ignore' (vårt eget history.back) eller null (flikbyte).
'use strict';
const Nav = {
  create: () => ({ stack: [], ignore: 0, closing: null, back: 0 }),
  // Returns true when a history step should be pushed.
  opened(n, id) {
    if (n.stack.includes(id)) return false;
    n.stack.push(id);
    return true;
  },
  // Returns true when steps must be taken back (the app closed the layer itself). Several closed at once (a ruta and
  // markeringsläget) are taken back together with flush(): one history.go(-k), one popstate to ignore.
  closed(n, id) {
    const i = n.stack.lastIndexOf(id);
    if (i < 0) return false;
    n.stack.splice(i, 1);
    if (n.closing === id) { n.closing = null; return false; }   // closed by Bakåt: the step is already gone
    n.back++;
    return true;
  },
  // Returns how many steps to go back now (0 = none).
  flush(n) {
    const k = n.back;
    n.back = 0;
    if (k) n.ignore++;
    return k;
  },
  popped(n) {
    if (n.ignore) { n.ignore--; return 'ignore'; }
    const top = n.stack[n.stack.length - 1];
    if (top == null) return null;
    n.closing = top;
    return top;
  },
  // A tab change from the menu: open layers are dropped without touching history.
  reset(n) { n.stack = []; n.closing = null; },
  depth: (n) => n.stack.length,
};
if (typeof module !== 'undefined') module.exports = Nav;
