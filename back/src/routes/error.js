"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorSchema = void 0;
exports.errorSchema = {
    '4XX': {
        type: 'object',
        required: ['statusCode', 'message'],
        properties: {
            statusCode: {
                type: 'number',
            },
            error: {
                type: 'string',
            },
            message: {
                type: 'string',
            }
        }
    }
};
