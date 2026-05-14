.PHONY: help install run build clean test docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install       - Download dependencies"
	@echo "  make run           - Run the application"
	@echo "  make build         - Build the application"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make test          - Run tests"
	@echo "  make docker-up     - Start Docker containers"
	@echo "  make docker-down   - Stop Docker containers"
	@echo "  make docker-logs   - View Docker logs"
	@echo "  make tidy          - Tidy go modules"

install:
	go mod download
	go mod tidy

run:
	go run main.go

build:
	CGO_ENABLED=1 go build -o case1 main.go

clean:
	rm -f case1
	go clean

test:
	go test ./...

tidy:
	go mod tidy

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f app

docker-rebuild:
	docker-compose up -d --build

dev: install run

.DEFAULT_GOAL := help
