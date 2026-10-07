# Motion

Expressive: some motion runs as long as 500ms.

- Default to 150ms transitions (40% of measured ones).
- Ease with cubic-bezier(0.4, 0, 0.2, 1).
- Animate all, color, background-color, border-color; avoid animating layout.
- Respect prefers-reduced-motion.

## Measurements

- Durations: 150ms (40%), 300ms (22%), 500ms (19%), 200ms (18%)
- Easings: `cubic-bezier(0.4, 0, 0.2, 1)`, `cubic-bezier(0, 0, 0.2, 1)`
- Animated properties: all, color, background-color, border-color, outline-color, text-decoration-color, fill, stroke

## Keyframes in use

```css
@keyframes pulse { 
  50% { opacity: 0.5; }
}
```

```css
@keyframes ping { 
  75%, 100% { opacity: 0; transform: scale(2); }
}
```

Always respect `prefers-reduced-motion: reduce`.
