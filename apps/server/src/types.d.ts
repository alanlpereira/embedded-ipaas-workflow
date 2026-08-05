declare module 'ws' {
  import { EventEmitter } from 'events';
  import { Server as HttpServer } from 'http';

  export class WebSocket extends EventEmitter {
    static OPEN: number;
    readyState: number;
    send(data: any): void;
    close(): void;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: { server?: HttpServer; port?: number; path?: string });
  }
}
