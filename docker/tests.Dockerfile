FROM node:22-alpine AS sol-tests-runner
LABEL description="This Docker image compiles the Solidity contracts and runs the tests"

WORKDIR /multiversx
COPY . .

RUN apk update && apk add jq

RUN cp -u .env.example .env

RUN yarn install
RUN yarn compile
RUN yarn test
