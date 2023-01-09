from django.core.management.base import BaseCommand

from api.models import Coverage

import investpy


def get_funds():
    fund_coverage_countries = [
        "united states",
        "united kingdom",
    ]
    cols = [
        "country",
        "name",
        "issuer",
        "currency",
        "symbol",
        "asset_class",
    ]
    res = []
    for country in fund_coverage_countries:
        for fund in investpy.funds.get_funds_dict(country, columns=cols):
            cov = Coverage(
                country_name=fund["country"],
                name=fund["name"],
                issuer=fund["issuer"],
                ticker=fund["symbol"],
                currency=fund["currency"],
                security_type="fund",
                asset_class=fund["asset_class"],
            )
            res.append(cov)
    return res


def get_stocks():
    stock_coverage_countries = [
        "united states",
        "united kingdom",
    ]
    cols = [
        "country",
        "name",
        "currency",
        "symbol",
    ]
    res = []
    for country in stock_coverage_countries:
        for stock in investpy.stocks.get_stocks_dict(country, columns=cols):
            cov = Coverage(
                country_name=stock["country"],
                name=stock["name"],
                issuer=None,
                ticker=stock["symbol"],
                currency=stock["currency"],
                security_type="stock",
                asset_class="equity",
            )
            res.append(cov)
    return res


def get_etfs():
    etf_coverage_countries = [
        "united states",
        "united kingdom",
    ]
    cols = [
        "country",
        "name",
        "currency",
        "symbol",
        "stock_exchange",
        "asset_class",
    ]
    res = []
    for country in etf_coverage_countries:
        for etf in investpy.etfs.get_etfs_dict(country, columns=cols):
            cov = Coverage(
                country_name=etf["country"],
                name=etf["name"],
                issuer=None,
                ticker=etf["symbol"],
                currency=etf["currency"],
                security_type="etf",
                exchange=etf["stock_exchange"],
                asset_class=etf["asset_class"],
            )
            res.append(cov)
    return res


def get_indicies():
    etf_coverage_countries = [
        "united states",
        "united kingdom",
    ]
    cols = [
        "country",
        "name",
        "currency",
        "symbol",
        "market",
    ]
    res = []
    for country in etf_coverage_countries:
        for index in investpy.indices.get_indices_dict(country, columns=cols):
            cov = Coverage(
                country_name=index["country"],
                name=index["name"],
                issuer=index["market"],
                ticker=index["symbol"],
                currency=index["currency"],
                security_type="index",
            )
            res.append(cov)
    return res


class Command(BaseCommand):
    def handle(self, *args, **options):
        res = []
        res.extend(get_funds())
        res.extend(get_stocks())
        res.extend(get_etfs())
        res.extend(get_indicies())
        remove_dup = {}

        for r in res:
            test = r.country_name + r.name + r.currency + r.ticker
            if test in remove_dup:
                continue
            else:
                remove_dup[test] = r

        Coverage.objects.bulk_create(list(remove_dup.values()), ignore_conflicts=True)
        return
