/* =========================================================
   Multiclass Email Security Detection
   ========================================================= */

const API_URL = "/predict";

const form = document.getElementById("analysisForm");
const subjectInput = document.getElementById("subject");
const bodyInput = document.getElementById("body");
const classifyBtn = document.getElementById("classifyBtn");
const buttonText = document.getElementById("buttonText");
const spinner = document.getElementById("spinner");
const resultBox = document.getElementById("result");
const emptyState = document.getElementById("emptyState");
const sampleButtons = document.querySelectorAll(".sample-btn");

/* =========================================================
   Sample Emails
   These are synthetic examples for demo purposes only.
   ========================================================= */

const samples = {
  ham: {
    subject: "Meeting schedule confirmation",
    body:
      "Hello, I am writing to confirm our meeting scheduled for tomorrow at 10:00 AM. Please let me know if the time still works for you. Best regards."
  },

  spam: {
    subject: "You have won a special cash reward",
    body:
      "Congratulations. You have been selected to receive a special cash prize. Reply now to claim your reward before this offer expires."
  },

  phishing: {
    subject: "Urgent account verification required",
    body:
      "Your account has been temporarily suspended due to unusual activity. Please verify your login details immediately using the link below to restore access."
  },

promotion: {
  subject: "Your 10% off promo code is inside! Inbox",
  body:
    "Your offer is here! Use code TUBYA2020 at checkout to save 10% on certifications, vouchers, and training that will help you advance your career.\n\nClaim your offer."
}
};

/* =========================================================
   Utility Functions
   ========================================================= */

function setLoading(isLoading) {
  classifyBtn.disabled = isLoading;
  buttonText.textContent = isLoading ? "Analyzing..." : "Analyze Email";
  spinner.style.display = isLoading ? "inline-block" : "none";
}

function showResult() {
  resultBox.style.display = "block";

  if (emptyState) {
    emptyState.style.display = "none";
  }
}

function hideResult() {
  resultBox.style.display = "none";

  if (emptyState) {
    emptyState.style.display = "flex";
  }
}

function formatClassName(label) {
  if (!label) return "Unknown";
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

function getRiskDetails(prediction) {
  const label = prediction.toLowerCase();

  const riskMap = {
    ham: {
      level: "Low Risk",
      className: "risk-low",
      recommendation:
        "This email appears to be legitimate. Still, verify the sender before opening attachments or links."
    },

    spam: {
      level: "Medium Risk",
      className: "risk-medium",
      recommendation:
        "This email may be unwanted or misleading. Avoid replying or interacting with suspicious links."
    },

    phishing: {
      level: "High Risk",
      className: "risk-high",
      recommendation:
        "This email may be malicious. Do not click links, download attachments, or share personal information."
    },

    promotion: {
      level: "Low to Medium Risk",
      className: "risk-medium",
      recommendation:
        "This email appears promotional. Review it carefully before clicking external links or offers."
    }
  };

  return riskMap[label] || {
    level: "Unknown Risk",
    className: "risk-unknown",
    recommendation:
      "The model returned an unknown class. Review the email manually before taking action."
  };
}

function detectIndicators(text) {
  const lowerText = text.toLowerCase();

  const checks = [
    {
      label: "Urgency language",
      terms: ["urgent", "immediately", "act now", "limited time", "expires", "suspended"]
    },
    {
      label: "Credential request",
      terms: ["password", "login", "verify", "account", "credentials", "bank"]
    },
    {
      label: "Financial or reward language",
      terms: ["prize", "reward", "cash", "winner", "discount", "offer"]
    },
    {
      label: "External link pattern",
      terms: ["http://", "https://", "www."]
    }
  ];

  return checks
    .filter((check) => check.terms.some((term) => lowerText.includes(term)))
    .map((check) => check.label);
}

function normalizeProbabilities(probabilities) {
  const classes = ["ham", "spam", "phishing", "promotion"];
  const normalized = {};

  classes.forEach((label) => {
    normalized[label] = Number(probabilities?.[label] || 0);
  });

  return normalized;
}

function createProbabilityRows(probabilities) {
  const normalized = normalizeProbabilities(probabilities);

  return Object.entries(normalized)
    .map(([label, value]) => {
      const percent = Math.max(0, Math.min(value * 100, 100));

      return `
        <div class="probability-row">
          <div class="probability-label">
            <span>${formatClassName(label)}</span>
            <strong>${percent.toFixed(2)}%</strong>
          </div>
          <div class="probability-track">
            <div class="probability-fill" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderError(message) {
  resultBox.innerHTML = `
    <div class="error">
      ${message}
    </div>
  `;

  showResult();
}

function renderResult(data, originalText) {
  const prediction = data.prediction || "unknown";
  const probabilities = normalizeProbabilities(data.probabilities);
  const confidence = probabilities[prediction] || 0;
  const confidencePercent = Math.max(0, Math.min(confidence * 100, 100));

  const risk = getRiskDetails(prediction);
  const indicators = detectIndicators(originalText);

  const indicatorHtml = indicators.length
    ? indicators.map((item) => `<span class="indicator">${item}</span>`).join("")
    : `<span class="indicator muted">No simple keyword indicator detected</span>`;

  resultBox.innerHTML = `
    <div class="result-header">
      <div>
        <span class="result-label">Predicted Class</span>
        <h3>${formatClassName(prediction)}</h3>
      </div>

      <span class="risk-badge ${risk.className}">
        ${risk.level}
      </span>
    </div>

    <div class="confidence-block">
      <div class="confidence-top">
        <span>Model Confidence</span>
        <strong>${confidencePercent.toFixed(2)}%</strong>
      </div>

      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
      </div>
    </div>

    <div class="recommendation-box">
      <span>Security Recommendation</span>
      <p>${risk.recommendation}</p>
    </div>

    <div class="indicators-box">
      <span>Basic Text Indicators</span>
      <div class="indicator-list">
        ${indicatorHtml}
      </div>
    </div>

    <div class="probability-box">
      <span>Class Probability Distribution</span>
      ${createProbabilityRows(probabilities)}
    </div>
  `;

  showResult();
}

/* =========================================================
   Sample Button Events
   ========================================================= */

sampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sampleType = button.dataset.sample;
    const sample = samples[sampleType];

    if (!sample) return;

    subjectInput.value = sample.subject;
    bodyInput.value = sample.body;

    hideResult();
    subjectInput.focus();
  });
});

/* =========================================================
   Form Submit Event
   ========================================================= */

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const subject = subjectInput.value.trim();
  const body = bodyInput.value.trim();
  const text = `${subject}\n${body}`.trim();

  if (text.length < 10) {
    renderError("Please enter a longer email message for analysis.");
    return;
  }

  setLoading(true);
  hideResult();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      renderError(data.error || "The email could not be analyzed.");
      return;
    }

    renderResult(data, text);
  } catch (error) {
    renderError(
      "Backend not reachable. Make sure the Flask server is running on http://localhost:8000."
    );
  } finally {
    setLoading(false);
  }
});
