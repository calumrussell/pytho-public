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
    ;
    EodSource.getPriceFlat = async (ticker) => {
        const url = `${baseUrl}/eod/${ticker}?api_token=${process.env.EOD_TOKEN}&fmt=json`;
        try {
            const res = await request(url);
            return (0, common_1.some)(JSON.parse(res));
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
    EodSource.getPricesFlat = async (tickers) => {
        try {
            const requests = await Promise.all(tickers.map(ticker => EodSource.getPriceFlat(ticker)));
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
            const { rows } = await fastify.query(db_1.queryBuilder.suggestIssuer(), [suggest]);
            return (0, common_1.some)(rows);
        }
        catch (e) {
            console.log(e);
            return (0, common_1.none)();
        }
    };
})(Issuer = exports.Issuer || (exports.Issuer = {}));
