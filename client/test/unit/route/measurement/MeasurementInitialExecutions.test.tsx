import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Measurement from 'route/measurement/Measurement';
import { measurementState } from '@into-cps-association/dt-automation';
import {
  MOCK_MEASUREMENT_STATE,
  createResultTask,
  setupMeasurementComponentTest,
} from './measurement.testSetup';

jest.mock('route/measurement/MeasurementControls', () => ({
  __esModule: true,
  default: () => <div data-testid="measurement-controls" />,
  CompletionSummary: () => <div data-testid="completion-summary" />,
}));

jest.mock('route/measurement/MeasurementTable', () => ({
  __esModule: true,
  default: ({ results }: { results: { 'Task Name': string }[] }) => (
    <div data-testid="measurement-table">
      {results.map((task) => (
        <span key={task['Task Name']}>{task['Task Name']}</span>
      ))}
    </div>
  ),
}));

const mockMergeExecutionStatus = jest.fn(
  (
    _executions: unknown,
    _activePipelines: unknown,
    _completedResults: unknown,
    _defaultConfig: unknown,
  ) => [],
);

jest.mock('@into-cps-association/dt-automation', () => {
  const setup = jest.requireActual('./measurement.testSetup');
  const actual = jest.requireActual('@into-cps-association/dt-automation');
  return {
    ...actual,
    ...setup.createRunnerStubs(),
    getMeasurementStatus: jest.fn(() => ({
      hasStarted: false,
      completedTasks: 0,
      completedTrials: 0,
    })),
    mergeExecutionStatus: (
      executions: unknown,
      activePipelines: unknown,
      completedResults: unknown,
      defaultConfig: unknown,
    ) =>
      mockMergeExecutionStatus(
        executions,
        activePipelines,
        completedResults,
        defaultConfig,
      ),
    measurementState: { ...setup.MOCK_MEASUREMENT_STATE },
    attachSetters: jest.fn(),
    detachSetters: jest.fn(),
    getDefaultConfig: jest.fn(() => ({ DTName: 'default-dt' })),
    getTasks: () => setup.MOCK_TASKS,
  };
});

describe('Measurement initial executions', () => {
  beforeEach(() => {
    setupMeasurementComponentTest();
    Object.assign(measurementState, {
      ...MOCK_MEASUREMENT_STATE,
      activePipelines: [{ dtName: 'hello-world', pipelineId: 11 }],
      currentTaskIndexUI: 0,
      executionResults: [{ dtName: 'hello-world', pipelineId: 11 }],
      isRunning: true,
    });
  });

  it('merges current executions when restoring an active measurement', () => {
    render(<Measurement />);

    expect(mockMergeExecutionStatus).toHaveBeenCalledWith(
      [{ dtName: 'hello-world', config: {} }],
      [{ dtName: 'hello-world', pipelineId: 11 }],
      [{ dtName: 'hello-world', pipelineId: 11 }],
      { DTName: 'default-dt' },
    );
  });

  it('opens the interrupted-session dialog with the restored results', () => {
    Object.assign(measurementState, {
      isRunning: false,
      results: [createResultTask('Restored Task', 'STOPPED')],
      restoredAfterRefresh: true,
    });

    render(<Measurement />);

    expect(
      screen.getByText('Previous Session Interrupted'),
    ).toBeInTheDocument();
    expect(screen.getByText('Restored Task')).toBeInTheDocument();
  });
});
