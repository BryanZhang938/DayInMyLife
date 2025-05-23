// Function to parse activity data
function parseActivity(d) {
  return {
    datetime: d3.timeParse("%H:%M:%S")(d.time),
    activity: +d["Vector Magnitude"]
  };
}

// Function to draw activity visualization
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

  // Create metrics display
  const avgActivity = d3.mean(validData, d => d.activity);
  d3.select("#activity-metrics").html(`
    <div class="metric">
      <strong>${avgActivity ? avgActivity.toFixed(1) : 'N/A'}</strong><br>Average Activity
    </div>
  `);

  // Create chart
  const svg = d3.select("#activity-chart");
  const { width, height } = svg.node().getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };

  svg.selectAll("*").remove();

  const x = d3.scaleTime()
    .domain(d3.extent(validData, d => d.datetime))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(validData, d => d.activity)]).nice()
    .range([height - margin.bottom, margin.top]);

  // Add line
  const line = d3.line()
    .x(d => x(d.datetime))
    .y(d => y(d.activity));

  svg.append("path")
    .datum(validData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  // Add axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x)
      .ticks(d3.timeHour.every(2))
      .tickFormat(d3.timeFormat("%-I %p")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Add labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width/2}, ${height - 5})`)
    .style("text-anchor", "middle")
    .text("Time of Day");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", 15)
    .style("text-anchor", "middle")
    .text("Activity Level");

  // Add title
  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .style("text-anchor", "middle")
    .text("Activity Over Time");
}

// Export functions for use in other modules
export { parseActivity, drawActivity }; 