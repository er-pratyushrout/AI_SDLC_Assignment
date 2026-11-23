import { expect, test } from "@playwright/test";

const documentId = "507f1f77bcf86cd799439011";
let selectedMode: "brief" | "standard" | "detailed" = "standard";

function summaryFor(mode: typeof selectedMode) {
  return {
    id: `summary-${mode}`,
    summaryType: mode,
    content: {
      keyPoints: [`Key point for ${mode}.`],
      findings: [`Finding for ${mode}.`],
      conclusions: [`Conclusion for ${mode}.`],
    },
    generatedAt: new Date().toISOString(),
  };
}

test.beforeEach(async ({ page }) => {
  selectedMode = "standard";
  await page.route("**/api/documents/upload", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: documentId,
        fileName: "report.pdf",
        fileSizeBytes: 1200,
        pageCount: 2,
        uploadedAt: new Date().toISOString(),
        processingStatus: "ready",
        generationStatus: "idle",
        lastErrorCode: null,
      }),
    });
  });
  await page.route(`**/api/documents/${documentId}/summarize`, async (route) => {
    selectedMode = route.request().postDataJSON().summaryType;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        documentId,
        generationStatus: "processing",
        requestedSummaryType: selectedMode,
        lastErrorCode: null,
        currentSummary: null,
      }),
    });
  });
  await page.route(`**/api/documents/${documentId}/summary`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        documentId,
        generationStatus: "completed",
        requestedSummaryType: selectedMode,
        lastErrorCode: null,
        currentSummary: summaryFor(selectedMode),
      }),
    });
  });
});

test("uploads a PDF and generates Brief, Standard, and Detailed summaries", async ({ page }) => {
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Choose a PDF")).toBeFocused();
  await page.getByLabel("Choose a PDF").setInputFiles({
    name: "report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });

  await expect(page.getByText("report.pdf")).toBeVisible();
  for (const [label, mode] of [
    ["Brief", "brief"],
    ["Standard", "standard"],
    ["Detailed", "detailed"],
  ] as const) {
    await page.getByRole("radio", { name: label }).check();
    await page.getByRole("button", { name: /generate summary/i }).click();
    await expect(page.getByText(`Key point for ${mode}.`)).toBeVisible();
    await expect(page.getByText(`Finding for ${mode}.`)).toBeVisible();
    await expect(page.getByText(`Conclusion for ${mode}.`)).toBeVisible();
  }
});

test("reports invalid PDFs without displaying a successful summary", async ({ page }) => {
  await page.route("**/api/documents/upload", async (route) => {
    await route.fulfill({
      status: 415,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "UNSUPPORTED_FILE_TYPE",
          message: "Choose a valid PDF file to continue.",
          requestId: "test-request",
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Choose a PDF").setInputFiles({
    name: "invalid.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });

  await expect(page.getByRole("alert")).toHaveText(/valid PDF/i);
  await expect(page.getByRole("heading", { name: "Summary" })).not.toBeVisible();
});
