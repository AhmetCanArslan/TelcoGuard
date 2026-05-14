FROM golang:1.23-alpine
WORKDIR /app
COPY go.mod go.sum ./
ENV GOTOOLCHAIN=local
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOTOOLCHAIN=local go build -ldflags="-s -w" -o simulator main.go
EXPOSE 3001
CMD ["./simulator"]
