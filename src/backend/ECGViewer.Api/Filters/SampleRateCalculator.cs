namespace ECGViewer.Api.Filters;

/// <summary>
/// Calcula la frecuencia de muestreo de una señal a partir del promedio de los deltas de tiempo
/// consecutivos entre muestras (no asume muestreo perfectamente uniforme). Refleja el mismo
/// criterio que <c>src/frontend/src/lib/ecg/sampleRate.ts</c> para que ambos lados calculen el
/// mismo valor sobre el mismo payload.
/// </summary>
public static class SampleRateCalculator
{
    /// <summary>
    /// Requiere al menos 2 muestras. Los llamadores deben validar el conteo de muestras
    /// (<see cref="FilterValidation.ValidateSampleCount"/>) antes de invocar este método.
    /// </summary>
    public static double ComputeSampleRateHz(IReadOnlyList<SampleDto> samples)
    {
        var deltaSum = 0.0;
        var deltaCount = samples.Count - 1;

        for (var i = 1; i < samples.Count; i++)
        {
            deltaSum += samples[i].T - samples[i - 1].T;
        }

        var averageDelta = deltaSum / deltaCount;

        return 1.0 / averageDelta;
    }
}
