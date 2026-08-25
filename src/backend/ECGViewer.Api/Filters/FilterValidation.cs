namespace ECGViewer.Api.Filters;

/// <summary>
/// Funciones de validación puras para el endpoint de filtros. Cada una devuelve un mensaje de
/// error en español (o <c>null</c> si el valor es válido) — no dependen de I/O ni de
/// <c>WebApplicationFactory</c>.
/// </summary>
public static class FilterValidation
{
    private const int MaxSampleCount = 500_000;
    private const int MinSampleCount = 2;

    public static string? ValidateSampleCount(int count)
    {
        if (count < MinSampleCount)
        {
            return "La señal debe tener al menos 2 muestras para calcular la frecuencia de muestreo";
        }

        if (count > MaxSampleCount)
        {
            return $"La señal supera el límite de {MaxSampleCount} muestras permitidas";
        }

        return null;
    }

    public static string? ValidateFrequency(double value, double nyquistHz)
    {
        if (value <= 0)
        {
            return "La frecuencia debe ser un valor positivo";
        }

        if (value > nyquistHz)
        {
            return $"La frecuencia debe ser positiva y no superar la frecuencia de Nyquist ({nyquistHz} Hz)";
        }

        return null;
    }

    public static string? ValidateFrequencyRange(double low, double high, double nyquistHz)
    {
        var lowError = ValidateFrequency(low, nyquistHz);
        if (lowError is not null)
        {
            return lowError;
        }

        var highError = ValidateFrequency(high, nyquistHz);
        if (highError is not null)
        {
            return highError;
        }

        if (low >= high)
        {
            return "La frecuencia inferior debe ser menor que la frecuencia superior";
        }

        return null;
    }

    public static string? ValidateWindow(int window, int totalSamples)
    {
        if (window <= 0)
        {
            return "La ventana debe ser un entero positivo";
        }

        if (window > totalSamples)
        {
            return "La ventana no puede ser mayor que el total de muestras de la señal";
        }

        return null;
    }

    public static string? ValidatePolynomialDegree(int degree, int window)
    {
        if (degree <= 0)
        {
            return "El grado del polinomio debe ser un entero positivo";
        }

        if (degree >= window)
        {
            return "El grado del polinomio debe ser menor que el tamaño de la ventana";
        }

        return null;
    }
}
