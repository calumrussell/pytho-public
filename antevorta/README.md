Input that the simulation engine has to cover

```
  //Main definition
  {
    "starting_cash": float,
    "nic_group": A | etc.
    "lifetime_pension_contributions": float, 
    "emergency_cash_min": float,
    "contribution_pct": float,
    "flows": array[Flow],
    "stacks": array[Stack],
  }

  //Flow definition
  {
    "type": Employment | EmploymentPAYE | Rental | PctOfIncomeExpense | Expense | InflationLinkedExpense,
    "person": number, identifies person for tax calcs,
    "value": number,
    "static_growth": float | empty, annual growth,
  }

  //Stack
  {
    "type": Mortgage | ISA | SIPP | GIA,
    "value": number,
    "person": number, identifies person for tax calcs,
    "rate": number, above overnight interbank rate, Mortgage
    "term: number, only for Mortgage,
    "fix_length": number, only if rate_type | Floating 
  }
```
