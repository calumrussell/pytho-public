---
layout: post
title:  "How does our lifetime simulation work?"
date:   2022-09-16 20:01:27 +0100
excerpt: This post explains how our lifetime simulation module works.
slug: lifetime-simulation-explainer
---

To make better financial decisions, we need good information. But it is hard to make financial decisions when there are so many variables in play: tax, future returns, rebalancing strategies, emergency funds, etc. Our lifetime simulation aims to simplify all this.

As of writing, the simulation module is intended to model the value of the lump sum on retirement. It is possible to construct a retirement simulation taking the lump sum as the starting value but we have not modelled taxation or any technical aspects of that decision.

The first step is to initialise all the values that are constant over the simulation or are used as initial values. 

Most of this is self-explanatory but it is worth highlighting that contribution percentages are constant over the life of the simulation. This may be unexpected, but is a simplifying assumption and if you get insufficient balances at the end this is one important value to look at more closely.

The second step is to create income and expense flows. These flows are generated monthly spanning the period of the simulation.

The purpose of our simulation is to understand more about how our end values change, based on inputs. Our inputs are, therefore, not predictions of future income and expense but a starting point: we ask how our lump sum at retirement will be impacted if we reduce our expenses from 50% of income to 40$ given our current level of income, for example.

The third step initialises the various accounts and debts that incurred over a lifetime.

This is all self-explanatory. The rules that pertain to each of these accounts are fully modelled within the simulation. For example, the contribution limit for ISAs is respected when rebalancing cash between accounts.

The default mortgage offered has a fix period that will reset automatically at the market rate when the fix ends. Right now, the default payment strategy is to always pay the minimum amortization amount (we will add overpayment strategies soon).

The fourth step defines how the simulation runs: how long, and how many times. We offer multiple runs of the simulation to give you an idea of the variation in outcomes that you can expect based on the inputs that you have selected.

And the final step is the portfolio creation step. Right now, we mainly cover funds in the EU and the US, equities, ETFs, commodities, and bonds. The search function is still quite vague but this should cover most use-cases.

A question that may occur to you: if we have selected a portfolio, why is there any variation? Why does the simulation run more than once? Surely we select the portfolio, and that is that. To see why this doesn't happen, imagine that we run a 10-year simulation but our portfolio only contains securities that have existed for one year. How would this work?

When we run a simulation, we use a technique called block bootstrapping to randomize the inputs. We use real data, but we ranomdly sample chunks of returns from that real data. This means we can "create" as much data as we need to complete a simulation. If we have three years of returns, we just repeatedly sample from those three years until we have ten or twenty years of returns. This technique also provides a range of outcomes, we learn not only what the outcome would have been but what the range of outcomes would be given the data that we have.

There is a caveat to this though: if we are sampling from a very short period with no economic downturns, for example, then this technique will naturally overstate the worst outcomes. Statistical techniques exist to get around this, some of these have actually been deployed in our exposure analysis module, but we have not integrated them into this module yet. It is up to users to ask whether the inputs they are using are correct.

Once you run the simulation, you get the average total value of all investment accounts/cash across all your portfolio runs, and a histogram showing the distribution of these values. The purpose of this analysis is not necessarily to show you what the best outcome is, but help you understand the robustness of your strategy. You may have a simulation that produces a high average value, but if the distribution of values is very left-tail heavy that should indicate treating that strategy with caution.