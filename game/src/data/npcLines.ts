/** Répliques des habitants de Cendrebourg (cliquer sur un personnage du hub). */
export interface Talker {
  id: string;
  name: string;
  /** Héros jouable → la bulle propose d'ouvrir sa fiche. */
  hero?: string;
  lines: string[];
}

export const TALKERS: Record<string, Talker> = {
  cat: { id: 'cat', name: 'Chat noir', lines: ['Mrrraow.', '… *te fixe sans cligner des yeux*', 'Prrr… *se frotte contre ta botte*', 'Fffsss ! *regarde le portail*'] },
  cultist: { id: 'cultist', name: 'Pèlerin à la lanterne', lines: [
    'La lumière de ma lanterne ne s’éteint jamais… elle se nourrit d’autre chose.',
    'Le Portail murmure des noms la nuit. Le tien en fait partie.',
    'On dit que la Tour n’a pas de sommet. Seulement des gens qui ont cessé de grimper.',
  ] },
  guard: { id: 'guard', name: 'Garde de l’Autel', lines: [
    'Halte. Ah, c’est toi, Invocateur. Passe.',
    'Le cristal a encore vibré cette nuit. Mauvais présage… ou bonne invocation.',
    'Les goules rôdent sur la Route des Pendus. Prends des renforts.',
  ] },
  smith: { id: 'smith', name: 'Brann le Forgeron', lines: [
    'Ma forge est encore froide pour toi. Reviens quand la cendre sera prête.',
    'Une lame forgée ici a tué un dragon. Enfin… un gros lézard.',
    'Tu veux du solide ? Rapporte-moi des os du Gardien.',
  ] },
  kael: { id: 'kael', name: 'Kael', hero: 'kael', lines: [
    'Mon serment est brisé, pas mon bouclier.',
    'Reste derrière moi. Les flammes ne mordent que ceux qui fuient.',
    'Le Gardien d’Os… je l’ai déjà affronté. Une fois.',
  ] },
  aldric: { id: 'aldric', name: 'Frère Aldric', hero: 'aldric', lines: [
    'Que la Lumière guide ta lame, Invocateur.',
    'Je soigne les vivants. Les morts, je les renvoie d’où ils viennent.',
    'Kael prie encore, même s’il prétend le contraire.',
  ] },
  lyra: { id: 'lyra', name: 'Lyra', hero: 'lyra', lines: [
    'Tu m’as vue ? Alors je deviens négligente.',
    'Ces ruelles sont à moi. Les ombres aussi.',
    'Un contrat, une cible. Le reste n’est que bavardage.',
  ] },
  morwen: { id: 'morwen', name: 'Morwen', hero: 'morwen', lines: [
    'Les morts sont de bien meilleurs alliés que les vivants. Ils ne discutent jamais.',
    'Ce portail sent le tombeau. J’adore.',
    'Tu as peur de mes squelettes ? Eux ont peur de moi.',
  ] },
  vaelen: { id: 'vaelen', name: 'Vaelen', hero: 'vaelen', lines: [
    'J’ai tenu la porte nord sept nuits. Je peux tenir celle-ci jusqu’à l’aube.',
    'Mon bouclier a fondu sur un dragon. Il est devenu plus lourd, c’est tout.',
    'Si je tombe, ne me relève pas. Prends mon marteau.',
  ] },
  sylvaine: { id: 'sylvaine', name: 'Sylvaine', hero: 'sylvaine', lines: [
    'Tu marches trop fort. Même les morts t’ont entendu arriver.',
    'Le Bois d’Argent m’a bannie. Ses ronces, elles, me suivent encore.',
    'Une flèche bien placée vaut mieux qu’une armée. C’est plus économique.',
  ] },
  pyrrha: { id: 'pyrrha', name: 'Pyrrha', hero: 'pyrrha', lines: [
    'Ne me touche pas. Trop longtemps, et tu ne serais plus que cendre.',
    'Mon village a brûlé. Je n’ai jamais dit que ce n’était pas moi.',
    'Le feu ne détruit rien. Il transforme. C’est différent.',
  ] },
};
