import { PanelPlugin } from '@grafana/data';
import { MetricsOptions } from './types';
import { MetricsPanel } from './components/MetricsPanel';

export const plugin = new PanelPlugin<MetricsOptions>(MetricsPanel).setPanelOptions((builder) =>
  builder
    .addRadio({
      path: 'view',
      name: 'Default view',
      defaultValue: 'both',
      settings: {
        options: [
          { value: 'table', label: 'Table' },
          { value: 'bars', label: 'Bars' },
          { value: 'both', label: 'Both' },
        ],
      },
    })
    .addNumberInput({
      path: 'slowSeconds',
      name: 'Slow query threshold (seconds)',
      defaultValue: 30,
      settings: { min: 0 },
    })
    .addBooleanSwitch({ path: 'showSummary', name: 'Show summary', defaultValue: true })
);
