import psycopg2
import json

conn = psycopg2.connect(
    dbname="pytho",
    user="calum",
    password="2delEuhh5ykYJYEaNCXKkg",
    host="work",
    port=14102)

with open('world_bond.json', 'r') as f:
    line = f.read()
    bonds = json.loads(line)

for bond in bonds:
    stmt = f"insert into jst_world_bond(year,real,nom) values({bond['year']},{bond['real']},{bond['nom']});"
    with conn:
        with conn.cursor() as curs:
            try:
                curs.execute(stmt)
            except Exception:
                continue

with open('world_equity.json', 'r') as f:
    line = f.read()
    equity = json.loads(line)

for equity in equity:
    stmt = f"insert into jst_world_equity(year,real,nom) values({equity['year']},{equity['real']},{equity['nom']});"
    with conn:
        with conn.cursor() as curs:
            try:
                curs.execute(stmt)
            except Exception:
                continue
