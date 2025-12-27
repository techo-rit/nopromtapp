import type { Template } from "../types";

export const searchTemplates = (query: string, templates: Template[]): Template[] => {
  const cleanQuery = query.trim().toLowerCase();
  
  if (!cleanQuery) return [];

  // Split query into tokens (e.g., "wedding suit" -> ["wedding", "suit"])
  const searchTokens = cleanQuery.split(/\s+/);

  return templates.filter((template) => {
    const title = template.name.toLowerCase();
    const keywords = (template.keywords || []).map(k => k.toLowerCase());
    const category = template.stackId.toLowerCase();

    // OR Logic: Returns true if ANY token matches title, keywords, or category
    // For stricter search (AND logic), change .some() to .every()
    return searchTokens.every((token) => {
      return (
        title.includes(token) || 
        keywords.some(k => k.includes(token)) ||
        category.includes(token)
      );
    });
  });
};