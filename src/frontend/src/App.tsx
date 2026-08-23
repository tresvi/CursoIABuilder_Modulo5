import { ChartToolbar } from '@/components/ChartToolbar';
import { CsvUpload } from '@/components/CsvUpload';
import { ECGChart } from '@/components/ECGChart';
import { MarkerForm } from '@/components/MarkerForm';
import { MarkerList } from '@/components/MarkerList';

function App() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-6 text-2xl font-bold">ECGViewer</h1>
      <div className="flex flex-col gap-6">
        <CsvUpload />
        <ChartToolbar />
        <ECGChart />
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
