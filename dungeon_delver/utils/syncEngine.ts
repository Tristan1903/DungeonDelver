export interface SyncMessage {
  type: 'join' | 'leave' | 'state' | 'ping' | 'pong' | 'chat' | 'ack';
  room: string;
  senderId: string;
  payload?: any;
  timestamp: number;
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type StateListener = (state: any, senderId: string) => void;
export type ChatListener = (msg: string, senderId: string) => void;
export type StatusListener = (status: SyncStatus) => void;

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
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private status: SyncStatus = 'disconnected';

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

  onStatus(fn: StatusListener) { this.statusListeners.push(fn); return () => { this.statusListeners = this.statusListeners.filter(l => l !== fn); }; }
  onState(fn: StateListener) { this.stateListeners.push(fn); return () => { this.stateListeners = this.stateListeners.filter(l => l !== fn); }; }
  onChat(fn: ChatListener) { this.chatListeners.push(fn); return () => { this.chatListeners = this.chatListeners.filter(l => l !== fn); }; }

  getStatus() { return this.status; }

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
      case 'pong':
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
