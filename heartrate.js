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

  d3.select("#heartrate-metrics").html(`
  <div class="metric">
    <div class="metric-value">${peakHour ? peakHour.avgRate.toFixed(1) : 'N/A'}</div>
    <div class="metric-label">Peak Hourly Heart Rate</div>
  </div>
  <div class="metric">
    <div class="metric-value">${peakHour ? d3.timeFormat("%-I %p")(peakHour.hour) : 'N/A'}</div>
    <div class="metric-label">Peak Hour</div>
  </div>
`);

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
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "6px")
        .style("border", "1px solid #999")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);
    }  const barW = ((width - margin.left - margin.right) / hourlyData.length) * 0.8;

  svg.append("g")
    .selectAll("rect")
    .data(hourlyData)
    .join("rect")
    .attr("x", d => x(d.hour) - barW / 2)
    .attr("y", d => y(d.avgRate))
    .attr("width", barW)
    .attr("height", d => y(0) - y(d.avgRate))
    .attr("fill", d => peakHour && d.hour.getTime() === peakHour.hour.getTime() ? "#ff7f0e" : "steelblue")
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
      .tickFormat(d3.timeFormat("%-I %p")))
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "12px");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width/2}, ${height - 5})`)
    .style("text-anchor", "middle")
    .style("font-size", "17px")
    .style("font-weight", "bold")
    .text("Hour of Day");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", 15)
    .style("text-anchor", "middle")
    .style("font-size", "17px")
    .style("font-weight", "bold")
    .text("Average Heart Rate (bpm)");

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width/2)
    .attr("y", margin.top/1.5)
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Average Heart Rate Per Hour");
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