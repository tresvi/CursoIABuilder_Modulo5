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
  // Reubicación de FEAT-009 Block 3: "Herramientas" y "Filtros" pasan al sidebar
  // sin tocar su lógica ni su estado. "Archivo" se llena en el Block 4 (CsvUpload).
  const sidebar = (
    <Sidebar>
      <SidebarSection title="Archivo" defaultOpen />
      <SidebarSection title="Herramientas" defaultOpen>
        <ChartToolbar />
      </SidebarSection>
      <SidebarSection title="Filtros" defaultOpen>
        <FilterPanel />
      </SidebarSection>
    </Sidebar>
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="flex flex-col gap-6">
        <BackendStatus />
        <CsvUpload />
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
