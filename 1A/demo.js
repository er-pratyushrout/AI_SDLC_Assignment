const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const workDir = path.join(__dirname, "demo-output");
const maxAttempts = 2;

/*
ATTEMPT 1
Missing invariant validation:
MIN_KEYPOINTS_CHECK
*/

const failingEvaluator = `
function evaluateSummary(summary) {
  const result = {
    schemaValid: true,
    semanticScore: 85
  };

  return result;
}

module.exports = evaluateSummary;
`;

/*
ATTEMPT 2
Corrected evaluator.
*/

const repairedEvaluator = `
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
`;

const failingTest = `
const test = require("node:test");
const assert = require("node:assert/strict");

const evaluateSummary = require("./summary-evaluator");

test("summary evaluation", () => {

  const result = evaluateSummary({
    summaryType: "brief",
    keyPoints: ["A", "B"],
    conclusion: "Example"
  });

  assert.ok(result.schemaValid);

});
`;

const repairedTest = `
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
`;

function resetWorkspace() {
  fs.rmSync(workDir, {
    recursive: true,
    force: true
  });

  fs.mkdirSync(workDir, {
    recursive: true
  });
}

function writeArtifacts(attempt) {

  fs.writeFileSync(
    path.join(workDir, "summary-evaluator.js"),
    attempt === 1
      ? failingEvaluator
      : repairedEvaluator
  );

  fs.writeFileSync(
    path.join(workDir, "summary-evaluator.test.js"),
    attempt === 1
      ? failingTest
      : repairedTest
  );
}

function runSensor() {

  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, "sensor.js"),
      workDir
    ],
    {
      encoding: "utf8"
    }
  );

  const report = JSON.parse(
    fs.readFileSync(
      path.join(workDir, "sensor-report.json"),
      "utf8"
    )
  );

  return {
    exitCode: result.status,
    report
  };
}

resetWorkspace();

const audit = {
  mode: "pdf-summarizer-simulation",
  feature: "summary-evaluation",
  maxAttempts,
  attempts: [],
  finalStatus: "FAILED"
};

for (
  let attempt = 1;
  attempt <= maxAttempts;
  attempt++
) {

  console.log(
    `\n=== ATTEMPT ${attempt} ===`
  );

  writeArtifacts(attempt);

  const result = runSensor();

  audit.attempts.push({
    attempt,
    passed: result.report.passed,
    findings: result.report.findings,
    dynamicPassed:
      result.report.dynamicPassed
  });

  if (result.report.passed) {
    audit.finalStatus = "SUCCESS";
    break;
  }

  console.log(
    "Sensor rejected attempt:"
  );

  console.log(
    JSON.stringify(
      result.report.findings,
      null,
      2
    )
  );

  console.log(
    "Applying predetermined repair."
  );
}

fs.writeFileSync(
  path.join(workDir, "attempt-log.json"),
  JSON.stringify(audit, null, 2)
);

console.log(
  "\n=== FINAL AUDIT ==="
);

console.log(
  JSON.stringify(audit, null, 2)
);

process.exit(
  audit.finalStatus === "SUCCESS"
    ? 0
    : 1
);