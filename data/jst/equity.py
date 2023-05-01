import warnings
warnings.filterwarnings("ignore")

import json
import pandas as pd
pd.set_option('display.float_format', lambda x: '%.5f' % x)

##
##Aus m
##Bel m
##Can b
##Den b
##Fin m
##Fra b
##Ger b
##Ire m
##Ita b
##Jap t
##Nth m
##Nor m
##Por m
##Spa m
##Swe m
##Sui m
##Uk  b
##US  b

df = pd.read_csv('./test.txt', sep='\t')
years = df['year'].unique()

"""
filtered = df[(pd.notna(df['cpi'])) & (pd.notna(df['stir'])) & (pd.notna(df['housing_tr']))]
pick = filtered[['country', 'year', 'cpi', 'stir', 'housing_tr']]
pick['inflation'] = pick['cpi'].pct_change()
pick.dropna(inplace=True)
pick.set_index(['country','year'])
rates = pick.to_json(orient='records')
with open('core.json', 'w') as f:
    f.write(rates)
"""


df.loc[df['country'] == "Australia", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Belgium", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Finland", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Ireland", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Japan", 'gdp'] = df['gdp'] * 1000
df.loc[df['country'] == "Netherlands", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Norway", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Portugal", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Spain", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Sweden", 'gdp'] = df['gdp'] / 1000
df.loc[df['country'] == "Switzerland", 'gdp'] = df['gdp'] / 1000

df['usd_gdp'] = df['gdp'] * (1 / df['xrusd'])
df['inflation'] = df['cpi'].pct_change()

start = 100
rets = []
for year in years:
    if year == 1923:
        continue

    rows = df.loc[df['year'] == year]
    take = rows[['country', 'year', 'gdp', 'usd_gdp', 'xrusd', 'eq_tr', 'inflation']]
    take['gdp_sum'] = float(take['usd_gdp'].sum())
    take['gdp_share'] = take['usd_gdp'] / take['gdp_sum']
    take['gdp_weight_real'] = (take['eq_tr']-take['inflation']) * take['gdp_share']
    take['gdp_weight_nom'] = (take['eq_tr']) * take['gdp_share']

    test = take['gdp_weight_real'].sum()
    test1 = take['gdp_weight_nom'].sum()
    data = {"year": int(year), "real": float(test), "nom": float(test1)}
    rets.append(data)

with open('world.json', 'w') as f:
    f.write(json.dumps(rets))
