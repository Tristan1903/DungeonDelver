export interface SyncMessage {
  type: string;
  room: string;
  senderId: string;
  payload?: any;
  timestamp: number;
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type StateListener = (state: any, senderId: string) => void;
export type ChatListener = (msg: string, senderId: string) => void;
export type StatusListener = (status: SyncStatus) => void;
export type ProjectionListener = (projection: any) => void;
export type StateSyncListener = (state: any) => void;
export type PlayerEventListener = (payload: any) => void;
export type CharacterUpdateListener = (payload: any) => void;
export type JoinAckListener = (payload: any) => void;
export type DiceRollListener = (payload: any, senderId: string) => void;
export type ErrorListener = (error: string) => void;

const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 15000;

export class SyncClient {
  private ws: WebSocket | null = null;
  private room: string;
  private senderId: string;
  private url: string;
  private statusListeners: StatusListener[] = [];
  private stateListeners: StateListener[] = [];
  private chatListeners: ChatListener[] = [];
  private projectionListeners: ProjectionListener[] = [];
  private stateSyncListeners: StateSyncListener[] = [];
  private playerJoinedListeners: PlayerEventListener[] = [];
  private playerLeftListeners: PlayerEventListener[] = [];
  private dmDisconnectedListeners: (() => void)[] = [];
  private characterUpdateListeners: CharacterUpdateListener[] = [];
  private joinAckListeners: JoinAckListener[] = [];
  private diceRollListeners: DiceRollListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private status: SyncStatus = 'disconnected';
  private role: string | null = null;
  private characterId: string | null = null;

  constructor(url: string, room: string, senderId: string) {
    this.url = url;
    this.room = room;
    this.senderId = senderId;
  }

  connect() {
    if (this.ws) return;
    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.send({ type: 'join', room: this.room, senderId: this.senderId, timestamp: Date.now() });
      this.setStatus('connected');
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch {}
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.stopPing();
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.setStatus('error');
    };
  }

  disconnect() {
    this.stopReconnect();
    this.stopPing();
    if (this.ws) {
      this.send({ type: 'leave', room: this.room, senderId: this.senderId, timestamp: Date.now() });
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  sendState(state: any) {
    this.send({ type: 'state', room: this.room, senderId: this.senderId, payload: state, timestamp: Date.now() });
  }

  sendChat(msg: string) {
    this.send({ type: 'chat', room: this.room, senderId: this.senderId, payload: { text: msg }, timestamp: Date.now() });
  }

  sendDiceRoll(formula: string, result: number, label: string) {
    this.send({ type: 'dice_roll', room: this.room, senderId: this.senderId, payload: { formula, result, label }, timestamp: Date.now() });
  }

  onStatus(fn: StatusListener) { this.statusListeners.push(fn); return () => { this.statusListeners = this.statusListeners.filter(l => l !== fn); }; }
  onState(fn: StateListener) { this.stateListeners.push(fn); return () => { this.stateListeners = this.stateListeners.filter(l => l !== fn); }; }
  onChat(fn: ChatListener) { this.chatListeners.push(fn); return () => { this.chatListeners = this.chatListeners.filter(l => l !== fn); }; }

  onProjection(fn: ProjectionListener) { this.projectionListeners.push(fn); return () => { this.projectionListeners = this.projectionListeners.filter(l => l !== fn); }; }
  onStateSync(fn: StateSyncListener) { this.stateSyncListeners.push(fn); return () => { this.stateSyncListeners = this.stateSyncListeners.filter(l => l !== fn); }; }
  onPlayerJoined(fn: PlayerEventListener) { this.playerJoinedListeners.push(fn); return () => { this.playerJoinedListeners = this.playerJoinedListeners.filter(l => l !== fn); }; }
  onPlayerLeft(fn: PlayerEventListener) { this.playerLeftListeners.push(fn); return () => { this.playerLeftListeners = this.playerLeftListeners.filter(l => l !== fn); }; }
  onDmDisconnected(fn: () => void) { this.dmDisconnectedListeners.push(fn); return () => { this.dmDisconnectedListeners = this.dmDisconnectedListeners.filter(l => l !== fn); }; }
  onCharacterUpdate(fn: CharacterUpdateListener) { this.characterUpdateListeners.push(fn); return () => { this.characterUpdateListeners = this.characterUpdateListeners.filter(l => l !== fn); }; }
  onJoinAck(fn: JoinAckListener) { this.joinAckListeners.push(fn); return () => { this.joinAckListeners = this.joinAckListeners.filter(l => l !== fn); }; }
  onDiceRoll(fn: DiceRollListener) { this.diceRollListeners.push(fn); return () => { this.diceRollListeners = this.diceRollListeners.filter(l => l !== fn); }; }
  onError(fn: ErrorListener) { this.errorListeners.push(fn); return () => { this.errorListeners = this.errorListeners.filter(l => l !== fn); }; }

  getStatus() { return this.status; }
  getRole() { return this.role; }
  getCharacterId() { return this.characterId; }

  joinAsDm(password?: string) {
    this.send({ type: 'join', room: this.room, senderId: this.senderId, payload: { role: 'dm', password: password || '' }, timestamp: Date.now() });
  }

  joinAsPlayer(characterId: string, characterName?: string) {
    this.characterId = characterId || null;
    this.send({ type: 'join', room: this.room, senderId: this.senderId, payload: { role: 'player', characterId: characterId || '', characterName: characterName || '' }, timestamp: Date.now() });
  }

  joinWithoutCharacter(characterName?: string) {
    this.characterId = null;
    this.send({ type: 'join', room: this.room, senderId: this.senderId, payload: { role: 'player', characterId: '', characterName: characterName || 'Adventurer' }, timestamp: Date.now() });
  }

  publishState(state: any) {
    this.send({ type: 'state_publish', room: this.room, senderId: this.senderId, payload: state, timestamp: Date.now() });
  }

  project(contentType: string, content: any) {
    this.send({ type: 'project', room: this.room, senderId: this.senderId, payload: { contentType, content }, timestamp: Date.now() });
  }

  clearProjections() {
    this.send({ type: 'clear_projections', room: this.room, senderId: this.senderId, timestamp: Date.now() });
  }

  updateCharacter(characterId: string, data: any) {
    this.send({ type: 'character_update', room: this.room, senderId: this.senderId, payload: { characterId, data }, timestamp: Date.now() });
  }

  publishCharacters(characters: any[]) {
    this.send({ type: 'publish_characters', room: this.room, senderId: this.senderId, payload: { characters }, timestamp: Date.now() });
  }

  requestCharacters() {
    this.send({ type: 'request_characters', room: this.room, senderId: this.senderId, timestamp: Date.now() });
  }

  private send(msg: SyncMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: SyncMessage) {
    switch (msg.type) {
      case 'state':
        this.stateListeners.forEach(fn => fn(msg.payload, msg.senderId));
        break;
      case 'chat':
        this.chatListeners.forEach(fn => fn(msg.payload?.text || '', msg.senderId));
        break;
      case 'dice_roll':
        this.diceRollListeners.forEach(fn => fn(msg.payload, msg.senderId));
        break;
      case 'pong':
        break;
      case 'join_ack':
        if (msg.payload?.role) this.role = msg.payload.role;
        this.joinAckListeners.forEach(fn => fn(msg.payload));
        break;
      case 'state_sync':
        this.stateSyncListeners.forEach(fn => fn(msg.payload));
        break;
      case 'projection':
        this.projectionListeners.forEach(fn => fn(msg.payload));
        break;
      case 'projection_ack':
        this.projectionListeners.forEach(fn => fn(msg.payload));
        break;
      case 'projections_cleared':
        this.projectionListeners.forEach(fn => fn(null));
        break;
      case 'player_joined':
        this.playerJoinedListeners.forEach(fn => fn(msg.payload));
        break;
      case 'player_left':
        this.playerLeftListeners.forEach(fn => fn(msg.payload));
        break;
      case 'dm_disconnected':
        this.dmDisconnectedListeners.forEach(fn => fn());
        break;
      case 'character_updated':
        this.characterUpdateListeners.forEach(fn => fn(msg.payload));
        break;
      case 'character_update_ack':
        break;
      case 'character_list':
        this.stateListeners.forEach(fn => fn(msg.payload, msg.senderId));
        break;
      case 'publish_characters_ack':
        break;
      case 'error':
        this.errorListeners.forEach(fn => fn(msg.payload?.error || 'Unknown error'));
        break;
    }
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.statusListeners.forEach(fn => fn(s));
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping', room: this.room, senderId: this.senderId, timestamp: Date.now() });
    }, PING_INTERVAL);
  }

  private stopPing() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY);
  }

  private stopReconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }
}
