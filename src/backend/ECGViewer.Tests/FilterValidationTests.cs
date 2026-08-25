using ECGViewer.Api.Filters;

namespace ECGViewer.Tests;

public class FilterValidationTests
{
    [Fact]
    public void RejectsSampleCountOverLimit()
    {
        var error = FilterValidation.ValidateSampleCount(500_001);

        Assert.NotNull(error);
    }

    [Fact]
    public void AcceptsSampleCountAtLimit()
    {
        var error = FilterValidation.ValidateSampleCount(500_000);

        Assert.Null(error);
    }

    [Fact]
    public void RejectsSampleCountBelowMinimum()
    {
        var error = FilterValidation.ValidateSampleCount(1);

        Assert.NotNull(error);
    }

    [Fact]
    public void AcceptsSampleCountAtMinimum()
    {
        var error = FilterValidation.ValidateSampleCount(2);

        Assert.Null(error);
    }

    [Fact]
    public void RejectsFrequencyAboveNyquist()
    {
        var error = FilterValidation.ValidateFrequency(60.0, nyquistHz: 50.0);

        Assert.NotNull(error);
    }

    [Fact]
    public void RejectsNonPositiveFrequency()
    {
        var error = FilterValidation.ValidateFrequency(0.0, nyquistHz: 50.0);

        Assert.NotNull(error);
    }

    [Fact]
    public void AcceptsValidFrequency()
    {
        var error = FilterValidation.ValidateFrequency(25.0, nyquistHz: 50.0);

        Assert.Null(error);
    }

    [Fact]
    public void RejectsLowGreaterOrEqualHigh()
    {
        var error = FilterValidation.ValidateFrequencyRange(30.0, 30.0, nyquistHz: 50.0);

        Assert.NotNull(error);
    }

    [Fact]
    public void AcceptsValidFrequencyRange()
    {
        var error = FilterValidation.ValidateFrequencyRange(1.0, 49.5, nyquistHz: 50.0);

        Assert.Null(error);
    }

    [Fact]
    public void RejectsWindowNotPositiveInteger()
    {
        var error = FilterValidation.ValidateWindow(0, totalSamples: 100);

        Assert.NotNull(error);
    }

    [Fact]
    public void RejectsWindowGreaterThanTotalSamples()
    {
        var error = FilterValidation.ValidateWindow(101, totalSamples: 100);

        Assert.NotNull(error);
    }

    [Fact]
    public void AcceptsValidWindow()
    {
        var error = FilterValidation.ValidateWindow(5, totalSamples: 100);

        Assert.Null(error);
    }

    [Fact]
    public void RejectsDegreeGreaterOrEqualWindow()
    {
        var error = FilterValidation.ValidatePolynomialDegree(5, window: 5);

        Assert.NotNull(error);
    }

    [Fact]
    public void AcceptsValidPolynomialDegree()
    {
        var error = FilterValidation.ValidatePolynomialDegree(2, window: 5);

        Assert.Null(error);
    }
}
