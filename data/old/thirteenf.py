import sqlite3
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError

from api.models import SecFilingPaths, SecThirteenFFiling, SecThirteenFPosition
from helpers.sec.thirteenf import ThirteenFFetcher, ThirteenFParser


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("lookback", nargs="?", type=int)

    def handle(self, *args, **options):
        self.future_date = (
            datetime.now() - timedelta(days=options["lookback"])
        ).timestamp()
        paths = SecFilingPaths.objects.filter(date__gte=int(self.future_date)).filter(
            form_id=83
        )
        for path in paths:
            fetcher = ThirteenFFetcher(path)
            parser = ThirteenFParser(fetcher)
            issuer_id = parser.get_issuer_id()
            filing_date = parser.get_filing_date()
            period_date = parser.get_period_date()
            positions = parser.get_positions()
            if not positions:
                continue
            total_value = sum([i["value"] for i in positions])
            if total_value < (10_000_000 / 1_000):
                continue

            filing_obj = SecThirteenFFiling(
                issuer_id=issuer_id, filing_date=filing_date, period_date=period_date
            )
            try:
                filing_obj.save()
            except sqlite3.IntegrityError:
                ##If object is already in database
                continue
            except IntegrityError:
                ##If object is already in database
                continue

            res = []
            for position in positions:
                position_obj = SecThirteenFPosition(
                    thirteenf_id=filing_obj.id,
                    cusip=position["cusip"],
                    shares=position["shares"],
                    value=position["value"],
                )
                res.append(position_obj)
            SecThirteenFPosition.objects.bulk_create(res, ignore_conflicts=True)
        return
