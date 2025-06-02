import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

window.history.scrollRestoration = 'manual';
window.addEventListener('load', function () {
    window.scrollTo(0, 0);
});

// --- Constants and Configuration ---
const width = 1000;
const height = 400;
const margin = { top: 5, right: 0, bottom: 60, left: 20 };
const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

if (!selectedUser) {
  console.error("No user specified in URL.");
  // Potentially display this error to the user on the page
}

// Activity mappings and details
const activityLabels = {
  1: "Sleeping", 2: "Laying down", 3: "Sitting", 4: "Light movement",
  5: "Medium activity", 6: "Heavy activity", 7: "Eating", 8: "Small screen",
  9: "Large screen", 10: "Caffeine", 11: "Smoking", 12: "Alcohol"
};

const activityDetailsMap = {
    1: { name: "sleeping", file: "../assets/animations/sleeping.mp4" },
    2: { name: "laying down", file: "../assets/animations/laying_down.mp4" },
    3: { name: "sitting (e.g. studying, eating, driving)", file: "../assets/animations/sitting.mp4" },
    4: { name: "light movement (e.g. slow/medium walk, chores, work)", file: "../assets/animations/light_movement.mp4" },
    5: { name: "medium movement (e.g. fast walk, bike)", file: "../assets/animations/medium_movement.mp4" },
    6: { name: "heavy movement (e.g. gym, running)", file: "../assets/animations/heavy_movement.mp4" },
    7: { name: "eating", file: "../assets/animations/eating.mp4" },
    8: { name: "small screen usage (e.g. smartphone, computer)", file: "../assets/animations/small_screen_usage.mp4" },
    9: { name: "large screen usage (e.g. TV, cinema)", file: "../assets/animations/large_screen_usage.mp4" },
    10: { name: "caffeinated drink consumption", file: "../assets/animations/caffeinated_drink_consumption.mp4" },
    11: { name: "smoking", file: "../assets/animations/smoking.mp4" },
    12: { name: "alcohol consumption", file: "../assets/animations/alcohol_assumption.mp4" } // Assuming typo "assumption" -> "consumption"
};
// Add this entry for default fallback animation
const defaultNoActivity = {
    name: "doing nothing",
    file: "../assets/animations/doing_nothing.mp4"
  };

// --- DOM Elements (will be assigned in DOMContentLoaded) ---
let currentVideoElement;
let preloadVideoElement;
let noActivityMsgElement;
let videoWrapperElement;

// --- DOM Setup ---
const svg = d3.select("#chart")
  .attr("viewBox", [0, 0, width, height]); // Main D3 chart, not video

let tooltip = d3.select("#tooltip-div"); // Tooltip for D3 chart
if (tooltip.empty()) {
  tooltip = d3.select("body").append("div")
    .attr("id", "tooltip-div")
    // ... (tooltip styles from original code)
    .style("position", "fixed").style("background", "#fff").style("border", "1px solid #ccc")
    .style("padding", "6px 10px").style("font-size", "13px").style("pointer-events", "none")
    .style("border-radius", "4px").style("box-shadow", "0 0 8px rgba(0,0,0,0.1)")
    .style("display", "none").style("z-index", "9999");
}

// --- Helper Functions ---
function parseTimeToDate(timeStr, dayNumber) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(2024, 0, dayNumber, hours, minutes, 0); // Ensure consistent base year/month for comparisons
    // Handle potential overnight activities for end times
    // This logic might need refinement if start/end are on different "day numbers" but part of same activity block
    return date;
}


function getActiveActivity(nowDateTime, activities) {
    if (!activities || activities.length === 0) {
        // console.warn('No activities provided');
        return null;
    }

    const userActivities = activities
        .filter(act => act.user === selectedUser)
        .map(act => {
            const startDateTime = parseTimeToDate(act.startStr, act.day);
            let endDateTime = null;
            if (act.endStr) {
                endDateTime = parseTimeToDate(act.endStr, act.day);
                // If end time is earlier than start time on the same day, assume it's the next day
                if (startDateTime && endDateTime && endDateTime < startDateTime) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                }
            }
            return { ...act, startDateTime, endDateTime };
        })
        .filter(act => act.startDateTime) // Ensure start time is valid
        .sort((a, b) => a.startDateTime - b.startDateTime);

    if (userActivities.length === 0) {
        // console.warn(`No activities found for user ${selectedUser}`);
        return null;
    }

    let currentActivity = null;

    for (let i = 0; i < userActivities.length; i++) {
        const activity = userActivities[i];
        if (activity.startDateTime > nowDateTime) continue; // Activity hasn't started yet

        // Determine effective end time
        let effectiveEndTime = activity.endDateTime;
        if (!effectiveEndTime) { // If no explicit end time
            if (i + 1 < userActivities.length) {
                effectiveEndTime = userActivities[i + 1].startDateTime; // Ends when next activity starts
            } else {
                // Last activity, assume it continues for a very long time or until end of data
                effectiveEndTime = new Date(nowDateTime.getFullYear() + 10, 0, 1); // Arbitrary far future date
            }
        }
        
        if (nowDateTime >= activity.startDateTime && nowDateTime < effectiveEndTime) {
            currentActivity = activity;
            break;
        }
    }
    return currentActivity;
}

// --- Activity Display Setup ---
function setupActivityDisplayElements() {
    const activitySection = document.createElement('div');
    activitySection.className = 'activity-section';
    // Styles are now in HTML/CSS, but you can override or set here if needed
    // Object.assign(activitySection.style, { /* ... */ });

    const title = document.createElement('h4');
    title.className = 'activity-title';
    // Styles are now in HTML/CSS

    const container = document.createElement('div');
    container.className = 'activity-container';
    // Styles are now in HTML/CSS

    videoWrapperElement = document.createElement('div'); // Assign to global
    videoWrapperElement.className = 'video-wrapper';
    // Styles are now in HTML/CSS

    // Active video player
    currentVideoElement = document.createElement('video'); // Assign to global
    currentVideoElement.id = 'activity-animation-video-active';
    currentVideoElement.className = 'activity-animation-video';
    Object.assign(currentVideoElement, { autoplay: true, loop: true, muted: true, playsinline: true });
    currentVideoElement.style.display = 'none'; // Start hidden

    // Standby video player (for preloading)
    preloadVideoElement = document.createElement('video'); // Assign to global
    preloadVideoElement.id = 'activity-animation-video-standby';
    preloadVideoElement.className = 'activity-animation-video';
    Object.assign(preloadVideoElement, { autoplay: true, loop: true, muted: true, playsinline: true });
    preloadVideoElement.style.display = 'none'; // Start hidden

    noActivityMsgElement = document.createElement('p'); // Assign to global
    noActivityMsgElement.id = 'no-activity-msg';
    noActivityMsgElement.textContent = 'Loading activity data...';
    // Styles are now in HTML/CSS

    videoWrapperElement.appendChild(currentVideoElement);
    videoWrapperElement.appendChild(preloadVideoElement);
    videoWrapperElement.appendChild(noActivityMsgElement);
    container.appendChild(videoWrapperElement);
    activitySection.appendChild(title);
    activitySection.appendChild(container);
    
    // Prepend to body or append to a specific placeholder if you have one
    const animationDiv = document.querySelector('.animation-section');
    animationDiv.appendChild(activitySection);
}

function updateActivityAnimationView(nowDateTime, activities) {
    if (!currentVideoElement || !preloadVideoElement || !noActivityMsgElement || !videoWrapperElement) {
        console.warn("Activity display DOM elements not yet initialized. Skipping update.");
        return;
    }

    const activeActivity = getActiveActivity(nowDateTime, activities);

    if (activeActivity && activeActivity.activityCode !== null) {
        const details = activityDetailsMap[activeActivity.activityCode];
        if (details) {
            const targetSrc = new URL(details.file, window.location.href).href; // Get absolute URL

            // If current video is already showing the target, do nothing
            if (currentVideoElement.style.display !== 'none' && currentVideoElement.currentSrc === targetSrc) {
                if (currentVideoElement.paused) {
                    currentVideoElement.play().catch(e => console.warn("Failed to play current video:", e));
                }
                noActivityMsgElement.style.display = 'none';
                videoWrapperElement.title = `User ${selectedUser}: ${details.name}`;
                return;
            }

            // If preload video is ready with the target, swap them
            if (preloadVideoElement.currentSrc === targetSrc && preloadVideoElement.readyState >= 3) { // HAVE_FUTURE_DATA
                currentVideoElement.style.display = 'none';
                currentVideoElement.pause();

                preloadVideoElement.style.display = 'block';
                if (preloadVideoElement.paused) {
                    preloadVideoElement.play().catch(e => console.warn("Failed to play preloaded video:", e));
                }
                noActivityMsgElement.style.display = 'none';

                // Swap roles
                let temp = currentVideoElement;
                currentVideoElement = preloadVideoElement;
                preloadVideoElement = temp;
                videoWrapperElement.title = `User ${selectedUser}: ${details.name}`;
                return;
            }

            // Otherwise, load target into preloadVideoElement (if not already loading it or loaded)
            if (preloadVideoElement.currentSrc !== targetSrc || preloadVideoElement.readyState < 2) { // Not loaded or loading something else
                
                // Show loading message ONLY if the active video isn't already playing something.
                // This is key for seamless transition.
                if (currentVideoElement.style.display === 'none' || !currentVideoElement.currentSrc) {
                    // noActivityMsgElement.textContent = "Loading activity...";
                    noActivityMsgElement.style.display = 'block';
                    currentVideoElement.style.display = 'none'; // Ensure current is hidden if it was blank
                }
                // else: currentVideoElement continues playing its current content

                preloadVideoElement.onloadeddata = () => {
                    // Check if this video is still the desired one (user might have scrolled fast)
                    const stillRelevantActivity = getActiveActivity(nowDateTime, activities);
                    if (stillRelevantActivity && activityDetailsMap[stillRelevantActivity.activityCode] &&
                        new URL(activityDetailsMap[stillRelevantActivity.activityCode].file, window.location.href).href === preloadVideoElement.currentSrc) {
                        
                        currentVideoElement.style.display = 'none';
                        currentVideoElement.pause();

                        preloadVideoElement.style.display = 'block';
                        if (preloadVideoElement.paused) {
                             preloadVideoElement.play().catch(error => {
                                console.warn("Video autoplay failed after preload:", error);
                                noActivityMsgElement.textContent = "Click to play activity";
                                noActivityMsgElement.style.display = 'block';
                            });
                        }
                        noActivityMsgElement.style.display = 'none';

                        let temp = currentVideoElement;
                        currentVideoElement = preloadVideoElement;
                        preloadVideoElement = temp; // Preload is now active, old active is standby
                    }
                    // else: this preloaded video is stale, next update call will handle new target.
                };
                preloadVideoElement.onerror = (error) => {
                    console.error("Video loading error for preload:", error, preloadVideoElement.src);
                    // If this error is for the video we are currently trying to load:
                    if (new URL(details.file, window.location.href).href === preloadVideoElement.src) {
                        noActivityMsgElement.textContent = `Failed to load: ${details.name}`;
                        noActivityMsgElement.style.display = 'block';
                        preloadVideoElement.style.display = 'none'; // Hide the failed video
                        // If active video was also hidden, the message stays.
                        // If active video was playing something else, it continues.
                    }
                };
                preloadVideoElement.src = targetSrc;
                preloadVideoElement.load();
            }
            videoWrapperElement.title = `User ${selectedUser}: ${details.name}`;
        } else { // No animation detail for this activity code
            currentVideoElement.style.display = 'none'; currentVideoElement.pause();
            preloadVideoElement.style.display = 'none'; preloadVideoElement.pause();
            noActivityMsgElement.textContent = `Activity (Code: ${activeActivity.activityCode}) - No animation available.`;
            noActivityMsgElement.style.display = 'block';
            videoWrapperElement.title = `User ${selectedUser}: Unmapped Activity ${activeActivity.activityCode}`;
        }
    } else {
        const targetSrc = new URL(defaultNoActivity.file, window.location.href).href;
    
        // If already showing the idle animation, resume if paused
        if (currentVideoElement.style.display !== 'none' && currentVideoElement.currentSrc === targetSrc) {
            if (currentVideoElement.paused) {
                currentVideoElement.play().catch(e => console.warn("Failed to play idle video:", e));
            }
            noActivityMsgElement.style.display = 'none';
            videoWrapperElement.title = `User ${selectedUser}: ${defaultNoActivity.name}`;
            return;
        }
    
        // Load into preload and swap
        if (preloadVideoElement.currentSrc !== targetSrc || preloadVideoElement.readyState < 2) {
            if (!currentVideoElement.currentSrc || currentVideoElement.style.display === 'none') {
                noActivityMsgElement.textContent = "Loading activity...";
                noActivityMsgElement.style.display = 'block';
            }
    
            preloadVideoElement.onloadeddata = () => {
                currentVideoElement.style.display = 'none';
                currentVideoElement.pause();
    
                preloadVideoElement.style.display = 'block';
                preloadVideoElement.play().catch(() => {
                    noActivityMsgElement.textContent = "Click to play activity";
                    noActivityMsgElement.style.display = 'block';
                });
    
                noActivityMsgElement.style.display = 'none';
                videoWrapperElement.title = `User ${selectedUser}: ${defaultNoActivity.name}`;
    
                let temp = currentVideoElement;
                currentVideoElement = preloadVideoElement;
                preloadVideoElement = temp;
            };
    
            preloadVideoElement.onerror = () => {
                noActivityMsgElement.textContent = "Failed to load idle animation.";
                preloadVideoElement.style.display = 'none';
            };
    
            preloadVideoElement.src = targetSrc;
            preloadVideoElement.load();
        } else {
            // If preload is already ready, show it
            currentVideoElement.style.display = 'none';
            currentVideoElement.pause();
    
            preloadVideoElement.style.display = 'block';
            preloadVideoElement.play().catch(() => {
                noActivityMsgElement.textContent = "Click to play activity";
                noActivityMsgElement.style.display = 'block';
            });
    
            noActivityMsgElement.style.display = 'none';
            videoWrapperElement.title = `User ${selectedUser}: ${defaultNoActivity.name}`;
    
            let temp = currentVideoElement;
            currentVideoElement = preloadVideoElement;
            preloadVideoElement = temp;
        }
    }
}

// --- Main Visualization Functions (renderChart, etc. - Keep as is) ---
function renderChart(dataSlice, windowStart, windowEnd, yExtent, activitiesForChart) { // Renamed 'activities' to avoid conflict
    svg.selectAll("*").remove();

    // Filter activities for the D3 chart, not to be confused with the global activities array
    const chartDisplayActivities = activitiesForChart.filter(d => activityLabels[d.activity] !== undefined);

    const x = d3.scaleTime()
        .domain([windowStart, windowEnd])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(yExtent ? [yExtent[0] - 5, yExtent[1] + 5] : [0, 100]) // Added fallback for yExtent
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .x(d => x(d.minute))
        .y(d => y(d.avgHR));

    const activityColor = d3.scaleOrdinal()
        .domain(d3.range(1, 13)) // 1 to 12 activities
        .range(d3.schemeTableau10.concat(d3.schemePastel1.slice(0,2))); // Ensure enough colors

    // Activity rectangles for D3 chart
    svg.selectAll(".activity-rect")
        .data(chartDisplayActivities) // Use chartDisplayActivities
        .enter()
        .append("rect")
        .attr("class", d => `activity-rect activity-${d.start.getTime()}-${d.end.getTime()}`)
        .attr("x", d => x(new Date(Math.max(d.start.getTime(), windowStart.getTime()))))
        .attr("y", margin.top)
        .attr("width", d => {
            const clippedStart = Math.max(d.start.getTime(), windowStart.getTime());
            const clippedEnd = Math.min(d.end.getTime(), windowEnd.getTime());
            if (clippedEnd < clippedStart) return 0; // Avoid negative width
            return x(new Date(clippedEnd)) - x(new Date(clippedStart));
        })
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", d => activityColor(d.activity))
        .attr("opacity", 0.15)
        .on("mousemove", function(event, d) {
            d3.select(this).attr("opacity", 0.35);
            tooltip
                .style("display", "block")
                .html(`<strong style="color:${activityColor(d.activity)}">${activityLabels[d.activity]}</strong>`)
                .style("left", (event.clientX + 10) + "px")
                .style("top", (event.clientY + 15) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).attr("opacity", 0.15);
            tooltip.style("display", "none");
        });

    // Heart rate line
    if (dataSlice && dataSlice.length > 0) {
        svg.append("path")
            .datum(dataSlice)
            .attr("fill", "none")
            .attr("stroke", "#e60026")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    }
    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%-I:%M %p")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 6)
        .attr("text-anchor", 'middle')
        .text("Time (1-Hour Window)")
        .style("font-size", "25px")
        .style("font-weight", "bold");
    
    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("x", -(height / 2))
        .attr("y", margin.left - 50) 
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Beats Per Minute")
        .style("font-size", "25px") 
        .style("font-weight", "bold");

    const hoverLine = svg.append("line")
        .attr("stroke", "gray").attr("stroke-width", 1).attr("stroke-dasharray", "4").style("display", "none");
    const hoverDot = svg.append("circle")
        .attr("r", 4).attr("fill", "#888888").attr("stroke", "#fff").attr("stroke-width", 1.5).style("display", "none");

    // Hover interaction rectangle
    svg.append("rect")
        .attr("fill", "transparent")
        .attr("x", margin.left)
        .attr("y", margin.top) // Use margin.top for y
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom) // Use full chart height
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this); // Pass `this` for correct coordinates
            if (mouseX < margin.left || mouseX > width - margin.right) { // ignore if outside chart plotting area
                 tooltip.style("display", "none");
                 hoverLine.style("display", "none");
                 hoverDot.style("display", "none");
                return;
            }
            const timeX = x.invert(mouseX);

            // Find data point for HR
            const bisect = d3.bisector(d => d.minute).center;
            const index = dataSlice && dataSlice.length > 0 ? bisect(dataSlice, timeX) : -1;
            const d_hr = index !== -1 ? dataSlice[index] : null;
            
            const formatTime = d3.timeFormat("%-I:%M %p");
            const hoveredTime = timeX; // Use the inverted time for activity matching

            // Find overlapping activity for tooltip and animation update
             const overlappingActivity = activitiesForChart.find(a => // use activitiesForChart
                hoveredTime >= a.start && hoveredTime <= (a.end || new Date(hoveredTime.getTime() + 1)) // handle null end
            );

            d3.selectAll(".activity-rect").attr("opacity", 0.15); // Reset all opacities

            let tooltipHtml = "";
            if (overlappingActivity) {
                const className = `.activity-${overlappingActivity.start.getTime()}-${(overlappingActivity.end || '').getTime()}`;
                try {
                    svg.select(className).attr("opacity", 0.35); // Highlight current activity rect
                } catch (e) { console.warn("Error selecting activity rect:", e); }
                tooltipHtml += `<strong style="color:${activityColor(overlappingActivity.activity)}">${activityLabels[overlappingActivity.activity]}</strong><br/>`;
                updateActivityInfo(overlappingActivity);
            } else {
                updateActivityInfo();
            }

            if (d_hr) {
                tooltipHtml += `<strong>BPM:</strong> ${d_hr.avgHR.toFixed(1)}<br/>`;
            }
            tooltipHtml += `<strong>Time:</strong> ${formatTime(hoveredTime)}`;

            tooltip
                .style("display", "block")
                .html(tooltipHtml)
                .style("left", (event.clientX + 10) + "px")
                .style("top", (event.clientY + 15) + "px");

            if (d_hr) {
                const xCoord = x(d_hr.minute);
                hoverLine.attr("x1", xCoord).attr("x2", xCoord)
                         .attr("y1", margin.top).attr("y2", height - margin.bottom)
                         .style("display", "block");
                hoverDot.attr("cx", xCoord).attr("cy", y(d_hr.avgHR)).style("display", "block");
            } else {
                hoverLine.style("display", "none");
                hoverDot.style("display", "none");
            }
            // Update activity animation based on hovered time (pass the main activities array)
            // Make sure `activities` here is the full list for the user, not just `activitiesForChart`
            // This requires passing the global `userActivities` or `fullActivityData` to renderChart if it needs it.
            // For now, assuming the main `activities` array (global or passed to DOMContentLoaded) is accessible.
            // Let's assume `allUserActivities` is the variable holding the full list.
            updateActivityAnimationView(hoveredTime, allUserActivities); // Ensure 'allUserActivities' is defined and passed
            const currentActivity = getActiveActivity(hoveredTime, allUserActivities);
            updateActivityInfo(currentActivity);
        })
        .on("mouseleave", () => {
            tooltip.style("display", "none");
            hoverLine.style("display", "none");
            hoverDot.style("display", "none");
            d3.selectAll(".activity-rect").attr("opacity", 0.15); // Reset opacity
             // When mouse leaves chart, reset animation to current scroll time
            const scrollTop = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            const scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
            
            // Need timeExtent here. This suggests timeExtent should be more globally available or re-calculated.
            // For now, this part might need to be linked to the scroll handler's time calculation.
            // Or, simply call updateActivityAnimationView with a time derived from the current window if available.
            // Let currentScrollTime be a globalish variable updated by scroll handler
            if (typeof currentScrollTime !== 'undefined' && allUserActivities) {
                 updateActivityAnimationView(currentScrollTime, allUserActivities);
                 const currentActivity = getActiveActivity(currentScrollTime, allUserActivities);
                 updateActivityInfo(currentActivity);
            }
        });

    svg.selectAll(".tick text").style("font-size", "20px"); // Adjusted tick font size
    svg.selectAll(".domain, .tick line").style("stroke", "#333").style("stroke-width", 1.5); // Adjusted stroke
}
// --- Main Data Loading and Initialization ---
let allUserActivities = []; // To store all activities for the selected user
let currentScrollTime; // To store the time corresponding to the current scroll position

// Add theme management
function getTimeTheme(hour) {
  if (hour >= 5 && hour < 8) {
    return {
      name: "dawn",
      bg: "var(--dawn-bg)",
      accent: "var(--accent-color)",
      card: "var(--card-bg)"
    };
  } else if (hour >= 8 && hour < 17) {
    return {
      name: "day",
      bg: "var(--day-bg)",
      accent: "var(--accent-color)",
      card: "var(--card-bg)"
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      name: "sunset",
      bg: "var(--sunset-bg)",
      accent: "var(--accent-color)",
      card: "var(--card-bg)"
    };
  } else {
    return {
      name: "night",
      bg: "var(--night-bg)",
      accent: "var(--accent-color)",
      card: "var(--card-bg)"
    };
  }
}

function updateTheme(time) {
  const hour = time.getHours();
  const theme = getTimeTheme(hour);
  
  // Update background
  const dynamicBg = document.querySelector('.dynamic-bg');
  if (dynamicBg) {
    dynamicBg.style.background = theme.bg;
  }
  
  // Update body class for theme-specific styles
  document.body.className = `theme-${theme.name}`;
  
  // Update accent colors
  document.documentElement.style.setProperty('--accent-color', theme.accent);
  document.documentElement.style.setProperty('--card-bg', theme.card);
}

// Update scroll progress
function updateScrollProgress(progress) {
  const progressFill = document.querySelector('.progress-fill');
  const scrollFill = document.querySelector('.scroll-fill');
  
  if (progressFill) {
    progressFill.style.width = `${progress * 100}%`;
  }
  if (scrollFill) {
    scrollFill.style.height = `${progress * 100}%`;
  }
}

// Update activity info card
function updateActivityInfo(activity) {
  const activityInfo = document.querySelector('.activity-title');
  if (activityInfo && activity) {
    const details = activityDetailsMap[activity.activityCode];
    if (details) {
        activityInfo.innerHTML = `
                <p>Current Activity:</p>
                <h4>${details.name}</h4>
                `;
    }
  } 
  else if (activityInfo) {
    activityInfo.innerHTML = `
                <p>Current Activity:</p>
                <h4>No Recorded Activity</h4>
                `;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupActivityDisplayElements(); // Setup video elements first

    const loadingOverlay = document.getElementById('loading-overlay-hr');
    const loadingText = document.getElementById('loading-text-hr');

    try {
        loadingText.textContent = 'Loading HR data...';
        const hrDataFull = await d3.csv("../assets/cleaned_data/all_actigraph.csv", d => {
            const hr = +d.HR;
            const steps = +d.Steps;
            if (isNaN(hr) || isNaN(steps) || d.user !== selectedUser) return null;
            const timestamp = new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`);
            timestamp.setSeconds(0); timestamp.setMilliseconds(0);
            return { user: d.user, minute: timestamp, heartRate: hr, steps: steps };        });
        
        // loadingText.textContent = 'Loading activity data...';
        const activityDataFull = await d3.csv("../assets/cleaned_data/all_activity.csv", d => {
            if (d.user !== selectedUser) return null; // Filter by user early
            return {
                activity: +d.Activity,
                start: parseTimeToDate(d.Start, +d.Day),
                end: d.End ? parseTimeToDate(d.End, +d.Day) : null,
                user: d.user,
                startStr: d.Start, // Keep original strings for getActiveActivity
                endStr: d.End,
                day: +d.Day,
                activityCode: +d.Activity // Keep for mapping
            };
        });

        loadingText.textContent = 'Processing data...';
        const filteredHrData = hrDataFull.filter(d => d !== null);
        allUserActivities = activityDataFull.filter(d => d !== null && d.start); // Store for global use

        // Ensure start/end times are handled for activities spanning midnight before sorting
        allUserActivities.forEach(act => {
            if (act.start && act.end && act.end < act.start) {
                act.end.setDate(act.end.getDate() + 1);
            }
        });
        allUserActivities.sort((a, b) => a.start - b.start);
        let cumulativeSteps = 0;

        const bpmPerMinute = d3.rollups(
            hrDataFull.filter(d => d !== null),
            v => {
                const avgHR = d3.mean(v, d => d.heartRate);
                const totalSteps = d3.sum(v, d => d.steps);
                cumulativeSteps += totalSteps;
                return { avgHR, cumulativeSteps };
            },
            d => d.minute.getTime()
        ).map(([minuteMillis, val]) => ({
            minute: new Date(minuteMillis),
            avgHR: val.avgHR,
            cumulativeSteps: val.cumulativeSteps
        })).sort((a, b) => a.minute - b.minute);

        if (bpmPerMinute.length === 0) {
            loadingText.textContent = `No heart rate data for user ${selectedUser}.`;
            console.warn(`No heart rate data for user ${selectedUser}.`);
            // Keep overlay or show a message
            return; 
        }
        
        const timeExtent = d3.extent(bpmPerMinute, d => d.minute);
        if (!timeExtent[0] || !timeExtent[1]) {
            loadingText.textContent = `No valid time extent for user ${selectedUser}.`;
            console.warn(`No valid time extent for user ${selectedUser}.`);
            // Keep overlay
            return;
        }

        const yExtent = d3.extent(bpmPerMinute, d => d.avgHR);
        const totalTimeRangeMs = timeExtent[1] - timeExtent[0];
        const viewWindowDurationMs = 1 * 60 * 60 * 1000; // 1 hour

        loadingOverlay.style.display = 'none'; // Hide loading overlay

        // Set initial theme
        updateTheme(timeExtent[0]);

        function updateTimeDisplay() {
            const scrollTop = window.scrollY;
            const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
            const scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
            
            // Calculate time based on scroll progress
            const effectiveScrollableRangeMs = Math.max(0, totalTimeRangeMs - viewWindowDurationMs);
            const offsetMs = scrollProgress * effectiveScrollableRangeMs;
            const windowStart = new Date(timeExtent[0].getTime() + offsetMs);
            const windowEnd = new Date(windowStart.getTime() + viewWindowDurationMs);
            currentScrollTime = new Date(windowStart.getTime());

            // Update theme based on current time
            updateTheme(currentScrollTime);
            
            // Update scroll progress indicators
            updateScrollProgress(scrollProgress);

            // Update time display
            const timeDisplay = document.querySelector('.time-display');
            if (timeDisplay) {
                const hours = currentScrollTime.getHours();
                const minutes = currentScrollTime.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                timeDisplay.textContent = `${displayHours}:${minutes} ${ampm}`;
            }
            const lastDataPoint = bpmPerMinute
    .filter(d => d.minute <= currentScrollTime)
    .at(-1);

const stepsUpToNow = lastDataPoint ? lastDataPoint.cumulativeSteps : 0;

// Update step counter display
const stepCounter = document.getElementById("step-counter");
if (stepCounter) {
    stepCounter.innerHTML = `Number of Steps: ${Math.round(stepsUpToNow)} <span class="step-box inline-box"></span> = 300 Steps`;}

// Box rendering stays as before

// Calculate number of full and partial boxes
const STEP_UNIT = 300;  // ← Define the new box scale here

const fullBoxes = Math.floor(stepsUpToNow / STEP_UNIT);
const partialFraction = (stepsUpToNow % STEP_UNIT) / STEP_UNIT;

// Render boxes
const stepBoxContainer = document.getElementById("step-boxes-container");
if (stepBoxContainer) {
stepBoxContainer.innerHTML = ""; // Clear previous boxes

for (let i = 0; i < fullBoxes; i++) {
const box = document.createElement("div");
box.className = "step-box";
stepBoxContainer.appendChild(box);
}

if (partialFraction > 0) {
const partialBox = document.createElement("div");
partialBox.className = "step-box partial";
partialBox.style.background = `linear-gradient(to right, green ${partialFraction * 100}%, transparent ${partialFraction * 100}%)`;
stepBoxContainer.appendChild(partialBox);
}
}


            // Update charts and activity
            const visibleData = bpmPerMinute.filter(d =>
                d.minute >= windowStart && d.minute <= windowEnd
            );
            const visibleActivities = allUserActivities.filter(d =>
                (d.end ? d.end >= windowStart : true) && d.start <= windowEnd
            );
            
            renderChart(visibleData, windowStart, windowEnd, yExtent, visibleActivities);
            updateActivityAnimationView(currentScrollTime, allUserActivities);
            
            // Update activity info
            const currentActivity = getActiveActivity(currentScrollTime, allUserActivities);
            updateActivityInfo(currentActivity);
        }
        updateTimeDisplay();

        window.addEventListener("scroll", () => {
            updateTimeDisplay();
        });

        // Initial render
        const initialStart = timeExtent[0];
        const initialEnd = new Date(initialStart.getTime() + viewWindowDurationMs);
        currentScrollTime = new Date(initialStart.getTime()); // Set initial scroll time

        const initialData = bpmPerMinute.filter(d =>
            d.minute >= initialStart && d.minute <= initialEnd
        );
        const initialActivitiesForChart = allUserActivities.filter(d =>
             (d.end ? d.end >= initialStart : true) && d.start <= initialEnd
        );

        renderChart(initialData, initialStart, initialEnd, yExtent, initialActivitiesForChart);
        updateActivityAnimationView(currentScrollTime, allUserActivities); // Initial animation update
        
        // Initial activity info
        const initialActivity = getActiveActivity(currentScrollTime, allUserActivities);
        updateActivityInfo(initialActivity);

        // Click handler for video wrapper to attempt play if paused by browser
        if (videoWrapperElement) {
            videoWrapperElement.addEventListener('click', () => {
                if (currentVideoElement && currentVideoElement.style.display !== 'none' && currentVideoElement.paused) {
                    currentVideoElement.play().then(() => {
                        if(noActivityMsgElement) noActivityMsgElement.style.display = 'none';
                    }).catch(error => {
                        console.warn("Video play on click failed:", error);
                         if(noActivityMsgElement) {
                            noActivityMsgElement.textContent = "Playback error. Try again.";
                            noActivityMsgElement.style.display = 'block';
                         }
                    });
                }
            });
        }

    } catch (error) {
        console.error("Error loading or processing data:", error);
        loadingText.textContent = 'Error loading data. Please refresh.';
        // Keep overlay visible or provide a more user-friendly error message on the page
    }
});