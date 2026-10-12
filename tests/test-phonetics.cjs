const assert = require('node:assert/strict');
const { getPronunciation, prepareMusicfulLyrics, normalizedName } = require(process.argv[2]);
const { BUILTIN_NAMES } = require(process.argv[3]);
const { AFRICAN_FRANCOPHONE_ADOPTED_NAMES } = require(process.argv[4]);

const examples = [
  ['Issa', 'Is-sa', 'high'],
  ['Moussa', 'Mou-ssa', 'high'],
  ['Aïcha', 'Aï-cha', 'high'],
  ['Kouassi', 'Koua-ssi', 'high'],
  ['Mamadou', 'Ma-ma-dou', 'high'],
  ['Fatou', 'Fa-tou', 'high'],
  ['Traoré', 'Tra-o-ré', 'high'],
  ['N’Guessan', "N'Gue-ssan", 'high'],
  ['Richard', 'Ri-char', 'high'],
  ['RICHARD', 'Ri-char', 'high'],
  ['Guillaume', 'Gui-yom', 'high'],
  ['Evra', 'Èv-ra', 'high'],
  ['EVRA', 'Èv-ra', 'high'],
  ['François', 'Fran-soua', 'high'],
  ['Francois', 'Fran-soua', 'high'],
  ['Patrick', 'Pa-trik', 'high'],
  ['Didier', 'Di-dié', 'high'],
  ['Chantal', 'Chan-tal', 'high'],
  ['Christelle', 'Chris-telle', 'high'],
  ['Chloé', 'Klo-é', 'high'],
  ['Chloe', 'Klo-é', 'high'],
  ['Jean-Pierre', 'Jean-Pierre', 'high'],
  ['Marie-Claire', 'Ma-rie-Claire', 'high'],
  ['Richard Kouassi', 'Ri-char Koua-ssi', 'high'],
  ['Guillaume Traoré', 'Gui-yom Tra-o-ré', 'high'],
  ['Evra Kouassi', 'Èv-ra Koua-ssi', 'high'],
  ['Marie-Claire Koffi', 'Ma-rie-Claire Ko-ffi', 'high'],
  ['Jean-Pierre Koné', 'Jean-Pierre Ko-né', 'high'],
  ['Bokara', 'Bo-ka-ra', 'low'],
  ['ZZZ', 'ZZZ', 'unknown'],
];
for (const [name, phonetic, confidence] of examples) {
  const result = getPronunciation(name);
  assert.equal(result.pronunciation, phonetic, `${name} : proposition`);
  assert.equal(result.confidence, confidence, `${name} : confiance`);
  assert.equal(result.needsReview, confidence !== 'high', `${name} : contrôle`);
}
assert.ok(AFRICAN_FRANCOPHONE_ADOPTED_NAMES.length >= 300, 'Ajouts ciblés >= 300');
assert.ok(BUILTIN_NAMES.length >= 1030, 'Corpus complet > 1000');
assert.ok(!AFRICAN_FRANCOPHONE_ADOPTED_NAMES.some(x => /^(?:De Gaulle|Dupont|Dubois|D'Ormesson)$/i.test(x.name)),
 'Ne pas introduire la liste des patronymes français génériques');
const spellings = new Map();
for (const entry of BUILTIN_NAMES) {
  const key = normalizedName(entry.name);
  const old = spellings.get(key);
  if (old) assert.equal(old, entry.pronunciation, `variantes normalisées : ${entry.name}`);
  else spellings.set(key, entry.pronunciation);
  assert.equal(getPronunciation(entry.name).source, 'dictionary', `entrée : ${entry.name}`);
  assert.ok(entry.name && entry.pronunciation && !/[<>]/.test(entry.pronunciation));
}
assert.ok(spellings.size >= 1000, 'Au moins 1000 clés normalisées distinctes');
assert.equal(normalizedName('Francois'), normalizedName('François'));
assert.equal(getPronunciation('Guillaume', { locale: 'fr-BE' }).pronunciation, 'Gui-yom');
assert.equal(getPronunciation('Guillaume', { locale: 'fr-FR' }).pronunciation, 'Gui-yom');
assert.equal(getPronunciation('Moussa', { locale: 'fr-CI' }).pronunciation, 'Mou-ssa');
assert.equal(getPronunciation('Evra', {
  approvedOverrides: [{name:'Evra', pronunciation:'Év-ra', approved:true}],
}).pronunciation, 'Év-ra');
assert.equal(getPronunciation('Evra', { locale:'en-US' }).source, 'rules');
const raw = 'Richard dédie une chanson à Guillaume et Evra. Le nom Richardine ne doit pas changer.';
const newLyrics = prepareMusicfulLyrics(raw, ['Richard','Guillaume','Evra']);
assert.equal(newLyrics.originalLyrics, raw);
assert.equal(newLyrics.musicfulLyrics,
 'Ri-char dédie une chanson à Gui-yom et Èv-ra. Le nom Richardine ne doit pas changer.');
assert.equal(prepareMusicfulLyrics('Bokara chante', ['Bokara'], { unknownNamePolicy: 'keep-original' }).musicfulLyrics, 'Bokara chante');
assert.equal(prepareMusicfulLyrics('Guillaume Traoré chante pour Aïcha', ['Guillaume Traoré', 'Aïcha']).musicfulLyrics,
 'Gui-yom Tra-o-ré chante pour Aï-cha');
assert.equal(prepareMusicfulLyrics('Richard chante', ['Richard'], {
  approvedOverrides: [{name:'Richard', pronunciation:'Ri-shar', approved:true}],
}).musicfulLyrics, 'Ri-shar chante');
assert.equal(getPronunciation('<script>').confidence, 'unknown');
console.log(`OK V3 ciblée — ${BUILTIN_NAMES.length} graphies, ${spellings.size} clés distinctes, ${AFRICAN_FRANCOPHONE_ADOPTED_NAMES.length} entrées francophones ajoutées, tests de prononciation, sécurité et paroles Musicful.`);
