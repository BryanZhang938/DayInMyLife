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