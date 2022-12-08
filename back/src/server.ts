import { FastifyError } from "fastify"

const server = require('./app')({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
})

server.listen({ port: process.env.API_PORT, host: process.env.API_HOST }, (err: FastifyError) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
})
