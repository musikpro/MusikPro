export type RecipientRelationOption = {
  id: string;
  name: string;
  slug: string;
};

export const DEFAULT_RECIPIENT_RELATIONS: RecipientRelationOption[] = [
  { id: "default-wife", name: "Ma femme", slug: "ma-femme" },
  { id: "default-husband", name: "Mon mari", slug: "mon-mari" },
  { id: "default-girlfriend", name: "Ma copine", slug: "ma-copine" },
  { id: "default-boyfriend", name: "Mon copain", slug: "mon-copain" },
  { id: "default-mother", name: "Ma mère", slug: "ma-mere" },
  { id: "default-father", name: "Mon père", slug: "mon-pere" },
  { id: "default-uncle", name: "Mon oncle", slug: "mon-oncle" },
  { id: "default-aunt", name: "Ma tante", slug: "ma-tante" },
  { id: "default-children", name: "Mes enfants", slug: "mes-enfants" },
  { id: "default-brother", name: "Mon frère", slug: "mon-frere" },
  { id: "default-sister", name: "Ma sœur", slug: "ma-soeur" },
  { id: "default-friend-m", name: "Un ami", slug: "un-ami" },
  { id: "default-friend-f", name: "Une amie", slug: "une-amie" },
  { id: "default-self", name: "Pour moi", slug: "pour-moi" },
  { id: "default-special", name: "Une personne qui compte", slug: "une-personne-qui-compte" },
];
