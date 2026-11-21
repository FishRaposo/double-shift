// A worker thread for test/cheese-run.mjs: takes tasks off the shared counter until none are left, then reports.
import { parentPort, workerData } from 'node:worker_threads';
import { analyse } from './cheese-run.mjs';

const { tasks, counter } = workerData;
const next = new Int32Array(counter);
const results = [];
for (let i = Atomics.add(next, 0, 1); i < tasks.length; i = Atomics.add(next, 0, 1)) results.push(analyse(tasks[i]));
parentPort.postMessage(results);
