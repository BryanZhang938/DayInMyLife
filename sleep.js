import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const data = {};

function parseSleep(d) {
  const anchor = new Date(2000, 0, 1);
  const dayOffset = +d["In Bed Date"];
  const timeStr = d["In Bed Time"];
  if (!timeStr || !d["In Bed Date"]) {
    console.warn("Invalid datetime –", d["In Bed Date"], timeStr);
    return null;
  }

  const [hour, minute] = timeStr.split(":").map(Number);

  const datetime = new Date(anchor);
  datetime.setDate(anchor.getDate() + dayOffset - 1);
  datetime.setHours(hour);
  datetime.setMinutes(minute);

  return {
    user: d.user.trim(),
    datetime: datetime,
    efficiency: +d.Efficiency,
    totalSleep: +d["Total Sleep Time (TST)"],
    waso: +d["Wake After Sleep Onset (WASO)"],
    latency: +d.Latency,
    awakenings: +d["Number of Awakenings"],
    avgAwakeningLength: +d["Average Awakening Length"],
    movementIndex: +d["Movement Index"],
    fragmentationIndex: +d["Fragmentation Index"]
  };
}

const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

const metricDescriptions = {
  totalSleep: "Total time the user spent sleeping, in minutes.",
  efficiency: "Percentage of time in bed that the user was actually asleep.",
  latency: "Time it took to fall asleep after going to bed.",
  awakenings: "Number of times the user woke up during sleep.",
  avgAwakeningLength: "Average duration of each awakening, in minutes.",
  waso: "Total number of minutes the participant spent awake after initially falling asleep.",
  movementIndex: "Percentage of time spent immobile (no arm movement) during the movement phase of sleep.",
  fragmentationIndex: "Percentage of time spent moving during what should have been immobile sleep phases.",
  cortisol: "Cortisol concentration measured in μg of cortisol per 100 μg of protein. Typically higher after waking, it reflects physiological stress and alertness.",
  melatonin: "Melatonin concentration measured in μg of melatonin per μg of protein. Typically higher before sleep, it reflects readiness for sleep and circadian rhythm."
};

// load CSV once at startup
d3.csv("../assets/cleaned_data/all_sleep.csv", parseSleep).then(sleepData => {
  data.sleep = sleepData;
  
  if (selectedUser) {
    const userData = sleepData.filter(d => d.user === selectedUser);
    if (userData.length > 0) {
      displaySleepMetrics(userData[userData.length - 1]); // latest entry
    } else {
      console.warn(`No sleep data found for user: ${selectedUser}`);
      if (window.markComponentLoaded) {
        window.markComponentLoaded('sleep');
      }
    }
  } else {
    console.error("No user specified in the URL (use ?user=user_01)");
    if (window.markComponentLoaded) {
      window.markComponentLoaded('sleep');
    }
  }
}).catch(error => {
  console.error("Failed to load sleep CSV:", error);
  if (window.markComponentLoaded) {
    window.markComponentLoaded('sleep');
  }
});

function summarizeSleepByUser(sleepData) {
  const summary = d3.rollups(
    sleepData,
    v => ({
      totalSleep: d3.sum(v, d => d.totalSleep),
      count: v.length,
      avgEfficiency: d3.mean(v, d => d.efficiency),
      latest: v[v.length - 1]
    }),
    d => d.user
  );
  
  return Object.fromEntries(summary);
}

function initParticipantSelector() {
  // Get unique participants
  const participants = [...new Set(data.sleep.map(d => d.user))];

  const summary = summarizeSleepByUser(data.sleep);
  data.sleepSummary = summary;

  // Populate dropdown
  const select = d3.select('#participant-select');
  select.selectAll('option').remove(); 
  
  select.selectAll('option')
    .data(participants)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => `Participant ${d.replace('user_', '')}`);
  
  const defaultUser = "user_1";
  if (participants.includes(defaultUser)) {
    select.property("value", defaultUser);
    displaySleepMetrics(data.sleepSummary[defaultUser]);
  }

  // Add change event listener
  select.on('change', function() {
    const selectedUser = this.value;
    if (selectedUser) {
      const summary = data.sleepSummary[selectedUser];
      if (summary) {
        displaySleepMetrics(summary);
      }
    }
  });
}

function displaySleepMetrics(data) {
  if (!data) {
    if (window.markComponentLoaded) {
      window.markComponentLoaded('sleep');
    }
    return;
  }

  const metricsContainer = d3.select('#sleep-metrics');
  metricsContainer.html(""); // clear existing

  const metrics = [
    { key: 'totalSleep', label: 'Total Sleep', value: `${Math.floor(data.totalSleep/60)} h ${data.totalSleep%60} m` },
    { key: 'efficiency', label: 'Sleep Efficiency', value: `${isNaN(data.efficiency) ? "N/A" : data.efficiency.toFixed(1)} %` },
    { key: 'latency', label: 'Sleep Latency', value: `${data.latency} m` },
    { key: 'awakenings', label: 'Number of Awakenings', value: `${data.awakenings}` },
    { key: 'avgAwakeningLength', label: 'Average Awakening Length', value: `${data.avgAwakeningLength.toFixed(1)} s` },
    { key: 'waso', label: 'Wake After Sleep Onset', value: `${data.waso} m` },
    { key: 'movementIndex', label: 'Movement Index', value: `${data.movementIndex.toFixed(1)} %` },
    { key: 'fragmentationIndex', label: 'Fragmentation Index', value: `${data.fragmentationIndex.toFixed(1)} %` }
  ];

  metrics.forEach(metric => {
    const metricDiv = metricsContainer.append('div').attr('class', 'metric');
    
    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    if (metricDescriptions[metric.key]) {
      labelGroup.append('span')
        .attr('class', 'info-icon')
        .html(' <i class="fas fa-info-circle" title="' + metricDescriptions[metric.key] + '"></i>')
        .on('mouseover', (event) => {
          showInfoTooltip(event.pageX, event.pageY, metricDescriptions[metric.key]);
        })
        .on('mouseout', hideInfoTooltip);
    }

    metricDiv.append('span')
      .attr('class', 'metric-value-badge')
      .text(metric.value);
  });

  // Mark sleep component as loaded
  if (window.markComponentLoaded) {
    window.markComponentLoaded('sleep');
  }
}

function showInfoTooltip(x, y, text) {
  let tooltip = d3.select("#metric-info-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "metric-info-tooltip");
  }

  tooltip
    .html(text)
    .style("left", `${x + 12}px`)
    .style("top", `${y - 10}px`)
    .style("visibility", "visible");
}

function hideInfoTooltip() {
  d3.select("#metric-info-tooltip").style("visibility", "hidden");
}

function initScrolly() {
  const scroller = scrollama();
  scroller
    .setup({ step: '.step', offset: 0.6 })
    .onStepEnter(({ element }) => {
      if (element.dataset.step === 'sleep') {
        drawSleep(data.sleep);
      }
    });
}

function drawSleep(sleepData) {
  
  // 1) Enhanced Big‑number panel
  const latest = sleepData[sleepData.length - 1];
  d3.select('#sleep-metrics')
    .html(`
      <div class="metric">
        <strong>${Math.round(latest.totalSleep/60)} h ${latest.totalSleep%60} m</strong><br>
        Total Sleep
      </div>
      <div class="metric">
        <strong>${latest.efficiency.toFixed(1)} %</strong><br>
        Efficiency
      </div>
      <div class="metric">
        <strong>${latest.latency} m</strong><br>
        Sleep Latency
      </div>
      <div class="metric">
        <strong>${latest.awakenings}</strong><br>
        Awakenings
      </div>
      <div class="metric">
        <strong>${latest.avgAwakeningLength.toFixed(1)} m</strong><br>
        Avg. Awakening
      </div>
      <div class="metric">
        <strong>${latest.movementIndex.toFixed(1)}</strong><br>
        Movement Index
      </div>
    `);

  // 2) Enhanced Sparkline of Efficiency with annotations
  const svg = d3.select('#sleep-chart');
  const { width, height } = svg.node().getBoundingClientRect();
  const margin = { top: 40, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // clear previous
  svg.selectAll('*').remove();

  // Create chart group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(sleepData, d => d.datetime))
    .range([0, chartWidth]);

  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([chartHeight, 0]);

  // Add efficiency line
  const line = d3.line()
    .x(d => x(d.datetime))
    .y(d => y(d.efficiency))
    .curve(d3.curveMonotoneX);

  // Add area under the line
  const area = d3.area()
    .x(d => x(d.datetime))
    .y0(chartHeight)
    .y1(d => y(d.efficiency))
    .curve(d3.curveMonotoneX);

  // Draw area
  g.append('path')
    .datum(sleepData)
    .attr('d', area)
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.2);

  // Draw line
  g.append('path')
    .datum(sleepData)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2);

  // Add dots for each data point
  g.selectAll('.dot')
    .data(sleepData)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.efficiency))
    .attr('r', 4)
    .attr('fill', 'steelblue')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', 6)
        .attr('fill', '#ff7f0e');
      
      // Add tooltip
      const tooltip = g.append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${x(d.datetime)},${y(d.efficiency)})`);

      tooltip.append('rect')
        .attr('x', 10)
        .attr('y', -30)
        .attr('width', 120)
        .attr('height', 60)
        .attr('fill', 'white')
        .attr('stroke', '#ccc')
        .attr('rx', 5);

      tooltip.append('text')
        .attr('x', 15)
        .attr('y', -15)
        .text(`Date: ${d3.timeFormat('%b %d')(d.datetime)}`);

      tooltip.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .text(`Efficiency: ${d.efficiency.toFixed(1)}%`);

      tooltip.append('text')
        .attr('x', 15)
        .attr('y', 25)
        .text(`Sleep: ${Math.round(d.totalSleep/60)}h ${d.totalSleep%60}m`);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 4)
        .attr('fill', 'steelblue');
      
      // Remove tooltip
      g.selectAll('.tooltip').remove();
    });

  // Add axes
  const xAxis = d3.axisBottom(x)
    .ticks(7)
    .tickFormat(d3.timeFormat('%b %d'));

  const yAxis = d3.axisLeft(y)
    .ticks(5)
    .tickFormat(d => d + '%');

  g.append('g')
    .attr('transform', `translate(0,${chartHeight})`)
    .call(xAxis);

  g.append('g')
    .call(yAxis);

  // Add axis labels
  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', `translate(${chartWidth/2}, ${chartHeight + margin.bottom - 5})`)
    .style('text-anchor', 'middle')
    .text('Date');

  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -chartHeight/2)
    .attr('y', -margin.left + 15)
    .style('text-anchor', 'middle')
    .text('Sleep Efficiency (%)');

  // Add title
  g.append('text')
    .attr('class', 'chart-title')
    .attr('x', chartWidth/2)
    .attr('y', -margin.top/2)
    .style('text-anchor', 'middle')
    .style('font-size', '16px')
    .text('Sleep Efficiency Over Time');
}
  
d3.csv("../assets/cleaned_data/all_saliva.csv", parseSaliva).then(salivaData => {
  if (!selectedUser) return;

  const userSaliva = salivaData.filter(d => d.user === selectedUser);
  
  // If there isn't exactly 2 entries, hide the hormone card
  if (userSaliva.length !== 2) {
    const hormoneCard = document.getElementById('hormone-card');
    if (hormoneCard) hormoneCard.style.display = 'none';
    return;
  }

  const container = d3.select("#hormone-metrics");

  // Sort and display hormone data
  const sorted = userSaliva.sort((a, b) =>
    a.sample === "before sleep" ? -1 : 1
  );

  sorted.forEach(entry => {
    appendHormoneMetric(container, entry.cortisol, "Cortisol Norm");
    appendHormoneMetric(container, entry.melatonin, "Melatonin Norm");
  });
});

function appendHormoneMetric(container, value, label) {
  const metricDiv = container.append('div').attr('class', 'metric');
  
  const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
  labelGroup.append('span').attr('class', 'metric-label-text').text(label);

  // Match the key to our metricDescriptions object
  const infoKey = label.toLowerCase().includes('cortisol') ? 'cortisol' : 'melatonin';

  labelGroup.append('span')
    .attr('class', 'info-icon')
    .html(' <i class="fas fa-info-circle" title="' + metricDescriptions[infoKey] + '"></i>')
    .on('mouseover', (event) => {
      showInfoTooltip(event.pageX, event.pageY, metricDescriptions[infoKey]);
    })
    .on('mouseout', hideInfoTooltip);

  metricDiv.append('span')
    .attr('class', 'metric-value-badge')
    .text(value.toFixed(4));
}

// Saliva parser
function parseSaliva(d) {
  return {
    user: d.user.trim(),
    sample: d.SAMPLES.toLowerCase(),
    cortisol: +d["Cortisol NORM"],
    melatonin: +d["Melatonin NORM"]
  };
}

