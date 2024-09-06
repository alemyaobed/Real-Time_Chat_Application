# Real-Time Chat Application

## Overview

This is a real-time chat application built with Node.js, Express.js, and MongoDB. It utilizes WebSockets for real-time messaging and Redis for message caching. The application also includes user authentication with JWT, Docker for containerization, and Jenkins for continuous deployment to AWS EC2.

## Features

- **Real-Time Messaging**: Leverages WebSockets for instant communication between users.
- **User Authentication**: Secured with JWT and bcrypt for password hashing.
- **Message Caching**: Utilizes Redis to cache messages for improved performance.
- **Containerization**: Docker is used for building and running the application in containers.
- **Continuous Deployment**: Integrated with Jenkins for automated deployment to AWS EC2.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-Time Communication**: WebSockets
- **Caching**: Redis
- **Authentication**: JWT, bcrypt
- **Containerization**: Docker
- **Continuous Deployment**: Jenkins, AWS EC2

## Installation

### Prerequisites

- Node.js
- Docker (optional for local development)
- Redis (optional for local development)

### Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/alemyaobed/Real-Time_Chat_Application.git
   cd Real-Time_Chat_Application
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the root directory and add the following environment variables:

   ```env
   MONGO_URI=mongodb://localhost:27017/chatapp
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_jwt_secret
   ```

4. **Run the Application**

   For local development:

   ```bash
   npm start
   ```

   For Docker:

   ```bash
   docker build -t real-time-chat-app .
   docker run -p 3000:3000 real-time-chat-app
   ```

## Usage

1. **Registration**

   POST `/api/auth/register` - Register a new user.

   ```json
   {
     "username": "user1",
     "password": "password123"
   }
   ```

2. **Login**

   POST `/api/auth/login` - Log in and receive a JWT token.

   ```json
   {
     "username": "user1",
     "password": "password123"
   }
   ```

   Include the token in the `Authorization` header for protected routes.

3. **WebSocket Communication**

   Connect to the WebSocket server at `ws://localhost:3000`. Send and receive messages in real-time.

## Docker

To build and run the Docker container:

```bash
docker build -t real-time-chat-app .
docker run -p 3000:3000 real-time-chat-app
```

## Continuous Deployment with Jenkins

Jenkins pipeline configuration is available in the `jenkins/Jenkinsfile`. Ensure Jenkins is set up to use this pipeline for automated builds and deployments.

## Deployment

Deploy the Docker container to an AWS EC2 instance using Jenkins. Refer to the Jenkins documentation for setting up continuous deployment pipelines.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or support, please reach out to [EMAIL](mailto:alemyaobed@gmail.com).
