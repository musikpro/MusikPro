ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "story_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "story_subtitle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "story_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "story_placeholder" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "story_tip" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Valeurs initiales des occasions standard (français, source ; les langues sont traduites par l'IA depuis /admin/languages).
-- Seules les lignes encore vides sont renseignées : un texte déjà saisi par le propriétaire n'est jamais écrasé.
UPDATE "occasions" SET
  "story_title" = 'Parle-nous de cet anniversaire',
  "story_subtitle" = 'Dis-nous qui on fête et pourquoi cette personne compte pour toi',
  "story_label" = 'Ton message d’anniversaire',
  "story_placeholder" = 'Ex. : Mon petit frère Moussa fête ses 25 ans. Il adore le foot et fait rire toute la famille. Je veux lui souhaiter un joyeux anniversaire...',
  "story_tip" = 'Cite l’âge, un souvenir drôle et ce que tu lui souhaites pour l’année à venir.'
WHERE "slug" = 'anniversaire' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Raconte votre histoire d’amour',
  "story_subtitle" = 'Dis ce que tu ressens et ce qui rend cette personne unique',
  "story_label" = 'Ta déclaration',
  "story_placeholder" = 'Ex. : Depuis notre rencontre, chaque jour avec toi est une fête. Ton sourire, ta douceur et ta façon de me comprendre me donnent envie de te dire merci...',
  "story_tip" = 'Évoque votre première rencontre, un moment fort à deux et ce que tu n’oses pas toujours dire.'
WHERE "slug" = 'amour' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Parle de cette réussite',
  "story_subtitle" = 'Raconte le parcours, les efforts et la fierté du moment',
  "story_label" = 'Ton message de félicitations',
  "story_placeholder" = 'Ex. : Après des années de travail et de nuits blanches, Awa obtient enfin son diplôme. Toute la famille est fière d’elle et de son courage...',
  "story_tip" = 'Mentionne le diplôme, les obstacles surmontés et les personnes qui ont soutenu cette réussite.'
WHERE "slug" = 'graduation' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Décris ta fête',
  "story_subtitle" = 'Dis-nous ce que tu célèbres et l’ambiance que tu veux',
  "story_label" = 'L’ambiance de ta fête',
  "story_placeholder" = 'Ex. : Samedi soir, on réunit tous nos amis pour célébrer la fin des examens. Je veux une chanson qui fait danser et rire jusqu’au matin...',
  "story_tip" = 'Précise l’événement, les invités et l’énergie que tu veux ressentir sur la piste.'
WHERE "slug" = 'fete' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Mets des mots sur cette séparation',
  "story_subtitle" = 'Exprime ce que tu ressens, à ton rythme et avec sincérité',
  "story_label" = 'Ce que tu ressens',
  "story_placeholder" = 'Ex. : Nous avons partagé de beaux moments, mais nos chemins se séparent. Je garde les souvenirs heureux et je veux avancer avec le cœur plus léger...',
  "story_tip" = 'Dis ce qui te manque, ce que tu as appris et la force que tu veux retrouver.'
WHERE "slug" = 'separation' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Dis merci avec tes mots',
  "story_subtitle" = 'Raconte ce que cette personne a fait pour toi',
  "story_label" = 'Ton message de remerciement',
  "story_placeholder" = 'Ex. : Merci maman pour tes sacrifices, tes prières et ton soutien dans les moments difficiles. Grâce à toi, je suis devenu la personne que je suis...',
  "story_tip" = 'Cite un geste précis, un souvenir où tu as été aidé et ce que ça a changé pour toi.'
WHERE "slug" = 'gratitude' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Décris ton moment de calme',
  "story_subtitle" = 'Dis-nous ce qui t’apaise et l’émotion que tu veux ressentir',
  "story_label" = 'Ce qui t’apaise',
  "story_placeholder" = 'Ex. : Le soir, quand la ville se tait, j’aime écouter la pluie et respirer lentement. Je veux une chanson douce qui m’aide à me détendre et à dormir...',
  "story_tip" = 'Évoque un lieu, un moment de la journée ou un souvenir qui te donne de la paix.'
WHERE "slug" = 'serenite' AND "story_title" = '';--> statement-breakpoint
UPDATE "occasions" SET
  "story_title" = 'Dis-nous ce qui te motive',
  "story_subtitle" = 'Parle de ton objectif et de l’énergie que tu veux y mettre',
  "story_label" = 'Ton objectif',
  "story_placeholder" = 'Ex. : Je prépare un grand défi sportif. Je veux une chanson qui me donne du courage, de la force et l’envie de ne jamais abandonner...',
  "story_tip" = 'Précise ton objectif, ce qui t’a fait douter et la victoire que tu vises.'
WHERE "slug" = 'motivation' AND "story_title" = '';
