import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

function parseActivity(d) {
  return {
    user: d.user,
    datetime: new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`),
    activity: +d["Vector Magnitude"]
  };
}

function drawActivity(data) {
  if (!data || data.length === 0) {
    console.error("No activity data available");
    return;
  }

  const validData = data.filter(d => !isNaN(d.activity) && d.datetime instanceof Date);

  if (validData.length === 0) {
    console.error("No valid activity data points found");
    return;
  }

  const hourlyData = Array.from(
    d3.rollup(
      validData,
      v => d3.mean(v, d => d.activity),
      d => d3.timeHour(d.datetime)
    ),
    ([hour, avgActivity]) => ({ hour, avgActivity })
  ).sort((a, b) => a.hour - b.hour);

  const peakHour = hourlyData.length > 0 
    ? hourlyData.reduce((a, b) => b.avgActivity > a.avgActivity ? b : a, hourlyData[0])
    : null;

  // Update peak value display
  const peakValueElement = document.getElementById('activity-peak-value');
  const peakTimeElement = document.getElementById('activity-peak-time');
  
  if (peakValueElement && peakTimeElement) {
    peakValueElement.textContent = peakHour ? `${peakHour.avgActivity.toFixed(1)}` : 'N/A';
    peakTimeElement.textContent = peakHour ? `Peak at ${d3.timeFormat("%-I %p")(peakHour.hour)}` : 'Peak at N/A';
  }

  // Update metrics grid
  const metricsContainer = d3.select("#activity-metrics");
  metricsContainer.html(""); // clear existing

  const minActivity = d3.min(hourlyData, d => d.avgActivity);
const maxActivity = d3.max(hourlyData, d => d.avgActivity);
const minHour = hourlyData.find(d => d.avgActivity === minActivity).hour;
const maxHour = hourlyData.find(d => d.avgActivity === maxActivity).hour;

const globalActivityAverages = {
  avg: 35.4,
  min: 0.5,
  max: 104.4
};

const metrics = [
  { 
    key: 'minActivity', 
    label: 'Minimum Hourly Activity Level', 
    value: `${minActivity.toFixed(1)}`,
    time: `on Day ${minHour.getDate()} at ${d3.timeFormat("%-I %p")(minHour)}`,
    global: `${globalActivityAverages.min.toFixed(1)}`
  },
  { 
    key: 'avgActivity', 
    label: 'Average Hourly Activity Level', 
    value: `${d3.mean(hourlyData, d => d.avgActivity).toFixed(1)}`,
    time: `for Day ${hourlyData[0].hour.getDate()} (${d3.timeFormat("%-I %p")(hourlyData[0].hour)}) through Day ${hourlyData[hourlyData.length - 1].hour.getDate()} (${d3.timeFormat("%-I %p")(hourlyData[hourlyData.length - 1].hour)})`,
    global: `${globalActivityAverages.avg.toFixed(1)}`
  },
  { 
    key: 'maxActivity', 
    label: 'Maximum Hourly Activity Level', 
    value: `${maxActivity.toFixed(1)}`,
    time: `on Day ${maxHour.getDate()} at ${d3.timeFormat("%-I %p")(maxHour)}`,
    global: `${globalActivityAverages.max.toFixed(1)}`
  }
];
  metrics.forEach(metric => {
    const metricDiv = metricsContainer.append('div').attr('class', 'metric');
    
    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    const valueGroup = metricDiv.append('div').attr('class', 'metric-value-group');
    valueGroup.append('span')
      .attr('class', 'metric-value-badge')
      .text(metric.value);
    
    if (metric.time) {
      valueGroup.append('span')
        .attr('class', 'metric-time')
        .text(metric.key === 'avgActivity' ? metric.time : `${metric.time}`);
    }

    if (metric.global) {
      valueGroup.append('div')
        .attr('class', 'metric-subtext')
        .style('font-size', '13px')
        .style('color', 'var(--muted-foreground)')
        .style('margin-top', '0.25rem')
        .text(`Average Across All Participants: ${metric.global}`);
    }

  });

  if (hourlyData.length === 0) return;

  const svg = d3.select("#activity-chart");
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
  const barPaddingMs = 30 * 60 * 1000; // half an hour on each side
  const x = d3.scaleTime()
    .domain([new Date(hourExtent[0].getTime() - barPaddingMs), new Date(hourExtent[1].getTime() + barPaddingMs)])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(hourlyData, d => d.avgActivity)]).nice()
    .range([height - margin.bottom, margin.top]);

  let tooltip = d3.select("body").select("#tooltip-activity");

  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("id", "tooltip-activity")
      .attr("class", "chart-tooltip")
      .style("opacity", 0);
  }

  const barW = ((width - margin.left - margin.right) / hourlyData.length) * 0.8;

  svg.append("g")
    .selectAll("rect")
    .data(hourlyData)
    .join("rect")
    .attr("x", d => x(d.hour) - barW / 2)
    .attr("y", d => y(d.avgActivity))
    .attr("width", barW)
    .attr("height", d => height - margin.bottom - y(d.avgActivity))
    .attr("rx", 4)
    .attr("fill", d => peakHour && d.hour.getTime() === peakHour.hour.getTime() ? "var(--accent-activity)" : "var(--primary)")
    .attr("opacity", 0.6)
    .on("mouseover", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Time:</strong> ${d3.timeFormat("%-I %p")(d.hour)}<br>
          <strong>Activity Level:</strong> ${d.avgActivity.toFixed(1)}
        `);
      d3.select(this).attr("opacity", 1);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
      d3.select(this).attr("opacity", 0.6);
    });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x)
      .ticks(d3.timeHour.every(1))
      .tickFormat(d => {
        const hour = d.getHours();
        const date = d.getDate();
        // Show hour for first occurrence of each hour in each day
        const isFirstOccurrence = hourlyData.findIndex(d2 => 
          d2.hour.getHours() === hour && d2.hour.getDate() === date
        ) === hourlyData.findIndex(d2 => d2.hour.getTime() === d.getTime());
        return isFirstOccurrence ? d3.timeFormat("%-I %p")(d) : "";
      }))
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "12px");

  // Add day markers
  const dayChanges = hourlyData.reduce((acc, curr, idx) => {
    if (idx > 0 && curr.hour.getDate() !== hourlyData[idx - 1].hour.getDate()) {
      acc.push(curr.hour);
    }
    return acc;
  }, []);

  // Add Day 1 marker at the start
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
    .style("fill", "var(--muted-foreground)")
    .text("Day 1");

  // Add markers for day changes
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
    .attr("y", 15)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .text("Average Activity Level");
}

export { parseActivity, drawActivity };

if (selectedUser) {
  d3.csv("../assets/cleaned_data/all_actigraph.csv", parseActivity).then(activityData => {
    const filtered = activityData.filter(d => d.user === selectedUser);
    if (filtered.length > 0) {
      drawActivity(filtered);
    } else {
      console.warn(`No activity data found for user: ${selectedUser}`);
    }
  }).catch(error => {
    console.error("Failed to load activity CSV:", error);
  });
}