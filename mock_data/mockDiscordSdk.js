export const mockDiscordSdk = {
  instanceId: '123456789',
  // Mocking the ready promise
  ready: () => Promise.resolve(),

  // Mocking the subscribe/unsubscribe system
  subscribe: (event, callback) => {},
  unsubscribe: (event, callback) => {},

  commands: {
    // Mock Authorize
    authorize: async () => ({ code: 'mock_code' }),

    // Mock Authenticate
    authenticate: async () => ({
      access_token: 'mock_token',
      user: {
        id: '999999999',
        username: 'MockTester',
        avatar: null,
      },
      scopes: ['identify', 'guilds'],
      expires: 'never',
      application: { id: 'mock_app_id' }
    }),

    // Mock Participants
    getInstanceConnectedParticipants: async () => ({
      participants: [
        { id: '999999999', username: 'MockPlayer1' },
        { id: '111111111', username: 'MockPlayer2' }
      ]
    }),
  },
};