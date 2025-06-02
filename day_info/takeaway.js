export function initializeConclusionModal() {
  const conclusionButton = document.getElementById('conclusion-button');
  const conclusionModal = document.getElementById('conclusion-modal');
  const closeButton = document.getElementById('conclusion-close-button');

  const titleEl = document.getElementById('conclusion-title');
  const textEl = document.getElementById('conclusion-text');

  const conclusionContent = {
    title: "Conclusion",
    text: `
      This summary dashboard gives you a concise look at a participant’s full day of physiological and behavioral data.
      You’ve seen breakdowns of sleep quality, resting heart rate, and activity levels — each represented through intuitive metrics and charts.
      <br><br>
      Use this summary to reflect on the day’s health patterns or compare across participants.
      For deeper insight, revisit the interactive Day View for moment-by-moment analysis.
      <strong>Thanks for exploring!</strong>
    `,
    step: "1"
  };

  if (conclusionButton) {
    conclusionButton.addEventListener('click', () => {
      titleEl.innerHTML = conclusionContent.title;
      textEl.innerHTML = conclusionContent.text;

      conclusionModal.classList.add('visible');
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      conclusionModal.classList.remove('visible');
    });
  }

  if (conclusionModal) {
    conclusionModal.addEventListener('click', (event) => {
      if (event.target === conclusionModal) {
        conclusionModal.classList.remove('visible');
      }
    });
  }
}