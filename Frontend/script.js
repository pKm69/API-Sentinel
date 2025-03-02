document.getElementById('scan-btn').addEventListener('click', async () => {
  const endpoint = document.getElementById('endpoint').value;
  const resultsList = document.getElementById('results-list');
  const summaryDiv = document.getElementById('summary');
  const loader = document.getElementById("loader");
  const scoreText = document.getElementById("score-text");

  // Clear previous results
  resultsList.innerHTML = '';
  summaryDiv.innerHTML = '';
  loader.style.display = "block"; // Show loader
  scoreText.textContent = "Score: Calculating...";

  if (!endpoint) {
    alert('Please enter an API endpoint.');
    loader.style.display = "none";
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });

    const data = await response.json();
    loader.style.display = "none"; // Hide loader

    // Display summary
    summaryDiv.innerHTML = `
      <h3>Summary</h3>
      <p>Total Vulnerabilities: ${data.summary.total_vulnerabilities}</p>
      <p>High Severity: ${data.summary.high_severity}</p>
      <p>Medium Severity: ${data.summary.medium_severity}</p>
      <p>Critical Severity: ${data.summary.critical_severity}</p>
    `;

    // Display vulnerabilities
    if (data.vulnerabilities.length > 0) {
      data.vulnerabilities.forEach((vuln) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${vuln.type}</strong> - ${vuln.severity}: ${vuln.description} <br>
                        <em>Location:</em> ${vuln.location}`;
        resultsList.appendChild(li);
      });
    } else {
      resultsList.innerHTML = '<li>No vulnerabilities found!</li>';
    }

    // Update Security Score
    updateScore(data.summary);

    // Store scan data for PDF generation
    window.latestScanData = data;

  } catch (error) {
    console.error('Error scanning API:', error);
    loader.style.display = "none"; // Hide loader
    resultsList.innerHTML = '<li>Error scanning API. Please try again.</li>';
  }
});

// Security Score Calculation
function updateScore(summary) {
  let score = 100;
  score -= summary.critical_severity * 40;
  score -= summary.high_severity * 25;
  score -= summary.medium_severity * 15;
  score = Math.max(0, score); // Prevent negative scores

  document.getElementById("score-text").textContent = `Score: ${score} / 100`;
}

// PDF Generation Function (Includes vulnerability locations)
function generatePDF() {
  if (!window.latestScanData) {
    alert("No scan results available. Please scan an API first.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.text("API Security Scan Report", 10, 10);

  let y = 20; // Starting y position

  // Add vulnerabilities
  window.latestScanData.vulnerabilities.forEach((vuln, index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${vuln.type}`, 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Severity: ${vuln.severity}`, 10, y + 5);
    doc.text(`Description: ${vuln.description}`, 10, y + 10);
    doc.text(`Location: ${vuln.location}`, 10, y + 15);
    y += 25; // Move down for the next item
  });

  // Add Summary
  doc.setFont("helvetica", "bold");
  doc.text("Summary:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Vulnerabilities: ${window.latestScanData.summary.total_vulnerabilities}`, 10, y + 5);
  doc.text(`High Severity: ${window.latestScanData.summary.high_severity}`, 10, y + 10);
  doc.text(`Medium Severity: ${window.latestScanData.summary.medium_severity}`, 10, y + 15);
  doc.text(`Critical Severity: ${window.latestScanData.summary.critical_severity}`, 10, y + 20);
  doc.text(`Final Security Score: ${document.getElementById("score-text").textContent}`, 10, y + 30);

  // Save the PDF
  doc.save("API_Security_Report.pdf");
}

// Attach event listeners
document.getElementById('download-pdf').addEventListener('click', generatePDF);
document.getElementById('share-report').addEventListener('click', async () => {
  if (!window.latestScanData) {
    alert("No scan results available to share.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.text("API Security Scan Report", 10, 10);

  let y = 20;
  window.latestScanData.vulnerabilities.forEach((vuln, index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${vuln.type}`, 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Severity: ${vuln.severity}`, 10, y + 5);
    doc.text(`Description: ${vuln.description}`, 10, y + 10);
    doc.text(`Location: ${vuln.location}`, 10, y + 15);
    y += 25;
  });

  doc.setFont("helvetica", "bold");
  doc.text("Summary:", 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Vulnerabilities: ${window.latestScanData.summary.total_vulnerabilities}`, 10, y + 5);
  doc.text(`High Severity: ${window.latestScanData.summary.high_severity}`, 10, y + 10);
  doc.text(`Medium Severity: ${window.latestScanData.summary.medium_severity}`, 10, y + 15);
  doc.text(`Critical Severity: ${window.latestScanData.summary.critical_severity}`, 10, y + 20);

  // Convert PDF to Blob
  const pdfBlob = doc.output("blob");

  // Create a File object
  const pdfFile = new File([pdfBlob], "API_Security_Report.pdf", { type: "application/pdf" });

  // Use Web Share API to share PDF
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    navigator.share({
      title: "API Security Report",
      files: [pdfFile]
    }).catch(err => console.log("Error sharing PDF:", err));
  } else {
    alert("Sharing PDF is not supported on this browser.");
  }
});
