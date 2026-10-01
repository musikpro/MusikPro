import { z } from "zod";

export const setAmbientTrackSchema = z.object({
  songGroupId: z.string().min(1, "Choisis une chanson."),
  volumePercent: z.coerce.number().int().min(1).max(50),
});
