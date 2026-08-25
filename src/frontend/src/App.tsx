import { BackendStatus } from '@/components/BackendStatus';
import { ChartToolbar } from '@/components/ChartToolbar';
import { CsvUpload } from '@/components/CsvUpload';
import { ECGChart } from '@/components/ECGChart';
import { FilterPanel } from '@/components/FilterPanel';
import { MarkerForm } from '@/components/MarkerForm';
import { MarkerList } from '@/components/MarkerList';
import { MetricsPanel } from '@/components/MetricsPanel';

function App() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-6 text-2xl font-bold">ECGViewer</h1>
      <div className="flex flex-col gap-6">
        <BackendStatus />
        <CsvUpload />
        <ChartToolbar />
        <FilterPanel />
        <ECGChart />
        <MetricsPanel />
        <MarkerList />
        {/* Único MarkerForm de la app (FEAT-003b Block 5): autosuficiente, sirve tanto
            al flujo de creación (disparado desde ECGChart) como al de edición
            (disparado desde MarkerList), ambos vía markersStore.formState. */}
        <MarkerForm />
      </div>
    </main>
  );
}

export default App;
