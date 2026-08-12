import { ChartToolbar } from '@/components/ChartToolbar';
import { CsvUpload } from '@/components/CsvUpload';
import { ECGChart } from '@/components/ECGChart';

function App() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-6 text-2xl font-bold">ECGViewer</h1>
      <div className="flex flex-col gap-6">
        <CsvUpload />
        <ChartToolbar />
        <ECGChart />
      </div>
    </main>
  );
}

export default App;
