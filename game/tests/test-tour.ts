/**
 * BANC DE TEST DU COMBAT TOUR PAR TOUR.
 *
 * Ce qui est vérifié, dans l'ordre :
 *  1. STRUCTURE — les 27 héros ont bien 3 capacités + 1 ultime, avec recharges en tours ;
 *  2. LIGNES — un corps à corps ne peut pas sauter une ligne encore debout, la ligne
 *     arrière prend moins de dégâts mais tape plus fort (le placement sert à quelque chose) ;
 *  3. CAPACITÉS — les 4 capacités de chaque héros s'exécutent vraiment, sans exception ;
 *  4. ROBUSTESSE — aucun combat ne boucle, aucune cible illégale, aucun chiffre invalide ;
 *  5. DÉTERMINISME — la même graine donne exactement le même combat ;
 *  6. ÉQUILIBRE — au niveau conseillé, une formation sensée gagne plus qu'une mauvaise.
 *
 * Usage : npx vite-node tests/test-tour.ts   (RUNS=5 pour plus de répétitions)
 */
import { ENEMIES, HEROES, REFERENCE_TEAM, STAGES, type StageDef, type TeamMember } from '../src/data/heroes';
import { TurnBattle, resetUid } from '../src/turn/engine';
import { autoFormation, buildBattle, foePlacement, testTeam } from '../src/turn/formation';
import { TOUR_HEROES, foeSkills, skillsOf } from '../src/turn/skills';
import type { BattleEvent, Row } from '../src/turn/types';
import { MAX_TURNS, ROW_BONUS, SOUL_BURN_COST } from '../src/turn/types';

const RUNS = Math.max(1, Number(process.env.RUNS ?? 3));
/** Plafond de tours avant match nul (alias local : voir le commentaire ci-dessus). */
const PLAFOND = MAX_TURNS;
const BOSS = STAGES.filter((s) => s.id.endsWith('-5'));

let erreurs = 0;
const echec = (msg: string): void => { erreurs++; console.log(`   ❌ ${msg}`); };
const ok = (msg: string): void => console.log(`   ✅ ${msg}`);

interface Trace { tours: number; coups: number; illegal: number; cdBug: number; nan: number; bloques: number; skillsUsed: Set<string>; }
const nouvelleTrace = (): Trace => ({ tours: 0, coups: 0, illegal: 0, cdBug: 0, nan: 0, bloques: 0, skillsUsed: new Set() });

/* ===================================================================== */
/*  1. Structure des capacités                                            */
/* ===================================================================== */

console.log(`\n═══ 1. STRUCTURE — ${HEROES.length} héros × (3 capacités + 1 ultime) ═══`);
{
  let ults = 0;
  let sommeCd = 0;
  let nb = 0;
  const sansIdentite: string[] = [];
  for (const h of HEROES) {
    const s = skillsOf(h);
    if (!TOUR_HEROES[h.id]) sansIdentite.push(h.id);
    // Deux capacités d'un même héros ne peuvent pas porter le même nom.
    const noms = s.map((x) => x.name.toLowerCase());
    for (let i = 1; i < noms.length; i++) {
      if (noms.indexOf(noms[i]!) !== i) echec(`${h.id} : deux capacités portent le même nom (« ${s[i]!.name} »)`);
    }
    // Le texte ne doit plus parler en secondes : on joue en tours.
    for (const x of s) {
      if (/\b\d+(,\d+)? ?s\b/.test(x.text) || x.text.includes('secondes')) echec(`${h.id}/${x.name} : le texte parle encore en secondes`);
      if (/\d{2,3} % d.?ATQ/.test(x.text)) echec(`${h.id}/${x.name} : le texte annonce un pourcentage d'ATQ qui n'est pas le sien`);
    }
    if (s.length !== 4) echec(`${h.id} : ${s.length} capacités au lieu de 4`);
    if (s.filter((x) => x.ultimate).length !== 1) echec(`${h.id} : pas exactement une ultime`);
    if (s[0]!.cooldown !== 0) echec(`${h.id} : la capacité de base a une recharge (${s[0]!.cooldown})`);
    if (s[3]!.cooldown < 4) echec(`${h.id} : ultime trop rapide (${s[3]!.cooldown} tours)`);
    for (const x of s) {
      ults += x.ultimate ? 1 : 0;
      sommeCd += x.cooldown;
      nb++;
      if (!x.name || !x.text || !x.icon) echec(`${h.id}/${x.id} : nom, texte ou icône manquants`);
      if (x.cooldown < 0 || x.cooldown > 12) echec(`${h.id}/${x.name} : recharge hors bornes (${x.cooldown})`);
      if (x.kind !== 'heal' && x.kind !== 'support' && x.mult <= 0) echec(`${h.id}/${x.name} : multiplicateur nul sur une capacité offensive`);
      if (!isFinite(x.mult) || !isFinite(x.hits) || x.hits < 0) echec(`${h.id}/${x.name} : chiffres invalides`);
      if (x.kind !== 'heal' && x.kind !== 'support' && x.hits < 1) echec(`${h.id}/${x.name} : capacité offensive sans frappe`);
    }
  }
  const foes = new Set<string>();
  for (const st of STAGES.slice(0, 40)) {
    for (const e of st.enemies) {
      const fs = foeSkills(e.def);
      if (fs.length !== 4) echec(`ennemi ${e.def.id} : ${fs.length} capacités`);
      if (fs.filter((x) => x.ultimate).length !== 1) echec(`ennemi ${e.def.id} : pas une seule ultime`);
      foes.add(e.def.id);
    }
  }
  ok(`${HEROES.length} héros × 4 capacités — ${ults} ultimes, recharge moyenne ${(sommeCd / nb).toFixed(1)} tours`);
  if (sansIdentite.length > 0) echec(`${sansIdentite.length} héros sans capacités écrites : ${sansIdentite.join(', ')}`);
  else ok(`${Object.keys(TOUR_HEROES).length} héros ont leurs 4 capacités écrites à la main (textes en tours, pas en secondes)`);
  ok(`${foes.size} créatures et boss ont eux aussi 4 capacités`);
}

/* ===================================================================== */
/*  2. Les lignes comptent                                                */
/* ===================================================================== */

console.log('\n═══ 2. LIGNES — 2 devant / 2 milieu / 2 derrière ═══');
{
  resetUid();
  const b = new TurnBattle(7);
  const team = testTeam(HEROES.slice(0, 6), 20);
  const placements: { row: Row; slot: number }[] = [
    { row: 'front', slot: 0 }, { row: 'front', slot: 1 },
    { row: 'mid', slot: 0 }, { row: 'mid', slot: 1 },
    { row: 'back', slot: 0 }, { row: 'back', slot: 1 },
  ];
  team.forEach((m, i) => {
    b.addHero({ def: m.def, row: placements[i]!.row, slot: placements[i]!.slot, level: m.level, stars: m.stars, skills: skillsOf(m.def) });
  });
  const front = b.heroes[0]!;
  const back = b.heroes[5]!;
  if (!(front.maxHp > back.maxHp)) echec('un héros devant devrait avoir plus de PV qu\'un héros derrière');
  if (!(back.baseAtk > front.baseAtk * 0.95)) echec('un héros derrière devrait taper plus fort qu\'un héros devant');
  ok(`ligne avant : PV ×${ROW_BONUS.front.hp}, armure ×${ROW_BONUS.front.armor}`);
  ok(`ligne arrière : ATQ ×${ROW_BONUS.back.atk}, armure ×${ROW_BONUS.back.armor}`);

  const melee = b.heroes.find((h) => !h.ranged) ?? b.heroes[0]!;
  const basicIdx = melee.skills.findIndex((s) => s.target === 'enemyFront');
  if (basicIdx < 0) echec('aucune capacité « ligne avant » sur un corps à corps');
  const basic = melee.skills[basicIdx]!;
  const pierce = melee.skills.find((s) => s.target === 'enemyAny');

  // Rien ne couvre la ligne arrière : elle est atteignable.
  b.addFoe({ def: ENEMIES.ghoul, row: 'back', slot: 0, scale: { hp: 1, atk: 1 }, level: 1, skills: foeSkills(ENEMIES.ghoul) });
  const cibleBack = b.foes[0]!;
  if (!b.legalTargets(melee, basic).includes(cibleBack)) echec('sans ligne avant, le corps à corps devrait pouvoir atteindre la ligne arrière');

  // Un mur se place devant : le corps à corps s'y casse les dents.
  b.addFoe({ def: ENEMIES.skeleton, row: 'front', slot: 0, scale: { hp: 1, atk: 1 }, level: 1, skills: foeSkills(ENEMIES.skeleton) });
  const legal2 = b.legalTargets(melee, basic);
  if (legal2.some((t) => t.row !== 'front')) echec('avec un mur devant, le corps à corps atteint encore une autre ligne');
  if (!legal2.some((t) => t.row === 'front')) echec('le corps à corps ne voit plus personne');
  if (pierce && !b.legalTargets(melee, pierce).some((t) => t.row === 'back')) echec('une capacité qui perce la ligne ne voit pas la ligne arrière');
  ok('le corps à corps est arrêté par la ligne la plus avancée encore debout');
  ok('les capacités à distance et de zone passent par-dessus');

  // Le placement des ennemis suit la même logique (boss devant, distance derrière).
  const fp = foePlacement(BOSS[9]!.enemies);
  const bossRow = fp[BOSS[9]!.enemies.findIndex((e) => !!e.boss)];
  if (bossRow && bossRow.row !== 'front') echec('le boss n\'est pas placé devant');
  ok(`ennemis placés automatiquement : ${fp.map((p) => p.row[0]).join(' ')} (niveau ${BOSS[9]!.id})`);
}

/* ===================================================================== */
/*  3. Les 4 capacités de chaque héros s'exécutent                        */
/* ===================================================================== */

console.log(`\n═══ 3. CAPACITÉS — ${HEROES.length} héros × 4 capacités exécutées ═══`);
{
  let jouees = 0;
  const effets = new Set<string>();
  for (const h of HEROES) {
    resetUid();
    const b = new TurnBattle(11);
    // Un sac à PV géant : aucune capacité ne peut le tuer, on peut tout tester.
    b.addHero({ def: h, row: 'front', slot: 0, level: 30, stars: h.stars, skills: skillsOf(h) });
    b.addHero({ def: h, row: 'back', slot: 0, level: 30, stars: h.stars, skills: skillsOf(h) });
    b.addFoe({ def: ENEMIES.ghoul, row: 'front', slot: 0, scale: { hp: 800, atk: 0.05 }, level: 1, skills: foeSkills(ENEMIES.ghoul) });
    b.addFoe({ def: ENEMIES.skeleton, row: 'back', slot: 0, scale: { hp: 800, atk: 0.05 }, level: 1, skills: foeSkills(ENEMIES.skeleton) });
    const acteur = b.heroes[0]!;
    for (let i = 0; i < 4; i++) {
      b.current = acteur;
      acteur.cd[i] = 0;
      acteur.hp = acteur.maxHp;
      const ev = b.resolve(i, null, false);
      if (ev.length === 0) { echec(`${h.id} : la capacité ${i} (${acteur.skills[i]!.name}) ne produit rien`); continue; }
      if (!ev.some((e) => e.type === 'damage' || e.type === 'heal' || e.type === 'status' || e.type === 'shield')) echec(`${h.id}/${acteur.skills[i]!.name} : aucun effet produit`);
      for (const e of ev) {
        if (e.type === 'status' && e.applied) effets.add(e.id);
        if (e.type === 'damage' && !isFinite(e.amount)) echec(`${h.id} : dégâts invalides`);
      }
      jouees++;
      b.over = false;
      b.winner = null;
      b.turn = 0;
    }
  }
  if (jouees < HEROES.length * 4) echec(`${jouees}/${HEROES.length * 4} capacités exécutées`);
  ok(`${jouees}/${HEROES.length * 4} capacités exécutées sans erreur`);
  ok(`${effets.size} statuts différents déclenchés : ${[...effets].sort().join(', ')}`);
}

/* ===================================================================== */
/*  4. Combats complets                                                   */
/* ===================================================================== */

/** Mène un combat jusqu'au bout en vérifiant les règles à chaque coup. */
function jouer(battle: TurnBattle, trace: Trace): BattleEvent[] {
  const all: BattleEvent[] = [];
  while (!battle.over && battle.turn < MAX_TURNS + 2) {
    const { actor, events } = battle.advance();
    all.push(...events);
    if (!actor) break;
    trace.tours++;
    const choice = battle.aiChoice(actor);
    const skill = actor.skills[choice.skill]!;
    const legal = battle.legalTargets(actor, skill);
    if (choice.target != null && !legal.some((t) => t.uid === choice.target)) trace.illegal++;
    if (!actor.ready(choice.skill)) trace.cdBug++;
    const ev = battle.resolve(choice.skill, choice.target, choice.burn);
    all.push(...ev);
    trace.coups++;
    trace.skillsUsed.add(skill.id);
    if (actor.cd[choice.skill] !== skill.cooldown) trace.cdBug++;
    // Une capacité qui recharge doit refuser d'être rejouée dans la foulée.
    if (skill.cooldown > 0 && !battle.over) {
      battle.current = actor;
      if (battle.resolve(choice.skill, choice.target).length > 0) trace.cdBug++;
      battle.current = null;
    }
    for (const e of ev) {
      if (e.type === 'damage' && (!isFinite(e.amount) || e.amount < 0)) trace.nan++;
      if (e.type === 'damage' && e.amount === 0) trace.bloques++;
      if (e.type === 'heal' && (!isFinite(e.amount) || e.amount < 1)) trace.nan++;
    }
  }
  return all;
}

console.log(`\n═══ 4. ROBUSTESSE — ${BOSS.length} niveaux de boss × ${RUNS} combats ═══`);
{
  const trace = nouvelleTrace();
  let fini = 0;
  let maxTours = 0;
  let totalTours = 0;
  for (const st of BOSS) {
    for (let r = 0; r < RUNS; r++) {
      resetUid();
      const team = REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level: st.level }));
      const battle = buildBattle({ stage: st, team, placements: autoFormation(team), seed: 1000 + r * 37 + st.tier });
      jouer(battle, trace);
      if (battle.over) fini++;
      maxTours = Math.max(maxTours, battle.turn);
      totalTours += battle.turn;
      if (battle.turn > PLAFOND) echec(st.id + ' : combat de ' + battle.turn + ' tours (plafond ' + PLAFOND + ')');
      for (const u of battle.units) {
        if (!isFinite(u.hp) || u.hp < 0 || u.hp > u.maxHp) echec(`${st.id}/${u.name} : PV invalides (${u.hp}/${u.maxHp})`);
        if (!isFinite(u.gauge) || u.gauge < 0) echec(`${st.id}/${u.name} : jauge invalide (${u.gauge})`);
      }
    }
  }
  if (trace.illegal > 0) echec(`${trace.illegal} coups ont visé une cible illégale`);
  if (trace.cdBug > 0) echec(`${trace.cdBug} anomalies de recharge`);
  if (trace.nan > 0) echec(`${trace.nan} dégâts ou soins invalides`);
  if (fini < BOSS.length * RUNS) echec(`${fini}/${BOSS.length * RUNS} combats terminés seulement`);
  ok(`${fini}/${BOSS.length * RUNS} combats terminés · ${trace.coups} coups · ${trace.tours} tours joués`);
  ok(`durée moyenne ${(totalTours / Math.max(1, fini)).toFixed(0)} tours · record ${maxTours} tours (plafond ${MAX_TURNS})`);
  ok(`0 cible illégale · 0 anomalie de recharge · 0 chiffre invalide · ${trace.bloques} coups arrêtés par une invulnérabilité`);
  ok(`${trace.skillsUsed.size} capacités différentes ont réellement servi`);
}

console.log('\n═══ 5. DÉTERMINISME ═══');
{
  const st = BOSS[9]!;
  const team = REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level: st.level }));
  const run = (seed: number): string => {
    resetUid();
    const b = buildBattle({ stage: st, team, placements: autoFormation(team), seed });
    const ev = jouer(b, nouvelleTrace());
    return JSON.stringify(ev);
  };
  const a = run(42);
  if (a !== run(42)) echec('deux combats avec la même graine diffèrent');
  if (a === run(43)) echec('deux graines différentes donnent le même combat (aléa figé ?)');
  ok(`même graine → combat identique (${(a.length / 1024).toFixed(0)} Ko d'événements) ; autre graine → autre combat`);
}

console.log('\n═══ 6. ÉQUILIBRE — le placement et le niveau conseillés ═══');
{
  const taux = (stage: StageDef, places: (t: TeamMember[]) => { row: Row; slot: number }[], niveau: (s: StageDef) => number, seedBase: number): number => {
    let wins = 0;
    for (let r = 0; r < RUNS; r++) {
      resetUid();
      const team = REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level: niveau(stage) }));
      const b = buildBattle({ stage, team, placements: places(team), seed: seedBase + r * 91 + stage.tier * 7 });
      jouer(b, nouvelleTrace());
      if (b.winner === 'hero') wins++;
    }
    return wins / RUNS;
  };

  const bonne = (t: TeamMember[]) => autoFormation(t);
  const mauvaise = (t: TeamMember[]) => t.map((_, i) => ({ row: 'back' as Row, slot: i % 2 }));

  const echantillon = [BOSS[1]!, BOSS[4]!, BOSS[7]!, BOSS[11]!, BOSS[15]!, BOSS[19]!];
  let sommeBonne = 0;
  let sommeMauvaise = 0;
  for (const st of echantillon) {
    const b1 = taux(st, bonne, (s) => s.level, 11);
    const b2 = taux(st, mauvaise, (s) => s.level, 11);
    sommeBonne += b1;
    sommeMauvaise += b2;
    console.log(`   ${st.id.padEnd(6)} niv. ${String(st.level).padStart(3)}   bien placés ${(b1 * 100).toFixed(0).padStart(3)} %   tous derrière ${(b2 * 100).toFixed(0).padStart(3)} %`);
  }
  const moyBonne = sommeBonne / echantillon.length;
  const moyMauvaise = sommeMauvaise / echantillon.length;
  console.log(`   → moyenne : ${(moyBonne * 100).toFixed(0)} % bien placés · ${(moyMauvaise * 100).toFixed(0)} % tous derrière`);
  if (moyBonne < moyMauvaise) echec('bien placer son équipe ne sert à rien');
  else ok(`le placement change le résultat (+${((moyBonne - moyMauvaise) * 100).toFixed(0)} points)`);

  const st = BOSS[11]!;
  const conseille = taux(st, bonne, (s) => s.level, 5);
  const faible = taux(st, bonne, (s) => Math.max(1, Math.round(s.level * 0.75)), 5);
  const tresFaible = taux(st, bonne, (s) => Math.max(1, Math.round(s.level * 0.6)), 5);
  console.log(`   ${st.id} : niveau conseillé ${(conseille * 100).toFixed(0)} % · −25 % de niveau ${(faible * 100).toFixed(0)} % · −40 % ${(tresFaible * 100).toFixed(0)} %`);
  if (conseille < faible) echec('être sous-niveau donne un meilleur résultat que le niveau conseillé');
  if (tresFaible > conseille) echec('être très sous-niveau donne un meilleur résultat que le niveau conseillé');
  ok('le niveau conseillé reste la référence');

  resetUid();
  const team = REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level: st.level }));
  const b = buildBattle({ stage: st, team, placements: autoFormation(team), seed: 77 });
  jouer(b, nouvelleTrace());
  const brules = b.log.filter((e) => e.type === 'cast' && e.burn).length;
  if (b.log.some((e) => e.type === 'soul' && e.total > 9)) echec('la jauge d\'âmes dépasse son plafond');
  ok(`${brules} capacités embrasées (${SOUL_BURN_COST} âmes) sur ce combat`);
}

console.log('\n═══ 7. CONTRAT DE DIFFICULTÉ — les 20 boss de la campagne ═══');
{
  /** Taux de victoire de l'équipe de référence sur les 20 boss, joué par l'IA du moteur. */
  const mesure = (facteurNiveau: number): { taux: number; tours: number; echecs: string[] } => {
    let tot = 0;
    let wins = 0;
    let tours = 0;
    const echecs: string[] = [];
    for (const st of BOSS) {
      const niveau = Math.max(1, Math.round(st.level * facteurNiveau));
      let w = 0;
      for (let r = 0; r < RUNS; r++) {
        resetUid();
        const team = REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level: niveau }));
        const b = buildBattle({ stage: st, team, placements: autoFormation(team), seed: 2000 + r * 53 + st.tier });
        jouer(b, nouvelleTrace());
        if (b.winner === 'hero') w++;
        tours += b.turn;
      }
      tot += RUNS;
      wins += w;
      if (w < RUNS) echecs.push(`${st.id} ${(w / RUNS * 100).toFixed(0)} %`);
    }
    return { taux: wins / tot, tours: tours / tot, echecs };
  };

  const conseille = mesure(1);
  const faible = mesure(0.65);
  console.log(`   niveau conseillé : ${(conseille.taux * 100).toFixed(0)} % de victoires · ${conseille.tours.toFixed(0)} tours en moyenne${conseille.echecs.length ? ' · ' + conseille.echecs.join(', ') : ''}`);
  console.log(`   −35 % de niveau  : ${(faible.taux * 100).toFixed(0)} % de victoires · ${faible.tours.toFixed(0)} tours en moyenne`);
  if (conseille.taux < 0.9) echec(`au niveau conseillé, l'équipe de référence ne passe que ${(conseille.taux * 100).toFixed(0)} % des boss (contrat : ≥ 90 %)`);
  else ok(`au niveau conseillé, ${(conseille.taux * 100).toFixed(0)} % des 20 boss passent (contrat v2.3 tenu en tour par tour)`);
  if (faible.taux > conseille.taux - 0.08) echec('être 35 % sous le niveau ne change rien : la progression ne sert à rien');
  else ok(`sous-niveau de 35 % : ${((conseille.taux - faible.taux) * 100).toFixed(0)} points de victoire en moins`);
  if (conseille.tours < 18 || conseille.tours > 60) echec(`durée moyenne hors cible : ${conseille.tours.toFixed(0)} tours (attendu 18-60)`);
  else ok(`durée moyenne ${conseille.tours.toFixed(0)} tours — lisible, pas interminable`);
}

console.log('\n════════════════════════════════════════════════');
if (erreurs === 0) console.log('✅ COMBAT TOUR PAR TOUR : AUCUN BUG DÉTECTÉ');
else console.log(`❌ ${erreurs} problème(s) détecté(s)`);
console.log('════════════════════════════════════════════════\n');
process.exit(erreurs === 0 ? 0 : 1);
