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
    // Ensure 'd' is not null or undefined before trying to access its properties
    if (!d || !d["In Bed Date"] || !d["In Bed Time"]) return null;

    const anchor = new Date(2000, 0, 1);
    const dayOffset = +d["In Bed Date"];
    const timeStr = d["In Bed Time"];
    // Additional check for timeStr validity can be added if needed
    // e.g. if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return null;

    const [hour, minute] = timeStr.split(":").map(Number);
    const datetime = new Date(anchor);
    datetime.setDate(anchor.getDate() + dayOffset - 1);
    datetime.setHours(hour);
    datetime.setMinutes(minute);

    return {
      user: d.user ? d.user.trim() : null, // Ensure user exists
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
  d3.csv("../assets/cleaned_data/all_saliva.csv", d => {
    if (!d || !d.user || !d.SAMPLES) return null; // Basic check for essential fields
    // Debug log to see the actual sample names
    return {
        user: d.user.trim(),
        sample: d.SAMPLES.toLowerCase().trim(), // Ensure consistent sample names
        cortisol: +d["Cortisol NORM"],
        melatonin: +d["Melatonin NORM"]
    };
  })
]).then(([activityData, heartRateData, sleepData, salivaData]) => {
  
  // Filter out any null entries that might have occurred during parsing
  const validSleepData = sleepData.filter(d => d && d.user);
  const validSalivaData = salivaData.filter(d => d && d.user);

  // Debug log to see the processed saliva data

  // Calculate average sleep metrics for all participants
  const allParticipantsSleepAverages = {};
  if (validSleepData && validSleepData.length > 0) {
      const collectedMetrics = {
          efficiency: [], totalSleep: [], waso: [], latency: [],
          awakenings: [], avgAwakeningLength: [], movementIndex: [], fragmentationIndex: []
      };

      // Use all sleep records instead of just the latest ones
      validSleepData.forEach(userData => {
          collectedMetrics.efficiency.push(userData.efficiency);
          collectedMetrics.totalSleep.push(userData.totalSleep);
          collectedMetrics.waso.push(userData.waso);
          collectedMetrics.latency.push(userData.latency);
          collectedMetrics.awakenings.push(userData.awakenings);
          collectedMetrics.avgAwakeningLength.push(userData.avgAwakeningLength);
          collectedMetrics.movementIndex.push(userData.movementIndex);
          collectedMetrics.fragmentationIndex.push(userData.fragmentationIndex);
      });

      for (const key in collectedMetrics) {
          const validValues = collectedMetrics[key].filter(v => v !== null && !isNaN(v));
          if (validValues.length > 0) {
              allParticipantsSleepAverages[key] = d3.mean(validValues);
          } else {
              allParticipantsSleepAverages[key] = null;
          }
      }
  }

  // Calculate average hormone metrics for all participants
  const allParticipantsHormoneAverages = {};
  if (validSalivaData && validSalivaData.length > 0) {
      const samplesByUser = d3.group(validSalivaData, d => d.user);

      const userAverages = {
          cortisolBeforeSleep: [], cortisolAfterSleep: [],
          melatoninBeforeSleep: [], melatoninAfterSleep: []
      };

      samplesByUser.forEach(userSamples => {
          let cortisolBefore = null, cortisolAfter = null;
          let melatoninBefore = null, melatoninAfter = null;

          userSamples.forEach(sample => {
              if (sample.sample === 'before sleep') {
                  cortisolBefore = sample.cortisol;
                  melatoninBefore = sample.melatonin;
              } else if (sample.sample === 'wake up') {  // Changed from 'after sleep' to 'wake up'
                  cortisolAfter = sample.cortisol;
                  melatoninAfter = sample.melatonin;
              }
          });

          // Only add values if both before and after measurements exist
          if (cortisolBefore !== null && !isNaN(cortisolBefore)) userAverages.cortisolBeforeSleep.push(cortisolBefore);
          if (cortisolAfter !== null && !isNaN(cortisolAfter)) userAverages.cortisolAfterSleep.push(cortisolAfter);
          if (melatoninBefore !== null && !isNaN(melatoninBefore)) userAverages.melatoninBeforeSleep.push(melatoninBefore);
          if (melatoninAfter !== null && !isNaN(melatoninAfter)) userAverages.melatoninAfterSleep.push(melatoninAfter);
      });
      
      for (const key in userAverages) {
          const validValues = userAverages[key].filter(v => v !== null && !isNaN(v));
          if (validValues.length > 0) {
              allParticipantsHormoneAverages[key] = d3.mean(validValues);
          } else {
              allParticipantsHormoneAverages[key] = null;
          }
      }

      // Debug log to verify averages
  }

  if (selectedUser) {
    const filteredActivity = activityData.filter(d => d && d.user === selectedUser);
    const filteredHeartRate = heartRateData.filter(d => d && d.user === selectedUser);
    const filteredSleep = validSleepData.filter(d => d.user === selectedUser);
    const filteredSaliva = validSalivaData.filter(d => d.user === selectedUser);

    drawActivity(filteredActivity);
    drawHeartRate(filteredHeartRate);
    // Pass the calculated global averages to the display functions
    if (filteredSleep.length > 0) {
        displaySleepMetrics(filteredSleep[filteredSleep.length - 1], allParticipantsSleepAverages);
    }
    if (filteredSaliva.length > 0) { // Ensure there's data for the selected user
        displayHormoneMetrics(filteredSaliva, allParticipantsHormoneAverages);
    }

  } else {
    console.warn("No user selected in URL (use ?user=user_1)");
  }
});

// Add metric descriptions
const metricDescriptions = {
  totalSleep: "Total time the user spent sleeping, in minutes.",
  efficiency: "Percentage of time in bed that the user was actually asleep.",
  latency: "Time it took to fall asleep after going to bed.",
  awakenings: "Number of times the user woke up during sleep.",
  avgAwakeningLength: "Average duration of each awakening, in minutes.",
  waso: "Total number of minutes the participant spent awake after initially falling asleep.",
  movementIndex: "Percentage of time spent immobile (no arm movement) during the movement phase of sleep.",
  fragmentationIndex: "Percentage of time spent moving during what should have been immobile sleep phases.",
  cortisol: "Cortisol concentration measured in microgram (μg) of cortisol per 100 microgram (μg) of protein. Typically higher after waking, it reflects physiological stress and alertness.",
  melatonin: "Melatonin concentration measured in femtogram (fg) of melatonin per microgram (μg) of protein. Typically higher before sleep, it reflects readiness for sleep and circadian rhythm."
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

function displaySleepMetrics(data, allAverages) {
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

    // Append the average subtext
    if (allAverages && allAverages[metric.key] !== null && !isNaN(allAverages[metric.key])) {
        const avgValue = allAverages[metric.key];
        let avgText = "";
        if (metric.key === 'totalSleep') {
            avgText = `Avg: ${Math.floor(avgValue/60)} h ${Math.round(avgValue%60)} m`;
        } else if (metric.key === 'efficiency' || metric.key === 'movementIndex' || metric.key === 'fragmentationIndex') {
            avgText = `Avg: ${avgValue.toFixed(1)} %`;
        } else if (metric.key === 'latency' || metric.key === 'waso') {
            avgText = `Avg: ${avgValue.toFixed(1)} m`;
        } else if (metric.key === 'avgAwakeningLength') {
            avgText = `Avg: ${avgValue.toFixed(1)} s`;
        } else { // awakenings
             avgText = `Avg: ${avgValue.toFixed(1)}`;
        }
        metricDiv.append('span')
            .attr('class', 'metric-average-subtext')
            .style('font-size', '0.75em')
            .style('color', '#555') // Slightly darker for better readability
            .style('display', 'block')
            .style('margin-top', '5px')
            .text(avgText);
    }
  });
}

function displayHormoneMetrics(data, allAverages) {
  if (!data || data.length !== 2) return;

  const container = d3.select("#hormone-metrics");
  container.html(""); // clear existing

  // Sort to ensure before sleep comes first
  const sorted = data.sort((a, b) =>
    a.sample === "before sleep" ? -1 : 1
  );

  const metrics = [
    { key: 'cortisolBeforeSleep', label: 'Cortisol (Before Sleep)', value: `${sorted[0].cortisol.toFixed(4)} µg` },
    { key: 'cortisolAfterSleep', label: 'Cortisol (After Sleep)', value: `${sorted[1].cortisol.toFixed(4)} µg` },
    { key: 'melatoninBeforeSleep', label: 'Melatonin (Before Sleep)', value: `${(sorted[0].melatonin * 1000*1000*1000).toFixed(4)} fg` },
    { key: 'melatoninAfterSleep', label: 'Melatonin (After Sleep)', value: `${(sorted[1].melatonin * 1000*1000*1000).toFixed(4)} fg` }
  ];

  metrics.forEach(metric => {
    const metricDiv = container.append('div').attr('class', 'metric');
    
    const labelGroup = metricDiv.append('div').attr('class', 'metric-label-group');
    labelGroup.append('span').attr('class', 'metric-label-text').text(metric.label);

    // Use the base key 'cortisol' or 'melatonin' for descriptions
    const descriptionKey = metric.key.toLowerCase().includes('cortisol') ? 'cortisol' : 'melatonin';
    if (metricDescriptions[descriptionKey]) {
      labelGroup.append('span')
        .attr('class', 'info-icon')
        .html(' <i class="fas fa-info-circle"></i>')
        .on('mouseover', (event) => {
          showInfoTooltip(event.pageX, event.pageY, metricDescriptions[descriptionKey]);
        })
        .on('mouseout', hideInfoTooltip);
    }

    metricDiv.append('span')
      .attr('class', 'metric-value-badge')
      .text(metric.value);

    // Append the average subtext
    if (allAverages && allAverages[metric.key] !== null && !isNaN(allAverages[metric.key])) {
        const avgValue = allAverages[metric.key];
        let avgText = "";
        if (metric.key.toLowerCase().includes('melatonin')) {
            avgText = `Avg: ${(avgValue * 1000*1000*1000).toFixed(4)} fg`;
        } else { // Cortisol
            avgText = `Avg: ${avgValue.toFixed(4)} µg`;
        }

        metricDiv.append('span')
            .attr('class', 'metric-average-subtext')
            .style('font-size', '0.75em')
            .style('color', '#555')
            .style('display', 'block')
            .style('margin-top', '5px')
            .text(avgText);
    }
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
      currentTutorialStep = 0;
      displayTutorialStep(currentTutorialStep);
      tutorialModal.style.display = 'flex';
      tutorialModal.classList.add('visible');
  }

  function hideModal() {
      tutorialModal.classList.remove('visible');
      setTimeout(() => {
          tutorialModal.style.display = 'none';
      }, 300); // Match the transition duration
  }

  if (showTutorialButton && tutorialModal) {
      showTutorialButton.addEventListener('click', () => {
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