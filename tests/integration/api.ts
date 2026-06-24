import { setBaseUrl } from '../../client/src/utils/backend';

export class TestApi {
  constructor(private readonly baseUrl: string, private readonly instanceId: string) {
    setBaseUrl(baseUrl);
  }

  async setupSession(players: any[], state: string, extraData = {}) {
    return await fetch(`${this.baseUrl}/api/test/setup-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: this.instanceId,
        registeredUsers: players,
        hostId: players[0].id,
        state,
        ...extraData
      })
    });
  }
}