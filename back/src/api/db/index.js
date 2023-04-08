"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryBuilder = exports.db = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const pg_1 = require("pg");
const innerDB = (fastify, _opts, done) => {
    //Uses env by default
    const pool = new pg_1.Pool();
    const defaultHandler = (query, values) => {
        return pool.query(query, values);
    };
    fastify.decorate('db', pool);
    fastify.decorate('query', defaultHandler);
    done();
};
const db = (0, fastify_plugin_1.default)(innerDB);
exports.db = db;
const suggestIssuer = () => {
    return "select * from api_coverage where to_tsvector('english', issuer) @@ plainto_tsquery('english', $1) or to_tsvector('english', ticker) @@ plainto_tsquery('english', $1);";
};
const getIssuer = () => {
    return "select * from api_coverage where id=$1";
};
const getUser = () => {
    return "select * from api_user where user_key=$1";
};
const insertUser = () => {
    return "insert into api_user(user_key) values($1)";
};
const insertPortfolioByUser = () => {
    return "insert into api_userportfolio(user_key, name, portfolio) values($1, $2, $3)";
};
const getPortfolioByUser = () => {
    return "select * from api_userportfolio where user_key=$1";
};
const insertFinancialPlanByUser = () => {
    return "insert into api_userfinancialplan(user_key, name, plan) values($1, $2, $3)";
};
const getFinancialPlanByUser = () => {
    return "select * from api_userfinancialplan where user_key=$1";
};
const removeFinancialPlanByUser = () => {
    return "delete from api_userfinancialplan where user_key=$1 and name=$2";
};
const removePortfolioByUser = () => {
    return "delete from api_userportfolio where user_key=$1 and name=$2";
};
const queryBuilder = {
    suggestIssuer,
    getIssuer,
    getUser,
    insertUser,
    insertPortfolioByUser,
    getPortfolioByUser,
    removePortfolioByUser,
    insertFinancialPlanByUser,
    getFinancialPlanByUser,
    removeFinancialPlanByUser,
};
exports.queryBuilder = queryBuilder;
