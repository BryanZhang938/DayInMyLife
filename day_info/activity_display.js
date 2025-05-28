// ../activity_display.js

// Assumes D3.js is available for CSV parsing.
// If not, D3 needs to be imported or a basic CSV parser used (see notes below).
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"; // Example ES6 import for D3

let allActivityData = [];

// --- Activity Mapping ---
// Maps CSV Activity Code to description and animation file
const activityDetailsMap = {
    0: { name: "sleeping", file: "../assets/animations/sleeping.mp4" },
    1: { name: "laying down", file: "../assets/animations/laying_down.mp4" },
    2: { name: "sitting (e.g. studying, eating, driving)", file: "../assets/animations/sitting.mp4" },
    3: { name: "light movement (e.g. slow/medium walk, chores, work)", file: "../assets/animations/light_movement.mp4" },
    4: { name: "medium movement (e.g. fast walk, bike)", file: "../assets/animations/medium_movement.mp4" },
    5: { name: "heavy movement (e.g. gym, running)", file: "../assets/animations/heavy_movement.mp4" },
    6: { name: "eating", file: "../assets/animations/eating.mp4" },
    7: { name: "small screen usage (e.g. smartphone, computer)", file: "../assets/animations/small_screen_usage.mp4" },
    8: { name: "large screen usage (e.g. TV, cinema)", file: "../assets/animations/large_screen_usage.mp4" },
    9: { name: "caffeinated drink consumption", file: "../assets/animations/caffeinated_drink_consumption.mp4" },
    10: { name: "smoking", file: "../assets/animations/smoking.mp4" },
    11: { name: "alcohol consumption", file: "../assets/animations/alcohol_assumption.mp4" },
    12: { name: "Other Activity (Code 12)", file: "../assets/animations/sitting.mp4" } // Using sitting as default
};

// --- Helper Functions ---
function parseTimeToDate(timeStr, dayNumber) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Use a consistent base date for all Date objects to allow comparisons.
    // Day 1 = January 1st, Day 2 = January 2nd of an arbitrary year (e.g., 2000).
    return new Date(2000, 0, dayNumber, hours, minutes, 0);
}

// --- Core Logic ---
async function loadAndParseActivityData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = 'Loading activity data...';

    try {
        const response = await fetch('../cleaned_data/all_activity.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for all_activity.csv`);
        }
        const csvText = await response.text();

        // Handle the specific CSV header format: ",Activity,Start,End,Day,user"
        const lines = csvText.trim().split('\n');
        const headerLineWithSource = lines.shift(); // Remove header line
        // Define expected headers based on CSV structure after the source part
        const headers = ["original_index", "Activity", "Start", "End", "Day", "user"];
        
        // Use D3.js for parsing if available
        if (typeof d3 !== 'undefined' && d3.csvParse) {
            // Reconstruct CSV data without the problematic "" part for d3.csvParse
            // d3.csvParse expects the first line to be headers or will use them if provided.
            // We provide the lines of data and explicitly name the columns.
             const dataRowsAsCsv = lines.join('\n');
             allActivityData = d3.csvParseRows(dataRowsAsCsv).map(row => {
                let obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] ? row[i].trim() : "";
                });
                return obj;
            });

        } else {
            // Fallback to a basic CSV parser if D3 is not loaded
            console.warn("D3.js not found. Using basic CSV parser. Ensure D3 is loaded for robust parsing.");
            allActivityData = lines.map(line => {
                const values = line.split(',');
                let obj = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i] ? values[i].trim() : "";
                });
                return obj;
            });
        }
        
        // Process and type-convert data
        allActivityData = allActivityData.map(d => ({
            activityCode: d.Activity !== "" ? +d.Activity : null,
            startStr: d.Start,
            endStr: d.End,
            day: d.Day !== "" ? +d.Day : null,
            user: d.user
        })).filter(d => d.user && d.activityCode !== null && d.day !== null);


        if (allActivityData.length === 0) {
            throw new Error("No activity data parsed. Check CSV format or parser.");
        }
        
        console.log("Activity data loaded and processed:", allActivityData.slice(0, 3));
        if (loadingOverlay) loadingOverlay.style.display = 'none';

        // Initial display and set up periodic updates
        updateActivityAnimationView();
        // Sync with main visualization's time updates instead of a fixed interval if possible
        // For example, if your other scripts dispatch a custom event:
        // window.addEventListener('visualizationTimeUpdate', updateActivityAnimationView);
        // Otherwise, a simple interval for demonstration:
        setInterval(updateActivityAnimationView, 1000); // Update every second

    } catch (error) {
        console.error("Error loading or parsing activity data:", error);
        if (loadingText) loadingText.textContent = `Error: ${error.message}`;
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
    }
}

function getActiveActivity(nowDateTime, currentUser) {
    const userActivities = allActivityData
        .filter(act => act.user === currentUser)
        .map(act => {
            const startDateTime = parseTimeToDate(act.startStr, act.day);
            let endDateTime = null;
            if (act.endStr) {
                endDateTime = parseTimeToDate(act.endStr, act.day);
                // Handle cases where an activity might cross midnight and end time looks "earlier" but is on the next day.
                // The `parseTimeToDate` uses `act.day`. If an activity starts 23:00 Day 1 and ends 02:00 Day 1 in CSV,
                // this implies the End is actually on Day 2. The current CSV seems to handle day changes explicitly.
                if (startDateTime && endDateTime && endDateTime < startDateTime) {
                    endDateTime.setDate(endDateTime.getDate() + 1); // Assume it's next day
                }
            }
            return { ...act, startDateTime, endDateTime };
        })
        .filter(act => act.startDateTime) // Must have a valid start time
        .sort((a, b) => a.startDateTime - b.startDateTime);

    let currentActivity = null;

    for (let i = 0; i < userActivities.length; i++) {
        const activity = userActivities[i];

        if (activity.startDateTime > nowDateTime) continue; // Activity hasn't started yet

        let effectiveEndTime = activity.endDateTime;
        if (!effectiveEndTime) { // No explicit end time
            if (i + 1 < userActivities.length) {
                effectiveEndTime = userActivities[i + 1].startDateTime; // Ends when next one starts
            } else {
                effectiveEndTime = new Date(nowDateTime.getFullYear() + 10, 0, 1); // Continues indefinitely (far future)
            }
        }

        if (nowDateTime >= activity.startDateTime && nowDateTime < effectiveEndTime) {
            currentActivity = activity; // This activity is active
        }
    }
    return currentActivity; // Returns the full activity object or null
}


// --- DOM Manipulation and Display Update ---
function setupActivityDisplayElements() {
    // Create main activity section
    const activitySection = document.createElement('div');
    activitySection.className = 'activity-section';
    Object.assign(activitySection.style, {
        position: 'fixed',
        top: '80px',
        left: '20px',
        width: '220px',
        zIndex: '10'
    });

    // Create title
    const title = document.createElement('h4');
    title.className = 'activity-title';
    title.textContent = 'Current Activity';
    Object.assign(title.style, {
        background: 'white',
        padding: '10px',
        margin: '0',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        textAlign: 'center'
    });

    // Create container
    const container = document.createElement('div');
    container.className = 'activity-container';
    Object.assign(container.style, {
        background: 'white',
        padding: '10px',
        borderRadius: '0 0 8px 8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
    });

    // Create video wrapper
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    Object.assign(videoWrapper.style, {
        width: '100%',
        height: '180px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #eee',
        borderRadius: '4px',
        background: '#f8f8f8'
    });

    // Create video element
    const video = document.createElement('video');
    video.id = 'activity-animation-video';
    Object.assign(video, {
        autoplay: true,
        loop: true,
        muted: true,
        playsinline: true
    });
    Object.assign(video.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: '0',
        left: '0'
    });

    // Create message element
    const msg = document.createElement('p');
    msg.id = 'no-activity-msg';
    msg.textContent = 'Loading activity data...';
    Object.assign(msg.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        textAlign: 'center',
        color: '#666',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '4px',
        margin: '0'
    });

    // Assemble the elements
    videoWrapper.appendChild(video);
    videoWrapper.appendChild(msg);
    container.appendChild(videoWrapper);
    activitySection.appendChild(title);
    activitySection.appendChild(container);
    document.body.appendChild(activitySection);
}

function updateActivityAnimationView() {
    const animationVideo = document.getElementById('activity-animation-video');
    const noActivityMsg = document.getElementById('no-activity-msg');
    const videoWrapper = document.querySelector('.video-wrapper');

    if (!animationVideo || !noActivityMsg || !videoWrapper) {
        console.warn("Activity display DOM elements not found. Skipping update.");
        return;
    }

    // TODO: Replace with actual synchronized time and user from your visualization
    // This is a placeholder. Your main visualization (scrolling, user selection) should provide this.
    const nowDateTime = window.currentVizTime || new Date(2000, 0, 1, 10, 15, 0); // Example: Day 1, 10:15 AM
    const currentUser = window.currentVizUser || "user_1"; // Example user

    const activeActivity = getActiveActivity(nowDateTime, currentUser);

    if (activeActivity && activeActivity.activityCode !== null) {
        const details = activityDetailsMap[activeActivity.activityCode];
        if (details) {
            // Show loading message while video loads
            noActivityMsg.textContent = "Loading activity...";
            noActivityMsg.style.display = 'block';
            
            // Set up video loading handlers
            animationVideo.onloadeddata = () => {
                noActivityMsg.style.display = 'none';
                animationVideo.style.display = 'block';
            };
            
            animationVideo.onerror = () => {
                noActivityMsg.textContent = `Failed to load activity: ${details.name}`;
                noActivityMsg.style.display = 'block';
                animationVideo.style.display = 'none';
            };

            // Update video source
            if (animationVideo.src !== details.file) {
                animationVideo.src = details.file;
            }
            
            videoWrapper.title = `User ${currentUser}: ${details.name}`;
            
            // Ensure video plays
            animationVideo.play().catch(error => {
                console.warn("Video autoplay failed:", error);
                noActivityMsg.textContent = "Click to play activity";
                noActivityMsg.style.display = 'block';
            });
        } else {
            animationVideo.style.display = 'none';
            noActivityMsg.textContent = `Activity (Code: ${activeActivity.activityCode}) - No animation.`;
            noActivityMsg.style.display = 'block';
            videoWrapper.title = `User ${currentUser}: Unmapped Activity ${activeActivity.activityCode}`;
        }
    } else {
        animationVideo.style.display = 'none';
        noActivityMsg.textContent = `No specific activity tracked for ${currentUser} at this time.`;
        noActivityMsg.style.display = 'block';
        videoWrapper.title = `User ${currentUser}: No activity`;
    }
}

// Add click handler to play video if autoplay fails
document.addEventListener('DOMContentLoaded', async () => {
    // First set up the DOM elements
    setupActivityDisplayElements();
    
    // Then load and parse the activity data
    await loadAndParseActivityData();

    // Add click handler to play video if autoplay fails
    const animationContainer = document.querySelector('.video-wrapper');
    const animationVideo = document.getElementById('activity-animation-video');
    const noActivityMsg = document.getElementById('no-activity-msg');

    if (animationContainer && animationVideo && noActivityMsg) {
        animationContainer.addEventListener('click', () => {
            if (animationVideo.style.display === 'none' && animationVideo.src) {
                animationVideo.play().then(() => {
                    noActivityMsg.style.display = 'none';
                    animationVideo.style.display = 'block';
                }).catch(error => {
                    console.warn("Video play failed:", error);
                });
            }
        });
    }
});