const DATASETS = [
  {
    label: "Chiller",
    file: "data/Big_Data_Chiller_2023_2025.csv"
  },
  {
    label: "Conductivity / RO Water",
    file: "data/Big_Data_Conduct_2023_2025.csv"
  },
  {
    label: "Raw Water",
    file: "data/Big_Data_Raw_Water_2023_2025..csv"
  },
  {
    label: "CDA",
    file: "data/Big_Data_CDA_2023_2025.csv"
  },
  {
    label: "RO D",
    file: "data/Big_Data_Ro_D_2023_2025.csv"
  }
];

const state = {
  datasets: [],
  chart: null,
  missingFiles: []
};

const els = {};

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  cacheElements();
  setLoadingState();

  try {
    await loadAllDatasets();

    if (state.datasets.length === 0) {
      showDashboardError(
        "No CSV data could be loaded.",
        "Check that your CSV files are inside the data folder and that you opened the site with VS Code Live Server."
      );
      return;
    }

    fillDatasetDropdown();
    fillMetricDropdown();
    setDateLimits();
    bindEvents();
    updateDashboard();
    updateLoadNote();
  } catch (error) {
    console.error(error);
    showDashboardError(
      "Could not load the dashboard.",
      error.message || "Please check the console for details."
    );
  }
}

function cacheElements() {
  const ids = [
    "datasetSelect",
    "metricSelect",
    "groupBySelect",
    "aggregateSelect",
    "chartTypeSelect",
    "fromDate",
    "toDate",
    "ignoreZero",
    "resetBtn",
    "downloadPdfBtn",
    "recordsStat",
    "avgStat",
    "minStat",
    "maxStat",
    "chartTitle",
    "chartNote",
    "dateRangeBadge",
    "loadNote",
    "previewTable"
  ];

  ids.forEach(id => {
    els[id] = document.getElementById(id);
  });
}

function setLoadingState() {
  if (els.dateRangeBadge) els.dateRangeBadge.textContent = "Loading data...";
  if (els.loadNote) els.loadNote.textContent = "Please wait while the CSV files are being read.";
}

async function loadAllDatasets() {
  state.datasets = [];
  state.missingFiles = [];

  for (const datasetConfig of DATASETS) {
    try {
      const response = await fetch(datasetConfig.file);

      if (!response.ok) {
        throw new Error(`Could not load ${datasetConfig.file}`);
      }

      const csvText = await response.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: header => cleanHeader(header)
      });

      const headers = (parsed.meta.fields || [])
        .map(cleanHeader)
        .filter(header => header);

      const dateColumn = detectDateColumn(headers);

      if (!dateColumn) {
        throw new Error(`No date column found in ${datasetConfig.file}`);
      }

      const rows = parsed.data
        .map(row => normalizeRow(row, dateColumn))
        .filter(row => row.DateObj instanceof Date && !isNaN(row.DateObj.getTime()));

      const numericColumns = detectNumericColumns(rows, headers, dateColumn);

      if (rows.length === 0) {
        throw new Error(`No valid dated rows found in ${datasetConfig.file}`);
      }

      if (numericColumns.length === 0) {
        throw new Error(`No numeric metric columns found in ${datasetConfig.file}`);
      }

      state.datasets.push({
        ...datasetConfig,
        rows,
        headers,
        dateColumn,
        numericColumns
      });
    } catch (error) {
      console.warn(error.message);
      state.missingFiles.push({
        label: datasetConfig.label,
        file: datasetConfig.file,
        reason: error.message
      });
    }
  }
}

function cleanHeader(header) {
  return String(header || "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDateColumn(headers) {
  return headers.find(header => header.toLowerCase() === "date")
    || headers.find(header => header.toLowerCase().includes("date"));
}

function normalizeRow(row, dateColumn) {
  const cleaned = {};

  Object.keys(row).forEach(key => {
    const cleanedKey = cleanHeader(key);
    if (cleanedKey) {
      cleaned[cleanedKey] = typeof row[key] === "string" ? row[key].trim() : row[key];
    }
  });

  cleaned.DateObj = parseDMYDate(cleaned[dateColumn]);
  return cleaned;
}

// The provided facility CSV files use day/month/year format, for example 17/6/2026.
function parseDMYDate(value) {
  if (!value) return null;

  const text = String(value).trim();
  const parts = text.split(/[/-]/);

  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  const fallback = new Date(text);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function detectNumericColumns(rows, headers, dateColumn) {
  return headers.filter(header => {
    const lowerHeader = header.toLowerCase();

    if (header === dateColumn || lowerHeader === "date" || lowerHeader.startsWith("location")) {
      return false;
    }

    let numericCount = 0;
    let checkedCount = 0;

    for (const row of rows.slice(0, 300)) {
      const rawValue = row[header];
      if (rawValue === "" || rawValue === null || rawValue === undefined) continue;

      checkedCount++;
      const value = Number(String(rawValue).replace(/,/g, ""));
      if (!isNaN(value)) numericCount++;
    }

    return checkedCount > 0 && numericCount / checkedCount >= 0.8;
  });
}

function fillDatasetDropdown() {
  els.datasetSelect.innerHTML = state.datasets
    .map((dataset, index) => `<option value="${index}">${escapeHTML(dataset.label)}</option>`)
    .join("");
}

function fillMetricDropdown() {
  const selectedDataset = state.datasets[Number(els.datasetSelect.value)];

  if (!selectedDataset) {
    els.metricSelect.innerHTML = "";
    return;
  }

  els.metricSelect.innerHTML = selectedDataset.numericColumns
    .map(column => `<option value="${escapeAttribute(column)}">${escapeHTML(column)}</option>`)
    .join("");
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setDateLimits() {
  const allDates = state.datasets.flatMap(dataset => dataset.rows.map(row => row.DateObj));
  const minDate = new Date(Math.min(...allDates.map(date => date.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(date => date.getTime())));

  els.fromDate.min = toDateInputValue(minDate);
  els.fromDate.max = toDateInputValue(maxDate);
  els.toDate.min = toDateInputValue(minDate);
  els.toDate.max = toDateInputValue(maxDate);

  els.fromDate.value = toDateInputValue(minDate);
  els.toDate.value = toDateInputValue(maxDate);

  els.dateRangeBadge.textContent = `${formatPrettyDate(minDate)} to ${formatPrettyDate(maxDate)}`;
}

function updateLoadNote() {
  const loadedText = `${state.datasets.length} dataset${state.datasets.length === 1 ? "" : "s"} loaded.`;

  if (state.missingFiles.length === 0) {
    els.loadNote.textContent = `${loadedText} All available dashboard files were found.`;
    return;
  }

  const missingText = state.missingFiles
    .map(item => item.label)
    .join(", ");

  els.loadNote.textContent = `${loadedText} Skipped missing or unreadable file(s): ${missingText}.`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPrettyDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function bindEvents() {
  els.datasetSelect.addEventListener("change", () => {
    fillMetricDropdown();
    updateDashboard();
  });

  [
    els.metricSelect,
    els.groupBySelect,
    els.aggregateSelect,
    els.chartTypeSelect,
    els.fromDate,
    els.toDate,
    els.ignoreZero
  ].forEach(element => {
    element.addEventListener("change", updateDashboard);
  });

  els.resetBtn.addEventListener("click", () => {
    els.groupBySelect.value = "month";
    els.aggregateSelect.value = "avg";
    els.chartTypeSelect.value = "line";
    els.ignoreZero.checked = true;
    setDateLimits();
    updateDashboard();
  });

  els.downloadPdfBtn.addEventListener("click", () => {
    downloadGraphAsPDF();
  });
}

function getFilteredRows() {
  const dataset = state.datasets[Number(els.datasetSelect.value)];
  const metric = els.metricSelect.value;
  const from = els.fromDate.value ? new Date(els.fromDate.value) : null;
  const to = els.toDate.value ? new Date(els.toDate.value) : null;

  if (!dataset || !metric) return [];
  if (to) to.setHours(23, 59, 59, 999);

  return dataset.rows
    .map(row => {
      const value = Number(String(row[metric]).replace(/,/g, ""));
      return { ...row, SelectedValue: value };
    })
    .filter(row => {
      const validNumber = !isNaN(row.SelectedValue);
      const zeroAllowed = !els.ignoreZero.checked || row.SelectedValue !== 0;
      const fromMatch = !from || row.DateObj >= from;
      const toMatch = !to || row.DateObj <= to;
      return validNumber && zeroAllowed && fromMatch && toMatch;
    });
}

function groupRows(rows) {
  const groups = new Map();
  const groupBy = els.groupBySelect.value;
  const aggregate = els.aggregateSelect.value;

  rows.forEach(row => {
    const key = getGroupKey(row.DateObj, groupBy);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row.SelectedValue);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => {
      const sum = values.reduce((total, value) => total + value, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const count = values.length;

      let finalValue = avg;
      if (aggregate === "sum") finalValue = sum;
      if (aggregate === "min") finalValue = min;
      if (aggregate === "max") finalValue = max;
      if (aggregate === "count") finalValue = count;

      return {
        period,
        value: Number(finalValue.toFixed(3)),
        count
      };
    });
}

function getGroupKey(date, groupBy) {
  const year = date.getFullYear();

  if (groupBy === "year") {
    return String(year);
  }

  if (groupBy === "month") {
    return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  if (groupBy === "week") {
    return `${getISOWeekYear(date)}-W${String(getISOWeekNumber(date)).padStart(2, "0")}`;
  }

  return toDateInputValue(date);
}

function getISOWeekNumber(date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear(date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  return temp.getUTCFullYear();
}

function updateDashboard() {
  const rows = getFilteredRows();
  const groupedRows = groupRows(rows);

  updateStats(rows);
  updateChart(groupedRows, rows.length);
  updateTable(rows);
}

function updateStats(rows) {
  els.recordsStat.textContent = rows.length.toLocaleString();

  if (rows.length === 0) {
    els.avgStat.textContent = "0";
    els.minStat.textContent = "0";
    els.maxStat.textContent = "0";
    return;
  }

  const values = rows.map(row => row.SelectedValue);
  const sum = values.reduce((total, value) => total + value, 0);

  els.avgStat.textContent = formatNumber(sum / values.length);
  els.minStat.textContent = formatNumber(Math.min(...values));
  els.maxStat.textContent = formatNumber(Math.max(...values));
}

function updateChart(groupedRows, rowCount) {
  const canvas = document.getElementById("myChart");

  if (!canvas) {
    console.error("Chart canvas with id 'myChart' was not found.");
    return;
  }

  const dataset = state.datasets[Number(els.datasetSelect.value)];
  const metric = els.metricSelect.value;
  const aggregateLabel = els.aggregateSelect.options[els.aggregateSelect.selectedIndex].text;
  const groupLabel = els.groupBySelect.options[els.groupBySelect.selectedIndex].text.toLowerCase();
  const chartType = els.chartTypeSelect.value;

  els.chartTitle.textContent = `${dataset.label}: ${metric}`;
  els.chartNote.textContent = `${aggregateLabel} value grouped by ${groupLabel}. ${rowCount.toLocaleString()} records are currently used.`;

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  if (groupedRows.length === 0) {
    els.chartNote.textContent = "No valid records found for this filter. Try changing the date range, metric, or Ignore 0 values option.";
    return;
  }

  state.chart = new Chart(canvas, {
    type: chartType,
    data: {
      labels: groupedRows.map(row => row.period),
      datasets: [
        {
          label: `${aggregateLabel} of ${metric}`,
          data: groupedRows.map(row => row.value),
          borderColor: "#b0002a",
          backgroundColor: chartType === "bar" ? "rgba(176, 0, 42, 0.72)" : "rgba(176, 0, 42, 0.12)",
          pointBackgroundColor: "#b0002a",
          pointBorderColor: "#ffffff",
          borderWidth: 2,
          pointRadius: chartType === "line" ? 2 : 0,
          pointHoverRadius: chartType === "line" ? 4 : 0,
          tension: 0.28,
          fill: chartType === "line"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            boxWidth: 14,
            boxHeight: 14,
            color: "#344054",
            font: {
              family: "Arial",
              weight: "bold"
            }
          }
        },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${formatNumber(context.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Time period",
            color: "#667085",
            font: {
              weight: "bold"
            }
          },
          ticks: {
            color: "#667085",
            maxRotation: 60,
            autoSkip: true,
            maxTicksLimit: 16
          },
          grid: {
            color: "rgba(228, 231, 236, 0.75)"
          }
        },
        y: {
          title: {
            display: true,
            text: aggregateLabel,
            color: "#667085",
            font: {
              weight: "bold"
            }
          },
          ticks: {
            color: "#667085",
            callback: value => formatNumber(value)
          },
          grid: {
            color: "rgba(228, 231, 236, 0.9)"
          },
          beginAtZero: false
        }
      }
    }
  });
}

function updateTable(rows) {
  const dataset = state.datasets[Number(els.datasetSelect.value)];

  if (!dataset) {
    els.previewTable.innerHTML = "";
    return;
  }

  const headers = dataset.headers.filter(header => header !== "");
  const previewRows = rows.slice(0, 100);

  if (previewRows.length === 0) {
    els.previewTable.innerHTML = `
      <tbody>
        <tr>
          <td class="empty-message">No rows match the current filter.</td>
        </tr>
      </tbody>
    `;
    return;
  }

  els.previewTable.innerHTML = `
    <thead>
      <tr>${headers.map(header => `<th>${escapeHTML(header)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${previewRows.map(row => `
        <tr>
          ${headers.map(header => `<td>${escapeHTML(row[header] ?? "")}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function formatNumber(value) {
  if (!isFinite(value)) return "0";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function showDashboardError(title, message) {
  if (els.dateRangeBadge) els.dateRangeBadge.textContent = title;
  if (els.loadNote) els.loadNote.textContent = message;
  if (els.chartTitle) els.chartTitle.textContent = title;
  if (els.chartNote) els.chartNote.textContent = message;
  if (els.previewTable) {
    els.previewTable.innerHTML = `
      <tbody>
        <tr>
          <td class="empty-message">${escapeHTML(message)}</td>
        </tr>
      </tbody>
    `;
  }
}

function downloadGraphAsPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library is still loading. Please try again in a moment.");
    return;
  }

  const chartCanvas = document.getElementById("myChart");

  if (!chartCanvas || !state.chart) {
    alert("Graph is not ready yet. Please wait for the dashboard to load.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "mm", "a4");

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  const titleY = 14;
  const subtitleY = 21;
  const imageY = 29;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = pageHeight - imageY - margin;

  const title = els.chartTitle.textContent || "Facility Data Graph Report";
  const subtitle = els.chartNote.textContent || "";
  const exportCanvas = document.createElement("canvas");
  const exportContext = exportCanvas.getContext("2d");

  exportCanvas.width = chartCanvas.width;
  exportCanvas.height = chartCanvas.height;
  exportContext.fillStyle = "#ffffff";
  exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.drawImage(chartCanvas, 0, 0);

  const chartImage = exportCanvas.toDataURL("image/png", 1.0);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(title, pageWidth / 2, titleY, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(subtitle.slice(0, 150), pageWidth / 2, subtitleY, { align: "center" });

  pdf.addImage(chartImage, "PNG", margin, imageY, imageWidth, imageHeight);

  const dataset = state.datasets[Number(els.datasetSelect.value)];
  const metric = els.metricSelect.value || "graph";
  const groupBy = els.groupBySelect.value || "period";
  const fileName = `${dataset.label}_${metric}_${groupBy}_graph.pdf`
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  pdf.save(fileName);
}
