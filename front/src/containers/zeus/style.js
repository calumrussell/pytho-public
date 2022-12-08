import {
  createGlobalStyle,
} from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  html{
    line-height: 1.15;
    --default-text-color: #bebebe;
    --alt-text-color: #989898;
    --disabled-text-color: #606060;

    --default-background-color: #282828;
    --alt-background-color: #383838;
    --off-background-color: #404040;
    --highlight-background-color: #b8b8b8;
    --img-background-color: #1e1e1e;

    --small-text-size: '0.8rem';

    --default-font: "Open Sans";

    scrollbar-width: thin;
    scrollbar-color: var(--default-background-color) var(--default-text-color);

    &::-webkit-scrollbar {
      width: 1rem;
    }

    &::-webkit-scrollbar-track {
      background: var(--default-background-color);
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--off-background-color);
      border-radius: 20px;
      border: 3px solid var(--default-background-color);
    }

  }

  table {

    &::-webkit-scrollbar {
      height: 0.75rem;
    }

    &::-webkit-scrollbar-track {
      background: var(--default-background-color);
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--off-background-color);
      border-radius: 20px;
      border: 3px solid var(--default-background-color);
    }
  }

  body {
   background-color: var(--default-background-color);
  }


`;
