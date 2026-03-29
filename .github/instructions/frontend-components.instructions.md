---
description: >
  Frontend component conventions and design quality standards for React/TypeScript/Tailwind files.
  Applied automatically when editing feature components. Includes aesthetic guidelines.
applyTo: "web/features/**/*.tsx"
---

# Frontend Component Conventions

When editing React components in `web/features/`:

- **No external state management**: No Redux, Zustand, Jotai. State flows from `App.tsx` via props.
- **Styling**: Use Tailwind CSS classes. Dark theme uses `bg-black`, `bg-zinc-900`, `text-white` patterns.
- **Component structure**: Feature components live in `web/features/<domain>/`. Shared UI in `web/shared/ui/`. Hooks in `web/shared/hooks/`.
- **Types**: All interfaces defined in `web/types/index.ts`. Import from there.
- **Services**: API calls go in service files (`*Service.ts`), not in components.
- **State management**: Props from `App.tsx` for global state. Local `useState`/`useEffect` for component state.
- **No infinite loops**: Never update a state variable that triggers an effect which updates the same variable.

# Frontend Design Quality Standards

Always apply these design principles when creating or modifying UI components:

## Design Thinking
Before coding UI, commit to a clear aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Choose a clear direction — brutally minimal, luxury/refined, playful, editorial, soft/pastel, etc.
- **Differentiation**: What makes this memorable? What will someone remember?

Execute the chosen direction with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

## Aesthetics Guidelines
- **Typography**: Choose distinctive, beautiful fonts. NEVER use generic fonts (Arial, Inter, Roboto, system fonts). Pair a display font with a refined body font.
- **Color & Theme**: Commit to a cohesive palette. Use CSS variables. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for micro-interactions. Focus on high-impact moments — staggered page load reveals, scroll-triggered effects, surprising hover states. Prefer CSS-only solutions.
- **Spatial Composition**: Use unexpected layouts. Asymmetry, overlap, diagonal flow, grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Details**: Create atmosphere and depth. Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, grain overlays.

## Anti-Patterns (NEVER)
- Generic AI aesthetics: overused fonts (Inter, Roboto), cliched purple gradients on white, predictable layouts
- Cookie-cutter component patterns that lack context-specific character
- Converging on the same "safe" choices across different components

Match implementation complexity to the vision. Maximalist = elaborate code. Minimalist = restraint and precision.
