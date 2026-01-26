import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling']
});

let processDataReceived = false;

socket.on('connect', () => {
  console.log('✅ Connected to server');
});

socket.on('metrics:processes', (data) => {
  if (processDataReceived) return;
  processDataReceived = true;

  console.log('\n📊 Process Data Received:');
  console.log('  Total processes:', data.all);
  console.log('  Running:', data.running);
  console.log('  Sleeping:', data.sleeping);

  console.log('\n🔥 Top by CPU:');
  data.topByCpu.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i+1}. ${p.name} - CPU: ${p.cpu.toFixed(1)}%, Mem: ${(p.memRss/1024).toFixed(1)}MB`);
  });

  console.log('\n💾 Top by Memory:');
  data.topByMem.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i+1}. ${p.name} - CPU: ${p.cpu.toFixed(1)}%, Mem: ${(p.memRss/1024).toFixed(1)}MB`);
  });

  // Verify the data is correct
  console.log('\n🧪 Verification:');

  const hasCpuData = data.topByCpu.some(p => p.cpu > 0);
  console.log(`  Has non-zero CPU values: ${hasCpuData ? '✅ YES' : '❌ NO'}`);

  const cpuSorted = data.topByCpu.every((p, i, arr) => i === 0 || arr[i-1].cpu >= p.cpu);
  console.log(`  CPU list sorted correctly: ${cpuSorted ? '✅ YES' : '❌ NO'}`);

  const memSorted = data.topByMem.every((p, i, arr) => i === 0 || arr[i-1].memRss >= p.memRss);
  console.log(`  Memory list sorted correctly: ${memSorted ? '✅ YES' : '❌ NO'}`);

  const cpuPids = JSON.stringify(data.topByCpu.map(p => p.pid));
  const memPids = JSON.stringify(data.topByMem.map(p => p.pid));
  const listsAreDifferent = cpuPids !== memPids;
  console.log(`  CPU and Memory lists are different: ${listsAreDifferent ? '✅ YES' : '⚠️  Same (may be coincidence)'}`);

  const allTestsPassed = hasCpuData && cpuSorted && memSorted;
  console.log(`\n${allTestsPassed ? '✅ All process data tests passed!' : '❌ Some tests failed'}`);

  socket.disconnect();
  process.exit(allTestsPassed ? 0 : 1);
});

setTimeout(() => {
  console.log('❌ Timeout waiting for process data');
  process.exit(1);
}, 10000);
