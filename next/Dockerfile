FROM node:18

WORKDIR /app
COPY . .
RUN yarn install
ENV NEXT_TELEMETRY_DISABLED 1

RUN apt install curl
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="${PATH}:/root/.cargo/bin"
RUN cargo install wasm-pack
RUN yarn run build
RUN yarn prisma migrate dev

EXPOSE 3000

ENV PORT 3000
CMD ["yarn", "run", "start"]
