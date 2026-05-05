// shared.js — fonctions communes aux apps client.html et index.html
// Charge AVANT le script inline de chaque page : <script src="/shared.js"></script>
// Suppose qu'une variable globale `state` existe avec un champ `recompensesNiveaux` (peut être vide).

const LEVELS = [
  { name: "Bronze",  min: 0,    max: 499,      color: "#c8956c" },
  { name: "Argent",  min: 500,  max: 999,      color: "#b0bec5" },
  { name: "Or",      min: 1000, max: 1999,     color: "#f9d056" },
  { name: "Platine", min: 2000, max: Infinity, color: "#e0e0ff" },
];
const LEVEL_ORDER = ["Bronze", "Argent", "Or", "Platine"];
const NOUVEAU = { name: "Nouveau", min: 0, max: 0, color: "#888" };

// Construit la liste des niveaux à partir des seuils de récompenses configurés (table recompenses_niveaux).
// Si pas de récompenses chargées, retombe sur les LEVELS hardcodés.
function buildLevels() {
  if (!state.recompensesNiveaux || !state.recompensesNiveaux.length) return LEVELS.slice();
  const recs = state.recompensesNiveaux
    .filter(r => LEVEL_ORDER.includes(r.niveau) && r.points_requis != null)
    .slice()
    .sort((a, b) => a.points_requis - b.points_requis);
  if (!recs.length) return LEVELS.slice();
  const dyn = recs.map(r => {
    const base = LEVELS.find(l => l.name === r.niveau);
    return { name: r.niveau, min: r.points_requis, color: base ? base.color : "#c8956c" };
  });
  for (let i = 0; i < dyn.length; i++) {
    dyn[i].max = (i + 1 < dyn.length) ? dyn[i + 1].min - 1 : Infinity;
  }
  return dyn;
}

function getLevel(p) {
  const dyn = buildLevels();
  if (!dyn.length || p < dyn[0].min) return { ...NOUVEAU, max: (dyn[0] ? dyn[0].min - 1 : 0) };
  return dyn.find(l => p >= l.min && p <= l.max) || dyn[dyn.length - 1];
}

function getNextLevel(p) {
  const dyn = buildLevels();
  if (!dyn.length) return null;
  if (p < dyn[0].min) return dyn[0];
  for (let i = 0; i < dyn.length; i++) {
    if (p >= dyn[i].min && p <= dyn[i].max) return dyn[i + 1] || null;
  }
  return null;
}

function getBadgeClass(pts) {
  const n = getLevel(pts).name;
  if (n === 'Nouveau') return 'badge badge-nouveau';
  return n === 'Argent' ? 'badge badge-argent' :
         n === 'Or' ? 'badge badge-or' :
         n === 'Platine' ? 'badge badge-platine' : 'badge';
}

function today() { return new Date().toISOString().split('T')[0]; }
function oneYearAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}
