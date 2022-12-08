import React, {
  useState,
} from 'react';
import axios from 'axios';
import styled from 'styled-components';

import {
  useMessage,
} from '@Components/reducers/message';

// Page>Section>Component
// When we are down to the level of Component, the
// component itself is responsible for the positioning.

// This wraps the whole page under the header and footer
// Empty now but included if changes needed later
export const PageWrapper = styled.div``;

// This wraps a discrete section of the page that needs to be
// organized seperately from another section
// Not nested, designing for limited horizontal space so would
// lead to pyramid look if we nested and then added spacing later
// Empty now but included if changes needed later
export const SectionWrapper = styled.div`
  margin: 1rem 0;
`;

// This wraps elements within sections that need to be
// organized seperately from other components within
// that section.
export const ComponentWrapper = styled.div`
  padding: 0.5rem 0;
`;

export const DefaultHorizontalSpacer = styled.div`
  padding: 0rem 0.5rem;
`;

export const DoubleHorizontalSpacer = styled.div`
  padding: 0rem 1rem;
`;

// Generic wrapper that can be used to space objects within a
// component
export const PanelWrapper = styled(DefaultHorizontalSpacer)`
  margin: 0.5rem 0;
`;

export const BaseMessage = styled.div`
  position: fixed;
  top: 1rem;
  width: 100%;
  box-sizing: border-box;
  margin 1rem 0;
  padding: 0.5rem;
  font-size: 1rem;
`;

export const MessageSuccess = styled(BaseMessage)`
  background: #4E937A;
  color: white;
`;

export const MessageError = styled(BaseMessage)`
  background: #B4656F;
  color: white;
`;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  onClick(event: React.MouseEvent<SVGSVGElement>): void;
  height?: string;
  width?: string;
}

export const PlusIcon = (props: IconProps) => {
  const height = props.height? props.height: '1.25rem';
  const width = props.width? props.width: '1.25rem';
  return (
    <svg
      { ...props }
      height={ height }
      width={ width }
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 448 512">
      <path
        shapeRendering="crispEdges"
        fill="currentColor"
        // eslint-disable-next-line
        d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z">
      </path>
    </svg>
  );
};

export const MinusIcon = (props: IconProps) => {
  const height = props.height? props.height: '1.25rem';
  const width = props.width? props.width: '1.25rem';
  return (
    <svg
      { ...props }
      height={ height }
      width={ width }
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 448 512">
      <path
        shapeRendering="crispEdges"
        fill="currentColor"
        // eslint-disable-next-line
        d="M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z">
      </path>
    </svg>
  );
};

export const BarChartIcon = (props: IconProps) => {
  const height = props.height? props.height: '1.25rem';
  const width = props.width? props.width: '1.25rem';
  return (
    <svg
      { ...props }
      height={ height }
      width={ width }
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        // eslint-disable-next-line
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
};

export const CancelIcon = (props: IconProps) => {
  const height = props.height? props.height: '1.25rem';
  const width = props.width? props.width: '1.25rem';
  return (
    <svg
      { ...props }
      height={ height }
      width={ width }
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 512 512">
      <path
        fill="currentColor"
        // eslint-disable-next-line
        d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z">
      </path>
    </svg>
  );
};

export const Message = () => {
  const {
    state,
  } = useMessage();
  const {
    message,
    messageType,
  } = state;

  if (!message) return null;
  if (messageType == 'SUCCESS') {
    return (
      <MessageSuccess>
        {message}
      </MessageSuccess>
    );
  } else if (messageType == 'ERROR') {
    return (
      <MessageError>
        {message}
      </MessageError>
    );
  } else {
    return null;
  }
};

interface ButtonOptions {
  icon?: boolean,
  noMargin?: boolean,
  success?: boolean,
  disabled?: boolean,
  onClick(event: React.MouseEvent<HTMLButtonElement>): void,
}

const ButtonInner = styled.button`
  cursor: pointer;
  padding: ${(props: ButtonOptions) => props.icon ?
    '0.25rem 0.25rem' :
    '0.5rem 1rem'};
  margin: ${(props: ButtonOptions) => props.noMargin ?
    '0' :
    '0.5rem 0'};
  margin-right: 0.25rem;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 1rem;
  background: none;
  outline: ${(props: ButtonOptions) => props.success ?
    'none' :
    'initial'};
  color: ${(props: ButtonOptions) => props.disabled ?
    'var(--disabled-text-color)' :
    'var(--default-text-color)'};
  background-color: var(--alt-background-color);
  border: none;
  };
`;


interface ButtonProps extends ButtonOptions {
  children: React.ReactNode,
}

export const Button = (props: ButtonProps) => (
  <ButtonInner
    { ...props }>
    {props.children}
  </ButtonInner>
);

interface RenderIfProps {
  cond: boolean,
  children: React.ReactNode,
}

export const RenderIf = ({
  cond, children,
}: RenderIfProps) => {
  return (
    cond ? (
      <>
        {children}
      </>
    ) :
    null
  );
};

interface TitleOptions {
  number?: boolean,
  align?: string,
  light?: boolean,
}

const TitleInner = styled.span`
  text-align: ${(props: TitleOptions) => props.number ?
    'right' :
    props.align ?
    props.align :
    'justify'};
  font-size: 0.9rem;
  color: ${(props: TitleOptions) => props.light ?
    'var(--alt-text-color)' :
    'var(--default-text-color)'};
`;

interface TitleProps extends TitleOptions {
  children: React.ReactNode,
  style?: React.CSSProperties,
}

export const Title = (props: TitleProps) => {
  return (
    <TitleInner
      { ...props }>
      {props.children}
    </TitleInner>
  );
};

interface TextOptions {
  italic?: boolean,
  align?: string,
  number?: boolean,
  focus?: boolean,
  small?: boolean,
  highlight?: boolean,
  margin?: string,
  light?: boolean,
}

export const Text = styled.p`
  font-style: ${(props: TextOptions) => props.italic ?
      'italic':
      'normal'};
  text-align: ${(props: TextOptions) => props.align ?
      props.align :
      props.number ?
      'right':
      'justify'};
  font-size: ${(props: TextOptions) => props.highlight ?
     '1.4rem':
     props.focus ?
     '1.1rem' :
     props.small ?
     '0.75rem':
     '0.9rem'};
  line-height: ${(props: TextOptions) => props.highlight ? '1.15': '1.75'};
  color: ${(props: TextOptions) => props.light ?
    'var(--alt-text-color)' :
    'var(--default-text-color)'};
  margin: ${(props: TextOptions) => props.highlight ?
    '0.1rem 0' :
    props.margin ?
    props.margin :
    'initial'};
`;

export const ClickableText = styled(Text)`
  text-decoration: underline;
  cursor: pointer;
`;

interface NumberWithTitleProps {
  title: string,
  number: string,
  hasPercentage?: boolean,
}

export const NumberWithTitle = ({
  title, number, hasPercentage,
}: NumberWithTitleProps) => {
  const cellStyle = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  };

  return (
    <div
      style={
        {
          margin: '0.25rem 0.5rem 0 0',
          width: '100px',
        }
      }>
      <Title
        style={ cellStyle }
        light>
        {title}
      </Title>
      <span
        style={ cellStyle }>
        <Text
          number
          highlight>
          {number}
        </Text>
        {
          !hasPercentage || (
            <Text
              light
              margin={ '0' }>
              %
            </Text>
          )
        }
      </span>
    </div>
  );
};

interface NullableProps {
  condition: boolean,
  children: React.ReactNode,
}

export const Nullable = ({
  condition, children,
}: NullableProps) => {
  if (condition) {
    return (
      <>
        {children}
      </>
    );
  }
  return null;
};

const roundNumber = (n: number): number => Math.round(n * 100) / 100;
export const strConverterMult =
  (scalar: number): string => roundNumber(scalar*100).toFixed(2);
export const strConverter =
  (scalar: number): string => roundNumber(scalar).toFixed(2);
export const annualiseDailyRet =
  (daily: number): number => Math.pow(1+(daily/100), 252)-1;
export const annualiseMonthlyRet =
  (monthly: number): number => Math.pow(1+(monthly/100), 12)-1;
export const getCssVar = (name: string) =>
  getComputedStyle(document.documentElement)
      .getPropertyValue(name);

export const request = (url: string) => {
  const baseUrl = process.env.API_URL;

  const postRequest = (input: object | string) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config = {
      headers,
    };

    const requestUrl = baseUrl + url;
    return axios.post(requestUrl, input, config);
  };

  const getRequest = (abort?: AbortController) => {
    const requestUrl = baseUrl + url;
    if (abort) {
      const sigInput = {
        signal: abort.signal,
      };
      return axios.get(requestUrl, sigInput);
    }
    return axios.get(requestUrl);
  };

  const requestBuilder = {
    post: (input: object | string) => postRequest(input),
    get: (abort?: AbortController) => getRequest(abort),
  };

  return requestBuilder;
};

const MultiSelectWrapper = styled.div`
`;

const MultiSelectRow = styled.div`
  display: flex;
  justify-content: space-evenly;
`;

interface MultiSelectOptionProps {
  focused: boolean,
}

const MultiSelectOption = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 2.5rem;
  cursor: pointer;
  width: 100%;
  margin: 0 1rem;
  border-bottom: 1px solid var(--highlight-background-color);
  background-color: ${(props: MultiSelectOptionProps) =>
    props.focused ? 'var(--alt-background-color)': 'transparent'};
`;

interface MultiSelectOptionWrapperProps {
  height: string,
}

const MultiSelectOptionWrapper = styled.div`
  height: ${(props: MultiSelectOptionWrapperProps) =>
    props.height};
`;

export interface MultiSelectProps {
  titles: Array<string>,
  children: React.ReactNode,
  // Should be the height of the largest element so the element
  // doesn't bump around the UI, in css format {number}px/rem/em
  height: string,
}

export const MultiSelect = ({
  titles, children, height,
}: MultiSelectProps) => {
  const [
    pos,
    setPos,
  ] = useState(0);
  const contents = React.Children.toArray(children);

  const clickHandler = (key: number) => {
    setPos(key);
  };

  return (
    <MultiSelectWrapper>
      <MultiSelectRow>
        {
          titles.map((title, key) => {
            return (
              <MultiSelectOption
                focused={ key === pos }
                key={ key }
                onClick={ () => clickHandler(key) }>
                <Text
                  light>
                  {title}
                </Text>
              </MultiSelectOption>
            );
          })
        }
      </MultiSelectRow>
      <DoubleHorizontalSpacer>
        <MultiSelectOptionWrapper
          height={ height }>
          {
            React.Children.map(contents, (child, idx) => {
              if (idx === pos) {
                return child;
              }
            })
          }
        </MultiSelectOptionWrapper>
      </DoubleHorizontalSpacer>
    </MultiSelectWrapper>
  );
};
