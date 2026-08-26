import { BackendStatus } from '@/components/BackendStatus';
import { ChartToolbar } from '@/components/ChartToolbar';
import { CsvUpload } from '@/components/CsvUpload';
import { ECGChart } from '@/components/ECGChart';
import { FilterPanel } from '@/components/FilterPanel';
import { MarkerForm } from '@/components/MarkerForm';
import { MarkerList } from '@/components/MarkerList';
import { MetricsPanel } from '@/components/MetricsPanel';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/components/layout/SidebarSection';

function App() {
  // Las tres secciones del sidebar se crean vacías en este bloque: sus controles
  // se reubican acá en los Blocks 3 y 4 de FEAT-009. Hasta entonces, todos los
  // componentes existentes siguen montados en el panel principal.
  const sidebar = (
    <Sidebar>
      <SidebarSection title="Archivo" defaultOpen />
      <SidebarSection title="Herramientas" defaultOpen />
      <SidebarSection title="Filtros" defaultOpen />
    </Sidebar>
  );

  return (
    <AppLayout sidebar={sidebar}>
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
    </AppLayout>
  );
}

export default App;
