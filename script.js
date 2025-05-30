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
});