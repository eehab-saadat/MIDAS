---
description: daisyUI 5 & Tailwind CSS 4 Standards
alwaysApply: true
applyTo: "**"
---

# AI Instructions: daisyUI 5 & Tailwind CSS 4 Standards

## Core Principles

**daisyUI First**: Always check for a daisyUI component before building a custom one. Use component classes (e.g., `btn`, `card`, `input`) as the base.

**Tailwind CSS 4 Syntax**: Follow the new CSS-first configuration. Do not generate or look for `tailwind.config.js`. Assume the project uses `@import "tailwindcss";` and `@plugin "daisyui";`.

**Strict Semantic Coloring**: To ensure light/dark theme consistency, never use fixed color scales (e.g., `bg-blue-500`, `text-slate-900`). Only use daisyUI semantic names:

- `primary`, `secondary`, `accent`, `neutral`
- `base-100`, `base-200`, `base-300` (for backgrounds/elevations)
- `info`, `success`, `warning`, `error`

Always use `*-content` classes for text on colored backgrounds (e.g., `text-primary-content` on `bg-primary`).

## Theming & Responsiveness

**Auto-Theming**: Do not use the `dark:` prefix. Use daisyUI semantic colors which swap automatically based on the theme.

**Theme Control**: When implementing theme switching, use the `theme-controller` component or apply `data-theme` to the `<html>` tag.

**Responsive Layouts**: Use Tailwind’s responsive prefixes (e.g., `md:`, `lg:`) for layouts. For daisyUI components, use specific responsive modifiers like `sm:alert-horizontal` or `lg:drawer-open`.

## Component Implementation Rules

- **Buttons**: Use `btn` with modifiers (e.g., `btn-primary`, `btn-sm`, `btn-outline`).
- **Forms**: Use `fieldset` with `fieldset-legend`. Always include the `validator` class and `validator-hint` for accessible error handling.
- **Modals**: Prioritize the native HTML `<dialog>` element with `onclick="id.showModal()"`.
- **Accordions**: Use the `collapse` component with `<input type="radio">` to ensure only one item opens at a time.
- **Images**: Use the `avatar` component for profile pictures and mask (e.g., `mask-squircle`) for consistent cropping.
- **Overriding**: If a utility class doesn't apply due to specificity, use the `!` modifier (e.g., `p-4!`). Use this sparingly.

## Example: Standards-Compliant Component

**Request**: "Create a login card with a dark/light compatible theme."

```html
<div class="card bg-base-100 w-96 shadow-xl border border-base-300">
  <div class="card-body">
    <h2 class="card-title text-primary">Login</h2>
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Email</legend>
      <input
        type="email"
        class="input validator w-full"
        placeholder="email@example.com"
        required
      />
      <p class="validator-hint">Please enter a valid email.</p>

      <legend class="fieldset-legend">Password</legend>
      <input type="password" class="input w-full" placeholder="••••••••" />

      <div class="card-actions justify-end mt-4">
        <button class="btn btn-primary">Login</button>
      </div>
    </fieldset>
  </div>
</div>
```

## Team-Specific Workflow

- **Images**: Use https://picsum.photos/ for placeholders.
- **Icons**: Assume the use of SVG icons (like Lucide or Heroicons) inside buttons and navs.
- **Code Style**: Keep HTML clean. Avoid deep nesting of custom wrappers; let daisyUI components handle the structure.

## Project Folder Structure (Next.js)

To maintain a scalable and organized codebase, always use the following folder structure inside the `frontend/` directory:

- `app/`: Next.js App Router pages, layouts, and global styles (`globals.css`).
- `components/`: React components.
  - `components/ui/`: Reusable, generic UI daisyUI wrappers (e.g., Buttons, Inputs, Cards).
  - `components/layout/`: Structural layout components (e.g., Navbar, Sidebar, Footer).
  - `components/features/`: Domain-specific components grouped by feature context.
- `lib/`: Utility functions, helper classes, API clients, and shared logic.
- `hooks/`: Custom reusable React hooks.
- `types/`: Shared TypeScript interfaces and utility types.
- `public/`: Static assets (images, fonts, raw icons).
