"use strict";

/* ===== LES RÈGLES ET L'IA (aucun lien avec la page : on peut les tester seules) ===== */
// La grille a 9 cases (0 à 8). Chaque case vaut null (vide), 0 (joueur 1) ou 1 (joueur 2).
const LIGNES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function gagnant(g) {
  for (const l of LIGNES) {
    const [a, b, c] = l;
    if (g[a] !== null && g[a] === g[b] && g[a] === g[c]) return { joueur: g[a], ligne: l };
  }
  return null;
}

const vides = g => g.reduce((r, v, i) => { if (v === null) r.push(i); return r; }, []);
const hasard = tab => tab[Math.floor(Math.random() * tab.length)];

// Minimax : l'IA essaie tous les coups possibles. Plus elle gagne vite, mieux c'est.
function minimax(g, tour, ia, profondeur) {
  const w = gagnant(g);
  if (w) return w.joueur === ia ? 10 - profondeur : profondeur - 10;
  const libres = vides(g);
  if (!libres.length) return 0;
  let meilleur = tour === ia ? -Infinity : Infinity;
  for (const i of libres) {
    g[i] = tour;
    const s = minimax(g, 1 - tour, ia, profondeur + 1);
    g[i] = null;
    meilleur = tour === ia ? Math.max(meilleur, s) : Math.min(meilleur, s);
  }
  return meilleur;
}

// Renvoie la case qui fait gagner ce joueur tout de suite, ou -1
function coupGagnant(g, joueur) {
  for (const i of vides(g)) {
    g[i] = joueur;
    const w = gagnant(g);
    g[i] = null;
    if (w) return i;
  }
  return -1;
}

function coupIA(g, ia, niveau) {
  const libres = vides(g);
  if (niveau === "facile") return hasard(libres);
  if (niveau === "moyen") {                        // gagne si possible, bloque si besoin, sinon au hasard
    let i = coupGagnant(g, ia);
    if (i < 0) i = coupGagnant(g, 1 - ia);
    return i >= 0 ? i : hasard(libres);
  }
  let meilleur = -Infinity, choix = [];            // imbattable : on garde tous les meilleurs coups et on en tire un
  for (const i of libres) {
    g[i] = ia;
    const s = minimax(g, 1 - ia, ia, 1);
    g[i] = null;
    if (s > meilleur) { meilleur = s; choix = [i]; }
    else if (s === meilleur) choix.push(i);
  }
  return hasard(choix);
}

/* ===== INTERFACE ===== */
const etapes = document.querySelectorAll(".etape");
const plateau = document.getElementById("plateau");
const statutImg = document.getElementById("statut-img");
const statutTexte = document.getElementById("statut-texte");
const listeAvatars = document.getElementById("avatars");
const blocNiveau = document.getElementById("niveau");

let mode = "solo", niveau = "moyen";
let joueurs = [null, null];
let indexChoix = 0;                // quel joueur choisit son avatar
let grille = [], tour = 0, depart = 0;
let fini = false, verrou = false, minuteur = null;
let scores = [0, 0], nuls = 0;

const noms = () => mode === "solo" ? ["Toi", "IA"] : ["Joueur 1", "Joueur 2"];

function montrer(id) {
  etapes.forEach(e => { e.hidden = e.id !== id; });
  const titre = document.querySelector("#" + id + " [data-titre]");
  if (titre) titre.focus({ preventScroll: true });
}

/* --- Étape 1 et 2 : mode et avatar --- */
function afficherAvatars() {
  const solo = mode === "solo";
  document.getElementById("titre-avatar").textContent =
    solo ? "Choisis ton avatar" : noms()[indexChoix] + " : choisis ton avatar";
  blocNiveau.hidden = !solo;

  listeAvatars.innerHTML = "";
  AVATARS.forEach(a => {
    const pris = indexChoix === 1 && joueurs[0] && joueurs[0].id === a.id;
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "avatar";
    b.disabled = pris;
    b.innerHTML = '<img alt="" width="80" height="80"><span></span>';
    b.querySelector("img").src = a.img;
    b.querySelector("span").textContent = pris ? a.nom + " (pris)" : a.nom;
    b.addEventListener("click", () => choisirAvatar(a));
    li.appendChild(b);
    listeAvatars.appendChild(li);
  });
  montrer("etape-avatar");
}

function choisirAvatar(a) {
  joueurs[indexChoix] = a;
  if (mode === "solo") {
    joueurs[1] = hasard(AVATARS.filter(x => x.id !== a.id));   // l'IA prend un autre avatar au hasard
    lancer();
  } else if (indexChoix === 0) {
    indexChoix = 1;
    afficherAvatars();
  } else {
    lancer();
  }
}

document.querySelectorAll(".carte-mode").forEach(b => {
  b.addEventListener("click", () => {
    mode = b.dataset.mode;
    joueurs = [null, null];
    indexChoix = 0;
    afficherAvatars();
  });
});

document.querySelectorAll(".puce").forEach(b => {
  b.addEventListener("click", () => {
    niveau = b.dataset.niveau;
    document.querySelectorAll(".puce").forEach(p => p.setAttribute("aria-pressed", String(p === b)));
  });
});

document.getElementById("btn-retour").addEventListener("click", () => {
  if (mode === "duo" && indexChoix === 1) { indexChoix = 0; afficherAvatars(); }
  else montrer("etape-mode");
});

/* --- Étape 3 : la partie --- */
const cases = [];
for (let i = 0; i < 9; i++) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "case";
  b.addEventListener("click", () => clicCase(i));
  plateau.appendChild(b);
  cases.push(b);
}

function majCase(i) {
  const b = cases[i], v = grille[i];
  const place = "Ligne " + (Math.floor(i / 3) + 1) + ", colonne " + ((i % 3) + 1);
  b.innerHTML = "";
  b.classList.remove("j0", "j1", "gagnante");
  if (v === null) {
    b.setAttribute("aria-label", place + " : vide");
    b.removeAttribute("aria-disabled");
  } else {
    const img = document.createElement("img");
    img.src = joueurs[v].img;
    img.alt = "";
    b.appendChild(img);
    b.classList.add("j" + v);
    b.setAttribute("aria-label", place + " : " + joueurs[v].nom);
    b.setAttribute("aria-disabled", "true");
  }
}

function statut(idx, texte) {
  if (idx === null) { statutImg.hidden = true; }
  else { statutImg.src = joueurs[idx].img; statutImg.hidden = false; }
  statutTexte.textContent = texte;
}

function majScores() {
  const n = noms();
  [0, 1].forEach(i => {
    const bloc = document.getElementById("score-" + i);
    bloc.querySelector("img").src = joueurs[i].img;
    bloc.querySelector(".etiquette").textContent = n[i] + " · " + joueurs[i].nom;
    bloc.querySelector(".gros").textContent = scores[i];
    bloc.classList.toggle("actif", !fini && tour === i);
  });
  document.getElementById("pts-nul").textContent = nuls;
}

function messageTour() {
  const solo = mode === "solo";
  if (solo) statut(tour, tour === 0 ? "À toi de jouer !" : "L'IA réfléchit…");
  else statut(tour, noms()[tour] + ", à toi de jouer !");
}

function nouvelleManche() {
  clearTimeout(minuteur);
  grille = Array(9).fill(null);
  fini = false;
  verrou = false;
  tour = depart;
  plateau.classList.remove("fini");
  for (let i = 0; i < 9; i++) majCase(i);
  messageTour();
  majScores();
  if (mode === "solo" && tour === 1) jouerIA();
}

function lancer() {
  scores = [0, 0];
  nuls = 0;
  depart = 0;
  montrer("etape-jeu");
  nouvelleManche();
}

function jouerIA() {
  verrou = true;
  minuteur = setTimeout(() => {
    verrou = false;
    jouer(coupIA(grille.slice(), 1, niveau));
  }, 650);
}

function clicCase(i) {
  if (fini || verrou || grille[i] !== null) return;
  if (mode === "solo" && tour === 1) return;
  jouer(i);
}

function jouer(i) {
  grille[i] = tour;
  majCase(i);
  const w = gagnant(grille);
  if (w) {
    fini = true;
    scores[w.joueur]++;
    w.ligne.forEach(k => cases[k].classList.add("gagnante"));
    plateau.classList.add("fini");
    if (mode === "solo") statut(w.joueur, w.joueur === 0 ? "Bravo, tu as gagné !" : "L'IA a gagné cette manche.");
    else statut(w.joueur, noms()[w.joueur] + " gagne la manche !");
  } else if (!vides(grille).length) {
    fini = true;
    nuls++;
    plateau.classList.add("fini");
    statut(null, "Match nul !");
  } else {
    tour = 1 - tour;
    messageTour();
    if (mode === "solo" && tour === 1) jouerIA();
  }
  majScores();
}

document.getElementById("btn-rejouer").addEventListener("click", () => {
  depart = 1 - depart;               // celui qui n'a pas commencé commence
  nouvelleManche();
});

document.getElementById("btn-changer").addEventListener("click", () => {
  clearTimeout(minuteur);
  montrer("etape-mode");
});
