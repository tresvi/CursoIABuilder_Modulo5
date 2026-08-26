using System.Text.Json.Serialization;

namespace ECGViewer.Api.Filters;

public enum FilterType
{
    LowPass,
    HighPass,
    BandPass,
    Notch,
    MovingAverage,
    MovingMedian,
    SavitzkyGolay,
}

public record SampleDto(double T, [property: JsonPropertyName("mV")] double MV);

public record FilterRequest(
    List<SampleDto> Samples,
    FilterType FilterType,
    double? Cutoff,
    double? CutoffLow,
    double? CutoffHigh,
    int? Window,
    int? PolynomialDegree);

public record FilterResponse(List<SampleDto> Samples);
