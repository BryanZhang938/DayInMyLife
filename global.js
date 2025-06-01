import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const d3ChartContainer = document.getElementById('d3-chart-container');
const containerWidth = d3ChartContainer ? d3ChartContainer.clientWidth : 600;
const width = containerWidth - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const tooltip = d3.select("#tooltip");

const svg = d3.select("#d3-chart-container")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Select hover preview elements
const hoverPreviewHelper = d3.select(".hover-preview-helper");
const placeholderContent = hoverPreviewHelper.select(".placeholder-content");
const participantDetailsContent = hoverPreviewHelper.select(".participant-details-content");

d3.csv("assets/cleaned_data/relevant_user_info.csv", d3.autoType).then(data => {
  data = data.filter(d => d.user !== "user_11" && d.user !== "user_8");

  data.forEach((d, i) => {
    d.original_user = d.user;
    d.user = `user_${i + 1}`;
    if (d.BMI && typeof d.BMI === 'number') d.BMI = parseFloat(d.BMI.toFixed(1));
    if (d.avg_HR && typeof d.avg_HR === 'number') d.avg_HR = parseFloat(d.avg_HR.toFixed(1));
  });

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Age)).nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.BMI)).nice()
    .range([height, 0]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.avg_HR))
    .range([8, 24]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .text("Age");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .text("BMI");

  svg.selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(d.Age))
      .attr("cy", d => y(d.BMI))
      .attr("r", d => r(d.avg_HR))
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.7)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .on("click", function(event, d) {
        const encodedUser = encodeURIComponent(d.original_user);
        console.log("Clicked participant (original ID):", d.original_user, "Reassigned ID for display:", d.user);
      })
      .on("mouseover", function (event, d) {
        tooltip.style("visibility", "visible")
          .html(`<strong>Participant ${d.user}</strong><br>` +
                `Age: ${d.Age}<br>` +
                `Height: ${d.Height} cm<br>` +
                `Weight: ${d.Weight} kg<br>` +
                `BMI: ${d.BMI}<br>` +
                `Avg HR: ${d.avg_HR} bpm`);
        
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("opacity", 0.9);

        if (!hoverPreviewHelper.empty()) {
            placeholderContent.style("display", "none");
            
            const detailsHtml = `
                <span class="avatar-placeholder">${d.user.replace('user_', 'P')}</span>
                <h4>Participant ${d.user}</h4>
                <ul>
                    <li><span class="label">Age:</span> <span class="value">${d.Age}</span></li>
                    <li><span class="label">Height:</span> <span class="value">${d.Height} cm</span></li>
                    <li><span class="label">Weight:</span> <span class="value">${d.Weight} kg</span></li>
                    <li><span class="label">BMI:</span> <span class="value">${d.BMI}</span></li>
                    <li><span class="label">Avg. Heart Rate:</span> <span class="value">${d.avg_HR} bpm</span></li>
                </ul>
            `;
            participantDetailsContent.html(detailsHtml).style("display", "block");
        }
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", (event.pageY - 40) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        d3.select(this)
          .attr("stroke-width", 1)
          .attr("opacity", 0.7);

        if (!hoverPreviewHelper.empty()) {
            participantDetailsContent.style("display", "none").html('');
            placeholderContent.style("display", "block");
        }
      });

  // Gridlines
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));
});