import React, { createContext, useContext } from "react";

import { AntevortaTypes, PortfolioTypes } from "@Common/index";
import type { api_userportfolio, api_userfinancialplan } from "@prisma/client";

interface FinancialPlanWrapper {
  name: string;
  plan: AntevortaTypes.FinancialPlan;
}

interface PortfolioWrapper {
  name: string;
  portfolio: PortfolioTypes.Portfolio;
}

interface UserState {
  userKey: string;
  plans: Array<api_userfinancialplan>;
  portfolios: Array<api_userportfolio>;
}

const initialState: UserState = {
  userKey: "",
  plans: [],
  portfolios: [],
};

const UserContext = createContext<UserState>(initialState);

interface UserProviderProps {
  userKey: string;
  plans: Array<api_userfinancialplan>;
  portfolios: Array<api_userportfolio>;
  children?: React.ReactNode;
}

export const UserProvider = ({
  userKey,
  plans,
  portfolios,
  children,
}: UserProviderProps) => {
  return (
    <UserContext.Provider value={{ userKey, plans, portfolios }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
