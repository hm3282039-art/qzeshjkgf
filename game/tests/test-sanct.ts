/**
 * Vérification du système d'étoiles (Sanctuaire) façon Mobile Legends :
 *  - un R monté à fond reste sous un SSR natif ;
 *  - les étoiles jaunes consomment de la nourriture ;
 *  - ✦1 = doublon du même héros, ✦2+ = sacrifice d'un héros de même rareté ;
 *  - plafonds R 3✦ / SR 4✦ / SSR 5✦ ;
 *  - l'invocation ne fusionne plus toute seule : elle stocke des doublons.
 */
import assert from 'node:assert/strict';
import { HEROES, MAX_RED, heroById, heroPower, starMult } from '../src/data/heroes';
import { planRed, planYellow, redCandidates } from '../src/data/sanctuaire';
import { performSummon } from '../src/data/summon';

/* --- 1. Règles pures : comparaison de puissance ---------------------------- */
const kael = heroById('kael')!;   // SSR
const bran = heroById('bran')!;   // R
const branMax = starMult(bran, 5, 3);
const kaelBase = starMult(kael, 5, 0);
assert.ok(branMax < 1, `R max doit rester sous ×1 (obtenu ${branMax.toFixed(3)})`);
assert.ok(branMax < kaelBase, 'R max doit rester sous un SSR natif de base');
assert.ok(heroPower(bran, 5, 1, undefined, 3) < heroPower(kael, 5, 1), 'puissance R max < puissance SSR 5★');
console.log(`R à fond : ×${branMax.toFixed(3)} · SSR natif 5★ : ×${kaelBase.toFixed(3)} → OK`);

/* --- 2. Plafonds ---------------------------------------------------------- */
assert.deepEqual(MAX_RED, { R: 3, SR: 4, SSR: 5 });

/* --- 3. Nourriture des étoiles jaunes ------------------------------------- */
const st = {
  heroes: { bran: 3, nell: 3, sable: 3, kael: 5 } as Record<string, number>,
  red: {} as Record<string, number>,
  dupes: { nell: 1, sable: 1 } as Record<string, number>,
};
const pR = planYellow(st, bran, 3);
assert.ok(pR && pR.dupes.length === 1 && pR.dupes[0]!.id === 'nell', '1 doublon R suffit pour un R');
assert.equal(pR.gold, 900);

// Sans doublon de même rareté, un SR exige 3 doublons R.
const stB = { heroes: { kael: 5, seren: 4 } as Record<string, number>, red: {}, dupes: { bran: 1, nell: 1, sable: 1 } as Record<string, number> };
const pSR = planYellow(stB, heroById('seren')!, 4);
assert.ok(pSR, '3 doublons R doivent débloquer une étoile SR');
assert.equal(pSR.dupes.reduce((s, d) => s + d.count, 0), 3);
assert.equal(pSR.gold, 1800 * 2);

/* --- 4. Étoiles rouges ---------------------------------------------------- */
const stR = {
  heroes: { kael: 5, noktis: 5, aurore: 5, bran: 5, sable: 5 } as Record<string, number>,
  red: { noktis: 0, bran: 1, sable: 1 } as Record<string, number>,
  dupes: { kael: 1 } as Record<string, number>,
};
// ✦1 : un doublon du même héros.
assert.ok(planRed(stR, kael, 0), '✦1 doit demander un doublon de Kael');
// ✦2 : un autre SSR 5★ qui a déjà ✦1 → il n'y en a pas.
assert.equal(planRed(stR, kael, 1), null, '✦2 impossible sans autre SSR à ✦1');
assert.equal(redCandidates(stR, kael, 1).length, 0);
// On donne à Noktis sa ✦1 : il devient sacrifiable pour Kael.
stR.red.noktis = 1;
assert.equal(planRed(stR, kael, 1)?.sacrifice, 'noktis', '✦2 sacrifie un SSR à ✦1');
assert.deepEqual(redCandidates(stR, kael, 1).map((h) => h.id), ['noktis']);
// Un R à ✦1 ne sert jamais de sacrifice pour un SSR.
assert.ok(!redCandidates(stR, kael, 1).some((h) => h.rarity === 'R'));

/* --- 5. Invocation : doublons stockés, aucune fusion automatique ---------- */
const pull = performSummon(1, { heroes: { kael: 5 }, dupes: {}, pity: 0 }, () => 0);
const first = pull.results[0]!;
assert.equal(first.kind, 'hero');
assert.equal(pull.heroes.kael, 5, 'un doublon ne change pas les étoiles');
assert.equal(pull.dupes.kael, 1, 'le doublon part en réserve');
assert.equal((first as { dupe?: boolean }).dupe, true);

/* --- 6. Récapitulatif lisible -------------------------------------------- */
console.log('Sanctuaire : toutes les règles vérifiées');
for (const h of HEROES) {
  const max = starMult(h, 5, MAX_RED[h.rarity]) / starMult(h, h.stars, 0);
  if (h.rarity === 'R' && max > 2.2) throw new Error(`R ${h.id} trop fort`);
}
console.log('Plafonds R/SR/SSR cohérents · 20 héros testés');
