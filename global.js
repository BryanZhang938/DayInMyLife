import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("body")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("cleaned_data/relevent_user_info.csv", d3.autoType).then(data => {
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Age)).nice()
    .range([0, width]);

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
      .attr("r", 5)
      .attr("fill", "steelblue")
      .attr("opacity", 0.8);

  // Optional: Tooltip on hover
  svg.selectAll("circle")
    .append("title")
    .text(d => `User: ${d.user}\nAge: ${d.Age}\nBMI: ${d.BMI}`);
});