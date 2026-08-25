using ECGViewer.Api.Filters;

namespace ECGViewer.Tests;

public class SampleRateCalculatorTests
{
    [Fact]
    public void ComputesAverageDeltaCorrectly()
    {
        // dt = 0.01s constante entre las 5 muestras -> 100 Hz
        var samples = new List<SampleDto>
        {
            new(T: 0.00, MV: 0.0),
            new(T: 0.01, MV: 0.1),
            new(T: 0.02, MV: 0.2),
            new(T: 0.03, MV: 0.3),
            new(T: 0.04, MV: 0.4),
        };

        var sampleRateHz = SampleRateCalculator.ComputeSampleRateHz(samples);

        Assert.Equal(100.0, sampleRateHz, precision: 6);
    }

    [Fact]
    public void ComputesAverageDeltaOverNonUniformSampling()
    {
        // deltas: 0.01, 0.03 -> promedio 0.02 -> 50 Hz
        var samples = new List<SampleDto>
        {
            new(T: 0.00, MV: 0.0),
            new(T: 0.01, MV: 0.1),
            new(T: 0.04, MV: 0.2),
        };

        var sampleRateHz = SampleRateCalculator.ComputeSampleRateHz(samples);

        Assert.Equal(50.0, sampleRateHz, precision: 6);
    }
}
