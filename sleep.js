const data = {};

function parseSleep(d) {
  return {
    user: d.user.trim(),
    datetime: d3.timeParse("%Y-%m-%d %H:%M")(d["In Bed Date"] + " " + d["In Bed Time"]),
    efficiency: +d.Efficiency,
    totalSleep: +d["Total Sleep Time (TST)"],
    waso: +d["Wake After Sleep Onset (WASO)"],
    latency: +d.Latency,
    awakenings: +d["Number of Awakenings"],
    avgAwakeningLength: +d["Average Awakening Length"],
    movementIndex: +d["Movement Index"],
    fragmentationIndex: +d["Fragmentation Index"]
  };
}

// load CSV once at startup
d3.csv("assets/cleaned_data/all_sleep.csv", parseSleep).then(sleep => {
  console.log("Sleep data loaded:", sleep);
  data.sleep = sleep;
  initParticipantSelector();
}).catch(error => {
  console.error("Error loading sleep data:", error);
});

function summarizeSleepByUser(sleepData) {
  const summary = d3.rollups(
    sleepData,
    v => ({
      totalSleep: d3.sum(v, d => d.totalSleep),
      count: v.length,
      avgEfficiency: d3.mean(v, d => d.efficiency),
      latest: v[v.length - 1]
    }),
    d => d.user
  );
  
  return Object.fromEntries(summary);
}

function initParticipantSelector() {
  // Get unique participants
  const participants = [...new Set(data.sleep.map(d => d.user))];

  const summary = summarizeSleepByUser(data.sleep);
  data.sleepSummary = summary;

  // Populate dropdown
  const select = d3.select('#participant-select');
  select.selectAll('option').remove(); 
  
  select.selectAll('option')
    .data(participants)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => `Participant ${d.replace('user_', '')}`);
  
  const defaultUser = "user_1";
  if (participants.includes(defaultUser)) {
    select.property("value", defaultUser);
    displaySleepMetrics(data.sleepSummary[defaultUser]);
  }

  // Add change event listener
  select.on('change', function() {
    const selectedUser = this.value;
    if (selectedUser) {
      const summary = data.sleepSummary[selectedUser];
      if (summary) {
        displaySleepMetrics(summary);
      }
    }
  });
}

function displaySleepMetrics(summary) {
  const { totalSleep, avgEfficiency, latest } = summary;

  d3.select('#sleep-metrics')
    .html(`
      <div class="metric">
        <strong>${Math.floor(totalSleep/60)} h ${totalSleep%60} m</strong>
        <div class="label">Total Sleep</div>
      </div>
      <div class="metric">
        <strong>${isNaN(avgEfficiency) ? "N/A" : avgEfficiency.toFixed(1)} %</strong>
        <div class="label">Sleep Efficiency</div>
      </div>
      <div class="metric">
        <strong>${latest.latency} m</strong>
        <div class="label">Sleep Latency</div>
      </div>
      <div class="metric">
        <strong>${latest.awakenings}</strong>
        <div class="label">Number of Awakenings</div>
      </div>
      <div class="metric">
        <strong>${latest.avgAwakeningLength.toFixed(1)} m</strong>
        <div class="label">Average Awakening Length</div>
      </div>
      <div class="metric">
        <strong>${latest.waso} m</strong>
        <div class="label">Wake After Sleep Onset</div>
      </div>
      <div class="metric">
        <strong>${latest.movementIndex.toFixed(1)}</strong>
        <div class="label">Movement Index</div>
      </div>
      <div class="metric">
        <strong>${latest.fragmentationIndex.toFixed(1)}</strong>
        <div class="label">Fragmentation Index</div>
      </div>
    `);
}

function initScrolly() {
  console.log("Initializing Scrollama");
  const scroller = scrollama();
  scroller
    .setup({ step: '.step', offset: 0.6 })
    .onStepEnter(({ element }) => {
      console.log("Step entered:", element.dataset.step);
      if (element.dataset.step === 'sleep') {
        drawSleep(data.sleep);
      }
    });
}

function drawSleep(sleepData) {
  console.log("Drawing sleep visualization with data:", sleepData);
  
  // 1) Enhanced Big‑number panel
  const latest = sleepData[sleepData.length - 1];
  d3.select('#sleep-metrics')
    .html(`
      <div class="metric">
        <strong>${Math.round(latest.totalSleep/60)} h ${latest.totalSleep%60} m</strong><br>
        Total Sleep
      </div>
      <div class="metric">
        <strong>${latest.efficiency.toFixed(1)} %</strong><br>
        Efficiency
      </div>
      <div class="metric">
        <strong>${latest.latency} m</strong><br>
        Sleep Latency
      </div>
      <div class="metric">
        <strong>${latest.awakenings}</strong><br>
        Awakenings
      </div>
      <div class="metric">
        <strong>${latest.avgAwakeningLength.toFixed(1)} m</strong><br>
        Avg. Awakening
      </div>
      <div class="metric">
        <strong>${latest.movementIndex.toFixed(1)}</strong><br>
        Movement Index
      </div>
    `);

  // 2) Enhanced Sparkline of Efficiency with annotations
  const svg = d3.select('#sleep-chart');
  const { width, height } = svg.node().getBoundingClientRect();
  const margin = { top: 40, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // clear previous
  svg.selectAll('*').remove();

  // Create chart group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(sleepData, d => d.datetime))
    .range([0, chartWidth]);

  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([chartHeight, 0]);

  // Add efficiency line
  const line = d3.line()
    .x(d => x(d.datetime))
    .y(d => y(d.efficiency))
    .curve(d3.curveMonotoneX);

  // Add area under the line
  const area = d3.area()
    .x(d => x(d.datetime))
    .y0(chartHeight)
    .y1(d => y(d.efficiency))
    .curve(d3.curveMonotoneX);

  // Draw area
  g.append('path')
    .datum(sleepData)
    .attr('d', area)
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.2);

  // Draw line
  g.append('path')
    .datum(sleepData)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2);

  // Add dots for each data point
  g.selectAll('.dot')
    .data(sleepData)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.efficiency))
    .attr('r', 4)
    .attr('fill', 'steelblue')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', 6)
        .attr('fill', '#ff7f0e');
      
      // Add tooltip
      const tooltip = g.append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${x(d.datetime)},${y(d.efficiency)})`);

      tooltip.append('rect')
        .attr('x', 10)
        .attr('y', -30)
        .attr('width', 120)
        .attr('height', 60)
        .attr('fill', 'white')
        .attr('stroke', '#ccc')
        .attr('rx', 5);

      tooltip.append('text')
        .attr('x', 15)
        .attr('y', -15)
        .text(`Date: ${d3.timeFormat('%b %d')(d.datetime)}`);

      tooltip.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .text(`Efficiency: ${d.efficiency.toFixed(1)}%`);

      tooltip.append('text')
        .attr('x', 15)
        .attr('y', 25)
        .text(`Sleep: ${Math.round(d.totalSleep/60)}h ${d.totalSleep%60}m`);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 4)
        .attr('fill', 'steelblue');
      
      // Remove tooltip
      g.selectAll('.tooltip').remove();
    });

  // Add axes
  const xAxis = d3.axisBottom(x)
    .ticks(7)
    .tickFormat(d3.timeFormat('%b %d'));

  const yAxis = d3.axisLeft(y)
    .ticks(5)
    .tickFormat(d => d + '%');

  g.append('g')
    .attr('transform', `translate(0,${chartHeight})`)
    .call(xAxis);

  g.append('g')
    .call(yAxis);

  // Add axis labels
  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', `translate(${chartWidth/2}, ${chartHeight + margin.bottom - 5})`)
    .style('text-anchor', 'middle')
    .text('Date');

  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -chartHeight/2)
    .attr('y', -margin.left + 15)
    .style('text-anchor', 'middle')
    .text('Sleep Efficiency (%)');

  // Add title
  g.append('text')
    .attr('class', 'chart-title')
    .attr('x', chartWidth/2)
    .attr('y', -margin.top/2)
    .style('text-anchor', 'middle')
    .style('font-size', '16px')
    .text('Sleep Efficiency Over Time');
}
  