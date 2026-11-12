import store from 'store/store';

type DtAutomation = typeof import('@into-cps-association/dt-automation');

const SAVED_RESULTS = JSON.stringify([
  {
    'Task Name': 'Task 1',
    Description: 'First task',
    Trials: [{ Execution: [], Status: 'RUNNING' }],
    Status: 'RUNNING',
  },
]);

describe('client store integration', () => {
  it('initializes the package environment with the runtime authority', () => {
    expect(store.getState().environment.AUTH_AUTHORITY).toBe(
      globalThis.env.REACT_APP_AUTH_AUTHORITY,
    );
  });

  it('injects the client store into the real package environment boundary', () => {
    const setEnvironmentStore = jest.fn();
    let reloadedStore!: typeof store;

    jest.resetModules();
    jest.doMock('@into-cps-association/dt-automation', () => {
      const actual = jest.requireActual('@into-cps-association/dt-automation');
      return {
        ...actual,
        setEnvironmentStore: (value: unknown) => {
          setEnvironmentStore(value);
          actual.setEnvironmentStore(value);
        },
      };
    });
    jest.isolateModules(() => {
      reloadedStore =
        jest.requireActual<typeof import('store/store')>('store/store').default;
    });

    expect(setEnvironmentStore).toHaveBeenCalledWith(reloadedStore);
  });
});

describe('measurement results across a page reload', () => {
  afterEach(() => sessionStorage.clear());

  it('restores the results saved before the reload', () => {
    sessionStorage.setItem('measurementResults', SAVED_RESULTS);
    let restored!: DtAutomation['measurementState'];

    jest.isolateModules(() => {
      jest.requireActual('store/store');
      restored = jest.requireActual<DtAutomation>(
        '@into-cps-association/dt-automation',
      ).measurementState;
    });

    expect(restored.results).toMatchObject([
      {
        'Task Name': 'Task 1',
        Status: 'STOPPED',
        Trials: [{ Status: 'STOPPED' }],
      },
    ]);
    expect(restored.restoredAfterRefresh).toBe(true);
  });
});
