import type { Template } from "../../types";

const AVAILABLE_TEMPLATE_IDS = new Set([
  "aesthetics_template_9",  // Seaside Golden Hour
  "flex_template_10",       // Luxury Hotel Lounge
  "aesthetics_template_14", // Evening Gown Twilight
  "flex_template_6",        // Yacht Life
  "flex_template_1",        // Bugatti Coastal Drive
]);

export function isTemplateAvailable(template: Template): boolean {
  return template.stackId === "fitit" || AVAILABLE_TEMPLATE_IDS.has(template.id);
}

export function sortTemplatesByAvailability(templates: Template[]): Template[] {
  return templates
    .map((template, index) => ({ template, index }))
    .sort((a, b) => {
      const aAvailable = isTemplateAvailable(a.template);
      const bAvailable = isTemplateAvailable(b.template);
      if (aAvailable === bAvailable) return a.index - b.index;
      return aAvailable ? -1 : 1;
    })
    .map(({ template }) => template);
}
