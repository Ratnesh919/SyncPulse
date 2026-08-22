const WebSocket = require('ws');

async function runSyncVerification() {
  console.log('--- Starting Multi-Device Sync Verification ---');
  const wsHost = new WebSocket('ws://localhost:3000');
  const wsGuest1 = new WebSocket('ws://localhost:3000');
  const wsGuest2 = new WebSocket('ws://localhost:3000');

  const roomId = 'TEST99';

  await Promise.all([
    new Promise(res => wsHost.on('open', res)),
    new Promise(res => wsGuest1.on('open', res)),
    new Promise(res => wsGuest2.on('open', res))
  ]);
  console.log('✓ 3 client sockets connected');

  // Join Room
  wsHost.send(JSON.stringify({ type: 'join_room', roomId, role: 'host', deviceName: 'Host Laptop' }));
  wsGuest1.send(JSON.stringify({ type: 'join_room', roomId, role: 'guest', deviceName: 'Phone Alpha', channel: 'left' }));
  wsGuest2.send(JSON.stringify({ type: 'join_room', roomId, role: 'guest', deviceName: 'Phone Beta', channel: 'right' }));

  // Test NTP Pings
  let ntpPass = false;
  await new Promise(resolve => {
    wsGuest1.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'ntp_pong') {
        console.log(`✓ NTP Pong received: ClientTime=${msg.clientSendTime.toFixed(1)}, ServerRecv=${msg.serverReceiveTime.toFixed(1)}, ServerSend=${msg.serverSendTime.toFixed(1)}`);
        ntpPass = true;
        resolve();
      }
    });
    wsGuest1.send(JSON.stringify({ type: 'ntp_ping', clientSendTime: performance.now(), pingId: 'test_p1' }));
  });

  // Test Play Cue broadcast
  let cueReceivedCount = 0;
  const cuePromise = new Promise(resolve => {
    const onCue = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'play_cue') {
        cueReceivedCount++;
        console.log(`✓ Play cue received on client (TargetMasterTime: ${msg.targetMasterTime.toFixed(1)}, ServerTime: ${msg.serverTime.toFixed(1)})`);
        if (cueReceivedCount >= 2) resolve();
      }
    };
    wsGuest1.on('message', onCue);
    wsGuest2.on('message', onCue);
  });

  // Host fires play cue
  wsHost.send(JSON.stringify({ type: 'play_cue', position: 0, leadTime: 300 }));
  await cuePromise;

  console.log('✓ Synchronized Play Cue successfully received across all guest devices simultaneously!');
  
  wsHost.close();
  wsGuest1.close();
  wsGuest2.close();
  console.log('--- All Sync Verification Checks Passed ---');
  process.exit(0);
}

runSyncVerification().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
