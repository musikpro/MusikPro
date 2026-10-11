ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "lyrics_guidance" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "music_styles" ADD COLUMN IF NOT EXISTS "lyrics_guidance" text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton chaleureux et festif. Féliciter la personne pour l''âge fêté, évoquer ses qualités et quelques souvenirs précis tirés de l''histoire, formuler des vœux pour l''année à venir. Le refrain doit être simple, joyeux et facile à chanter en chœur, avec le prénom et un « joyeux anniversaire ».' WHERE lower("name") = lower('Anniversaire') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton tendre et sincère. Parler du lien qui unit les deux personnes à partir de l''histoire racontée, avec des images concrètes plutôt que des clichés. Alterner confidences intimes dans les couplets et déclaration forte dans le refrain. Rester pudique et respectueux.' WHERE lower("name") = lower('Amour') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton énergique et rassembleur. Évoquer la danse, la joie de se retrouver, l''ambiance de la fête et les invités. Refrain court, répétitif et scandable, avec des appels à la foule (call-and-response).' WHERE lower("name") = lower('Fête') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton solennel mais joyeux. Célébrer l''union des deux mariés, leur histoire, leurs promesses et les vœux de bonheur de la famille. Évoquer la bénédiction, la fidélité et l''avenir ensemble. Refrain lumineux et émouvant.' WHERE lower("name") = lower('Mariage') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton respectueux et reconnaissant. Honorer la personne, son parcours, ses valeurs et ce qu''elle a transmis, à partir de l''histoire racontée. Éviter tout ton moqueur. Terminer sur un message d''héritage et de mémoire.' WHERE lower("name") = lower('Hommage') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton humble et sincère. Dire merci pour des gestes précis cités dans l''histoire, exprimer la reconnaissance sans exagération. Le refrain répète le merci de façon simple et touchante.' WHERE lower("name") = lower('Gratitude') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton paisible et lumineux. Célébrer l''arrivée de l''enfant, la bénédiction, la famille et la communauté qui l''entoure. Vocabulaire tendre, vœux de santé, de protection et de bonheur pour l''enfant.' WHERE lower("name") = lower('Baptême') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton sincère et courageux. Mettre des mots justes sur des sentiments profonds, avec des images concrètes tirées de l''histoire. Progresser du doute vers l''aveu clair dans le refrain. Rester respectueux.' WHERE lower("name") = lower('Déclaration') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton dynamique et mémorable. Mettre en avant le produit ou le service, son bénéfice principal et son nom dans un refrain très court, répétitif et facile à retenir (slogan chantable). Pas de promesses mensongères ni de chiffres inventés.' WHERE lower("name") = lower('Publicité') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton fédérateur et positif. Mettre en valeur la personnalité, ses valeurs et son engagement à partir des informations fournies, avec un refrain slogan facile à scander. Rester factuel : n''invente ni promesse ni accusation.' WHERE lower("name") = lower('Campagne / Personnalité') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Ton recueilli et élevé. Parler de foi, de louange, de gratitude et d''espérance avec respect, en cohérence avec la tradition évoquée dans l''histoire. Refrain simple, repris en assemblée. Éviter toute polémique ou comparaison entre religions.' WHERE lower("name") = lower('Religion') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "occasions" SET "lyrics_guidance" = 'Adapter le ton à l''histoire racontée : rester fidèle aux faits fournis, choisir un registre cohérent (joyeux, tendre ou solennel) et finir sur un refrain simple et mémorable.' WHERE lower("name") = lower('Autre etc...') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles équilibrées et universelles : phrases naturelles, vocabulaire simple, structure classique couplet-refrain-couplet-refrain-pont-refrain, rimes douces sans effet marqué.' WHERE lower("name") = lower('Neutre') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles sensuelles et émotives : phrases fluides et souples, images intimes, répétitions expressives dans le refrain, ad-libs (« oh », « baby ») à placer avec parcimonie, rimes douces et assonances.' WHERE lower("name") = lower('R&B / Soul') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles légères et hypnotiques : phrases courtes et répétitives, refrain mantra facile à reprendre, un peu d''anglais ou de mots locaux possible, ambiance de danse détendue, peu de mots par vers pour laisser respirer le rythme.' WHERE lower("name") = lower('Amapiano') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles rythmées et festives : phrases courtes, accentuées sur les temps forts, refrain à reprendre en chœur, invitations à danser, interjections joyeuses.' WHERE lower("name") = lower('Afro Danse') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles rappées : couplets denses de 12 à 16 lignes à rimes riches et internes, flow marqué avec jeux de mots et punchlines, vocabulaire de rue maîtrisé, refrain court et accrocheur, images fortes. Pas de vulgarité gratuite ni de violence.' WHERE lower("name") = lower('Hip-Hop / Rap') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles festives et conviviales : refrain « joyeux anniversaire » simple, joyeux et facile à chanter en groupe, couplets qui racontent la personne avec humour bienveillant, phrases courtes, rimes simples.' WHERE lower("name") = lower('Style Anniversaire') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles mélodiques et entraînantes : refrain accrocheur et répétitif, phrases courtes, quelques mots d''anglais ou de pidgin possibles, thèmes de joie, d''amour et de réussite, rimes simples, ad-libs (« eh », « yeah »).' WHERE lower("name") = lower('Afrobeats / Naija Pop') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles festives à l''ivoirienne : phrases courtes et percutantes, expressions populaires et nouchi, éloges et dédicaces, refrain scandé en appel-réponse, ambiance de fête abidjanaise, rythme rapide et énergique.' WHERE lower("name") = lower('Coupé-décalé') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles sociales et narratives : couplets qui racontent une histoire de la vie quotidienne avec humour et sincérité, langage populaire ivoirien, refrain en chœur, ton complice et fraternel.' WHERE lower("name") = lower('Zouglou') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles de louange et d''espérance : vocabulaire de foi, de grâce et de reconnaissance, refrain d''assemblée simple repris plusieurs fois, montée émotionnelle jusqu''à un pont inspiré, ton respectueux.' WHERE lower("name") = lower('Gospel') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles romantiques et mélodiques : images tendres, métaphores simples, refrain émotionnel facile à retenir, rimes douces et phrases chantables sur de longues notes.' WHERE lower("name") = lower('Pop Romantique') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles intimes et posées : phrases longues et lentes, peu de répétitions, images sensibles, progression émotionnelle douce jusqu''à un refrain sobre et poignant.' WHERE lower("name") = lower('Ballade Piano') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles intimes et sobres : phrases naturelles comme une confidence, peu d''effets, images simples et sincères, refrain doux et facile à fredonner.' WHERE lower("name") = lower('ballade acoustique') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles simples et sincères : langage du quotidien, phrases naturelles, images concrètes, refrain doux et chaleureux, sans surcharge.' WHERE lower("name") = lower('Acoustique') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles pop africaines lumineuses : refrain mélodique et mémorable, phrases courtes, thèmes d''amour et de joie, quelques mots locaux possibles, rimes simples.' WHERE lower("name") = lower('Afro-Pop') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles sensuelles et langoureuses : phrases fluides, vocabulaire d''amour et de nostalgie, refrain doux et répété, rimes en voyelles ouvertes.' WHERE lower("name") = lower('Zouk') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles chaleureuses d''inspiration highlife : ton convivial et nostalgique, proverbes et expressions imagées, refrain chantable en groupe, rythme tranquille et joyeux.' WHERE lower("name") = lower('Highlife rétro') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles lentes et tendres : phrases longues et douces, confidences amoureuses, peu de mots par ligne, refrain émouvant et simple.' WHERE lower("name") = lower('Slow') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles minimalistes et hypnotiques : très peu de mots, phrases courtes répétées comme un mantra, ambiance de club et de communion, quelques ad-libs.' WHERE lower("name") = lower('Afro House') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles de jingle : 4 à 8 lignes maximum, slogan court et mémorable répété, nom de la marque dans le refrain, rythme vif et positif. Aucune promesse mensongère.' WHERE lower("name") = lower('Jingle publicitaire') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Texte de voix off : phrases courtes parlées, ton convaincant et clair, message principal en tête, appel à l''action final. Pas de couplets rimés ; aucune promesse mensongère.' WHERE lower("name") = lower('Voix off publicitaire') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles reggae : phrases rythmées posées sur le contretemps, thèmes de paix, d''unité et de résilience, refrain simple et répété, ton chaleureux et positif.' WHERE lower("name") = lower('Reggae') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles de griot : récit louangeur et poétique, généalogie et proverbes, éloge de la personne et de sa lignée, phrases amples et rythmées, refrain en réponse du chœur.' WHERE lower("name") = lower('Griot / Kora Music') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles mélodiques et entraînantes : refrain accrocheur et répétitif, phrases courtes, quelques mots d''anglais ou de pidgin possibles, thèmes de joie, d''amour et de réussite, rimes simples, ad-libs (« eh », « yeah »).' WHERE lower("name") = lower('Afrobeat') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles rappées : couplets denses de 12 à 16 lignes à rimes riches et internes, flow marqué avec jeux de mots et punchlines, vocabulaire de rue maîtrisé, refrain court et accrocheur, images fortes. Pas de vulgarité gratuite ni de violence.' WHERE lower("name") = lower('Rap') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles trap : phrases courtes et saccadées, répétitions rythmiques, ad-libs fréquents, images de réussite et de détermination, refrain scandé et hypnotique. Pas de vulgarité gratuite ni de violence.' WHERE lower("name") = lower('Rap-Trap') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles sensuelles et émotives : phrases fluides et souples, images intimes, répétitions expressives dans le refrain, ad-libs (« oh », « baby ») à placer avec parcimonie, rimes douces et assonances.' WHERE lower("name") = lower('R&B') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles pop africaines lumineuses : refrain mélodique et mémorable, phrases courtes, thèmes d''amour et de joie, quelques mots locaux possibles, rimes simples.' WHERE lower("name") = lower('Afropop') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles de louange et d''adoration : vocabulaire de foi, de grâce et de reconnaissance, refrain d''assemblée simple repris plusieurs fois, montée émotionnelle jusqu''à un pont inspiré, ton respectueux.' WHERE lower("name") = lower('Louange (Chrétien)') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles de nasheed : ton respectueux et spirituel, thèmes de foi, de gratitude, de patience et de valeurs morales, vocabulaire sobre, refrain simple repris en chœur. Aucune référence à des instruments ; rester fidèle aux principes de l''islam sans controverse.' WHERE lower("name") = lower('Nasheed (Islam)') AND "lyrics_guidance" = '';
--> statement-breakpoint
UPDATE "music_styles" SET "lyrics_guidance" = 'Paroles d''inspiration mandingue : récit poétique, proverbes et éloge de la personne et de sa lignée, phrases amples et rythmées, refrain en réponse du chœur, ton noble et chaleureux.' WHERE lower("name") = lower('Mandingue') AND "lyrics_guidance" = '';
