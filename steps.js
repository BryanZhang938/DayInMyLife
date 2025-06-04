import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

function parseSteps(d) {
  return {
    user: d.user,
    datetime: new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`),
    steps: +d["Steps"]
  };
}

function processStepData(data) {
  const validData = data.filter(d => !isNaN(d.steps) && d.datetime instanceof Date);

  const hourlyData = Array.from(
    d3.rollup(
      validData,
      v => d3.sum(v, d => d.steps),
      d => d3.timeHour(d.datetime)
    ),
    ([hour, totalSteps]) => ({ hour, totalSteps })
  ).sort((a, b) => a.hour - b.hour);

  const peakHour = hourlyData.length > 0 
    ? hourlyData.reduce((a, b) => b.totalSteps > a.totalSteps ? b : a, hourlyData[0])
    : null;

  return { hourlyData, peakHour };
}

function drawSteps(data) {
  const { hourlyData, peakHour } = processStepData(data);

  // Update peak info
  const peakValueElement = document.getElementById('steps-peak-value');
  const peakTimeElement = document.getElementById('steps-peak-time');

  if (peakValueElement && peakTimeElement) {
    peakValueElement.textContent = peakHour ? `${peakHour.totalSteps} steps` : 'N/A';
    peakTimeElement.textContent = peakHour ? `Peak at ${d3.timeFormat("%-I %p")(peakHour.hour)}` : 'Peak at N/A';
  }

  const metricsContainer = d3.select("#steps-metrics");
  metricsContainer.html("");

  const minSteps = d3.min(hourlyData, d => d.totalSteps);
  const maxSteps = d3.max(hourlyData, d => d.totalSteps);
  const minHour = hourlyData.find(d => d.totalSteps === minSteps).hour;
  const maxHour = hourlyData.find(d => d.totalSteps === maxSteps).hour;
  
  const metrics = [
    {
      label: 'Minimum Steps',
      value: `${minSteps} steps`,
      time: `on Day ${minHour.getDate()} at ${d3.timeFormat("%-I %p")(minHour)}`
    },
    {
      label: 'Average Steps',
      value: `${Math.round(d3.mean(hourlyData, d => d.totalSteps))} steps`,
      time: `for Day ${hourlyData[0].hour.getDate()} (${d3.timeFormat("%-I %p")(hourlyData[0].hour)}) through Day ${hourlyData[hourlyData.length - 1].hour.getDate()} (${d3.timeFormat("%-I %p")(hourlyData[hourlyData.length - 1].hour)})`
    },
    {
      label: 'Maximum Steps',
      value: `${maxSteps} steps`,
      time: `on Day ${maxHour.getDate()} at ${d3.timeFormat("%-I %p")(maxHour)}`
    }
  ];

  metrics.forEach(metric => {
    const globalAverages = {
      'Minimum Steps': '5 steps',
      'Average Steps': '505 steps',
      'Maximum Steps': '1702 steps'
    };

    const metricDiv = metricsContainer.append("div").attr("class", "metric");
    metricDiv.append("div").attr("class", "metric-label-group")
      .append("span").attr("class", "metric-label-text").text(metric.label);

    const valueGroup = metricDiv.append("div").attr("class", "metric-value-group");
    valueGroup.append("span").attr("class", "metric-value-badge").text(metric.value);
    valueGroup.append("span").attr("class", "metric-time").text(metric.time);  
  
    valueGroup.append("div")
      .attr("class", "metric-global-average")
      .style("font-size", "13px")
      .style("color", "gray")
      .text(`Average Across All Participants: ${globalAverages[metric.label]}`);
    
  });

  if (hourlyData.length === 0) return;

  const svg = d3.select("#steps-chart");
  const width = svg.node().getBoundingClientRect().width;
  const height = 400;
  const margin = { top: 40, right: 20, bottom: 50, left: 50 };

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", `${height}px`);

  svg.selectAll("*").remove();

  const hourExtent = d3.extent(hourlyData, d => d.hour);
const barPaddingMs = 30 * 60 * 1000; // 30 minutes of padding on each side

const x = d3.scaleTime()
  .domain([
    new Date(hourExtent[0].getTime() - barPaddingMs),
    new Date(hourExtent[1].getTime() + barPaddingMs)
  ])
  .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(hourlyData, d => d.totalSteps)]).nice()
    .range([height - margin.bottom, margin.top]);

  let tooltip = d3.select("body").select("#tooltip-steps");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("id", "tooltip-steps")
      .attr("class", "chart-tooltip")
      .style("opacity", 0);
  }

  const barW = ((width - margin.left - margin.right) / hourlyData.length) * 0.8;

  svg.append("g")
    .selectAll("rect")
    .data(hourlyData)
    .join("rect")
    .attr("x", d => x(d.hour) - barW / 2)
    .attr("y", d => y(d.totalSteps))
    .attr("width", barW)
    .attr("height", d => height - margin.bottom - y(d.totalSteps))
    .attr("rx", 4)
    .attr("fill", d => peakHour && d.hour.getTime() === peakHour.hour.getTime() ? "var(--accent-steps)" : "var(--primary)")
    .attr("opacity", 0.6)
    .on("mouseover", function (event, d) {
        tooltip
  .style("opacity", 1)
  .html(`
    <div class="tooltip-line">
      <span class="tooltip-label">Time:</span>&nbsp;
      <span>${d3.timeFormat("%-I %p")(d.hour)}</span>
    </div>
    <div class="tooltip-line">
      <span class="tooltip-label">Steps:</span>&nbsp;
      <span>${d.totalSteps}</span>
    </div>
  `);
        d3.select(this).attr("opacity", 1);
      })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
      d3.select(this).attr("opacity", 0.6);
    });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(d3.timeHour.every(1)).tickFormat(d3.timeFormat("%-I %p")))
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#000");

  // Identify day changes
const dayChanges = hourlyData.reduce((acc, curr, idx) => {
  if (idx > 0 && curr.hour.getDate() !== hourlyData[idx - 1].hour.getDate()) {
    acc.push(curr.hour);
  }
  return acc;
}, []);

// Add Day 1 marker at start
const firstDay = hourlyData[0].hour;
svg.append("line")
  .attr("x1", x(firstDay))
  .attr("x2", x(firstDay))
  .attr("y1", height - margin.bottom)
  .attr("y2", height - margin.bottom + 6)
  .attr("stroke", "#000")
  .attr("stroke-width", 1);

svg.append("text")
  .attr("x", x(firstDay))
  .attr("y", height - margin.bottom + 35)
  .attr("text-anchor", "middle")
  .style("font-size", "12px")
  .style("fill", "#000")
  .text("Day 1");


dayChanges.forEach(dayChange => {
  svg.append("line")
    .attr("x1", x(dayChange))
    .attr("x2", x(dayChange))
    .attr("y1", height - margin.bottom)
    .attr("y2", height - margin.bottom + 6)
    .attr("stroke", "#000")
    .attr("stroke-width", 1);

  svg.append("text")
    .attr("x", x(dayChange))
    .attr("y", height - margin.bottom + 35)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "var(--muted-foreground)")
    .text(`Day ${dayChange.getDate()}`);
});


  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width/2}, ${height - 5})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .text("Hour of Day");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", 10)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .text("Steps");
}

export { parseSteps, drawSteps };

if (selectedUser) {
  d3.csv("../assets/cleaned_data/all_actigraph.csv", parseSteps).then(stepData => {
    const filtered = stepData.filter(d => d.user === selectedUser);
    if (filtered.length > 0) {
      drawSteps(filtered);
    } else {
      console.warn(`No step data found for user: ${selectedUser}`);
    }
  }).catch(error => {
    console.error("Failed to load steps CSV:", error);
  });
}

d3.csv("../assets/cleaned_data/all_actigraph.csv", d => ({
  user: d.user,
  steps: +d["Steps"],
  datetime: new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`)
})).then(data => {
  const valid = data.filter(d => !isNaN(d.steps) && d.datetime instanceof Date);

  const userHourly = d3.group(
    valid,
    d => d.user,
    d => d3.timeHour(d.datetime)
  );

  const userStats = Array.from(userHourly, ([user, hourMap]) => {
    const hourlySums = Array.from(hourMap, ([hour, entries]) => ({
      hour,
      totalSteps: d3.sum(entries, d => d.steps)
    }));
    const min = d3.min(hourlySums, d => d.totalSteps);
    const max = d3.max(hourlySums, d => d.totalSteps);
    const avg = d3.mean(hourlySums, d => d.totalSteps);
    return { user, min, max, avg };
  });

  const meanOfMins = d3.mean(userStats, d => d.min);
  const meanOfMaxes = d3.mean(userStats, d => d.max);
  const meanOfAvgs = d3.mean(userStats, d => d.avg);

  console.log("Mean of Participants' Minimum Steps:", Math.round(meanOfMins));
  console.log("Mean of Participants' Maximum Steps:", Math.round(meanOfMaxes));
  console.log("Mean of Participants' Average Steps:", Math.round(meanOfAvgs));
});
