##Taken from commands
from typing import TypedDict, List
from bs4 import BeautifulSoup as bs
from bs4.element import ResultSet
import requests
from datetime import datetime
import re
import os

from api.models import SecFilingPaths


class Position(TypedDict):
    title: str
    cusip: str
    value: int
    shares: int
    shares_type: str


class ThirteenFFetcher:
    def _fetch_primary(self):
        path = self.filing_path_obj.path
        url = f"https://sec.report/Document/{path}/primary_doc.xml"
        if not self.quiet:
            print(f"Requesting 13F Primary: {url}")
        r = self.client.get(url, headers=self.headers)
        soup = bs(r.text, "lxml")
        period_date_raw_date = soup.find("periodofreport").string
        date_fmt = "%m-%d-%Y"
        self.period_date = int(
            datetime.strptime(period_date_raw_date, date_fmt).timestamp()
        )
        return

    def _fetch_positions(self):
        if not self.quiet:
            print(f"Requesting 13F Data: {self.data_link}")
        r = self.client.get(self.data_link, headers=self.headers)
        self.data = r.text
        return

    def _fetch_document(self):
        ##This is a default as a safeguard, it will probably still fail if we can't
        ##find a link below
        self.data_link = (
            f"https://sec.report/Document/{self.filing_path_obj.path}/infotable.xml"
        )
        path = self.filing_path_obj.path
        url = f"https://sec.report/Document/{path}"
        if not self.quiet:
            print(f"Requesting 13F Document: {url}")
        r = self.client.get(url, headers=self.headers)
        self.document = bs(r.text, "html.parser")
        files = self.document.find("div", text=re.compile("Additional Files"))
        additional_rows = files.find_next_sibling("div").find_all("tr")
        for row in additional_rows:
            val = row.find("td")
            if not val:
                continue
            else:
                href = val.find("a")["href"]
                if href[-3:] == "xml":
                    self.data_link = href
        return

    def __init__(self, filing_path_obj: SecFilingPaths, quiet: bool = False):
        self.quiet = quiet
        self.issuer_id = filing_path_obj.issuer_id
        self.filing_date = filing_path_obj.date
        self.filing_path_obj = filing_path_obj
        self.client = requests.Session()
        self.headers = {"User-Agent": str(os.environ["SEC_USER_AGENT"])}
        self._fetch_document()
        self._fetch_primary()
        self._fetch_positions()


class ThirteenFParser:
    def _parse(self):
        self.positions: List[Position] = []
        for info_table in self.info_tables:
            position = Position(
                title=info_table.find(self.title_str).string,
                cusip=info_table.find(self.cusip_str).string,
                value=int(info_table.find(self.value_str).string),
                shares=int(info_table.find(self.shares_str).string),
                shares_type=info_table.find(self.shares_type_str).string,
            )
            self.positions.append(position)
        return

    def __init__(self, fetcher):
        self.fetcher = fetcher
        self.xml = bs(fetcher.data, "lxml")
        if self.xml.find("ns1:informationtable"):
            self.info_table_str = "ns1:infotable"
            self.title_str = "ns1:titleofclass"
            self.cusip_str = "ns1:cusip"
            self.value_str = "ns1:value"
            self.shares_str = "ns1:sshprnamt"
            self.shares_type_str = "ns1:sshprnamttype"
        else:
            self.info_table_str = "infotable"
            self.title_str = "titleofclass"
            self.cusip_str = "cusip"
            self.value_str = "value"
            self.shares_str = "sshprnamt"
            self.shares_type_str = "sshprnamttype"

        self.info_tables: ResultSet = self.xml.find_all(self.info_table_str)
        self._parse()

    def get_positions(self) -> List[Position]:
        return self.positions

    def get_filing_date(self) -> int:
        return self.fetcher.filing_date

    def get_period_date(self) -> int:
        return self.fetcher.period_date

    def get_issuer_id(self) -> int:
        return self.fetcher.issuer_id


##Taken from helpers
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

###Taken from commands
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
 
