from datetime import datetime
import io
import os
import time
import math
import requests
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError
import concurrent.futures

from api.models import SecIssuerId, SecFilingPaths, SecFormId


BASE_URL = "https://www.sec.gov/Archives/edgar/daily-index"

form_id_cache = {}
issuer_id_cache = {}


def url_builder(epoch):
    date_dt = datetime.fromtimestamp(epoch)
    quarter = math.ceil(date_dt.month / 3.0)
    date_dt_str = date_dt.strftime("%Y%m%d")
    return (
        BASE_URL
        + "/"
        + str(date_dt.year)
        + "/QTR"
        + str(quarter)
        + "/crawler."
        + str(date_dt_str)
        + ".idx"
    )


def line_parser(line):
    split_up = line.split(" ")
    vals = []
    temp_val = []
    count = 0
    for space in split_up:
        if space != "":
            temp_val.append(space)
            continue
        if len(temp_val) != 0 and count != 0:
            vals.append(temp_val)
            temp_val = []
            count = 0
        else:
            count += 1

    flatten = []
    for i in vals:
        if len(i) == 1:
            flatten.append(i[0])
        else:
            flatten.append(" ".join(i))
    return flatten


def run_date(epoch):
    time.sleep(1)
    url = url_builder(epoch)
    print(url)
    r = requests.get(
        url, stream=True, headers={"User-Agent": str(os.environ["SEC_USER_AGENT"])}
    )
    if r.status_code != 200:
        return

    contents = io.StringIO(r.content.decode()).readlines()
    info = contents[12:]
    to_insert = []
    for i in info:
        vals = line_parser(str(i))
        if len(vals) != 5:
            continue

        issuer = vals[0]
        form_type = vals[1]
        cik = vals[2]
        filing_date = int(datetime.strptime(vals[3], "%Y%m%d").timestamp())
        path = vals[4]
        if cik not in issuer_id_cache:
            SecIssuerId.objects.get_or_create(
                issuer_id=cik, defaults={"issuer_name": issuer}
            )
            issuer_id_cache[cik] = 1

        if form_type not in form_id_cache:
            form_id = SecFormId.objects.get_or_create(form_name=form_type)
            form_id_cache[form_type] = form_id
        else:
            form_id = form_id_cache[form_type]
        path_obj = SecFilingPaths(
            issuer_id=cik,
            form_id=form_id[0].form_id,
            date=filing_date,
            path=path,
        )
        to_insert.append(path_obj)
    return to_insert


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--week", help="Run over N weeks")
        parser.add_argument("--month", help="Run over N months")
        parser.add_argument("--year", help="Run over N years")

    def handle(self, *args, **options):
        seconds_in_day = 86400
        if options["week"]:
            end = int(datetime.now().timestamp())
            start = int(end - ((seconds_in_day * 7) * int(options["week"])))

        if options["month"]:
            end = int(datetime.now().timestamp())
            start = int(end - ((seconds_in_day * 30) * int(options["month"])))

        if options["year"]:
            end = int(datetime.now().timestamp())
            start = int(end - ((seconds_in_day * 365) * int(options["year"])))

        futs = []
        with concurrent.futures.ThreadPoolExecutor() as executor:
            for date_int in range(start, end, seconds_in_day):
                fut = executor.submit(run_date, date_int)
                futs.append(fut)

        for fut in concurrent.futures.as_completed(futs):
            to_insert = fut.result()
            SecFilingPaths.objects.bulk_create(to_insert, ignore_conflicts=True)
        return
