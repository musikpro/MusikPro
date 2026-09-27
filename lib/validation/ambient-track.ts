import { z } from "zod";

export const setAmbientTrackSchema = z.object({
  songGroupId: z.string().min(1, "Choisis une chanson."),
  volumePercent: z.coerce.number().int().min(5).max(50),
});
