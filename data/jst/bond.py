import warnings
warnings.filterwarnings("ignore")

import json
import pandas as pd
pd.set_option('display.float_format', lambda x: '%.5f' % x)

df = pd.read_csv('./test.txt', sep='\t')
years = df['year'].unique()

df['inflation'] = df['cpi'].pct_change()

start = 100
rets = []
for year in years:
    if year == 1923:
        continue

    rows = df.loc[df['year'] == year]
    take = rows[['country', 'year', 'rgdpmad', 'pop', 'bond_tr', 'inflation']]
    take['gdp'] = take['rgdpmad'] * take['pop']
    take['gdp_sum'] = float(take['gdp'].sum())
    take['gdp_share'] = take['gdp'] / take['gdp_sum']
    take['gdp_weight_real'] = (take['bond_tr']-take['inflation']) * take['gdp_share']
    take['gdp_weight_nom'] = (take['bond_tr']) * take['gdp_share']

    test = take['gdp_weight_real'].sum()
    test1 = take['gdp_weight_nom'].sum()
    data = {"year": int(year), "real": float(test), "nom": float(test1)}
    rets.append(data)

with open('world_bond.json', 'w') as f:
    f.write(json.dumps(rets))
