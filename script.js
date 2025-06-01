import { parseActivity, drawActivity } from './activity.js';
import { parseHeartRate, drawHeartRate } from './heartrate.js';

const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");
// Load and process data
Promise.all([
  d3.csv("assets/cleaned_data/all_actigraph.csv", parseActivity),
  d3.csv("cleaned_data/all_actigraph.csv", parseHeartRate)
]).then(([activityData, heartRateData]) => {
  if (selectedUser) {
    const filteredActivity = activityData.filter(d => d.user === selectedUser);
    const filteredHeartRate = heartRateData.filter(d => d.user === selectedUser);

    drawActivity(filteredActivity);
    drawHeartRate(filteredHeartRate);
  } else {
    console.warn("No user selected in URL (use ?user=user_1)");
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const filterButton = document.querySelector('.controls-bar .filter-button');
  const filterPanel = document.getElementById('filter-panel');

  if (filterButton && filterPanel) {
      filterButton.addEventListener('click', () => {
          // Check the current display state
          const isPanelHidden = filterPanel.style.display === 'none' || filterPanel.style.display === '';

          if (isPanelHidden) {
              // Show the panel
              filterPanel.style.display = 'block'; // Or 'grid' if .filter-panel itself should be a grid
                                                  // 'block' is fine since .filter-content inside it is 'grid'
              filterButton.classList.add('active-filter'); // Add a class to indicate the button is active
          } else {
              // Hide the panel
              filterPanel.style.display = 'none';
              filterButton.classList.remove('active-filter'); // Remove the active class
          }
      });
  }

  // --- Filter Sliders Functionality ---
  const ageMinSlider = document.getElementById('age-range-min');
  const ageMaxSlider = document.getElementById('age-range-max');
  const ageValueDisplay = document.getElementById('age-value-display');

  const hrMinSlider = document.getElementById('hr-range-min');
  const hrMaxSlider = document.getElementById('hr-range-max');
  const hrValueDisplay = document.getElementById('hr-value-display');

  function updateAgeDisplay() {
    if (ageMinSlider && ageMaxSlider && ageValueDisplay) {
      ageValueDisplay.textContent = `${ageMinSlider.value} - ${ageMaxSlider.value}`;
    }
  }

  function updateHrDisplay() {
    if (hrMinSlider && hrMaxSlider && hrValueDisplay) {
      hrValueDisplay.textContent = `${hrMinSlider.value} - ${hrMaxSlider.value} bpm`;
    }
  }

  function applyChartFilters() {
    if (!ageMinSlider || !ageMaxSlider || !hrMinSlider || !hrMaxSlider) return;

    const ageMin = parseInt(ageMinSlider.value);
    const ageMax = parseInt(ageMaxSlider.value);
    const hrMin = parseInt(hrMinSlider.value);
    const hrMax = parseInt(hrMaxSlider.value);

    // Select all circles rendered by D3 from global.js
    const circles = d3.select("#d3-chart-container svg").selectAll("circle");

    if (circles.empty()) {
      return;
    }

    circles.style("display", function(d) {
      if (!d || typeof d.Age === 'undefined' || typeof d.avg_HR === 'undefined') {
        return "none";
      }

      const meetsAgeCriteria = d.Age >= ageMin && d.Age <= ageMax;
      const meetsHrCriteria = d.avg_HR >= hrMin && d.avg_HR <= hrMax;

      return (meetsAgeCriteria && meetsHrCriteria) ? null : "none";
    });
  }

  // Event Listeners for Age Sliders
  if (ageMinSlider && ageMaxSlider) {
    ageMinSlider.addEventListener('input', () => {
      if (parseInt(ageMinSlider.value) > parseInt(ageMaxSlider.value)) {
        ageMaxSlider.value = ageMinSlider.value;
      }
      updateAgeDisplay();
      applyChartFilters();
    });

    ageMaxSlider.addEventListener('input', () => {
      if (parseInt(ageMaxSlider.value) < parseInt(ageMinSlider.value)) {
        ageMinSlider.value = ageMaxSlider.value;
      }
      updateAgeDisplay();
      applyChartFilters();
    });
    updateAgeDisplay();
  }

  // Event Listeners for HR Sliders
  if (hrMinSlider && hrMaxSlider) {
    hrMinSlider.addEventListener('input', () => {
      if (parseInt(hrMinSlider.value) > parseInt(hrMaxSlider.value)) {
        hrMaxSlider.value = hrMinSlider.value;
      }
      updateHrDisplay();
      applyChartFilters();
    });

    hrMaxSlider.addEventListener('input', () => {
      if (parseInt(hrMaxSlider.value) < parseInt(hrMinSlider.value)) {
        hrMinSlider.value = hrMaxSlider.value;
      }
      updateHrDisplay();
      applyChartFilters();
    });
    updateHrDisplay();
  }

  // Apply initial filters if chart is ready
  if (!d3.select("#d3-chart-container svg").selectAll("circle").empty()) {
    applyChartFilters();
  }
});