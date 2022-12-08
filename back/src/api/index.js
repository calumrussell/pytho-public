"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Issuer = exports.User = exports.EodSource = void 0;
const https_1 = __importDefault(require("https"));
var crypto = require("crypto");
const db_1 = require("./db");
const common_1 = require("../common");
const baseUrl = "https://eodhistoricaldata.com/api";
const request = async (path) => {
    return new Promise((resolve, reject) => {
        let raw = "";
        https_1.default.get(path, (resp) => {
            resp.on('data', (chunk) => raw += chunk);
            resp.on('end', () => resolve(raw));
        }).on('error', (e) => {
            console.log(e);
            return reject();
        });
    });
};
var EodSource;
(function (EodSource) {
    let Frequency;
    (function (Frequency) {
        Frequency[Frequency["Daily"] = 0] = "Daily";
        Frequency[Frequency["Monthly"] = 1] = "Monthly";
    })(Frequency || (Frequency = {}));
    ;
    ;
    ;
    EodSource.TableBuilder = (input, freq) => {
        const getDates = () => [...input.keys()];
        const getAdjustedClose = () => {
            let res = new Map();
            input.forEach((value, key) => {
                let close = value.map(v => v.adjusted_close);
                res.set(key, close);
            });
            return res;
        };
        const getFirstDate = () => getDates().slice(0, 1)[0];
        const getLastDate = () => getDates().slice(-1)[0];
        const getDate = (date) => input.has(date) ? (0, common_1.some)(input.get(date)) : (0, common_1.none)();
        const getReturns = () => {
            let res = new Map();
            const close = getAdjustedClose();
            const dates = [...close.keys()];
            const values = [...close.values()];
            for (let i = 1; i < values.length; i++) {
                const last = values[i - 1];
                const rets = values[i].map((price, j) => {
                    return ((price / last[j]) - 1) * 100;
                });
                res.set(dates[i], rets);
            }
            return res;
        };
        const toMonthly = () => {
            if (freq == 1) {
                throw Error("Already Monthly frequency");
            }
            const dates = getDates();
            const monthEndDates = [];
            const test = [];
            const existingHash = new Map();
            dates.forEach((date, i) => {
                const dateObj = new Date(date * 1000);
                const month = dateObj.getMonth();
                const year = dateObj.getFullYear();
                const key = `${month}/${year}`;
                if (!existingHash.has(key)) {
                    const lastDate = new Date(dates[i - 1] * 1000);
                    const epoch = lastDate.getTime() / 1000;
                    test.push(lastDate);
                    monthEndDates.push(epoch);
                    existingHash.set(key, 0);
                }
            });
            const monthly = new Map();
            monthEndDates.forEach((date) => {
                const row = getDate(date);
                if (row._tag === "Some") {
                    monthly.set(date, row.value);
                }
            });
            return EodSource.TableBuilder(monthly, 1);
        };
        const convertToRolling = (period) => {
            let keys = [...input.keys()];
            let values = [...input.values()];
            let pos = 0;
            let res = [];
            values.forEach((_val, i) => {
                if (pos > period) {
                    let wind = values.slice(i - period, i);
                    let dates = wind.map(d => d[0].date);
                    let table = new Map();
                    dates.forEach((date, i) => {
                        table.set(Date.parse(date) / 1000, wind[i]);
                    });
                    res.push(EodSource.TableBuilder(table, 0));
                }
                pos++;
            });
            return res;
        };
        return {
            _internal: input,
            freq,
            getAdjustedClose,
            getFirstDate,
            getLastDate,
            getDates,
            //It is impossible for getDate to return undefined
            /* @ts-ignore */
            getDate,
            getReturns,
            toMonthly,
            convertToRolling,
        };
    };
    EodSource.TablesBuilder = (input) => {
        const length = input.length;
        const getFirstAndLastDate = () => {
            let firstDates = input.map(i => i.getFirstDate());
            let lastDates = input.map(i => i.getLastDate());
            return [Math.max(...firstDates), Math.min(...lastDates)];
        };
        const mergeOnDate = (freq) => {
            const [firstDate, lastDate] = getFirstAndLastDate();
            const datesIntersect = input.map(i => i.getDates())
                .reduce((a, c) => a.filter(i => c.includes(i)));
            let mergedData = new Map();
            datesIntersect.map(date => {
                if (date > firstDate && date < lastDate) {
                    let rows = input.map(i => {
                        let row = i.getDate(date);
                        //Can't fail
                        if (row._tag === "Some") {
                            return row.value;
                        }
                    }).flat();
                    mergedData.set(date, rows);
                }
            });
            return EodSource.TableBuilder(mergedData, freq);
        };
        const mergeOnSource = (assets) => {
            let mergedData = new Map();
            assets.forEach((asset, i) => {
                mergedData.set(asset, input[i]);
            });
            return mergedData;
        };
        const getOverlappingDates = () => {
            let dates = undefined;
            input.forEach((result) => {
                if (dates === undefined) {
                    dates = new Set(result.getDates());
                }
                else {
                    const newSet = new Set(result.getDates());
                    dates = new Set([...newSet, ...dates]);
                }
            });
            if (dates === undefined) {
                return (0, common_1.none)();
            }
            else {
                return (0, common_1.some)(Array.from(dates));
            }
        };
        return {
            length,
            _internal: input,
            mergeOnDate,
            mergeOnSource,
            getOverlappingDates,
        };
    };
    EodSource.getPrice = async (ticker) => {
        const url = `${baseUrl}/eod/${ticker}?api_token=${process.env.EOD_TOKEN}&fmt=json`;
        try {
            const res = await request(url);
            let ret = new Map();
            for (let row of JSON.parse(res)) {
                ret.set(Date.parse(row.date) / 1000, [row]);
            }
            return (0, common_1.some)(EodSource.TableBuilder(ret, 0));
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
    EodSource.getPrices = async (tickers) => {
        try {
            const requests = await Promise.all(tickers.map(ticker => EodSource.getPrice(ticker)));
            const values = requests.map(r => {
                if (r._tag === "None") {
                    throw Error();
                }
                else {
                    return r.value;
                }
            });
            return (0, common_1.some)(EodSource.TablesBuilder(values));
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
})(EodSource = exports.EodSource || (exports.EodSource = {}));
var User;
(function (User) {
    ;
    User.getUser = async (fastify, user_key) => {
        try {
            const { rows } = await fastify.query(db_1.queryBuilder.getUser(), [user_key]);
            if (rows.length === 0) {
                return (0, common_1.none)();
            }
            else {
                return (0, common_1.some)(rows[0]);
            }
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
    User.insertUser = async (fastify) => {
        try {
            const user_key = crypto.randomBytes(15).toString('hex');
            const _res = await fastify.query(db_1.queryBuilder.insertUser(), [user_key]);
            return user_key;
        }
        catch (e) {
            console.log(e);
            return false;
        }
    };
})(User = exports.User || (exports.User = {}));
var Issuer;
(function (Issuer) {
    ;
    Issuer.getIssuer = async (fastify, id) => {
        try {
            const { rows } = await fastify.query(db_1.queryBuilder.getIssuer(), [id]);
            if (rows.length === 0) {
                return (0, common_1.none)();
            }
            else {
                return (0, common_1.some)(rows[0]);
            }
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
    //This needs it's own SQL query, we don't need to perform parallel queries
    Issuer.getIssuers = async (fastify, ids) => {
        try {
            const requests = await Promise.all(ids.map(id => Issuer.getIssuer(fastify, id)));
            const values = requests.map(r => {
                if (r._tag === "None") {
                    throw Error();
                }
                else {
                    return r.value;
                }
            });
            return (0, common_1.some)(values);
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
    Issuer.suggestIssuer = async (fastify, suggest) => {
        try {
            let formattedString = `%${suggest.toLowerCase()}%`;
            const { rows } = await fastify.query(db_1.queryBuilder.suggestIssuer(), [formattedString]);
            return (0, common_1.some)(rows);
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
})(Issuer = exports.Issuer || (exports.Issuer = {}));
