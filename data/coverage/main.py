import requests
import time
import os
import psycopg2

def get_url(exchange, api_key):
    url = f'https://eodhistoricaldata.com/api/exchange-symbol-list/{exchange}?api_token={api_key}&fmt=json'
    return url

def build_query_equity(values, source):
    base = "insert into api_coverage(country_name, name, currency, ticker, security_type, asset_class, exchange) VALUES "
    for value in values:
        name = value["Name"].replace("'", "''")
        base += f'(\'{value["Country"]}\',\'{name}\',\'{value["Currency"]}\', \'{value["Code"]}.{source}\', \'equity\', \'equity\', \'{value["Exchange"]}\'),'
    return base[:-1] + ";"

def build_query_fund(values, source):
    base = "insert into api_coverage(country_name, name, currency, ticker, security_type, asset_class) VALUES "
    for value in values:
        name = value["Name"].replace("'", "''")
        base += f'(\'{value["Country"]}\',\'{name}\',\'{value["Currency"]}\', \'{value["Code"]}.{source}\', \'fund\', \'fund\'),'
    return base[:-1] + ";"

sources = ['US', 'LSE', 'EUFUND', 'V', 'NEO', 'FUND', 'BE', 'HM', 'XETRA', 'DU', 'F', 'HA', 'STU', 'MU', 'LU', 'VI', 'PA', 'BR', 'AS', 'VX', 'MC', 'SW', 'IR', 'AU']

if __name__ == "__main__":
    conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PWD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
    )
    cur = conn.cursor()

    key = os.getenv("EOD_TOKEN")
    for source in sources:
        url = get_url(source, key)
        r = requests.get(url)
        print(source)
        json = r.json()
        chunked_json = []
        for i in range(0, len(json), 1000):
            chunked_json.append(json[i: i+1000])

        time.sleep(3)
        if not json:
            continue
        if source == "EUFUND":
            for chunk in chunked_json:
                query = build_query_fund(chunk, source)
                cur.execute(query)
        else:
            for chunk in chunked_json:
                query = build_query_equity(chunk, source)
                cur.execute(query)
        conn.commit()

    
