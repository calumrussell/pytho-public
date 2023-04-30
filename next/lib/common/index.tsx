import React, { useState } from "react";
import styled from "styled-components";

import { useMessage } from "@Components/reducers/message";

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

interface IconProps extends React.SVGProps<SVGSVGElement> {
  onClick(event: React.MouseEvent<SVGSVGElement>): void;
  height?: string;
  width?: string;
  value?: string;
}

export const PlusIcon = (props: IconProps) => {
  const height = props.height ? props.height : "1.25rem";
  const width = props.width ? props.width : "1.25rem";
  return (
    <svg
      {...props}
      height={height}
      width={width}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 448 512"
    >
      <path
        shapeRendering="crispEdges"
        fill="currentColor"
        // eslint-disable-next-line
        d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"
      ></path>
    </svg>
  );
};

export const MinusIcon = (props: IconProps) => {
  const height = props.height ? props.height : "1.25rem";
  const width = props.width ? props.width : "1.25rem";
  return (
    <svg
      {...props}
      height={height}
      width={width}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 448 512"
    >
      <path
        shapeRendering="crispEdges"
        fill="currentColor"
        // eslint-disable-next-line
        d="M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"
      ></path>
    </svg>
  );
};

export const BarChartIcon = (props: IconProps) => {
  const height = props.height ? props.height : "1.25rem";
  const width = props.width ? props.width : "1.25rem";
  return (
    <svg
      {...props}
      height={height}
      width={width}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        // eslint-disable-next-line
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
};

export const CancelIcon = (props: IconProps) => {
  const height = props.height ? props.height : "1.25rem";
  const width = props.width ? props.width : "1.25rem";
  return (
    <svg
      {...props}
      height={height}
      width={width}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 512 512"
    >
      <path
        fill="currentColor"
        // eslint-disable-next-line
        d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z"
      ></path>
    </svg>
  );
};

export const BaseMessage = styled.div`
  position: fixed;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 0.5rem;
  font-size: 1rem;
`;

export const MessageSuccess = styled(BaseMessage)`
  background: #4e937a;
  color: white;
`;

export const MessageError = styled(BaseMessage)`
  background: #b4656f;
  color: white;
`;

export const Message = () => {
  const { state } = useMessage();
  const { message, messageType } = state;

  if (!message) return null;
  if (messageType == "SUCCESS") {
    return <MessageSuccess>{message}</MessageSuccess>;
  } else if (messageType == "ERROR") {
    return <MessageError>{message}</MessageError>;
  } else {
    return null;
  }
};

interface ButtonOptions {
  icon?: boolean;
  noMargin?: boolean;
  success?: boolean;
  disabled?: boolean;
  onClick(event: React.MouseEvent<HTMLButtonElement>): void;
}

const ButtonInner = styled.button`
  cursor: pointer;
  padding: ${(props: ButtonOptions) =>
    props.icon ? "0.25rem 0.25rem" : "0.5rem 1rem"};
  margin: ${(props: ButtonOptions) => (props.noMargin ? "0" : "0.5rem 0")};
  margin-right: 0.25rem;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 1rem;
  background: none;
  outline: ${(props: ButtonOptions) => (props.success ? "none" : "initial")};
  color: ${(props: ButtonOptions) =>
    props.disabled
      ? "var(--disabled-text-color)"
      : "var(--default-text-color)"};
  background-color: var(--alt-background-color);
  border: none;
  };
`;

interface ButtonProps extends ButtonOptions {
  children: React.ReactNode;
}

export const Button = (props: ButtonProps) => (
  <ButtonInner {...props}>{props.children}</ButtonInner>
);

interface RenderIfProps {
  cond: boolean;
  children: React.ReactNode;
}

export const RenderIf = ({ cond, children }: RenderIfProps) => {
  return cond ? <>{children}</> : null;
};

interface TitleOptions {
  number?: boolean;
  align?: string;
  light?: boolean;
}

const TitleInner = styled.span`
  text-align: ${(props: TitleOptions) =>
    props.number ? "right" : props.align ? props.align : "justify"};
  font-size: 0.9rem;
  color: ${(props: TitleOptions) =>
    props.light ? "var(--alt-text-color)" : "var(--default-text-color)"};
`;

interface TitleProps extends TitleOptions {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Title = (props: TitleProps) => {
  return <TitleInner {...props}>{props.children}</TitleInner>;
};

interface TextOptions {
  italic?: boolean;
  align?: string;
  number?: boolean;
  focus?: boolean;
  small?: boolean;
  highlight?: boolean;
  margin?: string;
  light?: boolean;
}

export const Text = styled.p`
  font-style: ${(props: TextOptions) => (props.italic ? "italic" : "normal")};
  text-align: ${(props: TextOptions) =>
    props.align ? props.align : props.number ? "right" : "justify"};
  font-size: ${(props: TextOptions) =>
    props.highlight
      ? "1.4rem"
      : props.focus
      ? "1.1rem"
      : props.small
      ? "0.75rem"
      : "0.9rem"};
  line-height: ${(props: TextOptions) => (props.highlight ? "1.15" : "1.75")};
  color: ${(props: TextOptions) =>
    props.light ? "var(--alt-text-color)" : "var(--default-text-color)"};
  margin: ${(props: TextOptions) =>
    props.highlight ? "0.1rem 0" : props.margin ? props.margin : "initial"};
`;

export const ClickableText = styled(Text)`
  text-decoration: underline;
  cursor: pointer;
`;

interface ClickableTextHighlightBannerWrapperProps {
  selected: boolean;
}

const ClickableTextHighlightBannerWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${({
    selected,
  }: ClickableTextHighlightBannerWrapperProps) =>
    selected ? "var(--alt-background-color)" : "transparent"};
  padding: 0.5rem 1rem;
  > * {
    &:last-child {
      display: flex;
    }
    &:last-child > p {
      padding-right: 0.5rem;
    }
  }
`;

const ClickableTextHighlightBannerWrapperLeft = styled.div`
  display: flex;
  align-items: center;
  > * {
    &:first-child {
      padding-right: 0.5rem;
    }
    &:nth-child(2) {
      padding-right: 0.25rem;
    }
  }
`;

interface ClickableTextHighlightBannerProps {
  name: string;
  pos: number;
  key: number;
  selected: boolean;
  children: React.ReactNode;
}

export const ClickableTextHighlightBanner = ({
  name,
  pos,
  selected,
  children,
}: ClickableTextHighlightBannerProps) => {
  return (
    <ClickableTextHighlightBannerWrapper selected={selected}>
      <ClickableTextHighlightBannerWrapperLeft>
        <Text light>{pos + 1}.</Text>
        <Text>{name}</Text>
      </ClickableTextHighlightBannerWrapperLeft>
      {children}
    </ClickableTextHighlightBannerWrapper>
  );
};

interface NumberWithTitleProps {
  title: string;
  number: string;
  hasPercentage?: boolean;
}

export const NumberWithTitle = ({
  title,
  number,
  hasPercentage,
}: NumberWithTitleProps) => {
  const cellStyle = {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
  };

  return (
    <div
      style={{
        margin: "0.25rem 0.5rem 0 0",
        width: "100px",
      }}
    >
      <Title style={cellStyle} light>
        {title}
      </Title>
      <span style={cellStyle}>
        <Text number highlight>
          {number}
        </Text>
        {!hasPercentage || (
          <Text light margin={"0"}>
            %
          </Text>
        )}
      </span>
    </div>
  );
};

interface NullableProps {
  condition: boolean;
  children: React.ReactNode;
}

export const Nullable = ({ condition, children }: NullableProps) => {
  if (condition) {
    return <>{children}</>;
  }
  return null;
};

const roundNumber = (n: number): number => Math.round(n * 100) / 100;
export const strConverterCurr = (curr: number) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    maximumSignificantDigits: 3,
    currency: "GBP",
  }).format(curr);
};
export const dateConverter = (epoch: number) =>
  new Date(epoch * 1000).toLocaleDateString("en-GB");
export const strConverterMult = (scalar: number): string =>
  roundNumber(scalar * 100).toFixed(2);
export const strConverter = (scalar: number): string =>
  roundNumber(scalar).toFixed(2);
export const annualiseDailyRet = (daily: number): number =>
  Math.pow(1 + daily / 100, 252) - 1;
export const annualiseMonthlyRet = (monthly: number): number =>
  Math.pow(1 + monthly / 100, 12) - 1;
export const getCssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name);

const MultiSelectWrapper = styled.div``;

const MultiSelectRow = styled.div`
  display: flex;
  justify-content: space-evenly;
`;

interface MultiSelectOptionProps {
  focused: boolean;
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
    props.focused ? "var(--alt-background-color)" : "transparent"};
`;

interface MultiSelectOptionWrapperProps {
  height: string;
}

const MultiSelectOptionWrapper = styled.div`
  height: ${(props: MultiSelectOptionWrapperProps) => props.height};
`;

export interface MultiSelectProps {
  titles: Array<string>;
  children: React.ReactNode;
  // Should be the height of the largest element so the element
  // doesn't bump around the UI, in css format {number}px/rem/em
  height?: string;
}

export const MultiSelect = ({ titles, children, height }: MultiSelectProps) => {
  const [pos, setPos] = useState(0);
  const contents = React.Children.toArray(children);

  const clickHandler = (key: number) => {
    setPos(key);
  };

  return (
    <MultiSelectWrapper>
      <MultiSelectRow>
        {titles.map((title, key) => {
          return (
            <MultiSelectOption
              focused={key === pos}
              key={key}
              onClick={() => clickHandler(key)}
            >
              <Text light>{title}</Text>
            </MultiSelectOption>
          );
        })}
      </MultiSelectRow>
      <DoubleHorizontalSpacer>
        <MultiSelectOptionWrapper height={height ? height : "initial"}>
          {React.Children.map(contents, (child, idx) => {
            if (idx === pos) {
              return child;
            }
          })}
        </MultiSelectOptionWrapper>
      </DoubleHorizontalSpacer>
    </MultiSelectWrapper>
  );
};

export namespace AntevortaTypes {
  export enum ScheduleType {
    EndOfMonth = "EndOfMonth",
  }

  export interface Schedule {
    schedule_type: ScheduleType;
  }

  export enum FlowType {
    Employment = "Employment",
    EmploymentPAYE = "EmploymentPAYE",
    EmploymentStaticGrowth = "EmploymentStaticGrowth",
    EmploymentPAYEStaticGrowth = "EmploymentPAYEStaticGrowth",
    Rental = "Rental",
    Expense = "Expense",
    PctOfIncomeExpense = "PctOfIncomeExpense",
    InflationLinkedExpense = "InflationLinkedExpense",
  }

  export interface Flow {
    flow_type: FlowType;
    // Currently hardcoded to zero
    person: number;
    value?: number;
    static_growth?: number;
    pct?: number;
    // This is hardcoded to EndOfMonth
    schedule: Schedule;
  }

  export enum StackType {
    Isa = "Isa",
    Sipp = "Sipp",
    Gia = "Gia",
    Mortgage = "Mortgage",
  }

  export interface Stack {
    stack_type: StackType;
    person: number;
    value: number;
    rate?: number;
    term?: number;
    fix_length?: number;
  }

  export const isPlanStackEqualType = (
    existing: Array<Stack>,
    cand: Stack
  ): number => {
    let count = 0;
    for (const plan of existing) {
      if (plan.stack_type === cand.stack_type) {
        return count;
      }
      count++;
    }
    return -1;
  };

  // Only support A
  export enum NicGroups {
    A = "A",
  }

  // Use snake_case because this will go directly into Python
  export interface FinancialPlan {
    flows: Array<Flow>;
    stacks: Array<Stack>;
    nic: NicGroups;
    contribution_pct: number;
    emergency_cash_min: number;
    starting_cash: number;
    lifetime_pension_contributions: number;
  }

  export interface AntevortaRequestInput {
    runs: number;
    //Gets converted to string before it is send to back-end
    sim_config: AntevortaTypes.FinancialPlan;
    sim_length: number;
    assets: Array<number>;
    weights: Array<number>;
    inflation_mu: number;
    inflation_var: number;
    start_date: number;
  }

  export interface AntevortaStandardSimulationOutput {
    cash: Array<number>;
    gross_income: Array<number>;
    net_income: Array<number>;
    expense: Array<number>;
    tax_paid: Array<number>;
    sipp_contributions: Array<number>;
    ret: number;
    cagr: number;
    vol: number;
    mdd: number;
    sharpe: number;
    values: Array<number>;
    returns: Array<number>;
    returns_dates: Array<number>;
    investment_cash_flows: Array<number>;
    first_date: number;
    last_date: number;
    dd_start_date: number;
    dd_end_date: number;
    best_return: number;
    worst_return: number;
    frequency: string;
  }

  export interface AntevortaRequestOutput {
    runs: number;
    sim_length: number;
    results: Array<AntevortaStandardSimulationOutput>;
    sample_start: number;
    sample_end: number;
  }
}

export namespace AthenaTypes {
  export interface CoreResult {
    regression: {
      coefs: Array<number>;
      errors: Array<number>;
    };
    avgs: Array<number>;
  }

  export interface RollingResult {
    regressions: {
      coefs: Array<Array<number>>;
      errors: Array<Array<number>>;
    };
    dates: Array<number>;
  }

  export interface Security {
    id: number;
    name: string;
  }

  export interface Independents {
    [key: number]: Security;
  }

  export interface ModelResults {
    core: CoreResult;
    rolling: RollingResult;
  }
}

export namespace PortfolioTypes {
  export interface Security {
    id: number;
    name: string;
  }

  export interface Portfolio {
    assets: Array<Security>;
    weights: Array<number>;
  }

  export interface PortfolioWrapper {
    name: string;
    portfolio: Portfolio;
  }
}

export namespace Operations {
  export const transpose = (matrix: Array<Array<number>>) => {
    return matrix[0].map((col, i) => matrix.map((row) => row[i]));
  };

  export const average = (values: Array<number>) => {
    return values.reduce((prev, curr) => prev + curr, 0) / values.length;
  };
}

export namespace Request {
  const standardHandler = async (res: Response) => {
    if (res.ok) {
      return res;
    } else {
      let errContent = await res.json();
      throw Error(errContent);
    }
  };

  export const get = async (
    url: string,
    controller?: AbortController
  ): Promise<Response> => {
    if (controller) {
      return fetch(url, { signal: controller.signal }).then(standardHandler);
    }
    return fetch(url).then(standardHandler);
  };

  export const remove = async (url: string): Promise<Response> => {
    const request = {
      method: "DELETE",
    };
    return fetch(url, request).then(standardHandler);
  };

  export const post = async (url: string, data: object): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json",
    };

    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    };

    return fetch(url, request).then(standardHandler);
  };
}

export interface None {
  _tag: "None";
}

export interface Some<T> {
  _tag: "Some";
  readonly value: T;
}

export type Option<T> = None | Some<T>;

export function none(): None {
  return { _tag: "None" };
}

export function some<T>(value: T): Some<T> {
  return { _tag: "Some", value };
}

export namespace EodSource {
  const baseUrl = "https://eodhistoricaldata.com/api";

  const request = async (path: string): Promise<Response> => {
    return fetch(path);
  };

  export interface Row {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjusted_close: number;
    volume: number;
  }

  export const getPriceFlat = async (
    ticker: string
  ): Promise<Option<Array<Row>>> => {
    const url = `${baseUrl}/eod/${ticker}?api_token=${process.env.EOD_TOKEN}&fmt=json`;
    try {
      const res = await request(url);
      const json = await res.json();
      return some(json);
    } catch (e) {
      console.log(e);
      return none();
    }
  };

  export const getPricesFlat = async (
    tickers: Array<string>
  ): Promise<Option<Array<Array<Row>>>> => {
    try {
      const requests = await Promise.all(
        tickers.map((ticker) => getPriceFlat(ticker))
      );

      const values = requests.map((r) => {
        if (r._tag === "None") {
          throw Error();
        } else {
          return r.value;
        }
      });
      return some(values);
    } catch (e) {
      console.log(e);
      return none();
    }
  };
}
