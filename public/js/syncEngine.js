/**
 * SyncEngine: High-Precision NTP Time Synchronization for Web Browsers
 * Implements Cristian's Algorithm with median filtering & outlier rejection.
 */
class SyncEngine {
  constructor(ws) {
    this.ws = ws;
    this.clockOffset = 0;      // theta = ServerTime - ClientLocalTime
    this.roundTripTime = 0;    // RTT in ms
    this.jitter = 0;           // Standard deviation of RTT
    this.isSynchronized = false;
    this.pingHistory = [];
    this.maxHistory = 15;
    this.pendingPings = new Map();
    this.onSyncUpdateCallback = null;

    // Periodic sync interval (every 3 seconds)
    this.syncIntervalTimer = null;
  }

  // Get current synchronized Master Server Time in milliseconds
  now() {
    return performance.now() + this.clockOffset;
  }

  // Start synchronization burst (10 rapid pings)
  start() {
    this.pingHistory = [];
    this.isSynchronized = false;
    
    // Rapid initial burst
    let burstCount = 0;
    const burst = () => {
      if (burstCount < 10) {
        this.sendPing();
        burstCount++;
        setTimeout(burst, 120);
      } else {
        // Switch to regular maintenance polling
        this.startPeriodicSync();
      }
    };
    burst();
  }

  sendPing() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pingId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const t0 = performance.now(); // Client send timestamp

    this.pendingPings.set(pingId, t0);
    this.ws.send(JSON.stringify({
      type: 'ntp_ping',
      clientSendTime: t0,
      pingId
    }));
  }

  // Handle incoming ntp_pong from server
  handlePong(data) {
    const t3 = performance.now(); // Client receive timestamp
    const t0 = this.pendingPings.get(data.pingId) || data.clientSendTime;
    this.pendingPings.delete(data.pingId);

    const t1 = data.serverReceiveTime;
    const t2 = data.serverSendTime;

    // Cristian's Algorithm:
    // RTT = (t3 - t0) - (t2 - t1)
    // Offset = ((t1 - t0) + (t2 - t3)) / 2
    const rtt = Math.max(0.1, (t3 - t0) - (t2 - t1));
    const offset = ((t1 - t0) + (t2 - t3)) / 2;

    this.pingHistory.push({ rtt, offset, timestamp: t3 });
    if (this.pingHistory.length > this.maxHistory) {
      this.pingHistory.shift();
    }

    this.computeFilteredSync();
  }

  computeFilteredSync() {
    if (this.pingHistory.length < 3) return;

    // Filter outliers: pick lowest 60% RTT samples (least network bufferbloat)
    const sortedByRtt = [...this.pingHistory].sort((a, b) => a.rtt - b.rtt);
    const validCount = Math.max(3, Math.floor(sortedByRtt.length * 0.65));
    const bestSamples = sortedByRtt.slice(0, validCount);

    // Compute average offset & mean RTT from the best samples
    const meanOffset = bestSamples.reduce((sum, s) => sum + s.offset, 0) / bestSamples.length;
    const meanRtt = bestSamples.reduce((sum, s) => sum + s.rtt, 0) / bestSamples.length;

    // Calculate jitter (standard deviation of RTT)
    const variance = bestSamples.reduce((sum, s) => sum + Math.pow(s.rtt - meanRtt, 2), 0) / bestSamples.length;
    this.jitter = Math.sqrt(variance);

    // Smooth offset transition (exponential moving average)
    if (!this.isSynchronized) {
      this.clockOffset = meanOffset;
      this.isSynchronized = true;
    } else {
      this.clockOffset = this.clockOffset * 0.7 + meanOffset * 0.3;
    }

    this.roundTripTime = meanRtt;

    if (this.onSyncUpdateCallback) {
      this.onSyncUpdateCallback({
        offset: this.clockOffset,
        rtt: this.roundTripTime,
        jitter: this.jitter,
        isSynchronized: this.isSynchronized
      });
    }
  }

  startPeriodicSync() {
    if (this.syncIntervalTimer) clearInterval(this.syncIntervalTimer);
    this.syncIntervalTimer = setInterval(() => {
      this.sendPing();
    }, 2500);
  }

  stop() {
    if (this.syncIntervalTimer) clearInterval(this.syncIntervalTimer);
    this.pendingPings.clear();
  }

  onSyncUpdate(callback) {
    this.onSyncUpdateCallback = callback;
  }
}

window.SyncEngine = SyncEngine;
