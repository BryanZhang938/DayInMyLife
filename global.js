import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
const tooltip = d3.select("#tooltip");

const svg = d3.select("body")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("assets/cleaned_data/relevant_user_info.csv", d3.autoType).then(data => {
    data = data.filter(d => d.user !== "user_11");
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Age)).nice()
    .range([0, width]);
    const r = d3.scaleLinear()
    .domain(d3.extent(data, d => d.avg_HR))
    .range([8, 24]); // Adjust min/max size as needed
  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.BMI)).nice()
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Age");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("BMI");

    svg.selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(d.Age))
      .attr("cy", d => y(d.BMI))
      .attr("r", d => r(d.avg_HR))
      .attr("fill", "steelblue")
      .attr("opacity", 0.8)
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5)
      .on("click", function(event, d) {
        const encodedUser = encodeURIComponent(d.user); // handles spaces
        window.location.href = `day_info/index.html?user=${encodedUser}`;
      })
      
      
      .on("mouseover", function (event, d) {
        tooltip.style("visibility", "visible")
        .html(`<strong>Participant ${d.user.replace('user_', '')}</strong><br>` +
                `Age: ${d.Age}<br>` +
                `Height: ${d.Height} cm<br>` +
                `Weight: ${d.Weight} kg<br>` +
                `BMI: ${d.BMI}<br>` +
                `Avg HR: ${d.avg_HR.toFixed(1)} bpm`
              );
        d3.select(this).attr("stroke-width", 1.5);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", (event.pageY - 40) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        d3.select(this).attr("stroke-width", 0.5);
      });
      svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat("")  // no labels
    );
    svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .tickSize(-height)
      .tickFormat("")  // no labels
    );
});