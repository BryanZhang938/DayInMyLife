import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900;
const height = 400;
const margin = { top: 40, right: 40, bottom: 40, left: 60 };

const parseTime = d3.timeParse("%H:%M:%S");

const svg = d3.select("#chart")
  .attr("viewBox", [0, 0, width, height]);

const dropdown = d3.select("#user-select");

const loadingOverlay = d3.select("#loading-overlay");
const loadingText = d3.select("#loading-text");

let isPlaying = false;
let autoScrollInterval = null;
let isAutoScrolling = false; 
let lastScrollTime = 0;

let tooltip = d3.select("#tooltip-div");
if (tooltip.empty()) {
  tooltip = d3.select("body").append("div")
    .attr("id", "tooltip-div")
    .style("position", "fixed")
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

loadingOverlay.style("display", "flex");
loadingText.text("Loading data...");

d3.csv("../cleaned_data/acc.csv", d => {
  const time = parseTime(d.time);
  return {
    user: d.user,
    time,
    magnitude: +d["Vector Magnitude_smoothed"]
  };
}).then(accData => {
  accData = accData.filter(d => !isNaN(d.magnitude));

  const users = Array.from(new Set(accData.map(d => d.user)))
    .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]));

  dropdown.selectAll("option")
    .data(users)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  loadingText.text("Loading graph...");
  updateChart(users[0]);

  const playPauseBtn = d3.select("#play-pause-btn");
  playPauseBtn.on("click", () => {
    if (isPlaying) {
      // If currently playing, pause auto-scroll
      isPlaying = false;
      clearInterval(autoScrollInterval);
      playPauseBtn.text("▶ Auto-Scroll");
    } else if (playPauseBtn.text() === "↻ Reset") {
      // If button says Reset, scroll top and switch to play
      window.scrollTo({ top: 0, behavior: "smooth" });
      playPauseBtn.text("▶ Auto-Scroll");
    } else {
      // Start auto-scroll
      isPlaying = true;
      playPauseBtn.text("⏸ Pause");
  
      autoScrollInterval = setInterval(() => {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        const step = 50; // pixels per tick
  
        if (current + step >= maxScroll) {
          stopAutoScroll();
        } else {
          isAutoScrolling = true;
          lastScrollTime = Date.now();
          window.scrollTo({ top: current + step, behavior: "smooth" });
        }
      }, 100);
    }
  });
  
  function stopAutoScroll() {
    isPlaying = false;
    clearInterval(autoScrollInterval);
    playPauseBtn.text("↻ Reset");
  }
  

  dropdown.on("change", function () {
    updateChart(this.value);
  });

  function updateChart(user) {
    const userData = accData.filter(d => d.user === user);
    userData.sort((a, b) => a.time - b.time);

    const timeExtent = d3.extent(userData, d => d.time);
    if (!timeExtent[0] || !timeExtent[1]) {
      console.warn(`No valid time extent for user ${user}.`);
      return;
    }

    const totalTimeRangeMs = timeExtent[1] - timeExtent[0] - 1 * 60 * 60 * 1000;
    const yExtent = d3.extent(userData, d => d.magnitude);

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollProgress = scrollTop / maxScroll;
      const offsetMs = scrollProgress * totalTimeRangeMs;

      const windowStart = new Date(timeExtent[0].getTime() + offsetMs);
      const windowEnd = new Date(windowStart.getTime() + 1 * 60 * 60 * 1000);

      const visibleData = userData.filter(d =>
        d.time >= windowStart && d.time <= windowEnd
      );

      renderChart(visibleData, windowStart, windowEnd, yExtent);
    });

    const initialStart = timeExtent[0];
    const initialEnd = new Date(initialStart.getTime() + 1 * 60 * 60 * 1000);
    const initialData = userData.filter(d =>
      d.time >= initialStart && d.time <= initialEnd
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
    .domain([yExtent[0] - 1, yExtent[1] + 1])
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.time))
    .y(d => y(d.magnitude));

  svg.append("path")
    .datum(dataSlice)
    .attr("fill", "none")
    .attr("stroke", "#007acc")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%-I:%M %p")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .text("Time (1-Hour Window)");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Vector Magnitude (Smoothed)");

  const hoverLine = svg.append("line")
    .attr("stroke", "gray")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4")
    .style("display", "none");

  const hoverDot = svg.append("circle")
    .attr("r", 4)
    .attr("fill", "#007acc")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .style("display", "none");

  svg.append("rect")
    .attr("fill", "transparent")
    .attr("x", margin.left)
    .attr("y", y.range()[1])
    .attr("width", width - margin.left - margin.right)
    .attr("height", y.range()[0] - y.range()[1])
    .on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event);
      const timeX = x.invert(mouseX);

      const bisect = d3.bisector(d => d.time).center;
      const index = bisect(dataSlice, timeX);
      const d = dataSlice[index];
      if (!d) return;

      tooltip
        .style("display", "block")
        .html(`
          <strong>Magnitude:</strong> ${d.magnitude.toFixed(2)}<br/>
          <strong>Time:</strong> ${d3.timeFormat("%-I:%M %p")(d.time)}
        `)
        .style("left", (event.clientX + 10) + "px")
        .style("top", (event.clientY + 15) + "px");

      const xCoord = x(d.time);
      hoverLine
        .attr("x1", xCoord)
        .attr("x2", xCoord)
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .style("display", "block");

      hoverDot
        .attr("cx", xCoord)
        .attr("cy", y(d.magnitude))
        .style("display", "block");
    })
    .on("mouseleave", () => {
      tooltip.style("display", "none");
      hoverLine.style("display", "none");
      hoverDot.style("display", "none");
    });

    loadingOverlay.style("display", "none");
}
