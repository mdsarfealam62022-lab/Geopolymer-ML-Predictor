/* ════════════════════════════════════════════════════════════
   GeoPredict — app.js
   Handles: API calls, charts, PDF export, particle canvas
   ════════════════════════════════════════════════════════════ */

"use strict";

// ── Particle Canvas ────────────────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H, particles = [];
  const N = 60;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  class Particle {
    constructor() { this.reset(true); }
    reset(rand) {
      this.x  = Math.random() * W;
      this.y  = rand ? Math.random() * H : H + 10;
      this.r  = 1 + Math.random() * 2;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(0.2 + Math.random() * 0.5);
      this.a  = 0.3 + Math.random() * 0.5;
      this.da = 0.001 + Math.random() * 0.002;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.a -= this.da;
      if (this.a <= 0 || this.y < -10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,170,${this.a})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < N; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    // Connection lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,170,${0.07 * (1 - d/120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
})();


// ── Slider Sync ────────────────────────────────────────────────────────────────
function syncInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
  updateSliderFill(document.getElementById("s_" + id));
  updatePieChart();
}
function syncSlider(id, val) {
  const el = document.getElementById("s_" + id);
  if (el) {
    el.value = val;
    updateSliderFill(el);
  }
  updatePieChart();
}
function updateSliderFill(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty("--pct", pct + "%");
}
// Initialize all sliders on load
document.querySelectorAll(".slider").forEach(s => updateSliderFill(s));


// ── Age Presets ────────────────────────────────────────────────────────────────
function setAge(days) {
  document.getElementById("age").value       = days;
  document.getElementById("s_age").value     = days;
  updateSliderFill(document.getElementById("s_age"));
  document.querySelectorAll(".preset-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === days + "d");
  });
  updatePieChart();
}


// ── Get Input Values ───────────────────────────────────────────────────────────
function getValues() {
  return {
    fly_ash:         parseFloat(document.getElementById("fly_ash").value)         || 0,
    ggbs:            parseFloat(document.getElementById("ggbs").value)             || 0,
    naoh_molarity:   parseFloat(document.getElementById("naoh_molarity").value)   || 0,
    na2sio3_naoh:    parseFloat(document.getElementById("na2sio3_naoh").value)    || 0,
    water:           parseFloat(document.getElementById("water").value)           || 0,
    superplasticizer:parseFloat(document.getElementById("superplasticizer").value)|| 0,
    fine_agg:        parseFloat(document.getElementById("fine_agg").value)        || 0,
    coarse_agg:      parseFloat(document.getElementById("coarse_agg").value)      || 0,
    curing_temp:     parseFloat(document.getElementById("curing_temp").value)     || 0,
    curing_time:     parseFloat(document.getElementById("curing_time").value)     || 0,
    age:             parseFloat(document.getElementById("age").value)             || 0,
  };
}


// ── Charts Setup ───────────────────────────────────────────────────────────────
let pieChartInstance = null;
let barChartInstance = null;

const PIE_LABELS  = ["Fly Ash","GGBS","Water","Superplasticizer","Fine Agg","Coarse Agg"];
const PIE_KEYS    = ["fly_ash","ggbs","water","superplasticizer","fine_agg","coarse_agg"];
const PIE_COLORS  = ["#00d4aa","#ff7a35","#3d9bff","#9b6bff","#ffd166","#ff4d6a"];

function initPieChart() {
  const ctx = document.getElementById("pieChart").getContext("2d");
  const vals = getValues();
  const data = PIE_KEYS.map(k => vals[k]);

  pieChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: PIE_LABELS,
      datasets: [{
        data,
        backgroundColor: PIE_COLORS.map(c => c + "cc"),
        borderColor:     PIE_COLORS,
        borderWidth: 2,
        hoverOffset: 12,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
              const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${ctx.parsed} kg/m³ (${pct}%)`;
            }
          },
          backgroundColor: "#1c2235",
          titleColor: "#00d4aa",
          bodyColor:  "#d4dae8",
          borderColor:"rgba(0,212,170,0.2)",
          borderWidth: 1,
          padding: 12,
        }
      },
      animation: { animateRotate: true, duration: 800 }
    }
  });

  // Build legend
  buildPieLegend(PIE_LABELS, PIE_COLORS, data);
}

function buildPieLegend(labels, colors, vals) {
  const legend = document.getElementById("pieLegend");
  legend.innerHTML = labels.map((l, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${l}: <strong style="color:#fff">${vals[i]}</strong></span>
    </div>
  `).join("");
}

function updatePieChart() {
  if (!pieChartInstance) return;
  const vals = getValues();
  const data = PIE_KEYS.map(k => vals[k]);
  pieChartInstance.data.datasets[0].data = data;
  pieChartInstance.update("none");
  buildPieLegend(PIE_LABELS, PIE_COLORS, data);
}


// ── Feature Importance Bar Chart ──────────────────────────────────────────────
async function initBarChart() {
  let features = [];
  let importances = [];

  try {
    const res = await fetch("/feature-importance");
    if (res.ok) {
      const d    = await res.json();
      features   = d.features;
      importances= d.importances;
    }
  } catch (_) {
    // Fallback: correlation approximations from EDA
    features    = ["Age(days)","GGBS","NaOH_Molarity","FlyAsh","Curing_Temp","Water","Fine_Agg","Na₂SiO₃/NaOH","Superplasticizer","Coarse_Agg","Curing_Time"];
    importances = [0.37, 0.21, 0.16, 0.09, 0.06, 0.04, 0.03, 0.02, 0.01, 0.01, 0.01];
  }

  // Sort descending
  const combined = features.map((f,i) => ({f, v: importances[i]}))
    .sort((a,b) => b.v - a.v);
  const sortedF = combined.map(x => x.f);
  const sortedV = combined.map(x => parseFloat((x.v * 100).toFixed(2)));

  const barColors = sortedV.map(v =>
    v > 25 ? "#00d4aa" :
    v > 15 ? "#3d9bff" :
    v > 8  ? "#ff7a35" : "#9b6bff"
  );

  const ctx = document.getElementById("barChart").getContext("2d");
  barChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedF,
      datasets: [{
        label: "Importance (%)",
        data: sortedV,
        backgroundColor: barColors.map(c => c + "bb"),
        borderColor:     barColors,
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: barColors,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x.toFixed(2)}% importance`
          },
          backgroundColor: "#1c2235",
          titleColor: "#00d4aa",
          bodyColor: "#d4dae8",
          borderColor: "rgba(0,212,170,0.2)",
          borderWidth: 1,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { color:"rgba(255,255,255,0.04)" },
          ticks: { color:"#6e7a96", font:{family:"JetBrains Mono",size:11} },
          title: { display:true, text:"Importance (%)", color:"#6e7a96", font:{size:11} }
        },
        y: {
          grid: { display: false },
          ticks: { color:"#d4dae8", font:{family:"Rajdhani",size:12,weight:"600"} }
        }
      },
      animation: { duration: 1000, easing: "easeOutQuart" }
    }
  });
}


// ── Prediction ────────────────────────────────────────────────────────────────
let lastResult = null; // Store for PDF

async function runPrediction() {
  const btn    = document.getElementById("predictBtn");
  const loader = document.getElementById("btnLoader");
  const btnTxt = btn.querySelector(".btn-text");

  btn.disabled = true;
  loader.style.display = "inline-block";
  btnTxt.textContent   = "Predicting…";

  try {
    const payload = getValues();
    const res = await fetch("/predict", {
      method:  "POST",
      headers: {"Content-Type": "application/json"},
      body:    JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      showToast("Prediction failed: " + (err.detail || res.statusText));
      return;
    }

    const data = await res.json();
    lastResult = { ...data, inputs: payload };
    displayResults(data, payload);

  } catch (e) {
    showToast("Connection error. Is the FastAPI server running on port 8000?");
  } finally {
    btn.disabled = false;
    loader.style.display = "none";
    btnTxt.textContent   = "Predict Strength";
  }
}


function displayResults(data, inputs) {
  const strength = data.compressive_strength;
  const maxBar   = 80;
  const pct      = Math.min((strength / maxBar) * 100, 100);

  // Show sections
  document.getElementById("results").style.display = "block";
  document.getElementById("exportSection").style.display = "block";
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });

  // Strength number — animate counting
  const valEl = document.getElementById("strengthValue");
  animateCount(valEl, 0, strength, 1200);

  // Bar
  setTimeout(() => {
    document.getElementById("strengthBar").style.width = pct + "%";
  }, 100);

  // Grade mapping
  const gradeMap = {
    "Very Low Strength": "< M15",
    "Low Strength":      "M20 – M25",
    "Moderate Strength": "M25 – M35",
    "High Strength":     "M35 – M50",
    "Very High Strength":"M50 – M65",
    "Ultra High Strength":"M65+"
  };
  document.getElementById("strengthGrade").textContent = gradeMap[data.strength_category] || "—";

  // Category badge color
  const badge = document.getElementById("strengthCategoryBadge");
  badge.textContent = data.strength_category;
  badge.style.borderColor = getCategoryColor(data.strength_category);
  badge.style.color       = getCategoryColor(data.strength_category);
  badge.style.background  = getCategoryColor(data.strength_category) + "18";

  // Strength value color
  document.getElementById("strengthValue").style.color = getCategoryColor(data.strength_category);
  document.getElementById("strengthBar").style.background =
    `linear-gradient(90deg, ${getCategoryColor(data.strength_category)}, #00b4d8)`;

  // Usability
  renderUsability(data);
}


function getCategoryColor(cat) {
  const map = {
    "Very Low Strength":  "#ff4d6a",
    "Low Strength":       "#ff8c00",
    "Moderate Strength":  "#ffd166",
    "High Strength":      "#00d4aa",
    "Very High Strength": "#3d9bff",
    "Ultra High Strength":"#9b6bff",
  };
  return map[cat] || "#00d4aa";
}


function renderUsability(data) {
  // Fetch full details from backend (already included in response)
  const list = document.getElementById("usabilityList");
  list.innerHTML = (data.usability || []).map((u, i) => `
    <div class="use-item" style="animation-delay:${i * 0.08}s">
      <div class="use-icon">${u.icon}</div>
      <div class="use-name">${u.application}</div>
      <div class="use-detail">${u.detail}</div>
    </div>
  `).join("");
}


function animateCount(el, from, to, duration) {
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    el.textContent = (from + (to - from) * ease).toFixed(2);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = to.toFixed(2);
  }
  requestAnimationFrame(step);
}


// ── Clear All ─────────────────────────────────────────────────────────────────
function clearAll() {
  const defaults = {
    fly_ash: 300, ggbs: 75, naoh_molarity: 12, na2sio3_naoh: 2.0,
    water: 175, superplasticizer: 5.0, fine_agg: 700, coarse_agg: 1200,
    curing_temp: 60, curing_time: 24, age: 28
  };

  Object.entries(defaults).forEach(([k, v]) => {
    const inp = document.getElementById(k);
    const sld = document.getElementById("s_" + k);
    if (inp) inp.value = v;
    if (sld) { sld.value = v; updateSliderFill(sld); }
  });

  setAge(28);
  updatePieChart();

  // Hide results
  document.getElementById("results").style.display       = "none";
  document.getElementById("exportSection").style.display = "none";
  lastResult = null;

  // Reset strength display
  document.getElementById("strengthValue").textContent = "—";
  document.getElementById("strengthValue").style.color = "var(--accent)";
  document.getElementById("strengthGrade").textContent = "—";
  document.getElementById("strengthBar").style.width   = "0%";
  document.getElementById("strengthCategoryBadge").textContent = "—";
  document.getElementById("usabilityList").innerHTML   = "";
  document.getElementById("notSuitable").style.display= "none";
  document.getElementById("recommendationBox").innerHTML = "";
}

// new sarfe's line change(A)
// ── PDF Theme State ───────────────────────────────────────────────────────────
let currentPdfTheme = "light"; // default = light (white background)

function setPdfTheme(theme) {
  currentPdfTheme = theme;
  document.getElementById("themeOptLight").classList.toggle("active", theme === "light");
  document.getElementById("themeOptDark").classList.toggle("active",  theme === "dark");
}
// ── Toast Notification ────────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}


// ── PDF Export ────────────────────────────────────────────────────────────────
// ── PDF Export ────────────────────────────────────────────────────────────────
async function downloadPDF() {
  if (!lastResult) {
    showToast("Please run a prediction first.");
    return;
  }

  const isDark = currentPdfTheme === "dark";
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210, pageH = 297, margin = 15;
  let y = margin;

  // ── Theme-aware color palette ──
  const T = isDark ? {
    bg:        [10,  13,  20],
    surface:   [22,  27,  42],
    card:      [28,  34,  53],
    sectionBg: [26,  32,  48],
    textMain:  [255, 255, 255],
    textDim:   [110, 122, 150],
    textBody:  [180, 190, 210],
    border:    [40,  50,  70],
    barTrack:  [40,  46,  64],
    recBg:     [0,   40,  32],
    footerLine:[26,  32,  48],
  } : {
    bg:        [255, 255, 255],
    surface:   [245, 248, 252],
    card:      [255, 255, 255],
    sectionBg: [232, 240, 252],
    textMain:  [15,  23,  42],
    textDim:   [80,  95,  120],
    textBody:  [50,  65,  90],
    border:    [210, 220, 235],
    barTrack:  [220, 228, 240],
    recBg:     [230, 252, 246],
    footerLine:[210, 220, 235],
  };

  const C_ACCENT = [0,  180, 140];
  const C_ORANGE = [220, 100,  30];
  const C_BLUE   = [ 40, 130, 220];
  const C_PURPLE = [130,  80, 220];
  const C_RED    = [220,  60,  80];
  const C_GOLD   = [200, 155,  20];

  // ── Full page background ──
  doc.setFillColor(...T.bg);
  doc.rect(0, 0, pageW, pageH, "F");

  // ── Header Banner ──
  doc.setFillColor(...T.surface);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setDrawColor(...C_ACCENT);
  doc.setLineWidth(1.2);
  doc.line(0, 38, pageW, 38);
  doc.setFillColor(...C_ACCENT);
  doc.rect(0, 0, 4, 38, "F");

  doc.setTextColor(...C_ACCENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("GEOPREDICT", margin + 4, 16);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...T.textDim);
  doc.text("GEOPOLYMER CONCRETE COMPRESSIVE STRENGTH ANALYSIS REPORT", margin + 4, 24);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Theme: ${isDark ? "Dark" : "Light"}`, margin + 4, 31);

  doc.setFillColor(...C_ACCENT);
  doc.roundedRect(pageW - 62, 7, 52, 24, 3, 3, "F");
  doc.setTextColor(isDark ? 10 : 255, isDark ? 13 : 255, isDark ? 20 : 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("XGBoost Model", pageW - 59, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("R\u00B2 = 0.9927  |  MAE = 0.755 MPa", pageW - 59, 20);
  doc.text("RMSE = 1.011 MPa", pageW - 59, 26);

  y = 46;

  // ── Result Hero Card ──
  const str      = lastResult.compressive_strength;
  const cat      = lastResult.strength_category;
  const catColor = getCategoryColorRGB(cat);

  doc.setFillColor(...T.card);
  doc.roundedRect(margin, y, pageW - 2*margin, 40, 4, 4, "F");
  doc.setDrawColor(...catColor);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageW - 2*margin, 40, 4, 4, "S");
  doc.setFillColor(...catColor);
  doc.roundedRect(margin, y, 4, 40, 2, 2, "F");

  doc.setTextColor(...T.textDim);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("PREDICTED 28-DAY COMPRESSIVE STRENGTH", margin + 8, y + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...catColor);
  doc.text(`${str} MPa`, margin + 8, y + 28);
  doc.setFontSize(10);
  doc.text(cat, pageW - 75, y + 16);
  doc.setFontSize(8);
  doc.setTextColor(...T.textDim);
  doc.text("IS Grade: " + getGradeLabel(cat), pageW - 75, y + 24);

  const bY = y + 33;
  doc.setFillColor(...T.barTrack);
  doc.roundedRect(margin + 8, bY, pageW - 2*margin - 16, 4, 2, 2, "F");
  doc.setFillColor(...catColor);
  doc.roundedRect(margin + 8, bY, Math.max((pageW - 2*margin - 16) * Math.min(str/80,1), 3), 4, 2, 2, "F");
  y += 48;

  // ── Section Header Helper ──
  function drawSectionHeader(title) {
    doc.setFillColor(...T.sectionBg);
    doc.roundedRect(margin, y, pageW - 2*margin, 7, 2, 2, "F");
    doc.setDrawColor(...C_ACCENT);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 7, pageW - margin, y + 7);
    doc.setTextColor(...C_ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title, margin + 4, y + 5);
    y += 11;
  }

  // ── Mix Design Parameters ──
  drawSectionHeader("MIX DESIGN PARAMETERS");
  const params = [
    { label: "Fly Ash",            val: `${lastResult.inputs.fly_ash} kg/m\u00B3`,          color: C_ACCENT },
    { label: "GGBS",               val: `${lastResult.inputs.ggbs} kg/m\u00B3`,             color: C_ACCENT },
    { label: "NaOH Molarity",      val: `${lastResult.inputs.naoh_molarity} M`,              color: C_ORANGE },
    { label: "Na2SiO3/NaOH",       val: `${lastResult.inputs.na2sio3_naoh}`,                color: C_ORANGE },
    { label: "Water",              val: `${lastResult.inputs.water} kg/m\u00B3`,             color: C_BLUE },
    { label: "Superplasticizer",   val: `${lastResult.inputs.superplasticizer} kg/m\u00B3`, color: C_BLUE },
    { label: "Fine Aggregate",     val: `${lastResult.inputs.fine_agg} kg/m\u00B3`,          color: C_PURPLE },
    { label: "Coarse Aggregate",   val: `${lastResult.inputs.coarse_agg} kg/m\u00B3`,        color: C_PURPLE },
    { label: "Curing Temperature", val: `${lastResult.inputs.curing_temp} \u00B0C`,          color: C_ORANGE },
    { label: "Curing Time",        val: `${lastResult.inputs.curing_time} h`,                color: C_ORANGE },
    { label: "Age",                val: `${lastResult.inputs.age} days`,                     color: C_ACCENT },
  ];
  const cols = 3, cellW = (pageW - 2*margin) / cols, cellH = 15;
  params.forEach((p, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = margin + col * cellW, cy = y + row * (cellH + 2);
    doc.setFillColor(...T.card);
    doc.roundedRect(cx, cy, cellW - 2, cellH, 2, 2, "F");
    doc.setDrawColor(...T.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, cy, cellW - 2, cellH, 2, 2, "S");
    doc.setFillColor(...p.color);
    doc.roundedRect(cx, cy, cellW - 2, 2, 1, 1, "F");
    doc.setTextColor(...T.textDim);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(p.label.toUpperCase(), cx + 3, cy + 6.5);
    doc.setTextColor(...p.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(p.val, cx + 3, cy + 12);
  });
  y += Math.ceil(params.length / cols) * (cellH + 2) + 8;

  // ── Mix Composition ──
  drawSectionHeader("MIX COMPOSITION (WEIGHT %)");
  const totalMix = lastResult.inputs.fly_ash + lastResult.inputs.ggbs +
    lastResult.inputs.water + lastResult.inputs.superplasticizer +
    lastResult.inputs.fine_agg + lastResult.inputs.coarse_agg;
  const mixItems = [
    {l:"Fly Ash",     v:lastResult.inputs.fly_ash,           c:C_ACCENT},
    {l:"GGBS",        v:lastResult.inputs.ggbs,              c:C_ORANGE},
    {l:"Water",       v:lastResult.inputs.water,             c:C_BLUE},
    {l:"Superplast.", v:lastResult.inputs.superplasticizer,  c:C_PURPLE},
    {l:"Fine Agg",    v:lastResult.inputs.fine_agg,          c:C_GOLD},
    {l:"Coarse Agg",  v:lastResult.inputs.coarse_agg,        c:C_RED},
  ];
  const bw = pageW - 2*margin - 54;
  mixItems.forEach((item) => {
    const pct = totalMix > 0 ? item.v / totalMix : 0;
    doc.setTextColor(...T.textBody);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(item.l, margin, y + 4.5);
    doc.setFillColor(...T.barTrack);
    doc.roundedRect(margin + 28, y, bw, 5.5, 1, 1, "F");
    doc.setFillColor(...item.c);
    doc.roundedRect(margin + 28, y, Math.max(bw * pct, 2), 5.5, 1, 1, "F");
    doc.setTextColor(...T.textDim);
    doc.setFontSize(6.5);
    doc.text(`${item.v} kg/m\u00B3  (${(pct*100).toFixed(1)}%)`, margin + 28 + bw + 2, y + 4.5);
    y += 9;
  });
  y += 6;

  // ── Civil Applications ──
  if (y + 80 > pageH - 30) {
    doc.addPage();
    doc.setFillColor(...T.bg); doc.rect(0, 0, pageW, pageH, "F");
    y = margin;
  }
  drawSectionHeader("CIVIL ENGINEERING APPLICATIONS");
  (lastResult.usability || []).forEach((u) => {
    if (y + 16 > pageH - 30) {
      doc.addPage();
      doc.setFillColor(...T.bg); doc.rect(0, 0, pageW, pageH, "F");
      y = margin;
    }
    doc.setFillColor(...T.card);
    doc.roundedRect(margin, y, pageW - 2*margin, 13, 2, 2, "F");
    doc.setDrawColor(...T.border); doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, pageW - 2*margin, 13, 2, 2, "S");
    doc.setFillColor(...catColor);
    doc.roundedRect(margin, y, 3, 13, 1, 1, "F");
    doc.setTextColor(...T.textMain);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(`${u.icon} ${u.application}`, margin + 6, y + 6);
    doc.setTextColor(...T.textDim);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.text(u.detail, margin + 6, y + 11);
    y += 15;
  });
  y += 6;

  // ── Recommendation ──
  if (y + 28 > pageH - 30) {
    doc.addPage();
    doc.setFillColor(...T.bg); doc.rect(0, 0, pageW, pageH, "F");
    y = margin;
  }
  doc.setFillColor(...T.recBg);
  doc.roundedRect(margin, y, pageW - 2*margin, 26, 3, 3, "F");
  doc.setDrawColor(...C_ACCENT); doc.setLineWidth(0.6);
  doc.line(margin + 3, y + 2, margin + 3, y + 24);
  doc.setTextColor(...C_ACCENT);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("ENGINEER'S RECOMMENDATION", margin + 7, y + 8);
  doc.setTextColor(...T.textBody);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.text(doc.splitTextToSize(getRecommendation(cat), pageW - 2*margin - 14), margin + 7, y + 15);
  y += 32;

  // ── Disclaimer ──
  doc.setFillColor(...T.sectionBg);
  doc.roundedRect(margin, y, pageW - 2*margin, 12, 2, 2, "F");
  doc.setTextColor(...T.textDim);
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.5);
  doc.text("Disclaimer: Predictions are ML model estimates. Always verify with lab testing per IS 456:2000.", margin + 4, y + 4.5);
  doc.text("Data: Singh (2015), Ahmad (2021), Assi (2018), Mendeley GPC Hub.", margin + 4, y + 9.5);
  y += 18;

  // ── Footer ──
  const fY = pageH - 14;
  doc.setDrawColor(...T.footerLine); doc.setLineWidth(0.4);
  doc.line(margin, fY - 2, pageW - margin, fY - 2);
  doc.setFillColor(...C_ACCENT);
  doc.circle(margin + 2, fY + 4, 1.5, "F");
  doc.setTextColor(...T.textDim);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
  doc.text("Developed by: Sarfe Alam  |  linkedin.com/in/sarfe-alam-92a213300", margin + 6, fY + 2.5);
  doc.text("Guided by: Ass. Prof. Saurav (BCE)  |  GeoPredict v1.0  |  Academic use only", margin + 6, fY + 8);
  doc.setTextColor(...C_ACCENT);
  doc.text(`Report ID: GPC-${Date.now().toString(36).toUpperCase()}`, pageW - margin, fY + 2.5, { align: "right" });
  doc.setTextColor(...T.textDim);
  doc.text(`${isDark ? "Dark" : "Light"} Theme`, pageW - margin, fY + 8, { align: "right" });

  doc.save(`GeoPredict_${isDark ? "Dark" : "Light"}_Report_${str}MPa_${new Date().toISOString().split("T")[0]}.pdf`);
}

function getCategoryColorRGB(cat) {
  const map = {
    "Very Low Strength":  [255, 77, 106],
    "Low Strength":       [255, 140, 0],
    "Moderate Strength":  [255, 209, 102],
    "High Strength":      [0, 212, 170],
    "Very High Strength": [61, 155, 255],
    "Ultra High Strength":[155, 107, 255],
  };
  return map[cat] || [0, 212, 170];
}

function getGradeLabel(cat) {
  const map = {
    "Very Low Strength":"< M15","Low Strength":"M20–M25","Moderate Strength":"M25–M35",
    "High Strength":"M35–M50","Very High Strength":"M50–M65","Ultra High Strength":"M65+"
  };
  return map[cat] || "—";
}

function getRecommendation(cat) {
  const map = {
    "Very Low Strength": "Increase GGBS content, raise NaOH molarity to ≥12M, or increase curing temperature to 60°C+ for better strength. Not suitable for structural applications.",
    "Low Strength": "Suitable for lightweight applications only. Consider increasing binder content (GGBS ratio) and curing temperature for higher performance grades.",
    "Moderate Strength": "Good general-purpose strength. Ideal for residential and light commercial construction. Meets IS 456 M25-M35 requirements.",
    "High Strength": "Excellent structural performance. Meets IS 456 M35-M50 requirements. Well-suited for bridges, multi-storey buildings, and heavy infrastructure.",
    "Very High Strength": "Exceptional performance suitable for high-rise construction and long-span structures. Exceeds IS 456 M50 requirements. Ideal for prestressed concrete applications.",
    "Ultra High Strength": "World-class geopolymer concrete. Suitable for specialized structures including offshore platforms, nuclear containment, and supertall towers. Sustainable alternative to OPC with superior durability.",
  };
  return map[cat] || "Refer to IS 456:2000 and IS 383:2016 for structural design requirements.";
}


// ── Smooth Scroll for Nav ─────────────────────────────────────────────────────
document.querySelectorAll('.nav-link, .cta-btn').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initPieChart();
  await initBarChart();

  // Animate entry
  document.querySelectorAll(".input-group-card").forEach((el, i) => {
    el.style.opacity    = "0";
    el.style.transform  = "translateY(16px)";
    el.style.transition = `opacity 0.4s ${i * 0.06}s ease, transform 0.4s ${i * 0.06}s ease`;
    setTimeout(() => {
      el.style.opacity   = "1";
      el.style.transform = "translateY(0)";
    }, 50);
  });
});
