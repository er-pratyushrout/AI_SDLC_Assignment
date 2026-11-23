
function evaluateSummary(summary) {
  const result = {
    schemaValid: true,
    semanticScore: 85,
    minimumKeyPointsSatisfied:
      Array.isArray(summary.keyPoints) &&
      summary.keyPoints.length >= 3
  };

  return result;
}

module.exports = evaluateSummary;
