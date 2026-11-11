// Runs in the temporary consumer project and uses the installed package the
// way a Node.js service does, with in-memory services in place of browser storage.
import assert from 'node:assert/strict';

const RESULTS_KEY = 'measurementResults';
const savedResults = new Map([[RESULTS_KEY, '[]']]);
let purgeCount = 0;

const {
  buildResultsExport,
  formatName,
  handleBeforeUnload,
  measurementState,
  purgeMeasurementData,
  setMeasurementDB,
  setMeasurementResultsStorage,
} = await import(process.argv[2]);

const registerServices = () => {
  setMeasurementDB({
    add: async () => 'measurement',
    purge: async () => {
      purgeCount += 1;
    },
  });
  setMeasurementResultsStorage({
    getItem: (key) => savedResults.get(key) ?? null,
    setItem: (key, value) => {
      savedResults.set(key, value);
    },
    removeItem: (key) => {
      savedResults.delete(key);
    },
  });
};

const checkExport = () => {
  const exported = buildResultsExport([]);
  assert.equal(exported.mimeType, 'application/json');
  assert.deepEqual(JSON.parse(exported.content), {
    totalTimeSeconds: null,
    tasks: [],
  });
};

const checkPurge = async () => {
  await purgeMeasurementData();
  assert.equal(purgeCount, 1);
  assert.equal(savedResults.has(RESULTS_KEY), false);
  assert.ok(measurementState.results.length > 0);
  assert.ok(
    measurementState.results.every((task) => task.Status === 'NOT_STARTED'),
  );
};

const checkBeforeUnload = () => {
  handleBeforeUnload(
    { preventDefault: () => assert.fail('No measurement is running') },
    { current: false },
  );
};

assert.equal(formatName('digital-twin'), 'Digital Twin');
registerServices();
assert.deepEqual(measurementState.results, []);
checkExport();
await checkPurge();
checkBeforeUnload();
