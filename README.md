# Discord Bot Platform

A web platform for hosting and managing Discord bots. This platform allows users to:

- Add and manage multiple Discord bots
- Create and edit slash commands and other interactions
- Write custom code for each interaction
- Deploy commands to Discord
- Handle bot interactions through a secure endpoint

## Features

- Discord OAuth2 authentication
- Multiple bot management
- Interactive code editor for bot interactions
- Slash command builder
- Secure interaction endpoints
- Real-time bot status monitoring

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3.Create a `.env` file with the following variables:

```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
SESSION_SECRET=your_session_secret
```

4.Build the project:

```bash
npm run build
```

5.Start the development server:

```bash
npm run start:dev
```

## Usage

1. Log in with your Discord account
2. Add a new bot by providing its ID and public key
3. Create slash commands and other interactions
4. Write custom code for each interaction
5. Deploy commands to Discord
6. Use the provided interaction endpoint URL in your Discord application

## Development

- `npm run build` - Build the project
- `npm run start:dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Security

- All bot interactions are validated using Discord's signature system
- User sessions are secured with express-session
- Bot tokens and sensitive data are never exposed to the client
- Custom code execution is sandboxed

## License

ISC
