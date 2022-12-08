export const errorSchema = {
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
