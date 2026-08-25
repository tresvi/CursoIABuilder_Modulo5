using System.Net;
using System.Net.Http.Json;
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
}
