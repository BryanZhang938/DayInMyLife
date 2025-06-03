import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { parseActivity, drawActivity } from './activity.js';
import { parseHeartRate, drawHeartRate } from './heartrate.js';

const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

// Load and process all data
Promise.all([
  d3.csv("../assets/cleaned_data/all_actigraph.csv", parseActivity),
  d3.csv("../assets/cleaned_data/all_actigraph.csv", parseHeartRate),
  d3.csv("../assets/cleaned_data/all_sleep.csv", d => {
    const anchor = new Date(2000, 0, 1);
    const dayOffset = +d["In Bed Date"];
    const timeStr = d["In Bed Time"];
    if (!timeStr || !d["In Bed Date"]) return null;

    const [hour, minute] = timeStr.split(":").map(Number);
    const datetime = new Date(anchor);
    datetime.setDate(anchor.getDate() + dayOffset - 1);
    datetime.setHours(hour);
    datetime.setMinutes(minute);

    return {
      user: d.user.trim(),
      datetime: datetime,
      efficiency: +d.Efficiency,
      totalSleep: +d["Total Sleep Time (TST)"],
      waso: +d["Wake After Sleep Onset (WASO)"],
      latency: +d.Latency,
      awakenings: +d["Number of Awakenings"],
      avgAwakeningLength: +d["Average Awakening Length"],
      movementIndex: +d["Movement Index"],
      fragmentationIndex: +d["Fragmentation Index"]
    };
  }),
  d3.csv("../assets/cleaned_data/all_saliva.csv", d => ({
    user: d.user.trim(),
    sample: d.SAMPLES.toLowerCase(),
    cortisol: +d["Cortisol NORM"],
    melatonin: +d["Melatonin NORM"]
  }))
]).then(([activityData, heartRateData, sleepData, salivaData]) => {
  if (selectedUser) {
    // Filter data for selected user
    const filteredActivity = activityData.filter(d => d.user === selectedUser);
    const filteredHeartRate = heartRateData.filter(d => d.user === selectedUser);
    const filteredSleep = sleepData.filter(d => d.user === selectedUser);
    const filteredSaliva = salivaData.filter(d => d.user === selectedUser);

    // Display all metrics
    drawActivity(filteredActivity);
    drawHeartRate(filteredHeartRate);
    displaySleepMetrics(filteredSleep[filteredSleep.length - 1]);
    displayHormoneMetrics(filteredSaliva);
  } else {
    console.warn("No user selected in URL (use ?user=user_1)");
  }
});

// Add metric descriptions
const metricDescriptions = {
  totalSleep: "The total amount of time spent sleeping during the night.",
  efficiency: "The percentage of time spent asleep while in bed.",
  latency: "The time it takes to fall asleep after getting into bed.",
  awakenings: "The number of times you woke up during the night.",
  avgAwakeningLength: "The average duration of each awakening during sleep.",
  waso: "The total time spent awake after initially falling asleep.",
  movementIndex: "A measure of how much movement occurred during sleep.",
  fragmentationIndex: "A measure of how fragmented your sleep was.",
  cortisol: "A stress hormone that follows a daily rhythm, typically highest in the morning.",
  melatonin: "A sleep-promoting hormone that rises in the evening and peaks during sleep."
};

function showInfoTooltip(x, y, text) {
  let tooltip = d3.select("#metric-info-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "metric-info-tooltip")
      .style("position", "absolute")
      .style("background-color", "var(--popover)")
      .style("color", "var(--popover-foreground)")
      .style("border", "1px solid var(--border)")
      .style("border-radius", "var(--radius-md)")
      .style("padding", "0.5rem 0.75rem")
      .style("font-size", "0.875rem")
      .style("box-shadow", "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)")
      .style("z-index", "1010")
      .style("pointer-events", "none")
      .style("max-width", "250px")
      .style("line-height", "1.5")
      .style("transition", "opacity 0.15s ease-in-out");
  }

  tooltip
    .html(text)
    .style("left", `${x + 12}px`)
    .style("top", `${y - 10}px`)
    .style("visibility", "visible")
    .style("opacity", "1");
}

function hideInfoTooltip() {
  const tooltip = d3.select("#metric-info-tooltip");
  if (!tooltip.empty()) {
    tooltip
      .style("visibility", "hidden")
      .style("opacity", "0");
  }
}

function displaySleepMetrics(data) {
  if (!data) return;
  
  const metricsContainer = d3.select('#sleep-metrics');
  metricsContainer.html(""); // clear existing

  const metrics = [
    { key: 'totalSleep', label: 'Total Sleep', value: `${Math.floor(data.totalSleep/60)} h ${data.totalSleep%60} m` },
    { key: 'efficiency', label: 'Sleep Efficiency', value: `${isNaN(data.efficiency) ? "N/A" : data.efficiency.toFixed(1)} %` },
    { key: 'latency', label: 'Sleep Latency', value: `${data.latency} m` },
    { key: 'awakenings', label: 'Number of Awakenings', value: `${data.awakenings}` },
    { key: 'avgAwakeningLength', label: 'Average Awakening Length', value: `${data.avgAwakeningLength.toFixed(1)} s` },
    { key: 'waso', label: 'Wake After Sleep Onset', value: `${data.waso} m` },
    { key: 'movementIndex', label: 'Movement Index', value: `${data.movementIndex.toFixed(1)} %` },
    { key: 'fragmentationIndex', label: 'Fragmentation Index', value: `${data.fragmentationIndex.toFixed(1)} %` }
  ];

  metrics.forEach(metric => {
    const metricDiv = metricsContainer.append('div').attr('class', 'metric');
    
    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    if (metricDescriptions[metric.key]) {
      labelGroup.append('span')
        .attr('class', 'info-icon')
        .html(' <i class="fas fa-info-circle"></i>')
        .on('mouseover', (event) => {
          showInfoTooltip(event.pageX, event.pageY, metricDescriptions[metric.key]);
        })
        .on('mouseout', hideInfoTooltip);
    }

    metricDiv.append('span')
      .attr('class', 'metric-value-badge')
      .text(metric.value);
  });
}

function displayHormoneMetrics(data) {
  if (!data || data.length !== 2) return;

  const container = d3.select("#hormone-metrics");
  container.html(""); // clear existing

  // Sort to ensure before sleep comes first
  const sorted = data.sort((a, b) =>
    a.sample === "before sleep" ? -1 : 1
  );

  const metrics = [
    { key: 'cortisol', label: 'Cortisol (Before Sleep)', value: `${sorted[0].cortisol.toFixed(4)} µg/dL` },
    { key: 'cortisol', label: 'Cortisol (After Sleep)', value: `${sorted[1].cortisol.toFixed(4)} µg/dL` },
    { key: 'melatonin', label: 'Melatonin (Before Sleep)', value: `${sorted[0].melatonin.toFixed(4)} pg/mL` },
    { key: 'melatonin', label: 'Melatonin (After Sleep)', value: `${sorted[1].melatonin.toFixed(4)} pg/mL` }
  ];

  metrics.forEach(metric => {
    const metricDiv = container.append('div').attr('class', 'metric');
    
    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    if (metricDescriptions[metric.key]) {
      labelGroup.append('span')
        .attr('class', 'info-icon')
        .html(' <i class="fas fa-info-circle"></i>')
        .on('mouseover', (event) => {
          showInfoTooltip(event.pageX, event.pageY, metricDescriptions[metric.key]);
        })
        .on('mouseout', hideInfoTooltip);
    }

    metricDiv.append('span')
      .attr('class', 'metric-value-badge')
      .text(metric.value);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for "Start Exploring" link
  const startExploringLink = document.querySelector('a.start-exploring');

  if (startExploringLink) {
    startExploringLink.addEventListener('click', function(event) {
      event.preventDefault(); // Prevent the default anchor jump

      const targetId = this.getAttribute('href'); // Gets "#participant-overview-section"
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        // Calculate the scroll distance based on viewport height
        const viewportHeight = window.innerHeight;
        const scrollDistance = viewportHeight * 0.8; // Scroll 80% of the viewport height
        
        // Get the current scroll position
        const currentScroll = window.pageYOffset;
        
        // Calculate the target scroll position
        const targetScroll = currentScroll + scrollDistance;
        
        // Smooth scroll to the target position
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    });
  }

  const filterButton = document.querySelector('.controls-bar .filter-button');
  const filterPanel = document.getElementById('filter-panel');

  if (filterButton && filterPanel) {
      filterButton.addEventListener('click', () => {
          // Toggle the .open class on the filter panel
          filterPanel.classList.toggle('open');
          
          // Toggle the .active-filter class on the button based on the panel's state
          if (filterPanel.classList.contains('open')) {
              filterButton.classList.add('active-filter');
          } else {
              filterButton.classList.remove('active-filter');
          }
      });
  }

  // Tutorial Modal Functionality
  const showTutorialButton = document.querySelector('.controls-bar .tutorial-button');
  const tutorialModal = document.getElementById('tutorial-modal');
  const modalCloseButton = document.getElementById('modal-close-button');
  const tutorialTitleElement = document.getElementById('tutorial-title');
  const tutorialTextElement = document.getElementById('tutorial-text');
  const tutorialNextButton = document.getElementById('tutorial-next-button');
  const stepDotsContainer = document.getElementById('tutorial-step-dots');
  const stepIndicatorContainer = document.querySelector('.tutorial-header .step-indicator-container');

  console.log('Tutorial Button:', showTutorialButton);
  console.log('Tutorial Modal:', tutorialModal);

  const tutorialSteps = [
      {
          title: "Welcome to A Day in My Life!",
          content: "Each circle on the chart represents a real participant who shared their biometric data for 24 hours."
      },
      {
          title: "Explore the Data",
          content: "Hover over any circle to see that participant's summary details."
      },
      {
          title: "Begin the Journey",
          content: "Click on any participant's circle to dive into a more detailed view of their personal data story."
      }
  ];

  let currentTutorialStep = 0;

  function updateTutorialStepDots() {
      stepDotsContainer.innerHTML = ''; // Clear existing dots
      for (let i = 0; i < tutorialSteps.length; i++) {
          const dot = document.createElement('div');
          dot.classList.add('dot');
          if (i === currentTutorialStep) {
              dot.classList.add('active');
          }
          stepDotsContainer.appendChild(dot);
      }
  }

  function displayTutorialStep(stepIndex) {
      if (stepIndex < 0 || stepIndex >= tutorialSteps.length) return;

      const step = tutorialSteps[stepIndex];
      tutorialTitleElement.textContent = step.title;
      tutorialTextElement.textContent = step.content;

      if (stepIndicatorContainer) {
          stepIndicatorContainer.textContent = `${stepIndex + 1}`;
      }
      updateTutorialStepDots();

      if (stepIndex === tutorialSteps.length - 1) {
          tutorialNextButton.textContent = "Start Exploring";
      } else {
          tutorialNextButton.textContent = "Next";
      }
      currentTutorialStep = stepIndex;
  }

  function showModal() {
      console.log('Showing modal');
      currentTutorialStep = 0;
      displayTutorialStep(currentTutorialStep);
      tutorialModal.style.display = 'flex';
      tutorialModal.classList.add('visible');
  }

  function hideModal() {
      console.log('Hiding modal');
      tutorialModal.classList.remove('visible');
      setTimeout(() => {
          tutorialModal.style.display = 'none';
      }, 300); // Match the transition duration
  }

  if (showTutorialButton && tutorialModal) {
      showTutorialButton.addEventListener('click', () => {
          console.log('Tutorial button clicked');
          showModal();
      });
  }

  if (modalCloseButton) {
      modalCloseButton.addEventListener('click', hideModal);
  }

  if (tutorialModal) {
      tutorialModal.addEventListener('click', (event) => {
          if (event.target === tutorialModal) {
              hideModal();
          }
      });
  }

  if (tutorialNextButton) {
      tutorialNextButton.addEventListener('click', () => {
          if (currentTutorialStep < tutorialSteps.length - 1) {
              currentTutorialStep++;
              displayTutorialStep(currentTutorialStep);
          } else {
              hideModal();
          }
      });
  }

  // Optional: Show tutorial once on first visit
  if (!localStorage.getItem('tutorialShown')) {
      showModal();
      localStorage.setItem('tutorialShown', 'true');
  }

  // Trigger page load animations
  // Using a small timeout to ensure initial styles are rendered before 'loaded' class is added
  setTimeout(() => {
      document.body.classList.add('loaded');
  }, 100); // 100ms delay, adjust if needed
});

const intro = document.getElementById("intro-screen");
const runner = document.getElementById("runner");

if (!sessionStorage.getItem("introShown")) {
  // Show the intro screen
  if (intro) intro.style.display = "flex";
  if (runner) runner.style.display = "block";
  document.body.style.overflow = "hidden";

  document.getElementById("explore-button")?.addEventListener("click", () => {
    if (runner) {
      runner.style.transition = "opacity 1s ease";
      runner.style.opacity = 0;
    }

    if (intro) {
      intro.style.transition = "opacity 1s ease";
      intro.style.opacity = 0;
      setTimeout(() => {
        intro.style.display = "none";
        if (runner) runner.style.display = "none";
        document.body.style.overflow = "auto";
        sessionStorage.setItem("introShown", "true");
      }, 1000);
    }
  });
} else {
  // User has already seen the intro
  if (intro) intro.style.display = "none";
  if (runner) runner.style.display = "none";
  document.body.style.overflow = "auto";
}