import requests
import zipfile
import pandas as pd
import io
import psycopg2

class FFDat:
    def dat_to_df(self, csv, headers=None):
        remove_header = csv.splitlines()[self.header_size :]
        remove_last = remove_header[:-1]
        rejoined = io.StringIO("\n".join(remove_last))
        df = pd.read_csv(rejoined, header=0, names=headers, delim_whitespace=True)
        return df


class FFCsv:
    def csv_to_df(self, csv):
        annual_text = "Annual Factors: January-December"
        if annual_text in csv:
            split_data = csv.split(annual_text)
            csv = split_data[0]
        remove_header = csv.splitlines()[self.header_size :]
        remove_last = remove_header[:-1]
        rejoined = io.StringIO("\n".join(remove_last))
        df = pd.read_csv(rejoined)
        df.rename(columns={df.columns[0]: "period"}, inplace=True)
        return df


class FFRequest:
    __base = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"

    def get_files(self):
        file_names = self.z.namelist()
        return [self.z.read(i).decode() for i in file_names]

    def get_file(self):
        file_name = self.z.namelist()[self.file_loc]
        return self.z.read(file_name).decode()

    def init_zip(self):
        self.r = requests.get(FFRequest.__base + self.location)
        self.z = zipfile.ZipFile(io.BytesIO(self.r.content))
        return


class FlattenDf:
    def format_df(self, df):
        df["period"] = (
            (pd.to_datetime(df["period"], format=self.date_fmt)).astype(int) / 10**9
        ).astype(int)
        df.set_index("period", inplace=True)
        df = pd.DataFrame(df.unstack(level=-1))
        df.reset_index(inplace=True)
        df.rename(columns={df.columns[0]: "factor"}, inplace=True)
        df.rename(columns={df.columns[2]: "ret"}, inplace=True)
        df["name"] = self.name
        df["period_name"] = (
            df["name"].astype("str") + df["period"].astype("str") + df["factor"]
        )
        df.dropna(inplace=True)

        if df["ret"].dtype == object:
            df["ret"] = df["ret"].astype("str")
            df["ret"] = df.apply(lambda r: r["ret"].strip(), axis=1)
            df["ret"] = df["ret"].astype("float64")
        return df


class FlattenDfAppendName(FlattenDf):
    def format_df_with_suffix(self, df, suffix):
        df = self.format_df(df)
        df["name"] = self.name + "_" + suffix
        df["period_name"] = df["period_name"] + "_" + suffix
        return df


class FFCommonBuildAlgo:
    def build(self):
        self.init_zip()
        raw_csv = self.get_file()
        df = self.csv_to_df(raw_csv)
        self.df = self.format_df(df)
        return


class FF3FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ff3factormonthly"
    __location = "F-F_Research_Data_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FF3FactorMonthlyData.__name
        self.location = FF3FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 3
        self.date_fmt = "%Y%m"
        self.build()
        return


class FF5FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ff5factormonthly"
    __location = "F-F_Research_Data_5_Factors_2x3_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FF5FactorMonthlyData.__name
        self.location = FF5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 3
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFDeveloped5FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ffdeveloped5factormonthly"
    __location = "Developed_5_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFDeveloped5FactorMonthlyData.__name
        self.location = FFDeveloped5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFDevelopedExUs5FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ffdevelopedexus5factormonthly"
    __location = "Developed_ex_US_5_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFDevelopedExUs5FactorMonthlyData.__name
        self.location = FFDevelopedExUs5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFEuropean5FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ffeuropean5factormonthly"
    __location = "Europe_5_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFEuropean5FactorMonthlyData.__name
        self.location = FFEuropean5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFJapanese5FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ffjapanese5factormonthly"
    __location = "Japan_5_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFJapanese5FactorMonthlyData.__name
        self.location = FFJapanese5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFAsiaPacificExJapan5FactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffasiapacificexjapan5factormonthly"
    __location = "Asia_Pacific_ex_Japan_5_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFAsiaPacificExJapan5FactorMonthlyData.__name
        self.location = FFAsiaPacificExJapan5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFNorthAmerica5FactorMonthlyData(FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo):

    __name = "ffnorthamerica5factormonthly"
    __location = "North_America_5_Factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFNorthAmerica5FactorMonthlyData.__name
        self.location = FFNorthAmerica5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFDevelopedMomentumFactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffdevelopedmomentumfactormonthly"
    __location = "Developed_Mom_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFDevelopedMomentumFactorMonthlyData.__name
        self.location = FFDevelopedMomentumFactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFDevelopedExUsMomentumFactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffdevelopedexusmomentumfactormonthly"
    __location = "Developed_ex_US_Mom_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFDevelopedExUsMomentumFactorMonthlyData.__name
        self.location = FFDevelopedExUsMomentumFactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFEuropeanMomentumFactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffeuropeanmomentumfactormonthly"
    __location = "Europe_Mom_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFEuropeanMomentumFactorMonthlyData.__name
        self.location = FFEuropeanMomentumFactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFJapaneseMomentumFactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffjapanesemomentumfactormonthly"
    __location = "Japan_Mom_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFJapaneseMomentumFactorMonthlyData.__name
        self.location = FFJapaneseMomentumFactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFAsiaPacificExJapanMomentumFactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffasiapacificexjapanmomentumfactormonthly"
    __location = "Asia_Pacific_ex_Japan_Mom_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFAsiaPacificExJapanMomentumFactorMonthlyData.__name
        self.location = FFAsiaPacificExJapanMomentumFactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFNorthAmericaMomentumFactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffnorthamericamomentumfactormonthly"
    __location = "North_America_Mom_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFNorthAmericaMomentumFactorMonthlyData.__name
        self.location = FFNorthAmericaMomentumFactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFEmergingMarket5FactorMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffemergingmarket5factormonthly"
    __location = "Emerging_5_factors_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFEmergingMarket5FactorMonthlyData.__name
        self.location = FFEmergingMarket5FactorMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFEmergingMarketFactorMomentumMonthlyData(
    FFRequest, FFCsv, FlattenDf, FFCommonBuildAlgo
):

    __name = "ffemergingmarketmomentumfactormonthly"
    __location = "Emerging_MOM_Factor_CSV.zip"

    def __init__(self):
        super().__init__()
        self.name = FFEmergingMarketFactorMomentumMonthlyData.__name
        self.location = FFEmergingMarketFactorMomentumMonthlyData.__location
        self.file_loc = 0
        self.header_size = 6
        self.date_fmt = "%Y%m"
        self.build()
        return


class FFInternationalCountriesMonthlyData(FFRequest, FFDat, FlattenDfAppendName):

    """
    The formatting for this is terrible so we need to
    do a lot of extra work here
    """

    __name = "ffinternationalcountriesmonthly"
    __location = "F-F_International_Countries.zip"

    def __init__(self):
        super().__init__()
        self.name = FFInternationalCountriesMonthlyData.__name
        self.location = FFInternationalCountriesMonthlyData.__location
        self.header_size = 3
        self.date_fmt = "%Y%m"
        columns = [
            "period",
            "Mkt",
            "BE/MEHi",
            "BE/MELo",
            "E/PHi",
            "E/PLo",
            "CE/PHi",
            "CE/PLo",
            "YldHi",
            "YldLo",
            "YldZero",
        ]

        self.init_zip()
        df_buffer = []
        string = "     Value-Weight Local  Returns      All 4 Data Items Required"

        for i, j in enumerate(self.z.namelist()):
            self.file_loc = i
            raw_csv = self.get_file()
            filter_csv_buffer = []
            should_copy = False

            all_data = raw_csv.splitlines()
            for m, n in enumerate(all_data):
                if should_copy:
                    filter_csv_buffer.append(n)

                if not n:
                    if should_copy:
                        should_copy = False
                        break
                    else:
                        if all_data[m + 1] == string:
                            should_copy = True

            joined = "\n".join(filter_csv_buffer)
            df = self.dat_to_df(joined, headers=columns)
            df = self.format_df_with_suffix(df, j[:-4].strip())
            df_buffer.append(df)

        self.df = pd.concat(df_buffer)
        return

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

def insert_flow(o, conn):
    print(o)
    ff = o()
    d = ff.df.to_dict("records")
    with conn:
        with conn.cursor() as curs:
            for row in d:
                stmt = f"insert into ff_factors(factor, period, ret, name, period_name) values('{row['factor']}',{row['period']},{row['ret']},'{row['name']}','{row['period_name']}') on conflict(period_name) do nothing;" 
                curs.execute(stmt)
    return


if __name__ == "__main__":

    conn = psycopg2.connect(
        dbname="pytho",
        user="calum",
        password="2delEuhh5ykYJYEaNCXKkg",
        host="work",
        port=14102)
    [insert_flow(d, conn) for d in datasets]
