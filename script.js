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
          content: "Hover over any circle to see that participant's summary details. The size of the circle corresponds to their Average Heart Rate."
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

if (!localStorage.getItem("introShown")) {
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
        localStorage.setItem("introShown", "true");
      }, 1000);
    }
  });
} else {
  // User has already seen the intro
  if (intro) intro.style.display = "none";
  if (runner) runner.style.display = "none";
  document.body.style.overflow = "auto";
}