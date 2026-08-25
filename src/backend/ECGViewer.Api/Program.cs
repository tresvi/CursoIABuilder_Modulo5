using System.Text.Json.Serialization;
using ECGViewer.Api.Filters;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader());
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

app.UseCors("FrontendDev");

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/filters/apply", (FilterRequest request) =>
{
    var sampleCountError = FilterValidation.ValidateSampleCount(request.Samples.Count);
    if (sampleCountError is not null)
    {
        return Results.BadRequest(new { error = sampleCountError });
    }

    var sampleRateHz = SampleRateCalculator.ComputeSampleRateHz(request.Samples);
    var nyquistHz = sampleRateHz / 2;
    var mV = request.Samples.Select(s => s.MV).ToArray();

    double[] filtered;

    switch (request.FilterType)
    {
        case FilterType.LowPass:
        {
            if (request.Cutoff is not double cutoff)
            {
                return Results.BadRequest(new { error = "Falta el parámetro 'cutoff' para el filtro seleccionado" });
            }

            var frequencyError = FilterValidation.ValidateFrequency(cutoff, nyquistHz);
            if (frequencyError is not null)
            {
                return Results.BadRequest(new { error = frequencyError });
            }

            filtered = SpectralFilters.ApplyLowPass(mV, sampleRateHz, cutoff);
            break;
        }

        case FilterType.HighPass:
        {
            if (request.Cutoff is not double cutoff)
            {
                return Results.BadRequest(new { error = "Falta el parámetro 'cutoff' para el filtro seleccionado" });
            }

            var frequencyError = FilterValidation.ValidateFrequency(cutoff, nyquistHz);
            if (frequencyError is not null)
            {
                return Results.BadRequest(new { error = frequencyError });
            }

            filtered = SpectralFilters.ApplyHighPass(mV, sampleRateHz, cutoff);
            break;
        }

        case FilterType.BandPass:
        {
            if (request.CutoffLow is not double low || request.CutoffHigh is not double high)
            {
                return Results.BadRequest(new { error = "Faltan los parámetros 'cutoffLow'/'cutoffHigh' para el filtro seleccionado" });
            }

            var rangeError = FilterValidation.ValidateFrequencyRange(low, high, nyquistHz);
            if (rangeError is not null)
            {
                return Results.BadRequest(new { error = rangeError });
            }

            filtered = SpectralFilters.ApplyBandPass(mV, sampleRateHz, low, high);
            break;
        }

        case FilterType.Notch:
        {
            if (request.CutoffLow is not double low || request.CutoffHigh is not double high)
            {
                return Results.BadRequest(new { error = "Faltan los parámetros 'cutoffLow'/'cutoffHigh' para el filtro seleccionado" });
            }

            var rangeError = FilterValidation.ValidateFrequencyRange(low, high, nyquistHz);
            if (rangeError is not null)
            {
                return Results.BadRequest(new { error = rangeError });
            }

            filtered = SpectralFilters.ApplyNotch(mV, sampleRateHz, low, high);
            break;
        }

        // MovingAverage, MovingMedian y SavitzkyGolay se implementan en el Bloque 3.
        default:
            return Results.StatusCode(StatusCodes.Status501NotImplemented);
    }

    var newSamples = request.Samples
        .Select((s, i) => new SampleDto(s.T, filtered[i]))
        .ToList();

    return Results.Ok(new FilterResponse(newSamples));
});

app.Run();

public partial class Program { }
