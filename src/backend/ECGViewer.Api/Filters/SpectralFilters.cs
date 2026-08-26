namespace ECGViewer.Api.Filters;

/// <summary>
/// Envoltorios sobre <see cref="FftSharp.Filter"/> para los 4 filtros espectrales
/// (Pasa Bajo, Pasa Alto, Pasa Banda, Notch). Operan sobre el array de amplitudes (<c>mV</c>) de
/// la señal; los timestamps no se tocan acá — los preserva el llamador (endpoint).
///
/// <c>FftSharp.Filter</c> usa una FFT internamente y requiere que la longitud del array sea una
/// potencia de 2 — las señales reales cargadas de un CSV no cumplen eso en general, así que cada
/// filtro rellena con ceros hasta la potencia de 2 siguiente (<see cref="FftSharp.Pad.ZeroPad"/>)
/// antes de filtrar, y trunca el resultado de vuelta a la longitud original después, para no
/// introducir muestras extra en la señal devuelta.
/// </summary>
public static class SpectralFilters
{
    public static double[] ApplyLowPass(double[] mV, double sampleRateHz, double cutoffHz) =>
        Truncate(FftSharp.Filter.LowPass(FftSharp.Pad.ZeroPad(mV), sampleRateHz, cutoffHz), mV.Length);

    public static double[] ApplyHighPass(double[] mV, double sampleRateHz, double cutoffHz) =>
        Truncate(FftSharp.Filter.HighPass(FftSharp.Pad.ZeroPad(mV), sampleRateHz, cutoffHz), mV.Length);

    public static double[] ApplyBandPass(double[] mV, double sampleRateHz, double cutoffLowHz, double cutoffHighHz) =>
        Truncate(FftSharp.Filter.BandPass(FftSharp.Pad.ZeroPad(mV), sampleRateHz, cutoffLowHz, cutoffHighHz), mV.Length);

    public static double[] ApplyNotch(double[] mV, double sampleRateHz, double cutoffLowHz, double cutoffHighHz) =>
        Truncate(FftSharp.Filter.BandStop(FftSharp.Pad.ZeroPad(mV), sampleRateHz, cutoffLowHz, cutoffHighHz), mV.Length);

    private static double[] Truncate(double[] padded, int originalLength) =>
        padded.Length == originalLength ? padded : padded[..originalLength];
}
