export interface CrossTabMessage {
  type: string;
  data: any;
  sender: string;
  timestamp: number;
}

export interface TabElection {
  tabId: string;
  timestamp: number;
}

export class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private isLeader = false;
  private tabId: string;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private leaderTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastHeartbeat = 0;
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private readonly LEADER_TIMEOUT = 10000; // 10 seconds

  constructor() {
    this.tabId = this.generateTabId();
  }

  async initialize() {
    // Check browser support for BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('analytics-sync');
      this.setupChannelListeners();
      await this.electLeader();
      this.startHeartbeat();
    } else {
      // Fallback to localStorage events for older browsers
      this.setupStorageFallback();
      console.warn('BroadcastChannel not supported, falling back to localStorage');
    }

    console.log(`CrossTabSync initialized for tab ${this.tabId}, isLeader: ${this.isLeader}`);
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupChannelListeners() {
    if (!this.channel) return;

    this.channel.addEventListener('message', (event) => {
      const message: CrossTabMessage = event.data;
      
      // Ignore own messages
      if (message.sender === this.tabId) return;
      
      this.handleMessage(message);
    });
  }

  private handleMessage(message: CrossTabMessage) {
    const { type, data, sender, timestamp } = message;
    
    switch (type) {
      case 'data-update':
        this.notifySubscribers('data-update', data);
        break;
      
      case 'cache-invalidation':
        this.notifySubscribers('cache-invalidation', data);
        break;
      
      case 'leader-election':
        this.participateInElection(data as TabElection);
        break;
      
      case 'leader-heartbeat':
        this.handleLeaderHeartbeat(sender, timestamp);
        break;
      
      case 'leader-resignation':
        this.handleLeaderResignation(sender);
        break;
      
      default:
        // Forward unknown message types to subscribers
        this.notifySubscribers(type, data);
    }
  }

  private async electLeader() {
    const election: TabElection = {
      tabId: this.tabId,
      timestamp: Date.now()
    };

    this.broadcast('leader-election', election);
    
    // Wait for other tabs to respond
    await this.delay(200);
    
    // If no one else claimed leadership, become leader
    if (!this.isLeader) {
      this.becomeLeader();
    }
  }

  private participateInElection(election: TabElection) {
    // Simple leader election: earliest timestamp wins
    // If timestamps are equal, lexicographically smallest tabId wins
    const myTimestamp = parseInt(this.tabId.split('_')[1]);
    const theirTimestamp = election.timestamp;
    
    if (theirTimestamp < myTimestamp || 
        (theirTimestamp === myTimestamp && election.tabId < this.tabId)) {
      // They should be leader
      if (this.isLeader) {
        this.resignLeadership();
      }
    } else if (theirTimestamp > myTimestamp || 
               (theirTimestamp === myTimestamp && election.tabId > this.tabId)) {
      // I should be leader
      this.becomeLeader();
    }
  }

  private becomeLeader() {
    if (this.isLeader) return;
    
    this.isLeader = true;
    console.log(`Tab ${this.tabId} became leader`);
    
    // Start sending heartbeats
    this.startHeartbeat();
    
    // Notify subscribers
    this.notifySubscribers('leadership-change', { isLeader: true, tabId: this.tabId });
  }

  private resignLeadership() {
    if (!this.isLeader) return;
    
    this.isLeader = false;
    console.log(`Tab ${this.tabId} resigned leadership`);
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Notify other tabs
    this.broadcast('leader-resignation', { tabId: this.tabId });
    
    // Notify subscribers
    this.notifySubscribers('leadership-change', { isLeader: false, tabId: this.tabId });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isLeader) {
        this.broadcast('leader-heartbeat', { timestamp: Date.now() });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleLeaderHeartbeat(senderId: string, timestamp: number) {
    this.lastHeartbeat = timestamp;
    
    // If I thought I was leader but someone else is sending heartbeats, resign
    if (this.isLeader && senderId !== this.tabId) {
      console.log(`Detected another leader (${senderId}), resigning`);
      this.resignLeadership();
    }
    
    // Reset leader timeout
    this.resetLeaderTimeout();
  }

  private handleLeaderResignation(_senderId: string) {
    // If the current leader resigned, start new election
    if (!this.isLeader) {
      setTimeout(() => {
        this.electLeader();
      }, 100 + Math.random() * 100); // Random delay to prevent collision
    }
  }

  private resetLeaderTimeout() {
    if (this.leaderTimeout) {
      clearTimeout(this.leaderTimeout);
    }
    
    if (!this.isLeader) {
      this.leaderTimeout = setTimeout(() => {
        console.log('Leader timeout, starting new election');
        this.electLeader();
      }, this.LEADER_TIMEOUT);
    }
  }

  private setupStorageFallback() {
    // Fallback implementation using localStorage events
    const storageKey = 'analytics-sync';
    
    window.addEventListener('storage', (event) => {
      if (event.key === storageKey && event.newValue) {
        try {
          const message: CrossTabMessage = JSON.parse(event.newValue);
          if (message.sender !== this.tabId) {
            this.handleMessage(message);
          }
        } catch (error) {
          console.error('Error parsing storage message:', error);
        }
      }
    });

    // Clean up old messages periodically
    setInterval(() => {
      localStorage.removeItem(storageKey);
    }, 60000); // Clean every minute
  }

  // Public API methods

  public broadcast(type: string, data: any) {
    const message: CrossTabMessage = {
      type,
      data,
      sender: this.tabId,
      timestamp: Date.now()
    };

    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      // Fallback to localStorage
      localStorage.setItem(
        'analytics-sync',
        JSON.stringify(message)
      );
      
      // Clear after a short delay to avoid accumulation
      setTimeout(() => {
        const current = localStorage.getItem('analytics-sync');
        if (current === JSON.stringify(message)) {
          localStorage.removeItem('analytics-sync');
        }
      }, 1000);
    }
  }

  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    this.subscribers.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  public isTabLeader(): boolean {
    return this.isLeader;
  }

  public getTabId(): string {
    return this.tabId;
  }

  public getLastHeartbeat(): number {
    return this.lastHeartbeat;
  }

  public async cleanup() {
    // Resign leadership if we're the leader
    if (this.isLeader) {
      this.resignLeadership();
    }
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Clear timeouts
    if (this.leaderTimeout) {
      clearTimeout(this.leaderTimeout);
      this.leaderTimeout = null;
    }
    
    // Close broadcast channel
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    
    // Clear subscribers
    this.subscribers.clear();
    
    console.log(`CrossTabSync cleaned up for tab ${this.tabId}`);
  }

  private notifySubscribers(event: string, data: any) {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} subscriber:`, error);
        }
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Debug methods
  public getDebugInfo() {
    return {
      tabId: this.tabId,
      isLeader: this.isLeader,
      lastHeartbeat: this.lastHeartbeat,
      subscriberCount: Array.from(this.subscribers.entries()).map(([event, subs]) => ({
        event,
        count: subs.size
      })),
      hasChannel: !!this.channel,
      heartbeatActive: !!this.heartbeatInterval
    };
  }
}
