// Function to parse activity data
function parseActivity(d) {
  return {
    datetime: d3.timeParse("%H:%M:%S")(d.time),
    activity: +d["Vector Magnitude"]
  };
}

function drawActivity(data) {
  // Validate data
  if (!data || data.length === 0) {
    console.error("No activity data available");
    return;
  }

  // Filter out invalid data points
  const validData = data.filter(d => !isNaN(d.activity) && d.datetime !== null);

  if (validData.length === 0) {
    console.error("No valid activity data points found");
    return;
  }

  // Group data by hour and calculate average activity
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

  // Update metrics display with overall average activity
  d3.select("#activity-metrics").html(`
    <div class="metric">
      <strong>${peakHour ? peakHour.avgActivity.toFixed(1) : 'N/A'}</strong><br>Peak Activity Level
    </div>
    <div class="metric">
      <strong>${peakHour ? d3.timeFormat("%-I %p")(peakHour.hour) : 'N/A'}</strong><br>Peak Hour
    </div>
  `);

  if (hourlyData.length === 0) {
    console.error("No hourly activity data available for visualization");
    return;
  }

  // Create chart
  const svg = d3.select("#activity-chart");
  const { width, height } = svg.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };

  svg.selectAll("*").remove();

  const hourExtent = d3.extent(hourlyData, d => d.hour);
  const paddedDomain = [
    d3.timeHour.offset(hourExtent[0], -1),  
    d3.timeHour.offset(hourExtent[1], 1)   
  ];

  const x = d3.scaleTime()
    .domain(paddedDomain)
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(hourlyData, d => d.avgActivity)]).nice()
    .range([height - margin.bottom, margin.top]);

  // Calculate bar width based on time difference between hours
  const barWidth = (width - margin.left - margin.right) / hourlyData.length * 0.8;

  // Draw bars
  svg.append("g")
    .selectAll("rect")
    .data(hourlyData)
    .join("rect")
    .attr("x", d => x(d.hour) - barWidth / 2)
    .attr("y", d => y(d.avgActivity))
    .attr("width", barWidth)
    .attr("height", d => y(0) - y(d.avgActivity))
    .attr("fill", d => peakHour && d.hour.getTime() === peakHour.hour.getTime() ? "#ff7f0e" : "steelblue")
    .attr("opacity", 0.6);

  // Add axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x)
      .ticks(d3.timeHour.every(2))
      .tickFormat(d3.timeFormat("%-I %p")))
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "12px");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px");

  // Add axis labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height-5})`)
    .style("text-anchor", "middle")
    .style("font-size", "17px")
    .style("font-weight", "bold")
    .text("Hour of Day");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 15)
    .style("text-anchor", "middle")
    .style("font-size", "17px")
    .style("font-weight", "bold")
    .text("Average Activity Level");

  // Add title
  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", margin.top / 1.5)
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Average Activity Level Per Hour");
}


// Export functions for use in other modules
export { parseActivity, drawActivity }; 