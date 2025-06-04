import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

function parseHeartRate(d) {
  return {
    user: d.user,
    datetime: new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`),
    heartRate: +d["HR"]
  };
}

function processHeartRateData(data) {
  if (!data || data.length === 0) {
    console.error("No heart rate data available");
    return { hourlyData: [], peakHour: null };
  }

  const validData = data.filter(d => !isNaN(d.heartRate) && d.datetime instanceof Date);

  if (validData.length === 0) {
    console.error("No valid heart rate data points found");
    return { hourlyData: [], peakHour: null };
  }

  const hourlyData = Array.from(
    d3.rollup(
      validData,
      v => d3.mean(v, d => d.heartRate),
      d => d3.timeHour(d.datetime)
    ),
    ([hour, avgRate]) => ({ hour, avgRate })
  ).sort((a, b) => a.hour - b.hour);

  const peakHour = hourlyData.length > 0 
    ? hourlyData.reduce((a, b) => b.avgRate > a.avgRate ? b : a, hourlyData[0])
    : null;

  return { hourlyData, peakHour };
}

function drawHeartRate(data) {
  const { hourlyData, peakHour } = processHeartRateData(data);

  d3.csv("../assets/cleaned_data/all_actigraph.csv", parseHeartRate).then(allData => {
    const globalData = allData.filter(d => !isNaN(d.heartRate) && d.datetime instanceof Date);

    const grouped = d3.rollup(
      globalData,
      v => d3.mean(v, d => d.heartRate),
      d => d3.timeHour(d.datetime)
    );

    const hourlyGlobal = Array.from(grouped, ([hour, avgRate]) => ({ hour, avgRate }));
    const minGlobal = 56.4;
    const maxGlobal = 113.7;
    const avgGlobal = 76.4;

    updateHeartRateMetrics(hourlyData, peakHour, { minGlobal, maxGlobal, avgGlobal });
  });

  // Update peak value display
  const peakValueElement = document.getElementById('heartrate-peak-value');
  const peakTimeElement = document.getElementById('heartrate-peak-time');
  
  if (peakValueElement && peakTimeElement) {
    peakValueElement.textContent = peakHour ? `${peakHour.avgRate.toFixed(1)} bpm` : 'N/A';
    peakTimeElement.textContent = peakHour ? `Peak at ${d3.timeFormat("%-I %p")(peakHour.hour)}` : 'Peak at N/A';
  }

  // Update metrics grid
  const metricsContainer = d3.select("#heartrate-metrics");
  metricsContainer.html(""); // clear existing

  const minRate = d3.min(hourlyData, d => d.avgRate);
const maxRate = d3.max(hourlyData, d => d.avgRate);
const minHour = hourlyData.find(d => d.avgRate === minRate).hour;
const maxHour = hourlyData.find(d => d.avgRate === maxRate).hour;

const metrics = [
  { 
    key: 'minHeartRate', 
    label: 'Minimum Hourly Heart Rate', 
    value: `${minRate.toFixed(1)} bpm`,
    time: `on Day ${minHour.getDate()} at ${d3.timeFormat("%-I %p")(minHour)}`
  },
  { 
    key: 'avgHeartRate', 
    label: 'Average Hourly Heart Rate', 
    value: `${d3.mean(hourlyData, d => d.avgRate).toFixed(1)} bpm`,
    time: `for Day ${hourlyData[0].hour.getDate()} (${d3.timeFormat("%-I %p")(hourlyData[0].hour)}) through Day ${hourlyData[hourlyData.length - 1].hour.getDate()} (${d3.timeFormat("%-I %p")(hourlyData[hourlyData.length - 1].hour)})`
  },
  { 
    key: 'maxHeartRate', 
    label: 'Maximum Hourly Heart Rate', 
    value: `${maxRate.toFixed(1)} bpm`,
    time: `on Day ${maxHour.getDate()} at ${d3.timeFormat("%-I %p")(maxHour)}`
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
        .text(`${metric.time}`);
    }
  });

  if (hourlyData.length === 0) return;

  const svg = d3.select("#heartrate-chart");
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
    .domain([0, d3.max(hourlyData, d => d.avgRate)]).nice()
    .range([height - margin.bottom, margin.top]);

  let tooltip = d3.select("body").select("#tooltip-heartrate");

  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("id", "tooltip-heartrate")
      .attr("class", "chart-tooltip")
      .style("opacity", 0);
  }

  const barW = ((width - margin.left - margin.right) / hourlyData.length) * 0.8;

  svg.append("g")
    .selectAll("rect")
    .data(hourlyData)
    .join("rect")
    .attr("x", d => x(d.hour) - barW / 2)
    .attr("y", d => y(d.avgRate))
    .attr("width", barW)
    .attr("height", d => height - margin.bottom - y(d.avgRate))
    .attr("rx", 4)
    .attr("fill", d => peakHour && d.hour.getTime() === peakHour.hour.getTime() ? "var(--accent-heart)" : "var(--primary)")
    .attr("opacity", 0.6)
    .on("mouseover", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Time:</strong> ${d3.timeFormat("%-I %p")(d.hour)}<br>
          <strong>Heart Rate:</strong> ${d.avgRate.toFixed(1)} bpm
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
    .text("Average Heart Rate (bpm)");
}

export { parseHeartRate, drawHeartRate };

const userParam = new URLSearchParams(window.location.search).get("user");
if (userParam) {
  d3.csv("../assets/cleaned_data/all_actigraph.csv", parseHeartRate).then(hrData => {
    const filtered = hrData.filter(d => d.user === userParam);
    if (filtered.length > 0) {
      drawHeartRate(filtered);
    } else {
      console.warn(`No heart rate data found for user: ${userParam}`);
    }
  }).catch(error => {
    console.error("Failed to load heart rate CSV:", error);
  });
}

function updateHeartRateMetrics(hourlyData, peakHour, globalAverages) {
  const metricsContainer = d3.select("#heartrate-metrics");
  metricsContainer.html(""); // clear existing

  const minRate = d3.min(hourlyData, d => d.avgRate);
  const maxRate = d3.max(hourlyData, d => d.avgRate);
  const minHour = hourlyData.find(d => d.avgRate === minRate).hour;
  const maxHour = hourlyData.find(d => d.avgRate === maxRate).hour;

  const metrics = [
    {
      key: 'minHeartRate',
      label: 'Minimum Hourly Heart Rate',
      value: `${minRate.toFixed(1)} bpm`,
      time: `on Day ${minHour.getDate()} at ${d3.timeFormat("%-I %p")(minHour)}`,
      global: `${globalAverages.minGlobal.toFixed(1)} bpm`
    },
    {
      key: 'avgHeartRate',
      label: 'Average Hourly Heart Rate',
      value: `${d3.mean(hourlyData, d => d.avgRate).toFixed(1)} bpm`,
      time: `for Day ${hourlyData[0].hour.getDate()} through Day ${hourlyData[hourlyData.length - 1].hour.getDate()}`,
      global: `${globalAverages.avgGlobal.toFixed(1)} bpm`
    },
    {
      key: 'maxHeartRate',
      label: 'Maximum Hourly Heart Rate',
      value: `${maxRate.toFixed(1)} bpm`,
      time: `on Day ${maxHour.getDate()} at ${d3.timeFormat("%-I %p")(maxHour)}`,
      global: `${globalAverages.maxGlobal.toFixed(1)} bpm`
    }
  ];

  metrics.forEach(metric => {
    const metricDiv = metricsContainer.append('div').attr('class', 'metric');

    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    const valueGroup = metricDiv.append('div').attr('class', 'metric-value-group');
    valueGroup.append('span').attr('class', 'metric-value-badge').text(metric.value);
    if (metric.time) {
      valueGroup.append('span').attr('class', 'metric-time').text(metric.time);
    }

    valueGroup.append('div')
      .attr('class', 'metric-subtext')
      .style('font-size', '13px')
      .style('color', 'var(--muted-foreground)')
      .style('margin-top', '0.25rem')
      .text(`Average across all Participants: ${metric.global}`);
  });
}
