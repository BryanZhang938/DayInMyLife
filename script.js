import { parseActivity, drawActivity } from './activity.js';
import { parseHeartRate, drawHeartRate } from './heartrate.js';

// Load and process data
Promise.all([
  d3.csv("cleaned_data/all_actigraph.csv", parseActivity),
  d3.csv("cleaned_data/all_actigraph.csv", parseHeartRate)
]).then(([activityData, heartRateData]) => {
  drawActivity(activityData);
  drawHeartRate(heartRateData);
}).catch(error => {
  console.error("Error loading data:", error);
}); 