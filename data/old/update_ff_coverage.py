from api.models import FactorReturns, Coverage
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **options):
        temp = set()
        for i in FactorReturns.objects.all():
            to_dict = i.__dict__
            name = to_dict["name"]
            factor = to_dict["factor"]
            combo = name + "-" + factor
            temp.add(combo)
        temp1 = []
        for t in temp:
            c = Coverage(
                country_name="international",
                name=t,
                issuer=None,
                currency=None,
                ticker=None,
                security_type="factor",
            )
            temp1.append(c)
        Coverage.objects.bulk_create(temp1)
        return
