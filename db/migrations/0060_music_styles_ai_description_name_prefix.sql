UPDATE "music_styles" SET "ai_description" = "name" || ': ' || "ai_description" WHERE "ai_description" <> '' AND lower(left("ai_description", length("name") + 1)) <> lower("name") || ':';
