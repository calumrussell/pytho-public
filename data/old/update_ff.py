from api.models import FactorReturns

from helpers.prices.ff import (
    FF3FactorMonthlyData,
    FF5FactorMonthlyData,
    FFDeveloped5FactorMonthlyData,
    FFDevelopedExUs5FactorMonthlyData,
    FFEuropean5FactorMonthlyData,
    FFJapanese5FactorMonthlyData,
    FFAsiaPacificExJapan5FactorMonthlyData,
    FFNorthAmerica5FactorMonthlyData,
    FFDevelopedMomentumFactorMonthlyData,
    FFDevelopedExUsMomentumFactorMonthlyData,
    FFEuropeanMomentumFactorMonthlyData,
    FFJapaneseMomentumFactorMonthlyData,
    FFAsiaPacificExJapanMomentumFactorMonthlyData,
    FFNorthAmericaMomentumFactorMonthlyData,
    FFEmergingMarket5FactorMonthlyData,
    FFEmergingMarketFactorMomentumMonthlyData,
    FFInternationalCountriesMonthlyData,
)

from django.core.management.base import BaseCommand

from api.models import FactorReturns

datasets = [
    FF3FactorMonthlyData,
    FF5FactorMonthlyData,
    FFDeveloped5FactorMonthlyData,
    FFDevelopedExUs5FactorMonthlyData,
    FFEuropean5FactorMonthlyData,
    FFJapanese5FactorMonthlyData,
    FFAsiaPacificExJapan5FactorMonthlyData,
    FFNorthAmerica5FactorMonthlyData,
    FFDevelopedMomentumFactorMonthlyData,
    FFDevelopedExUsMomentumFactorMonthlyData,
    FFEuropeanMomentumFactorMonthlyData,
    FFJapaneseMomentumFactorMonthlyData,
    FFAsiaPacificExJapanMomentumFactorMonthlyData,
    FFNorthAmericaMomentumFactorMonthlyData,
    FFEmergingMarket5FactorMonthlyData,
    FFEmergingMarketFactorMomentumMonthlyData,
    FFInternationalCountriesMonthlyData,
]


def insert_flow(o):
    print(o)
    ff = o()
    d = ff.df.to_dict("records")
    frs = [FactorReturns(**i) for i in d]
    FactorReturns.objects.bulk_create(frs, ignore_conflicts=True)
    return


class Command(BaseCommand):
    def handle(self, *args, **options):
        [insert_flow(d) for d in datasets]
        return
