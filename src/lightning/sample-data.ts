export const sampleCss = {
  mediaQueries: `@media (min-width: 990px) {
  .bg {
    background-color: red;
  }
}

.bg {
  background-color: green;
}

@media (max-width: 1290px) {
  .bg {
    background-color: blue;
  }
}

@media (min-width: 640px) {
  .bg {
    background-color: yellow;
  }
}`,
  panda: `@layer reset, base, tokens, recipes, utilities;

@import './reset.css';

@import './global.css';

@layer utilities {
  .p_25px {
    padding: 25px;
  }

  .hover\\:text_red\\.200:is(:hover, [data-hover]) {
    color: var(--colors-red-200);
  }
  .active\\:translate_0_3px:is(:active, [data-active]) {
    translate: 0 3px;
  }

  @media screen and (width >= 768px) {
    .md\\:gap_10 {
      gap: var(--spacing-10);
    }
  }
}

@layer recipes {
  .button--variant_danger {
    color: var(--colors-white);
    background-color: var(--colors-red-500);
  }

  .button--state_focused {
    color: green;
  }

  @layer _base {
    .button {
      font-size: var(--font-sizes-lg);
    }
  }
}`,
}
