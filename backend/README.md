# Case1 - Go Fiber Backend Template

A complete backend system template built with Go Fiber, WebSocket support, and PostgreSQL ORM using GORM.

## Features

- ✅ **Go Fiber**: Fast and lightweight web framework
- ✅ **WebSocket**: Real-time bidirectional communication
- ✅ **GORM**: ORM for PostgreSQL database
- ✅ **User Management**: CRUD operations for users
- ✅ **Message System**: Message handling with user association
- ✅ **Error Handling**: Centralized error handler middleware
- ✅ **CORS Support**: Cross-Origin Resource Sharing enabled
- ✅ **Environment Configuration**: Flexible config via .env

## Project Structure

```
case1/
├── config/          # Configuration management
├── database/        # Database initialization and connection
├── handlers/        # Route handlers (HTTP & WebSocket)
├── middleware/      # Custom middleware (CORS, logging, etc.)
├── models/          # GORM models and database schemas
├── routes/          # Route definitions
├── websocket/       # WebSocket hub and client management
├── main.go          # Entry point
├── go.mod           # Module definition
├── .env.example     # Example environment variables
├── .gitignore       # Git ignore rules
└── README.md        # This file
```

## Prerequisites

- Go 1.22.2 or higher
- PostgreSQL database
- Git

## Setup

### 1. Install Dependencies

\`\`\`bash
go mod download
\`\`\`

### 2. Configure Environment

Copy \`.env.example\` to \`.env\` and configure your database:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env`:
\`\`\`
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=case1_db
DB_SSLMODE=disable

SERVER_PORT=3000
SERVER_HOST=0.0.0.0

ENV=development
\`\`\`

### 3. Create Database

\`\`\`bash
createdb case1_db
\`\`\`

### 4. Run the Server

\`\`\`bash
go run main.go
\`\`\`

The server will start on `http://0.0.0.0:3000`

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Users
- **POST** `/api/users` - Create a new user
- **GET** `/api/users` - List all users
- **GET** `/api/users/:id` - Get user by ID
- **PUT** `/api/users/:id` - Update user
- **DELETE** `/api/users/:id` - Delete user

### Messages
- **POST** `/api/messages` - Create a message
- **GET** `/api/messages/user/:user_id` - Get messages for a user
- **DELETE** `/api/messages/:id` - Delete a message

### WebSocket
- **GET** `/ws` - WebSocket connection endpoint

## WebSocket Usage

Connect to the WebSocket endpoint:

\`\`\`javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'message', content: 'Hello' }));
};

ws.onmessage = (event) => {
  console.log('Received:', event.data);
};

ws.onerror = (error) => {
  console.error('Error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
\`\`\`

## Example Requests

### Create User
\`\`\`bash
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }'
\`\`\`

### Get All Users
\`\`\`bash
curl http://localhost:3000/api/users
\`\`\`

### Create Message
\`\`\`bash
curl -X POST http://localhost:3000/api/messages \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": 1,
    "content": "Hello World!"
  }'
\`\`\`

## Build for Production

\`\`\`bash
go build -o case1
./case1
\`\`\`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | password |
| DB_NAME | Database name | case1_db |
| DB_SSLMODE | SSL mode | disable |
| SERVER_PORT | Server port | 3000 |
| SERVER_HOST | Server host | 0.0.0.0 |
| ENV | Environment (development/production) | development |

## Next Steps

You can extend this template by:

1. **Authentication**: Add JWT or session-based authentication
2. **Validation**: Implement input validation with libraries like `validator`
3. **Testing**: Add unit and integration tests
4. **Logging**: Enhance logging with structured logging
5. **Caching**: Add Redis caching layer
6. **Rate Limiting**: Implement rate limiting middleware
7. **Deployment**: Configure Docker and deploy to production

## License

MIT

## Support

For issues or questions, create an issue in the repository.
