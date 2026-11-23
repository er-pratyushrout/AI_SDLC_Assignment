const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const targetDir = path.resolve(process.argv[2] || ".");

const servicePath = path.join(targetDir, "pdf.service.js");
const testPath = path.join(targetDir, "pdf.service.test.js");
const reportPath = path.join(targetDir, "sensor-report.json");

function addFinding(findings, code, message) {
  findings.push({
    code,
    message,
  });
}

function runStaticChecks() {
  const findings = [];

  if (!fs.existsSync(servicePath)) {
    addFinding(
      findings,
      "MISSING_SERVICE",
      "pdf.service.js does not exist."
    );
  }

  if (!fs.existsSync(testPath)) {
    addFinding(
      findings,
      "MISSING_TEST",
      "pdf.service.test.js does not exist."
    );
  }

  if (findings.length > 0) {
    return findings;
  }

  const serviceCode = fs.readFileSync(servicePath, "utf8");
  const testCode = fs.readFileSync(testPath, "utf8");

  const requiredPatterns = [
    {
      code: "MISSING_201_ASSERTION",
      regex: /assert\.strictEqual\(.*201\)/,
      message:
        "Missing exact assertion for successful PDF upload (201).",
    },
    {
      code: "MISSING_413_ASSERTION",
      regex: /assert\.strictEqual\(.*413\)/,
      message:
        "Missing exact assertion for oversized PDF rejection (413).",
    },
    {
      code: "MISSING_415_ASSERTION",
      regex: /assert\.strictEqual\(.*415\)/,
      message:
        "Missing exact assertion for invalid PDF rejection (415).",
    },
    {
      code: "MISSING_422_ASSERTION",
      regex: /assert\.strictEqual\(.*422\)/,
      message:
        "Missing exact assertion for empty/corrupt PDF rejection (422).",
    }
  ];

  for (const rule of requiredPatterns) {
    if (!rule.regex.test(testCode)) {
      addFinding(findings, rule.code, rule.message);
    }
  }

  if (!/module\.exports/.test(serviceCode)) {
    addFinding(
      findings,
      "SERVICE_NOT_EXPORTED",
      "pdf.service.js must export functionality."
    );
  }

  if (!/20\s*\*\s*1024\s*\*\s*1024|20971520/.test(serviceCode)) {
    addFinding(
      findings,
      "FILE_LIMIT_NOT_VISIBLE",
      "20MB file-size validation not detected."
    );
  }

  return findings;
}

function runDynamicChecks() {
  if (!fs.existsSync(testPath)) {
    return {
      passed: false,
      exitCode: null,
      stdout: "",
      stderr: "Test file missing."
    };
  }

  const result = spawnSync(
    process.execPath,
    ["--test", "pdf.service.test.js"],
    {
      cwd: targetDir,
      encoding: "utf8",
      timeout: 15000
    }
  );

  return {
    passed: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

const staticFindings = runStaticChecks();

const dynamic =
  staticFindings.length === 0
    ? runDynamicChecks()
    : {
        passed: false,
        exitCode: null,
        stdout: "",
        stderr:
          "Dynamic checks skipped until static findings are resolved.",
      };

const report = {
  targetDir,
  checkedAt: new Date().toISOString(),
  staticPassed: staticFindings.length === 0,
  dynamicPassed: dynamic.passed,
  passed:
    staticFindings.length === 0 &&
    dynamic.passed,
  findings: staticFindings,
  testExecution: dynamic,
};

fs.writeFileSync(
  reportPath,
  JSON.stringify(report, null, 2)
);

console.log(JSON.stringify(report, null, 2));

process.exit(report.passed ? 0 : 1);