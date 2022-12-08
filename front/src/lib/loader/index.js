import styled, {
  keyframes,
} from 'styled-components';

const clip = keyframes`
  0% {transform: rotate(0deg) scale(1)}
  50% {transform: rotate(180deg) scale(1)}
  100% {transform: rotate(360deg) scale(1)}
`;

export const Loader = styled.span`
  background: transparent !important;
  width: 2rem;
  height: 2rem;
  border-radius: 100%;
  border: 0.5rem solid;
  border-color: var(--default-text-color);
  border-bottom-color: transparent;
  display: inline-block;
  animation: ${clip} 1.5s 0s infinite linear;
  animation-fill-mode: both;
`;
