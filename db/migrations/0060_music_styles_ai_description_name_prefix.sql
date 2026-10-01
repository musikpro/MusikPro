UPDATE "music_styles" SET "ai_description" = "name" || E':\n' || "ai_description" WHERE "ai_description" <> '' AND lower(left("ai_description", length("name") + 1)) <> lower("name") || ':';
