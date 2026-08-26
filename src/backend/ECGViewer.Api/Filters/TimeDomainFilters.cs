namespace ECGViewer.Api.Filters;

/// <summary>
/// Filtros de dominio temporal implementados a mano (sin dependencia de <c>FftSharp</c>): media
/// móvil, mediana móvil y Savitzky-Golay. Todos usan una ventana deslizante centrada en cada
/// índice, con recorte simétrico en los bordes (el tamaño real de la ventana se reduce cerca de
/// los extremos de la señal en vez de rellenar con ceros).
/// </summary>
public static class TimeDomainFilters
{
    /// <summary>
    /// Umbral por debajo del cual un pivote de la eliminación gaussiana se considera cero —
    /// mitigación del threat model riesgo 3: una matriz de Vandermonde singular o casi singular
    /// dispara una excepción en vez de propagar valores <c>NaN</c>/<c>Infinity</c> silenciosos.
    /// </summary>
    private const double SingularPivotThreshold = 1e-9;

    public static double[] ApplyMovingAverage(double[] mV, int window)
    {
        var n = mV.Length;
        var result = new double[n];
        var half = window / 2;

        for (var i = 0; i < n; i++)
        {
            var lo = Math.Max(0, i - half);
            var hi = Math.Min(n - 1, i + half);

            double sum = 0;
            for (var j = lo; j <= hi; j++)
            {
                sum += mV[j];
            }

            result[i] = sum / (hi - lo + 1);
        }

        return result;
    }

    public static double[] ApplyMovingMedian(double[] mV, int window)
    {
        var n = mV.Length;
        var result = new double[n];
        var half = window / 2;

        for (var i = 0; i < n; i++)
        {
            var lo = Math.Max(0, i - half);
            var hi = Math.Min(n - 1, i + half);
            var count = hi - lo + 1;

            var values = new double[count];
            Array.Copy(mV, lo, values, 0, count);
            Array.Sort(values);

            result[i] = count % 2 == 1
                ? values[count / 2]
                : (values[(count / 2) - 1] + values[count / 2]) / 2.0;
        }

        return result;
    }

    /// <summary>
    /// Ajusta, para cada índice, un polinomio de grado <paramref name="degree"/> por mínimos
    /// cuadrados sobre la ventana deslizante centrada en ese índice (coordenadas locales
    /// <c>x = j - i</c>, de modo que el punto a suavizar siempre corresponde a <c>x = 0</c>) y
    /// evalúa el polinomio ahí — como <c>x = 0</c>, el valor suavizado es directamente el primer
    /// coeficiente resuelto, sin necesidad de evaluar el polinomio completo.
    /// Los coeficientes se calculan resolviendo las ecuaciones normales
    /// (<c>(XᵀX) c = Xᵀy</c>) por eliminación gaussiana con pivoteo parcial. Si la matriz resulta
    /// singular o casi singular (ventana efectiva, recortada en un borde, con menos muestras que
    /// coeficientes a resolver), se lanza una excepción que el endpoint traduce a 400.
    /// </summary>
    public static double[] ApplySavitzkyGolay(double[] mV, int window, int degree)
    {
        var n = mV.Length;
        var result = new double[n];
        var half = window / 2;
        var coeffCount = degree + 1;

        for (var i = 0; i < n; i++)
        {
            var lo = Math.Max(0, i - half);
            var hi = Math.Min(n - 1, i + half);

            var ata = new double[coeffCount, coeffCount];
            var aty = new double[coeffCount];
            var powers = new double[coeffCount];

            for (var j = lo; j <= hi; j++)
            {
                var x = (double)(j - i);
                powers[0] = 1.0;
                for (var p = 1; p < coeffCount; p++)
                {
                    powers[p] = powers[p - 1] * x;
                }

                for (var r = 0; r < coeffCount; r++)
                {
                    aty[r] += powers[r] * mV[j];
                    for (var c = 0; c < coeffCount; c++)
                    {
                        ata[r, c] += powers[r] * powers[c];
                    }
                }
            }

            var coefficients = SolveLinearSystem(ata, aty, coeffCount);
            result[i] = coefficients[0];
        }

        return result;
    }

    private static double[] SolveLinearSystem(double[,] a, double[] b, int size)
    {
        var m = (double[,])a.Clone();
        var v = (double[])b.Clone();

        for (var col = 0; col < size; col++)
        {
            var pivotRow = col;
            var maxAbs = Math.Abs(m[col, col]);
            for (var r = col + 1; r < size; r++)
            {
                if (Math.Abs(m[r, col]) > maxAbs)
                {
                    maxAbs = Math.Abs(m[r, col]);
                    pivotRow = r;
                }
            }

            if (maxAbs < SingularPivotThreshold)
            {
                throw new InvalidOperationException(
                    "La matriz de Vandermonde es singular o casi singular para esta combinación de ventana y grado");
            }

            if (pivotRow != col)
            {
                for (var c = 0; c < size; c++)
                {
                    (m[col, c], m[pivotRow, c]) = (m[pivotRow, c], m[col, c]);
                }

                (v[col], v[pivotRow]) = (v[pivotRow], v[col]);
            }

            for (var r = col + 1; r < size; r++)
            {
                var factor = m[r, col] / m[col, col];
                for (var c = col; c < size; c++)
                {
                    m[r, c] -= factor * m[col, c];
                }

                v[r] -= factor * v[col];
            }
        }

        var x = new double[size];
        for (var r = size - 1; r >= 0; r--)
        {
            var sum = v[r];
            for (var c = r + 1; c < size; c++)
            {
                sum -= m[r, c] * x[c];
            }

            x[r] = sum / m[r, r];
        }

        return x;
    }
}
