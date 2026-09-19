# Design QA — Packs de chansons

## Référence

- Captures fournies par l’utilisateur : carte « Chansons disponibles » et moyens de paiement acceptés.
- Écran contrôlé : `/dashboard/credits`.

## Comparaison finale

- La carte du solde conserve la palette orange MusikPro dans un format plus compact ; le chiffre et « chansons disponibles » restent sur une seule ligne.
- Le contraste, les espacements, les rayons et l’ombre sont cohérents avec les autres cartes du tableau de bord.
- Orange Money, MTN MoMo, Moov Money, Wave et Visa/Mastercard utilisent les ressources officielles déjà présentes dans le projet.
- Les cinq emplacements restent sur une seule ligne de 320 à 1440 px.
- Aucun débordement horizontal global n’a été détecté aux largeurs 320, 360, 390, 430, 768, 1024 et 1440 px.

## Défauts bloquants

- P0 : aucun.
- P1 : aucun.
- P2 : aucun.

## Ajustement — navigation de création

- Les boutons « Retour » et « Tableau de bord » disposent d’une hauteur et d’une marge intérieure plus généreuses.
- L’indicateur « Étape » reprend exactement le style et les dimensions du bouton « Retour ».
- Les trois éléments de la bande supérieure restent sur une seule ligne de 320 à 1440 px, sans débordement.
- Une variante compacte conserve cet élargissement à 320 px sans provoquer de débordement horizontal.

## Ajustement — destinataire de la chanson

- Le champ du nom utilise un seul traitement de focus orange, sans second contour.
- Le menu « Lien avec cette personne » reste au-dessus de la carte de conseils lorsqu’il est ouvert.
- Le défilement interne de la liste ne ferme plus le menu ; seul le défilement de la page le referme.
- Les relations « Mon oncle » et « Ma tante » sont proposées et acceptées par la validation.
- La prononciation suggérée est affichée en lecture seule et ne peut recevoir ni clic ni focus clavier.

## Ajustement — révision des paroles

- Le compteur, l’éditeur et la validation partagent une limite maximale de 5 000 mots.
- L’action de rallongement respecte également cette limite.
- Une seule barre de défilement native et stylée reste visible dans le cadre des paroles.

## Ajustement — finalisation de la création

- Le parcours suit désormais l’ordre « Prêt à générer → Vos informations → Choix du pack → paiement → génération ».
- La page « Vos informations » ne contient plus de résumé de commande ; les trois champs ont la même hauteur et le téléphone intègre proprement l’indicatif +225.
- L’indicatif téléphonique utilise un menu MusikPro personnalisé avec huit pays ; il reste au-dessus du contenu et se contrôle aussi au clavier.
- Les champs d’identité utilisent désormais une hauteur standard de 48 px et des marges intérieures plus compactes.
- La sélection du pack dispose de son propre écran, d’un état sélectionné visible, du choix de devise et des moyens de paiement sur une ligne.
- L’écran du choix du pack reprend la carte, l’en-tête illustré, les bordures et la profondeur visuelle de la page « Vos informations ».
- La navigation basse est absente des pages d’informations, de choix du pack et de redirection.
- Les trois écrans ont été vérifiés à 320, 360, 390, 430, 768, 1024 et 1440 px sans débordement horizontal ni bouton tronqué.

## Ajustement — solde et grille des packs

- La carte latérale « Chansons disponibles » utilise une composition plus compacte, une icône fonctionnelle et un fond en profondeur cohérent avec MusikPro.
- Le chiffre du solde passe à 34 px et reste sur la même ligne que « chansons restantes ».
- Les quatre packs sont disposés en grille 2 × 2 sur mobile et bureau, aussi bien sur la page générale que dans le parcours de création.
- À 320 px, les cartes font 133 à 137 px de large sans débordement horizontal ; à 1440 px, la grille conserve deux colonnes égales.

final result: passed
