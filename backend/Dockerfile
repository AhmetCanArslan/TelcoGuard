# Multi-stage Dockerfile for Go Fiber application

# Stage 1: Build
FROM golang:1.22.2-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
ENV GOTOOLCHAIN=local
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOTOOLCHAIN=local GOOS=linux go build -a -installsuffix cgo -o case1 main.go

# Stage 2: Runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates postgresql-client

WORKDIR /root/

COPY --from=builder /app/case1 .
COPY .env.example .env

EXPOSE 3000

CMD ["./case1"]
