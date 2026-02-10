import { defineCollection, z } from "astro:content";

const experimentsCollection = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
        icon: z.string(),
        color: z.string(),
        lang: z.enum(["en", "es"]).default("en"),
        order: z.number().optional().default(0),
    }),
});

export const collections = {
    experiments: experimentsCollection,
};
