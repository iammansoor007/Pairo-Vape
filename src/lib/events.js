import { EventEmitter } from 'events';
import AuditLog from '@/models/AuditLog';

// Singleton Event Emitter
class UVapeEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
    this.ready = false;
    
    // Automatically initialize listeners on server-side only
    if (typeof window === 'undefined') {
       this.initPromise = this._init();
    }
  }

  async _init() {
    try {
      const { initOrderListeners } = await import('./listeners/orderListeners');
      initOrderListeners();
      this.ready = true;
      console.log("=> Event System Ready");
    } catch (err) {
      console.error("Failed to init listeners:", err);
    }
  }

  // Enhanced emit with logging
  async dispatch(event, data) {
    try {
      // Wait for listeners to be ready if they are still initializing
      if (!this.ready && this.initPromise) {
          await this.initPromise;
      }

      console.log(`[Event Dispatched]: ${event}`, data.orderId || data.id || '');
      
      // Log event to DB for audit trail
      await AuditLog.create({
        event,
        referenceId: data.orderId || data.id,
        message: `Event ${event} triggered`,
        metadata: data
      }).catch(err => console.error("Failed to log event:", err));

      this.emit(event, data);
    } catch (err) {
      console.error(`Error dispatching event ${event}:`, err);
    }
  }
}

// Ensure singleton in development to prevent memory leaks during HMR
let uvapeEvents;

if (process.env.NODE_ENV === 'production') {
  uvapeEvents = new UVapeEventEmitter();
} else {
  if (!global.uvapeEvents) {
    global.uvapeEvents = new UVapeEventEmitter();
  }
  uvapeEvents = global.uvapeEvents;
}

export default uvapeEvents;
