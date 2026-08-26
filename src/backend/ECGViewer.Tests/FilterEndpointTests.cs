using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ECGViewer.Api.Filters;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ECGViewer.Tests;

public class FilterEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    public FilterEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private static List<SampleDto> BuildSyntheticSignal(
        double sampleRateHz, int count, double lowFreqHz, double highFreqHz)
    {
        var samples = new List<SampleDto>(count);
        for (var i = 0; i < count; i++)
        {
            var t = i / sampleRateHz;
            var mV = Math.Sin(2 * Math.PI * lowFreqHz * t) + Math.Sin(2 * Math.PI * highFreqHz * t);
            samples.Add(new SampleDto(t, mV));
        }

        return samples;
    }

    private static void AssertSignalChangedButTimestampsPreserved(
        List<SampleDto> original, List<SampleDto> filtered)
    {
        Assert.Equal(original.Count, filtered.Count);

        var different = false;
        for (var i = 0; i < original.Count; i++)
        {
            Assert.Equal(original[i].T, filtered[i].T, precision: 10);

            if (Math.Abs(original[i].MV - filtered[i].MV) > 1e-6)
            {
                different = true;
            }
        }

        Assert.True(different, "Expected the filtered signal to differ from the original");
    }

    [Fact]
    public async Task LowPass_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.LowPass, Cutoff: 10, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task HighPass_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.HighPass, Cutoff: 10, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task BandPass_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.BandPass, Cutoff: null, CutoffLow: 1, CutoffHigh: 10, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task Notch_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.Notch, Cutoff: null, CutoffLow: 35, CutoffHigh: 45, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task LowPass_WorksWithNonPowerOfTwoSampleCount()
    {
        // Señales reales cargadas de un CSV casi nunca tienen una longitud potencia de 2;
        // FftSharp.Filter requiere esa longitud internamente (FFT), así que SpectralFilters debe
        // rellenar con ceros y truncar de vuelta — este test usa 500 muestras (no es potencia de 2)
        // para confirmar que el endpoint no rompe en el caso real.
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 500, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.LowPass, Cutoff: 10, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task LowPass_RejectsFrequencyAboveNyquist()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        // sampleRateHz = 200 -> nyquist = 100
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.LowPass, Cutoff: 150, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MovingAverage_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.MovingAverage, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: 5, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task MovingMedian_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.MovingMedian, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: 7, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task SavitzkyGolay_ReturnsFilteredSignal()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.SavitzkyGolay, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: 7, PolynomialDegree: 2);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<FilterResponse>(JsonOptions, cancellationToken);
        Assert.NotNull(body);
        AssertSignalChangedButTimestampsPreserved(samples, body!.Samples);
    }

    [Fact]
    public async Task MovingAverage_RejectsWindowNotPositiveInteger()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.MovingAverage, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: 0, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SavitzkyGolay_RejectsDegreeGreaterOrEqualWindow()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.SavitzkyGolay, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: 5, PolynomialDegree: 5);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SavitzkyGolay_RejectsUnstableCombinationWith400()
    {
        // Con una señal de 10 muestras, ventana=9 y grado=8 (ambos valores válidos según
        // FilterValidation: window <= totalSamples y degree < window), las ventanas centradas en
        // los extremos quedan recortadas por el borde a solo 5 muestras reales (half = window/2 =
        // 4), mientras que el polinomio de grado 8 requiere 9 coeficientes: el sistema de mínimos
        // cuadrados (X^T X, de 9x9) queda con rango <= 5, es decir, singular. Esto dispara la
        // detección de pivote casi-cero en la eliminación gaussiana de TimeDomainFilters.
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 10, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.SavitzkyGolay, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: 9, PolynomialDegree: 8);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsPayloadWithExtraFieldPerSample()
    {
        // NFR-02: un campo extra por muestra simula una tercera "columna"/canal que el DTO
        // SampleDto (t, mV) no espera. Se arma el JSON crudo a mano porque el record SampleDto en
        // C# no permite agregar un campo extra accidentalmente.
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        const string json = """
        {
          "samples": [
            {"t": 0.0, "mV": 1.0, "channel2": 2.0},
            {"t": 0.005, "mV": 1.1, "channel2": 2.1},
            {"t": 0.01, "mV": 1.2, "channel2": 2.2}
          ],
          "filterType": "LowPass",
          "cutoff": 10
        }
        """;
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/filters/apply", content, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsPayloadOverSampleLimit()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 500_001, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.LowPass, Cutoff: 10, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task BandPass_RejectsLowGreaterOrEqualHigh()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.BandPass, Cutoff: null, CutoffLow: 40, CutoffHigh: 10, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsRequestWithMissingRequiredParameter()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 200, count: 512, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.LowPass, Cutoff: null, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RespondsUnder500msForOneMinuteSignal()
    {
        // NFR-01: 1 minuto de señal a 250Hz (frecuencia de muestreo ECG realista) = 15000 muestras.
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        var samples = BuildSyntheticSignal(sampleRateHz: 250, count: 15_000, lowFreqHz: 2, highFreqHz: 40);
        var request = new FilterRequest(samples, FilterType.LowPass, Cutoff: 10, CutoffLow: null, CutoffHigh: null, Window: null, PolynomialDegree: null);

        var stopwatch = Stopwatch.StartNew();
        var response = await client.PostAsJsonAsync("/api/filters/apply", request, JsonOptions, cancellationToken);
        stopwatch.Stop();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(stopwatch.ElapsedMilliseconds < 500, $"Expected < 500ms, took {stopwatch.ElapsedMilliseconds}ms");
    }
}
