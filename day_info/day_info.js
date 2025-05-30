import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// --- Constants and Configuration ---
const width = 900;
const height = 400;
const margin = { top: 40, right: 20, bottom: 40, left: 20 };
const params = new URLSearchParams(window.location.search);
const selectedUser = params.get("user");

if (!selectedUser) {
  console.error("No user specified in URL.");
}

// Activity mappings and details
const activityLabels = {
  1: "Sleeping",
  2: "Laying down",
  3: "Sitting",
  4: "Light movement",
  5: "Medium activity",
  6: "Heavy activity",
  7: "Eating",
  8: "Small screen",
  9: "Large screen",
  10: "Caffeine",
  11: "Smoking",
  12: "Alcohol"
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
    12: { name: "alcohol consumption", file: "../assets/animations/alcohol_assumption.mp4" }
};

// --- DOM Setup ---
const svg = d3.select("#chart")
  .attr("viewBox", [0, 0, width, height]);

let tooltip = d3.select("#tooltip-div");
if (tooltip.empty()) {
  tooltip = d3.select("body").append("div")
    .attr("id", "tooltip-div")
    .style("position", "fixed")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "6px 10px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("border-radius", "4px")
    .style("box-shadow", "0 0 8px rgba(0,0,0,0.1)")
    .style("display", "none")
    .style("z-index", "9999");
}

// --- Helper Functions ---
function parseTimeToDate(timeStr, dayNumber) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(2024, 0, dayNumber, hours, minutes, 0);
}

function getActiveActivity(nowDateTime, activities) {
    if (!activities || activities.length === 0) {
        console.warn('No activities provided');
        return null;
    }

    const userActivities = activities
        .filter(act => act.user === selectedUser)
        .map(act => {
            const startDateTime = parseTimeToDate(act.startStr, act.day);
            let endDateTime = null;
            if (act.endStr) {
                endDateTime = parseTimeToDate(act.endStr, act.day);
                if (startDateTime && endDateTime && endDateTime < startDateTime) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                }
            }
            return { ...act, startDateTime, endDateTime };
        })
        .filter(act => act.startDateTime)
        .sort((a, b) => a.startDateTime - b.startDateTime);

    if (userActivities.length === 0) {
        console.warn(`No activities found for user ${selectedUser}`);
        return null;
    }

    let currentActivity = null;

    for (let i = 0; i < userActivities.length; i++) {
        const activity = userActivities[i];
        if (activity.startDateTime > nowDateTime) continue;

        let effectiveEndTime = activity.endDateTime;
        if (!effectiveEndTime) {
            if (i + 1 < userActivities.length) {
                effectiveEndTime = userActivities[i + 1].startDateTime;
            } else {
                effectiveEndTime = new Date(nowDateTime.getFullYear() + 10, 0, 1);
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
    Object.assign(activitySection.style, {
        position: 'fixed',
        top: '80px',
        left: '20px',
        width: '220px',
        zIndex: '10'
    });

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

    const container = document.createElement('div');
    container.className = 'activity-container';
    Object.assign(container.style, {
        background: 'white',
        padding: '10px',
        borderRadius: '0 0 8px 8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
    });

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

    videoWrapper.appendChild(video);
    videoWrapper.appendChild(msg);
    container.appendChild(videoWrapper);
    activitySection.appendChild(title);
    activitySection.appendChild(container);
    document.body.appendChild(activitySection);
}

function updateActivityAnimationView(nowDateTime, activities) {
    const animationVideo = document.getElementById('activity-animation-video');
    const noActivityMsg = document.getElementById('no-activity-msg');
    const videoWrapper = document.querySelector('.video-wrapper');

    if (!animationVideo || !noActivityMsg || !videoWrapper) {
        console.warn("Activity display DOM elements not found. Skipping update.");
        return;
    }

    const activeActivity = getActiveActivity(nowDateTime, activities);

    if (activeActivity && activeActivity.activityCode !== null) {
        const details = activityDetailsMap[activeActivity.activityCode];
        if (details) {
            // Reset video state
            animationVideo.style.display = 'none';
            noActivityMsg.textContent = "Loading activity...";
            noActivityMsg.style.display = 'block';
            
            // Set up video event handlers
            animationVideo.onloadeddata = () => {
                noActivityMsg.style.display = 'none';
                animationVideo.style.display = 'block';
                animationVideo.play().catch(error => {
                    console.warn("Video autoplay failed:", error);
                    noActivityMsg.textContent = "Click to play activity";
                    noActivityMsg.style.display = 'block';
                });
            };
            
            animationVideo.onerror = (error) => {
                console.error("Video loading error:", error);
                noActivityMsg.textContent = `Failed to load activity: ${details.name}`;
                noActivityMsg.style.display = 'block';
                animationVideo.style.display = 'none';
            };

            // Only update src if it's different to avoid unnecessary reloads
            if (animationVideo.src !== details.file) {
                animationVideo.src = details.file;
                animationVideo.load(); // Explicitly load the video
            }
            
            videoWrapper.title = `User ${selectedUser}: ${details.name}`;
        } else {
            animationVideo.style.display = 'none';
            noActivityMsg.textContent = `Activity (Code: ${activeActivity.activityCode}) - No animation available.`;
            noActivityMsg.style.display = 'block';
            videoWrapper.title = `User ${selectedUser}: Unmapped Activity ${activeActivity.activityCode}`;
        }
    } else {
        animationVideo.style.display = 'none';
        noActivityMsg.textContent = `No specific activity tracked for ${selectedUser} at this time.`;
        noActivityMsg.style.display = 'block';
        videoWrapper.title = `User ${selectedUser}: No activity`;
    }
}

// --- Main Visualization Functions ---
function renderChart(dataSlice, windowStart, windowEnd, yExtent, activities) {
    svg.selectAll("*").remove();

    activities = activities.filter(d => activityLabels[d.activity] !== undefined);

    const x = d3.scaleTime()
        .domain([windowStart, windowEnd])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([yExtent[0] - 5, yExtent[1] + 5])
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .x(d => x(d.minute))
        .y(d => y(d.avgHR));

    const activityColor = d3.scaleOrdinal()
        .domain(d3.range(1, 13))
        .range(d3.schemeTableau10.concat(d3.schemePastel1));

    // Activity rectangles
    svg.selectAll(".activity-rect")
        .data(activities)
        .enter()
        .append("rect")
        .attr("class", d => `activity-rect activity-${d.start.getTime()}-${d.end.getTime()}`)
        .attr("x", d => x(new Date(Math.max(d.start.getTime(), windowStart.getTime()))))
        .attr("y", margin.top)
        .attr("width", d => {
            const clippedStart = Math.max(d.start.getTime(), windowStart.getTime());
            const clippedEnd = Math.min(d.end.getTime(), windowEnd.getTime());
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
    svg.append("path")
        .datum(dataSlice)
        .attr("fill", "none")
        .attr("stroke", "#e60026")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%-I:%M %p")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -margin.left - 5)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Beats Per Minute")
        .style("font-size", "20px")
        .style("font-weight", "bold");

    // Hover elements
    const hoverLine = svg.append("line")
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4")
        .style("display", "none");

    const hoverDot = svg.append("circle")
        .attr("r", 4)
        .attr("fill", "#888888")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .style("display", "none");

    // Hover interaction
    svg.append("rect")
        .attr("fill", "transparent")
        .attr("x", margin.left)
        .attr("y", y.range()[1])
        .attr("width", width - margin.left - margin.right)
        .attr("height", y.range()[0] - y.range()[1])
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event);
            const timeX = x.invert(mouseX);

            const bisect = d3.bisector(d => d.minute).center;
            const index = bisect(dataSlice, timeX);
            const d = dataSlice[index];
            if (!d) return;

            const formatTime = d3.timeFormat("%-I:%M %p");
            const hoveredTime = d.minute;

            const overlappingActivity = activities.find(a =>
                hoveredTime >= a.start && hoveredTime <= a.end
            );

            d3.selectAll(".activity-rect").attr("opacity", 0.15);

            if (overlappingActivity) {
                const className = `.activity-${overlappingActivity.start.getTime()}-${overlappingActivity.end.getTime()}`;
                d3.select(className).attr("opacity", 0.35);
            }

            const activityLine = overlappingActivity
                ? `<strong style="color:${activityColor(overlappingActivity.activity)}">${activityLabels[overlappingActivity.activity]}</strong><br/>`
                : "";

            tooltip
                .style("display", "block")
                .html(`
                    ${activityLine}
                    <strong>BPM:</strong> ${d.avgHR.toFixed(1)}<br/>
                    <strong>Time:</strong> ${formatTime(d.minute)}
                `)
                .style("left", (event.clientX + 10) + "px")
                .style("top", (event.clientY + 15) + "px");

            const xCoord = x(d.minute);
            hoverLine
                .attr("x1", xCoord)
                .attr("x2", xCoord)
                .attr("y1", margin.top)
                .attr("y2", height - margin.bottom)
                .style("display", "block");

            hoverDot
                .attr("cx", xCoord)
                .attr("cy", y(d.avgHR))
                .style("display", "block");

            // Update activity display
            updateActivityAnimationView(hoveredTime, activities);
        })
        .on("mouseleave", () => {
            tooltip.style("display", "none");
            hoverLine.style("display", "none");
            hoverDot.style("display", "none");
        });

    svg.selectAll(".tick text")
        .style("font-size", "17px");

    svg.selectAll(".domain, .tick line")
        .style("stroke", "#333")
        .style("stroke-width", 1.5);
}

// --- Main Data Loading and Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    setupActivityDisplayElements();

    try {
        const [hrData, activityData] = await Promise.all([
            d3.csv("../assets/cleaned_data/all_actigraph.csv", d => {
                const hr = +d.HR;
                if (isNaN(hr)) return null;
                const timestamp = new Date(`2024-01-${String(d.day).padStart(2, '0')}T${d.time}`);
                timestamp.setSeconds(0);
                timestamp.setMilliseconds(0);
                return {
                    user: d.user,
                    minute: timestamp,
                    heartRate: hr
                };
            }),
            d3.csv("../assets/cleaned_data/all_activity.csv", d => ({
                activity: +d.Activity,
                start: parseTimeToDate(d.Start, +d.Day),
                end: d.End ? parseTimeToDate(d.End, +d.Day) : null,
                user: d.user,
                startStr: d.Start,
                endStr: d.End,
                day: +d.Day,
                activityCode: +d.Activity
            }))
        ]);

        const filteredHrData = hrData.filter(d => d !== null);
        const userData = filteredHrData.filter(d => d.user === selectedUser);
        const userActivities = activityData.filter(d => d.user === selectedUser);

        const bpmPerMinute = d3.rollups(
            userData,
            v => d3.mean(v, d => d.heartRate),
            d => d.minute
        ).map(([minute, avgHR]) => ({ minute, avgHR }));

        bpmPerMinute.sort((a, b) => a.minute - b.minute);
        const timeExtent = d3.extent(bpmPerMinute, d => d.minute);
        if (!timeExtent[0] || !timeExtent[1]) {
            console.warn(`No valid time extent for user ${selectedUser}.`);
            return;
        }

        const totalTimeRangeMs = timeExtent[1] - timeExtent[0] - 1 * 60 * 60 * 1000;
        const yExtent = d3.extent(bpmPerMinute, d => d.avgHR);

        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            const scrollProgress = scrollTop / maxScroll;
            const offsetMs = scrollProgress * totalTimeRangeMs;

            const windowStart = new Date(timeExtent[0].getTime() + offsetMs);
            const windowEnd = new Date(windowStart.getTime() + 1 * 60 * 60 * 1000);

            // Update time display
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) {
                const currentTime = new Date(windowStart.getTime() + (windowEnd.getTime() - windowStart.getTime()) / 2);
                const hours = currentTime.getHours();
                const minutes = currentTime.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                timeDisplay.textContent = `${displayHours}:${minutes} ${ampm}`;
            }

            const visibleData = bpmPerMinute.filter(d =>
                d.minute >= windowStart && d.minute <= windowEnd
            );
            const visibleActivities = userActivities.filter(d =>
                d.end >= windowStart && d.start <= windowEnd
            );

            renderChart(visibleData, windowStart, windowEnd, yExtent, visibleActivities);
            
            // Update activity animation based on the middle of the current time window
            const currentTime = new Date(windowStart.getTime() + (windowEnd.getTime() - windowStart.getTime()) / 2);
            updateActivityAnimationView(currentTime, userActivities);
        });

        const initialStart = timeExtent[0];
        const initialEnd = new Date(initialStart.getTime() + 1 * 60 * 60 * 1000);
        const initialData = bpmPerMinute.filter(d =>
            d.minute >= initialStart && d.minute <= initialEnd
        );
        const initialActivities = userActivities.filter(d =>
            d.end >= initialStart && d.start <= initialEnd
        );

        renderChart(initialData, initialStart, initialEnd, yExtent, initialActivities);
        
        // Set initial activity animation
        const initialTime = new Date(initialStart.getTime() + (initialEnd.getTime() - initialStart.getTime()) / 2);
        updateActivityAnimationView(initialTime, userActivities);

        // Add click handler for video playback
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

    } catch (error) {
        console.error("Error loading or processing data:", error);
    }
}); 