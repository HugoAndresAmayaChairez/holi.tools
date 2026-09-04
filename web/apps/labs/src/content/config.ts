import { defineCollection, z } from "astro:content";

const experimentsCollection = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        description: z.string(),
        summary: z.string().optional(),
        tags: z.array(z.string()),
        category: z.string().optional(),
        format: z.enum(["tutorial", "field-note", "experiment", "paper"]).optional().default("field-note"),
        icon: z.string(),
        color: z.string(),
        lang: z.enum(["en", "es", "zh", "hi", "ar", "bn", "pt"]).default("en"),
        order: z.number().optional().default(0),
        featured: z.boolean().optional().default(false),
    }),
});

export const collections = {
    experiments: experimentsCollection,
};
