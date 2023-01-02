FROM rust:1.66

WORKDIR /app
COPY . ./
RUN cd ./lib/panacea && ls
RUN cd ./lib/panacea && cargo build && cargo install wasm-pack && wasm-pack build --target nodejs

FROM node:18

WORKDIR /app

COPY . /app
RUN yarn install
COPY --from=0 /app/lib/panacea /app/lib/panacea

CMD [ "yarn", "run", "start" ]
