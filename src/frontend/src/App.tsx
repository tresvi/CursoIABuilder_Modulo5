import { BackendStatus } from '@/components/BackendStatus';
import { ChartToolbar } from '@/components/ChartToolbar';
import { ECGChart } from '@/components/ECGChart';
import { FilterPanel } from '@/components/FilterPanel';
import { MarkerForm } from '@/components/MarkerForm';
import { MarkerList } from '@/components/MarkerList';
import { MetricsPanel } from '@/components/MetricsPanel';
import { AppLayout } from '@/components/layout/AppLayout';
import { DisabledMenuItem } from '@/components/layout/DisabledMenuItem';
import { FileSection } from '@/components/layout/FileSection';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/components/layout/SidebarSection';

function App() {
  // Reubicación de FEAT-009 Blocks 3 y 4: "Archivo", "Herramientas" y "Filtros"
  // pasan al sidebar sin tocar la lógica ni el estado de los componentes existentes.
  const sidebar = (
    <Sidebar>
      <SidebarSection title="Archivo" defaultOpen>
        <FileSection />
      </SidebarSection>
      <SidebarSection title="Herramientas" defaultOpen>
        <ChartToolbar />
        {/* "Desplazar" (pan) aparece en la referencia visual pero no existe como
            herramienta: `viewStore.ChartTool` no tiene un miembro para ella y el PRD
            deja fuera de alcance tocar la lógica de las herramientas (decisión de
            diseño 5 de la spec). Se muestra deshabilitado; anotado en docs/BACKLOG.md. */}
        <DisabledMenuItem label="Desplazar" />
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
