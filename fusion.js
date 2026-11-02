"use strict";

/* ===== SÉCURITÉ : le moteur de physique vient d'internet ===== */
if (typeof Matter === "undefined") {
  const err = document.getElementById("erreur");
  if (err) err.hidden = false;
  throw new Error("Matter.js n'a pas pu être chargé (connexion internet ?).");
}
const { Engine, Bodies, Composite, Events } = Matter;

/* ===== RÉGLAGES ===== */
const L = 400, H = 620;                  // taille du plateau
const GAUCHE = 20, DROITE = 380, SOL = 600;
const LIGNE = 120;                       // ligne rouge à ne pas dépasser
const Y_MAIN = 62;                       // hauteur de la tête qu'on tient
const POINTS = [1, 3, 6, 10, 15, 21, 28, 36, 45];

// Les 9 joueurs, du plus petit au plus gros (r = rayon, couleur = anneau autour de la tête).
// Pour changer l'ordre ou ajouter un joueur : modifie cette liste et mets l'image dans /images.
const TETES = [
  { nom: "Olise",         img: "images/olise.png",         r: 17, couleur: "#ff6b6b" },
  { nom: "Kvaratskhelia", img: "images/kvaratskhelia.png", r: 24, couleur: "#ff9f43" },
  { nom: "Rodri",         img: "images/rodri.png",         r: 31, couleur: "#feca57" },
  { nom: "Dembélé",       img: "images/dembele.png",       r: 39, couleur: "#1dd1a1" },
  { nom: "Kane",          img: "images/kane.png",          r: 48, couleur: "#54a0ff" },
  { nom: "Yamal",         img: "images/yamal.png",         r: 58, couleur: "#a78bfa" },
  { nom: "Haaland",       img: "images/haaland.png",       r: 69, couleur: "#ee5253" },
  { nom: "Mbappé",        img: "images/mbappe.png",        r: 81, couleur: "#2e86de" },
  { nom: "Messi",         img: "images/messi.png",         r: 94, couleur: "#ffc83d" }
];
const DERNIER = TETES.length - 1;
const TIRAGE = 5;                        // on ne tire au sort que les 5 plus petites têtes

/* ===== LES IMAGES ===== */
TETES.forEach(t => { t.image = new Image(); t.image.src = t.img; });

/* ===== LE DESSIN D'UNE TÊTE ===== */
function dessinerTete(ctx, x, y, r, t, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (t.image.complete && t.image.naturalWidth > 0) {
    ctx.drawImage(t.image, -r, -r, r * 2, r * 2);
  } else {
    // Image pas encore chargée : un rond de couleur avec l'initiale
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = t.couleur; ctx.fill();
    ctx.fillStyle = "#1b1450";
    ctx.font = `700 ${r}px Fredoka, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t.nom[0], 0, 2);
  }
  ctx.restore();
  // Anneau de couleur (ne tourne pas) : on reconnaît le niveau d'un coup d'œil
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.lineWidth = 3; ctx.strokeStyle = t.couleur; ctx.stroke();
}

/* ===== LE MOTEUR DE PHYSIQUE ===== */
const engine = Engine.create();
engine.gravity.y = 1.4;
engine.positionIterations = 8;

Composite.add(engine.world, [
  Bodies.rectangle(L / 2, SOL + 30, L, 60, { isStatic: true, label: "mur" }),
  Bodies.rectangle(GAUCHE - 30, H / 2, 60, H * 2, { isStatic: true, label: "mur" }),
  Bodies.rectangle(DROITE + 30, H / 2, 60, H * 2, { isStatic: true, label: "mur" })
]);

/* ===== L'ÉTAT DE LA PARTIE ===== */
const canvas = document.getElementById("jeu");
const c = canvas.getContext("2d");
const ECHELLE = 2;                         // pour une image nette sur écran haute définition
canvas.width = L * ECHELLE;
canvas.height = H * ECHELLE;
c.scale(ECHELLE, ECHELLE);

const imgSuivant = document.getElementById("suivant");
const btnRejouer = document.getElementById("btn-rejouer");
const btnPause = document.getElementById("btn-pause");
const btnSon = document.getElementById("btn-son");
const CLE_RECORD = "bmz-fusion-foot-record";
const CLE_SON = "bmz-fusion-foot-son";

let score = 0, record = 0, courant = 0, suivant = 0;
let xMain = L / 2, peutLacher = true, fini = false, pause = false, danger = 0;
let tempsFin = 0, nouveauRecord = false, son = true;
const fusions = [];
const particules = [];

const niveauAleatoire = () => Math.floor(Math.random() * TIRAGE);

function ajouterTete(x, y, niveau) {
  const corps = Bodies.circle(x, y, TETES[niveau].r, { restitution: 0.1, friction: 0.4, frictionAir: 0.001, label: "tete" });
  corps.niveau = niveau;
  corps.cree = performance.now();
  corps.pop = 0;
  Composite.add(engine.world, corps);
  return corps;
}

const toutesLesTetes = () => Composite.allBodies(engine.world).filter(b => b.label === "tete");

function majScore() {
  document.getElementById("score").textContent = score;
  document.getElementById("record").textContent = record;
}

function majSuivant() {
  imgSuivant.src = TETES[suivant].img;
  imgSuivant.alt = "Prochaine tête : " + TETES[suivant].nom;
}

function limiteX() {
  const r = TETES[courant].r;
  return Math.max(GAUCHE + r + 2, Math.min(DROITE - r - 2, xMain));
}

/* ===== LE SON (petit « bip » qui monte avec le niveau) ===== */
let audio = null;
function bip(niveau) {
  if (!son) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle";
    o.frequency.value = 260 + niveau * 70;
    g.gain.setValueAtTime(0.18, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.25);
  } catch (e) { /* pas de son possible : tant pis */ }
}

function majBoutonSon() {
  btnSon.textContent = son ? "Son : oui" : "Son : non";
  btnSon.setAttribute("aria-pressed", String(son));
}

/* ===== PARTIE : lâcher, finir, rejouer, pause ===== */
function lacher() {
  if (!peutLacher || fini || pause) return;
  ajouterTete(limiteX(), Y_MAIN, courant);
  peutLacher = false;
  courant = suivant;
  suivant = niveauAleatoire();
  majSuivant();
  setTimeout(() => { peutLacher = true; }, 550);
}

function terminer() {
  fini = true;
  tempsFin = performance.now();
  nouveauRecord = score > record && score > 0;
  if (nouveauRecord) {
    record = score;
    try { localStorage.setItem(CLE_RECORD, String(record)); } catch (e) { /* stockage bloqué : tant pis */ }
  }
  majScore();
}

function rejouer() {
  Composite.remove(engine.world, toutesLesTetes());
  fusions.length = 0;
  particules.length = 0;
  score = 0; danger = 0; fini = false; pause = false; peutLacher = true; nouveauRecord = false;
  courant = niveauAleatoire();
  suivant = niveauAleatoire();
  majScore();
  majSuivant();
  btnPause.textContent = "Pause";
  btnPause.setAttribute("aria-pressed", "false");
}

function basculerPause(valeur) {
  if (fini) return;
  pause = typeof valeur === "boolean" ? valeur : !pause;
  btnPause.textContent = pause ? "Reprendre" : "Pause";
  btnPause.setAttribute("aria-pressed", String(pause));
}

/* ===== LES FUSIONS ===== */
// Quand deux têtes du même niveau se touchent, on les met de côté...
Events.on(engine, "collisionStart", ev => {
  ev.pairs.forEach(({ bodyA: a, bodyB: b }) => {
    if (a.label === "tete" && b.label === "tete" && a.niveau === b.niveau && !a.fusion && !b.fusion) {
      a.fusion = b.fusion = true;
      fusions.push([a, b]);
    }
  });
});

function etincelles(x, y, couleur, nb) {
  for (let i = 0; i < nb; i++) {
    const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3;
    particules.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, vie: 1, couleur });
  }
}

// ...puis on les remplace par une tête plus grosse, une fois le calcul de physique terminé
Events.on(engine, "afterUpdate", () => {
  fusions.splice(0).forEach(([a, b]) => {
    const n = a.niveau;
    const x = (a.position.x + b.position.x) / 2;
    const y = (a.position.y + b.position.y) / 2;
    Composite.remove(engine.world, [a, b]);
    if (n === DERNIER) {
      score += 100;                                  // deux Messi : ils disparaissent, gros bonus !
      etincelles(x, y, TETES[n].couleur, 40);
    } else {
      ajouterTete(x, y, n + 1).pop = 1;
      score += POINTS[n + 1];
      etincelles(x, y, TETES[n + 1].couleur, 14 + n * 2);
    }
    bip(n);
    majScore();
  });
});

/* ===== L'AFFICHAGE ===== */
function voile(titre, lignes) {
  c.fillStyle = "rgba(27,20,80,.78)";
  c.fillRect(0, 0, L, H);
  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.font = "700 40px Fredoka, sans-serif";
  c.fillText(titre, L / 2, H / 2 - 30);
  c.font = "500 22px Fredoka, sans-serif";
  lignes.forEach((l, i) => c.fillText(l, L / 2, H / 2 + 10 + i * 32));
}

function dessiner(dt, now) {
  c.clearRect(0, 0, L, H);
  c.fillStyle = "#e3f7ec";
  c.fillRect(0, 0, L, H);

  // Pelouse rayée
  for (let x = GAUCHE, i = 0; x < DROITE; x += 40, i++) {
    c.fillStyle = i % 2 ? "#c4efd2" : "#b3e8c5";
    c.fillRect(x, 20, Math.min(40, DROITE - x), SOL - 20);
  }

  // Ligne de danger
  c.setLineDash([8, 6]);
  c.lineWidth = 3;
  c.strokeStyle = danger > 0 ? `rgba(255,61,129,${0.55 + 0.45 * Math.sin(now / 90)})` : "rgba(255,61,129,.55)";
  c.beginPath(); c.moveTo(GAUCHE, LIGNE); c.lineTo(DROITE, LIGNE); c.stroke();
  c.setLineDash([]);

  // Les têtes
  toutesLesTetes().forEach(b => {
    b.pop = Math.max(0, b.pop - dt / 250);
    dessinerTete(c, b.position.x, b.position.y, b.circleRadius * (1 + 0.14 * b.pop), TETES[b.niveau], b.angle);
  });

  // Les étincelles des fusions
  for (let i = particules.length - 1; i >= 0; i--) {
    const p = particules[i];
    if (!pause) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vie -= dt / 600; }
    if (p.vie <= 0) { particules.splice(i, 1); continue; }
    c.globalAlpha = p.vie;
    c.fillStyle = p.couleur;
    c.beginPath(); c.arc(p.x, p.y, 2 + 3 * p.vie, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;

  // La tête qu'on tient en main
  if (peutLacher && !fini) {
    const x = limiteX(), t = TETES[courant];
    c.setLineDash([4, 6]);
    c.lineWidth = 2;
    c.strokeStyle = "rgba(27,20,80,.35)";
    c.beginPath(); c.moveTo(x, Y_MAIN + t.r); c.lineTo(x, SOL); c.stroke();
    c.setLineDash([]);
    dessinerTete(c, x, Y_MAIN, t.r, t, 0);
  }

  // Contour du plateau
  c.lineWidth = 6;
  c.strokeStyle = "#1b1450";
  c.lineJoin = "round";
  c.beginPath(); c.moveTo(GAUCHE, 20); c.lineTo(GAUCHE, SOL); c.lineTo(DROITE, SOL); c.lineTo(DROITE, 20); c.stroke();

  if (fini) {
    voile("Partie terminée", ["Score : " + score, nouveauRecord ? "Nouveau record !" : "Record : " + record, "Clique pour rejouer"]);
  } else if (pause) {
    voile("Pause", ["Appuie sur P pour reprendre"]);
  }
}

function verifierDanger(dt, now) {
  // Une tête qui reste au-dessus de la ligne rouge plus de 2 secondes = perdu
  const trop = toutesLesTetes().some(b => !b.fusion && now - b.cree > 1500 && b.position.y - b.circleRadius < LIGNE);
  danger = trop ? danger + dt : 0;
  if (danger > 2000) terminer();
}

let dernier = performance.now();
function boucle(now) {
  const dt = Math.min(now - dernier, 32);
  dernier = now;
  if (!fini && !pause) {
    Engine.update(engine, dt / 2);
    Engine.update(engine, dt / 2);                   // deux petits pas = physique plus stable
    verifierDanger(dt, now);
  }
  dessiner(dt, now);
  requestAnimationFrame(boucle);
}

/* ===== LES COMMANDES ===== */
function positionX(ev) {
  const zone = canvas.getBoundingClientRect();
  return (ev.clientX - zone.left) * L / zone.width;
}

canvas.addEventListener("pointermove", ev => { xMain = positionX(ev); });
canvas.addEventListener("pointerdown", ev => { xMain = positionX(ev); });
canvas.addEventListener("pointerup", ev => {
  xMain = positionX(ev);
  if (fini) {
    if (performance.now() - tempsFin > 700) rejouer();   // petit délai pour ne pas relancer par accident
  } else if (pause) {
    basculerPause(false);
  } else {
    lacher();
  }
});

document.addEventListener("keydown", ev => {
  if (ev.key === "ArrowLeft") { ev.preventDefault(); xMain -= 14; }
  else if (ev.key === "ArrowRight") { ev.preventDefault(); xMain += 14; }
  else if (ev.key === "p" || ev.key === "P") basculerPause();
  else if ((ev.key === " " || ev.key === "Enter") && document.activeElement.tagName !== "BUTTON") {
    ev.preventDefault();
    if (fini) { if (performance.now() - tempsFin > 700) rejouer(); }
    else lacher();
  }
});

// On met le jeu en pause si on change d'onglet
document.addEventListener("visibilitychange", () => { if (document.hidden) basculerPause(true); });

btnRejouer.addEventListener("click", () => { rejouer(); btnRejouer.blur(); });
btnPause.addEventListener("click", () => { basculerPause(); btnPause.blur(); });
btnSon.addEventListener("click", () => {
  son = !son;
  try { localStorage.setItem(CLE_SON, son ? "1" : "0"); } catch (e) { /* tant pis */ }
  majBoutonSon();
  btnSon.blur();
});

/* ===== DÉMARRAGE ===== */
// La liste « Évolution » : toutes les têtes dans l'ordre
const liste = document.getElementById("evolution");
TETES.forEach(t => {
  const li = document.createElement("li");
  const im = document.createElement("img");
  im.src = t.img;
  im.alt = t.nom;
  im.title = t.nom;
  im.width = im.height = 44;
  im.style.borderColor = t.couleur;
  li.appendChild(im);
  liste.appendChild(li);
});

try { record = Number(localStorage.getItem(CLE_RECORD)) || 0; } catch (e) { record = 0; }
try { son = localStorage.getItem(CLE_SON) !== "0"; } catch (e) { son = true; }
majBoutonSon();
rejouer();
requestAnimationFrame(boucle);
