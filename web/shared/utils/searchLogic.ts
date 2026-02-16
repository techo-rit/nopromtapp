import type { Template } from "../../types";

export const searchTemplates = (query: string, templates: Template[]): Template[] => {
  const cleanQuery = query.trim().toLowerCase();
  
  if (!cleanQuery) return [];

  // Split query into tokens (e.g., "wedding suit" -> ["wedding", "suit"])
  const searchTokens = cleanQuery.split(/\s+/);

  return templates.filter((template) => {
    const title = template.name.toLowerCase();
    const keywords = (template.keywords || []).map(k => k.toLowerCase());
    const category = template.stackId.toLowerCase();

    // AND across tokens: every token must match title, keyword, or category.
    // Within a token check, matching against fields is OR-based.
    return searchTokens.every((token) => {
      return (
        title.includes(token) || 
        keywords.some(k => k.includes(token)) ||
        category.includes(token)
      );
    });
  });
};
