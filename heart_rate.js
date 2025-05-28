import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900;
const height = 400;
const margin = { top: 40, right: 20, bottom: 40, left: 20 };
const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

if (!selectedUser) {
  console.error("No user specified in URL.");
}
const svg = d3.select("#chart")
  .attr("viewBox", [0, 0, width, height]);

const activityLabels = {
  1: "Sleeping",
  2: "Laying down",
  3: "Sitting",
  4: "Light movement",
  5: "Medium activity",
  6: "Heavy activity",
  7: "Eating",
  8: "Small screen",
  9: "Large screen",
  10: "Caffeine",
  11: "Smoking",
  12: "Alcohol"
};

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

Promise.all([
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
  }),
  d3.csv("../cleaned_data/all_activity.csv", d => {
    return {
      activity: +d.Activity,
      start: new Date(`2024-01-${String(d.Day).padStart(2, '0')}T${d.Start}`),
      end: new Date(`2024-01-${String(d.Day).padStart(2, '0')}T${d.End}`),
      user: d.user
    };
  })
]).then(([hrData, activityData]) => {
  hrData = hrData.filter(d => d !== null);

  updateChart(selectedUser);

  function updateChart(user) {
    const userData = hrData.filter(d => d.user === user);
    const userActivities = activityData.filter(d => d.user === user);

    const bpmPerMinute = d3.rollups(
      userData,
      v => d3.mean(v, d => d.heartRate),
      d => d.minute
    ).map(([minute, avgHR]) => ({ minute, avgHR }));

    bpmPerMinute.sort((a, b) => a.minute - b.minute);
    const timeExtent = d3.extent(bpmPerMinute, d => d.minute);
    if (!timeExtent[0] || !timeExtent[1]) {
      console.warn(`No valid time extent for user ${user}.`);
      return;
    }

    const totalTimeRangeMs = timeExtent[1] - timeExtent[0] - 1 * 60 * 60 * 1000;
    const yExtent = d3.extent(bpmPerMinute, d => d.avgHR);

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollProgress = scrollTop / maxScroll;
      const offsetMs = scrollProgress * totalTimeRangeMs;

      const windowStart = new Date(timeExtent[0].getTime() + offsetMs);
      const windowEnd = new Date(windowStart.getTime() + 1 * 60 * 60 * 1000);

      const visibleData = bpmPerMinute.filter(d =>
        d.minute >= windowStart && d.minute <= windowEnd
      );
      const visibleActivities = userActivities.filter(d =>
        d.end >= windowStart && d.start <= windowEnd
      );

      renderChart(visibleData, windowStart, windowEnd, yExtent, visibleActivities);
    });

    const initialStart = timeExtent[0];
    const initialEnd = new Date(initialStart.getTime() + 1 * 60 * 60 * 1000);
    const initialData = bpmPerMinute.filter(d =>
      d.minute >= initialStart && d.minute <= initialEnd
    );
    const initialActivities = userActivities.filter(d =>
      d.end >= initialStart && d.start <= initialEnd
    );

    renderChart(initialData, initialStart, initialEnd, yExtent, initialActivities);
  }
});

function renderChart(dataSlice, windowStart, windowEnd, yExtent, activities) {
  svg.selectAll("*").remove();

  activities = activities.filter(d => activityLabels[d.activity] !== undefined);

  const x = d3.scaleTime()
    .domain([windowStart, windowEnd])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([yExtent[0] - 5, yExtent[1] + 5])
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.minute))
    .y(d => y(d.avgHR));

  const activityColor = d3.scaleOrdinal()
    .domain(d3.range(1, 13))
    .range(d3.schemeTableau10.concat(d3.schemePastel1));

  svg.selectAll(".activity-rect")
    .data(activities)
    .enter()
    .append("rect")
    .attr("class", d => `activity-rect activity-${d.start.getTime()}-${d.end.getTime()}`)
    .attr("x", d => x(new Date(Math.max(d.start.getTime(), windowStart.getTime()))))
    .attr("y", margin.top)
    .attr("width", d => {
        const clippedStart = Math.max(d.start.getTime(), windowStart.getTime());
        const clippedEnd = Math.min(d.end.getTime(), windowEnd.getTime());
        return x(new Date(clippedEnd)) - x(new Date(clippedStart));
    })
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", d => activityColor(d.activity))
    .attr("opacity", 0.15)
    .on("mousemove", function(event, d) {
      d3.select(this).attr("opacity", 0.35);
      tooltip
        .style("display", "block")
        .html(`<strong style="color:${activityColor(d.activity)}">${activityLabels[d.activity]}</strong>`)
        .style("left", (event.clientX + 10) + "px")
        .style("top", (event.clientY + 15) + "px");
    })
    .on("mouseleave", function() {
      d3.select(this).attr("opacity", 0.15);
      tooltip.style("display", "none");
    });

  svg.append("path")
    .datum(dataSlice)
    .attr("fill", "none")
    .attr("stroke", "#e60026")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%-I:%M %p")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  /* svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .text("Time (1-Hour Window)"); */

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left - 5)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Beats Per Minute")
    .style("font-size", "20px")
    .style("font-weight", "bold");

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
    .attr("y", y.range()[1])
    .attr("width", width - margin.left - margin.right)
    .attr("height", y.range()[0] - y.range()[1])
    .on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event);
      const timeX = x.invert(mouseX);

      const bisect = d3.bisector(d => d.minute).center;
      const index = bisect(dataSlice, timeX);
      const d = dataSlice[index];
      if (!d) return;

      const formatTime = d3.timeFormat("%-I:%M %p");

      const hoveredTime = d.minute;

        // Check if hovered time falls within any activity range
        const overlappingActivity = activities.find(a =>
        hoveredTime >= a.start && hoveredTime <= a.end
        );

        d3.selectAll(".activity-rect").attr("opacity", 0.15); // reset all

        if (overlappingActivity) {
        const className = `.activity-${overlappingActivity.start.getTime()}-${overlappingActivity.end.getTime()}`;
        d3.select(className).attr("opacity", 0.35); // highlight current
        }

        const activityLine = overlappingActivity
        ? `<strong style="color:${activityColor(overlappingActivity.activity)}">${activityLabels[overlappingActivity.activity]}</strong><br/>`
        : "";

        tooltip
        .style("display", "block")
        .html(`
            ${activityLine}
            <strong>BPM:</strong> ${d.avgHR.toFixed(1)}<br/>
            <strong>Time:</strong> ${formatTime(d.minute)}
        `)
        .style("left", (event.clientX + 10) + "px")
        .style("top", (event.clientY + 15) + "px");

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
      tooltip.style("display", "none");
      hoverLine.style("display", "none");
      hoverDot.style("display", "none");
    });

  svg.selectAll(".tick text")
  .style("font-size", "17px");

  svg.selectAll(".domain, .tick line")
  .style("stroke", "#333")
  .style("stroke-width", 1.5);

}
