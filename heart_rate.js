import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900;
const height = 400;
const margin = { top: 40, right: 40, bottom: 40, left: 60 };

const svg = d3.select("#chart")
  .attr("viewBox", [0, 0, width, height]);

const dropdown = d3.select("#user-select");

d3.csv("../cleaned_data/all_actigraph.csv", d => {
  const hr = +d.HR;
  if (isNaN(hr)) return null;

  const timestamp = new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`);
  timestamp.setSeconds(0);
  timestamp.setMilliseconds(0);

  return {
    user: d.user,
    minute: timestamp,
    heartRate: hr
  };
}).then(data => {
  data = data.filter(d => d !== null);

  const users = Array.from(new Set(data.map(d => d.user)))
    .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]));

  dropdown.selectAll("option")
    .data(users)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  updateChart(users[0]);

  dropdown.on("change", function () {
    updateChart(this.value);
  });

  function updateChart(user) {
    const userData = data.filter(d => d.user === user);

    const bpmPerMinute = d3.rollups(
      userData,
      v => d3.mean(v, d => d.heartRate),
      d => d.minute
    ).map(([minute, avgHR]) => ({ minute, avgHR }));

    bpmPerMinute.sort((a, b) => a.minute - b.minute);

    const timeExtent = d3.extent(bpmPerMinute, d => d.minute);
    const totalTimeRangeMs = timeExtent[1] - timeExtent[0] - 3 * 60 * 60 * 1000;

    const yExtent = d3.extent(bpmPerMinute, d => d.avgHR);

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollProgress = scrollTop / maxScroll;

      const offsetMs = scrollProgress * totalTimeRangeMs;
      const windowStart = new Date(timeExtent[0].getTime() + offsetMs);
      const windowEnd = new Date(windowStart.getTime() + 3 * 60 * 60 * 1000);

      const visibleData = bpmPerMinute.filter(d =>
        d.minute >= windowStart && d.minute <= windowEnd
      );

      renderChart(visibleData, windowStart, windowEnd, yExtent);
    });

    const initialStart = timeExtent[0];
    const initialEnd = new Date(initialStart.getTime() + 3 * 60 * 60 * 1000);
    const initialData = bpmPerMinute.filter(d =>
      d.minute >= initialStart && d.minute <= initialEnd
    );
    renderChart(initialData, initialStart, initialEnd, yExtent);
  }
});

function renderChart(dataSlice, windowStart, windowEnd, yExtent) {
  svg.selectAll("*").remove();

  const x = d3.scaleTime()
    .domain([windowStart, windowEnd])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([yExtent[0] - 5, yExtent[1] + 5])
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.minute))
    .y(d => y(d.avgHR));

  svg.append("path")
    .datum(dataSlice)
    .attr("fill", "none")
    .attr("stroke", "#e60026")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  const formatXTime = d3.timeFormat("%-I:%M %p");

    svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(formatXTime));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .text("Time (3-Hour Window)");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Average BPM");

  const tooltip = d3.select("body").select("#tooltip-div");
  if (tooltip.empty()) {
    d3.select("body").append("div")
      .attr("id", "tooltip-div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 10px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("border-radius", "4px")
      .style("box-shadow", "0 0 8px rgba(0,0,0,0.1)")
      .style("display", "none")
      .style("z-index", "9999");
  }

  const hoverLine = svg.append("line")
    .attr("stroke", "gray")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4")
    .style("display", "none");

  const hoverDot = svg.append("circle")
    .attr("r", 4)
    .attr("fill", "#888888")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .style("display", "none");

  svg.append("rect")
    .attr("fill", "transparent")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event);
      const timeX = x.invert(mouseX);

      const bisect = d3.bisector(d => d.minute).center;
      const index = bisect(dataSlice, timeX);
      const d = dataSlice[index];
      if (!d) return;

      const formatTime = d3.timeFormat("%-I:%M %p");

      d3.select("#tooltip-div")
        .style("display", "block")
        .html(`
          <strong>BPM:</strong> ${d.avgHR.toFixed(1)}<br/>
          <strong>Time:</strong> ${formatTime(d.minute)}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 15) + "px");

      const xCoord = x(d.minute);
      hoverLine
        .attr("x1", xCoord)
        .attr("x2", xCoord)
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .style("display", "block");

      hoverDot
        .attr("cx", xCoord)
        .attr("cy", y(d.avgHR))
        .style("display", "block");
    })
    .on("mouseleave", () => {
      d3.select("#tooltip-div").style("display", "none");
      hoverLine.style("display", "none");
      hoverDot.style("display", "none");
    });
}