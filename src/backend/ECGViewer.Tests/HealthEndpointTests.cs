using System.Diagnostics;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ECGViewer.Tests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ReturnsOkWithStatusOk()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;

        var response = await client.GetAsync("/api/health", cancellationToken);

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        Assert.Equal("""{"status":"ok"}""", body);
    }

    [Fact]
    public async Task RespondsUnder200ms()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;

        var stopwatch = Stopwatch.StartNew();
        var response = await client.GetAsync("/api/health", cancellationToken);
        stopwatch.Stop();

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        Assert.True(
            stopwatch.ElapsedMilliseconds < 200,
            $"Expected response under 200ms, took {stopwatch.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task RejectsDisallowedOrigin()
    {
        var client = _factory.CreateClient();
        var cancellationToken = TestContext.Current.CancellationToken;
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("Origin", "http://evil.example");

        var response = await client.SendAsync(request, cancellationToken);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
