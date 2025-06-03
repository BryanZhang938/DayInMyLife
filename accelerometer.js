import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 1000;
const height = 400;
const margin = { top: 5, right: 0, bottom: 60, left: 20 };
const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

if (!selectedUser) {
  console.error("No user specified in URL.");
}

const svg = d3.select("#chart-acc")
  .attr("viewBox", [0, 0, width, height]);

const dropdown = d3.select("#user-select");

const loadingOverlay = d3.select("#loading-overlay-acc");
const loadingText = d3.select("#loading-text-acc");

let isPlaying = false;
let autoScrollInterval = null;
let isAutoScrolling = false;
let lastScrollTime = 0;

let tooltip = d3.select("#tooltip-div-acc");
if (tooltip.empty()) {
  tooltip = d3.select("body").append("div")
    .attr("id", "tooltip-div-acc")
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
if (loadingText.node()) {
  loadingText.text("Loading data...");
}

d3.csv("../assets/cleaned_data/acc.csv", d => {
  // const time = parseTime(d.time);
  return {
    user: d.user,
    time: new Date(d.time),
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

  if (loadingText.node()) {
    loadingText.text("Loading graph...");
  }
  updateChart(selectedUser);

  const playPauseBtn = d3.select("#play-pause-btn");
  const fastBtn = d3.select("#fast");
  const slowBtn = d3.select("#slow");
  const scrollSpeed = d3.select("#scroll-speed");

  let currentSpeed = 1.5;
  const baseInterval = 50;
  const step = 15;
  

  playPauseBtn.on("click", () => {
    if (!playPauseBtn || !playPauseBtn.node()) return;
    
    if (isPlaying) {
      // If currently playing, pause auto-scroll
      isPlaying = false;
      clearInterval(autoScrollInterval);
      playPauseBtn.text("▶");
      playPauseBtn.style("font-size", "1.3rem");
    } else if (playPauseBtn.text() === "↻") {
      // If button says Reset, scroll top and switch to play
      window.scrollTo({ top: 0, behavior: "auto" });
      playPauseBtn.text("▶");
    } else {
      // Start auto-scroll
      isPlaying = true;
      playPauseBtn.text("⏸");
      playPauseBtn.style("font-size", "1.5rem");
  
      autoScrollInterval = setInterval(() => {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        const distance = step * currentSpeed;
  
        if (current + distance >= maxScroll) {
          window.scrollTo({ top: maxScroll });
          stopAutoScroll();
        } else {
          isAutoScrolling = true;
          lastScrollTime = Date.now();
          window.scrollTo({ top: current + distance, behavior: "auto" });
        }
      }, baseInterval);
    }
  });

  fastBtn.on("click", () => {
    if (currentSpeed === 0.5) {
      currentSpeed = 1;
      scrollSpeed.text("1×");
    } else if (currentSpeed === 1) {
      currentSpeed = 1.5;
      scrollSpeed.text("1.5×");
    } else if (currentSpeed === 1.5) {
      currentSpeed = 2;
      scrollSpeed.text("2×");
    } else if (currentSpeed === 2) {
      currentSpeed = 2.5;
      scrollSpeed.text("2.5×");
    } else {
      currentSpeed = 2.5;
      scrollSpeed.text("2.5×");
    }

  
    if (isPlaying) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = setInterval(() => {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        const distance = step * currentSpeed;
  
        if (current + distance >= maxScroll) {
          window.scrollTo({ top: maxScroll });
          stopAutoScroll();
        } else {
          isAutoScrolling = true;
          lastScrollTime = Date.now();
          window.scrollTo({ top: current + distance, behavior: "auto" });
        }
      }, baseInterval);
    }

  });

  slowBtn.on("click", () => {
    if (currentSpeed === 2.5) {
      currentSpeed = 2;
      scrollSpeed.text("2×");
    } else if (currentSpeed === 2) {
      currentSpeed = 1.5;
      scrollSpeed.text("1.5×");
    } else if (currentSpeed === 1.5) {
      currentSpeed = 1;
      scrollSpeed.text("1×");
    } else if (currentSpeed === 1) {
      currentSpeed = 0.5;
      scrollSpeed.text("0.5×");
    } else {
      currentSpeed = 0.5;
      scrollSpeed.text("0.5×");
    }

    if (isPlaying) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = setInterval(() => {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        const distance = step * currentSpeed;
  
        if (current + distance >= maxScroll) {
          window.scrollTo({ top: maxScroll });
          stopAutoScroll();
        } else {
          isAutoScrolling = true;
          lastScrollTime = Date.now();
          window.scrollTo({ top: current + distance, behavior: "auto" });
        }
      }, baseInterval);
    }
  });
  
  
  function stopAutoScroll() {
    isPlaying = false;
    clearInterval(autoScrollInterval);
    if (playPauseBtn && playPauseBtn.node()) {
      playPauseBtn.text("↻");
    }
  }
  
  window.addEventListener("wheel", () => {
    if (isPlaying) {
      isPlaying = false;
      clearInterval(autoScrollInterval);
      playPauseBtn.text("▶");
    }
  }, { passive: true });
  
  window.addEventListener("touchmove", () => {
    if (isPlaying) {
      isPlaying = false;
      clearInterval(autoScrollInterval);
      playPauseBtn.text("▶");
    }
  }, { passive: true });
  
  // if we're in "↻ Reset" but the user scrolls up off the bottom, flip back to ▶ Auto-Scroll
window.addEventListener("scroll", () => {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  // only when we're showing Reset and we're no longer at the bottom
  if (playPauseBtn && playPauseBtn.node() && playPauseBtn.text() === "↻" && window.scrollY < maxScroll) {
    playPauseBtn.text("▶");
  }
}, { passive: true });

  function updateChart(user) {
    let userData = accData.filter(d => d.user === user);
    userData.sort((a, b) => a.time - b.time);

    userData = interpolateAccelerometerData(userData);

    const timeExtent = d3.extent(userData, d => d.time);
    if (!timeExtent[0] || !timeExtent[1]) {
      console.warn(`No valid time extent for user ${user}.`);
      return;
    }

    const scrollableTimeRangeMs = timeExtent[1] - timeExtent[0];
    const totalTimeRangeMs = Math.max(0, scrollableTimeRangeMs - 1 * 60 * 60 * 1000);
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
    .call(d3.axisLeft(y).ticks(8));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 7)
    .attr("text-anchor", 'middle')
    .text("Time (1-Hour Window)")
    .style("font-size", "25px")
    .style("font-weight", "bold");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", margin.left-55)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Movement Intensity")
    .style("font-size", "25px")
    .style("font-weight", "bold");

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

    svg.selectAll(".tick text")
    .style("font-size", "20px");
    
    svg.selectAll(".domain, .tick line")
    .style("stroke", "#333")
    .style("stroke-width", 2);

    loadingOverlay.style("display", "none");
}

function interpolateAccelerometerData(data) {
  if (!data || data.length < 2) return data;
  
  const interpolatedData = [];
  const MAX_GAP_MINUTES = 3;
  
  // Sort data by time
  const sortedData = [...data].sort((a, b) => a.time - b.time);
  
  for (let i = 0; i < sortedData.length - 1; i++) {
      const current = sortedData[i];
      const next = sortedData[i + 1];
      
      // Add current point
      interpolatedData.push(current);
      
      // Calculate time difference in minutes
      const timeDiff = (next.time - current.time) / (1000 * 60);
      
      // If gap is larger than MAX_GAP_MINUTES, interpolate
      if (timeDiff > MAX_GAP_MINUTES) {
          const numPoints = Math.floor(timeDiff / MAX_GAP_MINUTES);
          const stepSize = timeDiff / (numPoints + 1);
          
          for (let j = 1; j <= numPoints; j++) {
              const interpolatedTime = new Date(current.time.getTime() + (stepSize * j * 60 * 1000));
              const interpolatedMagnitude = current.magnitude + (next.magnitude - current.magnitude) * (j / (numPoints + 1));
              
              interpolatedData.push({
                  user: current.user,
                  time: interpolatedTime,
                  magnitude: interpolatedMagnitude
              });
          }
      }
  }
  
  // Add the last point
  interpolatedData.push(sortedData[sortedData.length - 1]);
  
  return interpolatedData;
}

function parseAccelerometer(d) {
  return {
    user: d.user,
    datetime: new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`),
    magnitude: +d["Vector Magnitude"]
  };
}

function processAccelerometerData(data) {
  if (!data || data.length === 0) {
    console.error("No accelerometer data available");
    return { hourlyData: [], peakHour: null };
  }

  const validData = data.filter(d => !isNaN(d.magnitude) && d.datetime instanceof Date);

  if (validData.length === 0) {
    console.error("No valid accelerometer data points found");
    return { hourlyData: [], peakHour: null };
  }

  const hourlyData = Array.from(
    d3.rollup(
      validData,
      v => d3.mean(v, d => d.magnitude),
      d => d3.timeHour(d.datetime)
    ),
    ([hour, avgMagnitude]) => ({ hour, avgMagnitude })
  ).sort((a, b) => a.hour - b.hour);

  const peakHour = hourlyData.length > 0 
    ? hourlyData.reduce((a, b) => b.avgMagnitude > a.avgMagnitude ? b : a, hourlyData[0])
    : null;

  return { hourlyData, peakHour };
}

function drawAccelerometer(data) {
  const { hourlyData, peakHour } = processAccelerometerData(data);

  // Update peak value display
  const peakValueElement = document.getElementById('accelerometer-peak-value');
  const peakTimeElement = document.getElementById('accelerometer-peak-time');
  
  if (peakValueElement && peakTimeElement) {
    peakValueElement.textContent = peakHour ? `${peakHour.avgMagnitude.toFixed(1)}` : 'N/A';
    peakTimeElement.textContent = peakHour ? `Peak at ${d3.timeFormat("%-I %p")(peakHour.hour)}` : 'Peak at N/A';
  }

  // Update metrics grid
  const metricsContainer = d3.select("#accelerometer-metrics");
  metricsContainer.html(""); // clear existing

  const metrics = [
    { key: 'avgMagnitude', label: 'Average Movement', value: `${d3.mean(hourlyData, d => d.avgMagnitude).toFixed(1)}` },
    { key: 'minMagnitude', label: 'Minimum Movement', value: `${d3.min(hourlyData, d => d.avgMagnitude).toFixed(1)}` },
    { key: 'maxMagnitude', label: 'Maximum Movement', value: `${d3.max(hourlyData, d => d.avgMagnitude).toFixed(1)}` },
    { key: 'magnitudeRange', label: 'Movement Range', value: `${(d3.max(hourlyData, d => d.avgMagnitude) - d3.min(hourlyData, d => d.avgMagnitude)).toFixed(1)}` }
  ];

  metrics.forEach(metric => {
    const metricDiv = metricsContainer.append('div').attr('class', 'metric');
    
    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    metricDiv.append('span')
      .attr('class', 'metric-value-badge')
      .text(metric.value);
  });

  if (hourlyData.length === 0) return;

  const svg = d3.select("#accelerometer-chart");
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
    .domain([0, d3.max(hourlyData, d => d.avgMagnitude)]).nice()
    .range([height - margin.bottom, margin.top]);

  let tooltip = d3.select("body").select("#tooltip-accelerometer");

  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("id", "tooltip-accelerometer")
      .attr("class", "chart-tooltip");
  }

  const barW = ((width - margin.left - margin.right) / hourlyData.length) * 0.8;

  svg.append("g")
    .selectAll("rect")
    .data(hourlyData)
    .join("rect")
    .attr("x", d => x(d.hour) - barW / 2)
    .attr("y", d => y(d.avgMagnitude))
    .attr("width", barW)
    .attr("height", d => height - margin.bottom - y(d.avgMagnitude))
    .attr("fill", d => peakHour && d.hour.getTime() === peakHour.hour.getTime() ? "var(--accent-activity)" : "var(--primary)")
    .attr("opacity", 0.6)
    .on("mouseover", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Time:</strong> ${d3.timeFormat("%-I %p")(d.hour)}<br>
          <strong>Movement Level:</strong> ${d.avgMagnitude.toFixed(1)}
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
    .text("Average Movement Level");
}

export { parseAccelerometer, drawAccelerometer };