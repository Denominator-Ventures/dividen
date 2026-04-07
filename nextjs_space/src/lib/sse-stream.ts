// ─── SSE Stream Manager ──────────────────────────────────────────────────────
// Manages Server-Sent Event connections for real-time agent communication.

export interface SSEClient {
  id: string;
  keyId: string;
  userId: string;
  agentName: string;
  controller: ReadableStreamDefaultController;
  connectedAt: number;
  lastPing: number;
}

class SSEStreamManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({ type: 'heartbeat', timestamp: new Date().toISOString() });
      this.cleanupStale();
    }, 30_000); // every 30 seconds
  }

  /**
   * Register a new SSE client connection.
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
  }

  /**
   * Remove a client by ID.
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Send an SSE event to a specific client.
   */
  sendToClient(clientId: string, data: Record<string, unknown>): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      const encoder = new TextEncoder();
      const eventType = (data.type as string) || 'message';
      const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      client.controller.enqueue(encoder.encode(payload));
      client.lastPing = Date.now();
      return true;
    } catch {
      // Client disconnected
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Broadcast a message to all connected clients.
   */
  broadcast(data: Record<string, unknown>, userId?: string): void {
    for (const [id, client] of this.clients.entries()) {
      if (userId && client.userId !== userId) continue;
      try {
        const encoder = new TextEncoder();
        const eventType = (data.type as string) || 'message';
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        client.controller.enqueue(encoder.encode(payload));
        client.lastPing = Date.now();
      } catch {
        this.removeClient(id);
      }
    }
  }

  /**
   * Send a wake signal to all agents for a specific user (e.g., urgent task).
   */
  sendWakeSignal(userId: string, reason: string, metadata?: Record<string, unknown>): void {
    this.broadcast({
      type: 'wake',
      reason,
      metadata,
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Send a new chat message event to all connected agents for a user.
   */
  sendNewMessage(userId: string, message: Record<string, unknown>): void {
    this.broadcast({
      type: 'new_message',
      message,
      timestamp: new Date().toISOString(),
    }, userId);
  }

  /**
   * Clean up stale connections (no ping in 5 minutes).
   */
  private cleanupStale(): void {
    const staleThreshold = Date.now() - 300_000; // 5 minutes
    for (const [id, client] of this.clients.entries()) {
      if (client.lastPing < staleThreshold) {
        try {
          client.controller.close();
        } catch { /* ignore */ }
        this.removeClient(id);
      }
    }
  }

  /**
   * Get count of connected clients.
   */
  getClientCount(userId?: string): number {
    if (!userId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId) count++;
    }
    return count;
  }

  /**
   * Get info about connected clients.
   */
  getClientInfo(userId?: string): Array<{ id: string; agentName: string; connectedAt: number }> {
    const result: Array<{ id: string; agentName: string; connectedAt: number }> = [];
    for (const client of this.clients.values()) {
      if (userId && client.userId !== userId) continue;
      result.push({
        id: client.id,
        agentName: client.agentName,
        connectedAt: client.connectedAt,
      });
    }
    return result;
  }
}

// Singleton instance
export const sseManager = new SSEStreamManager();
