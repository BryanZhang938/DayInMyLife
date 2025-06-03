import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const d3ChartContainer = document.getElementById('d3-chart-container');
const containerWidth = d3ChartContainer ? d3ChartContainer.clientWidth : 600;
const width = containerWidth - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const tooltip = d3.select("#tooltip");

// Ensure the container has a fixed height to prevent shifting
d3ChartContainer.style.height = `${height + margin.top + margin.bottom}px`;

const svg = d3.select("#d3-chart-container")
  .select("svg") // Try to select existing SVG first
  .empty() ? // If it doesn't exist, append it
    d3.select("#d3-chart-container").append("svg") 
    : d3.select("#d3-chart-container").select("svg"); // Otherwise, use the existing one

// Set fixed dimensions for the SVG
svg.attr("width", width + margin.left + margin.right)
   .attr("height", height + margin.top + margin.bottom)
   .style("display", "block"); // Ensure block display to prevent inline spacing issues

const chartGroup = svg.select("g")
    .empty() ?
    svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)
    : svg.select("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Select hover preview elements
const hoverPreviewHelper = d3.select(".hover-preview-helper");
const placeholderContent = hoverPreviewHelper.select(".placeholder-content");
const participantDetailsContent = hoverPreviewHelper.select(".participant-details-content");

let selectedCircle = null; // Keep track of the currently selected circle
let currentlySelectedData = null; // Keep track of data for the selected circle

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

  // Clear previous axes before drawing new ones if re-running
  chartGroup.selectAll(".axis").remove();
  chartGroup.selectAll(".axis-label").remove();
  chartGroup.selectAll(".grid").remove();

  chartGroup.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  chartGroup.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(y));

  chartGroup.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .text("Age");

  chartGroup.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .text("BMI");

  // Gridlines
  chartGroup.append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0,${height})`)
    .style("pointer-events", "none")
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));
  
  chartGroup.append("g")
    .attr("class", "grid y-grid")
    .style("pointer-events", "none")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  const circles = chartGroup.selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(d.Age))
      .attr("cy", d => y(d.BMI))
      .attr("r", d => r(d.avg_HR))
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.7)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer"); // Add pointer cursor

  // Set initial participant count right after drawing circles
  const countElement = document.getElementById('participant-count');
  if (countElement) {
    countElement.textContent = circles.size();
  }

  // Add event handlers
  circles
      .on("mouseover", function (event, d) {
        tooltip.style("visibility", "visible")
          .html(`<strong>Participant ${d.user.replace('user_', '')}</strong><br>` +
                `Age: ${d.Age}<br>` +
                `Height: ${d.Height} cm<br>` +
                `Weight: ${d.Weight} kg<br>` +
                `BMI: ${d.BMI}<br>` +
                `Avg HR: ${d.avg_HR} bpm`);
        
        // Highlight on hover only if not the currently selected circle
        if (!d3.select(this).classed("selected")) {
            d3.select(this)
              .attr("stroke-width", 2)
              .attr("opacity", 0.9);
        }

        // If no circle is selected, update hover preview
        if (!selectedCircle) {
            if (!hoverPreviewHelper.empty()) {
                placeholderContent.style("display", "none");
                const detailsHtml = `
                    <span class="avatar-placeholder">Participant ${d.user.replace('user_', '')}</span>
                    <ul>
                        <li><span class="label">Age:</span> <span class="value">${d.Age}</span></li>
                        <li><span class="label">Height:</span> <span class="value">${d.Height} cm</span></li>
                        <li><span class="label">Weight:</span> <span class="value">${d.Weight} kg</span></li>
                        <li><span class="label">BMI:</span> <span class="value">${d.BMI}</span></li>
                        <li><span class="label">Avg. Heart Rate:</span> <span class="value">${d.avg_HR} bpm</span></li>
                    </ul>`;
                participantDetailsContent.html(detailsHtml).style("display", "block");
            }
        }
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", (event.pageY - 40) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        // Revert hover highlight only if not the currently selected circle
        if (!d3.select(this).classed("selected")) {
            d3.select(this)
              .attr("stroke-width", 1)
              .attr("opacity", 0.7);
        }

        // If no circle is selected, revert hover preview to placeholder
        if (!selectedCircle) {
            if (!hoverPreviewHelper.empty()) {
                participantDetailsContent.style("display", "none").html('');
                placeholderContent.style("display", "block");
            }
        }
      })
      .on("click", function(event, d) {
        event.stopPropagation(); // Prevent click from bubbling to other elements like the main svg
        const clickedNode = this;

        // If there was a previously selected circle, reset its appearance
        if (selectedCircle && selectedCircle.node() !== clickedNode) {
          selectedCircle
            .classed("selected", false)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7);
        }

        // Toggle selection on the clicked circle
        if (selectedCircle && selectedCircle.node() === clickedNode) {
          // Deselecting the current circle
          d3.select(clickedNode)
            .classed("selected", false)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7); // Revert to default opacity
          selectedCircle = null;
          currentlySelectedData = null;
          console.log(`Participant ${d.user} deselected.`);
          
          // Revert to placeholder
          if (!hoverPreviewHelper.empty()) {
            participantDetailsContent.style("display", "none").html('');
            placeholderContent.select(".placeholder-title").text("Hover to Preview"); // Reset title
            placeholderContent.style("display", "block");
          }

        } else {
          // Selecting a new circle (or the first one)
          d3.select(clickedNode)
            .classed("selected", true)
            .attr("stroke", "#fbbf24") // Prominent stroke color for selection (amber)
            .attr("stroke-width", 3)
            .attr("opacity", 1); // Full opacity when selected
          selectedCircle = d3.select(clickedNode);
          currentlySelectedData = d;
          console.log(`Participant ${d.user} (Original ID: ${d.original_user}) selected.`);

          // Update hover-preview-helper with selected participant's details
          if (!hoverPreviewHelper.empty()) {
            placeholderContent.style("display", "none");
            const detailsHtml = `
                <span class="avatar-placeholder">Participant ${d.user.replace('user_', '')}</span>
                <ul>
                    <li><span class="label">Age:</span> <span class="value">${d.Age}</span></li>
                    <li><span class="label">Height:</span> <span class="value">${d.Height} cm</span></li>
                    <li><span class="label">Weight:</span> <span class="value">${d.Weight} kg</span></li>
                    <li><span class="label">BMI:</span> <span class="value">${d.BMI}</span></li>
                    <li><span class="label">Avg. Heart Rate:</span> <span class="value">${d.avg_HR} bpm</span></li>
                </ul>
                <button id="start-story-button" class="control-button" style="margin-top: 20px; width: 100%; justify-content: center;">Explore Their Day</button>
            `;
            participantDetailsContent.html(detailsHtml).style("display", "block");

            // Add event listener for the "Explore Their Day" button
            const startStoryButton = participantDetailsContent.select("#start-story-button");
            if (!startStoryButton.empty()) {
                startStoryButton.on("click", () => {
                    console.log(`Navigating to day_info for ${currentlySelectedData.user}`);
                    const encodedUser = encodeURIComponent(currentlySelectedData.original_user);
                    window.location.href = `day_info/index.html?user=${encodedUser}`;
                });
            }
          }
        }
      });

  // --- FILTER FUNCTION ---
  window.applyChartFilters = function() {
    // Get slider values from window.ageSlider and window.hrSlider
    let ageMin = 20, ageMax = 40, hrMin = 60, hrMax = 95;
    if (window.ageSlider && typeof window.ageSlider.getValues === 'function') {
      const ageVals = window.ageSlider.getValues();
      ageMin = ageVals.min;
      ageMax = ageVals.max;
    }
    if (window.hrSlider && typeof window.hrSlider.getValues === 'function') {
      const hrVals = window.hrSlider.getValues();
      hrMin = hrVals.min;
      hrMax = hrVals.max;
    }
    let visibleCount = 0;
    circles.each(function(d) {
      const show = d.Age >= ageMin && d.Age <= ageMax && d.avg_HR >= hrMin && d.avg_HR <= hrMax;
      d3.select(this).style("display", show ? null : "none");
      if (show) visibleCount++;
    });
    // Update participant count
    const countElement = document.getElementById('participant-count');
    if (countElement) {
      countElement.textContent = visibleCount;
    }
  };

  // Call filter once to set initial state
  window.applyChartFilters();
});

// Add a click listener to the SVG background to deselect any circle
svg.on("click", function() {
    if (selectedCircle) {
        selectedCircle
            .classed("selected", false)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7);
        selectedCircle = null;
        currentlySelectedData = null;
        console.log("Selection cleared by clicking background.");

        if (!hoverPreviewHelper.empty()) {
            participantDetailsContent.style("display", "none").html('');
            placeholderContent.select(".placeholder-title").text("Hover to Preview");
            placeholderContent.style("display", "block");
        }
    }
});