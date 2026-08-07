import { CsvUpload } from '@/components/CsvUpload';

function App() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-6 text-2xl font-bold">ECGViewer</h1>
      <CsvUpload />
    </main>
  );
}

export default App;
