
const test = require("node:test");
const assert = require("node:assert/strict");

const evaluateSummary = require("./summary-evaluator");

test("summary evaluation", () => {

  const result = evaluateSummary({
    summaryType: "brief",
    keyPoints: ["A", "B", "C"],
    conclusion: "Example"
  });

  assert.ok(result.schemaValid);
  assert.strictEqual(
    result.minimumKeyPointsSatisfied,
    true
  );

});
