export function initializeConclusionModal() {
  const conclusionButton = document.getElementById('conclusion-button');
  const conclusionModal = document.getElementById('conclusion-modal');
  const closeButton = document.getElementById('conclusion-close-button');

  const titleEl = document.getElementById('conclusion-title');
  const textEl = document.getElementById('conclusion-text');

  const conclusionContent = {
    title: "Conclusion",
    text: `
      <em>So, what does healthy really look like?</em> <strong>Even when healthy individuals engage in comparable daily activities</strong>, such as working, exercising, commuting, or resting, <strong>their 
      physiological and behavioral data</strong> (e.g., heart rate, step count, and sleep quality) <strong>often diverge significantly</strong>. This variation 
      is <strong>influenced by a complex interplay of factors</strong>, including baseline fitness, environmental context, and lifestyle habits.
      <br><br>
      For instance, Participant 3 and Participant 7 both completed 30 minutes of medium-difficulty activity, yet one showed a steep rise 
      in heart rate, while the other showed only a modest response. These divergences illustrate that <strong>standardized activity labels</strong> 
      (e.g., "work", "exercise", "sleep") <strong>mask underlying physiological diversity</strong>, making surface-level similarities generalizations that 
      do not capture the full story. 
      <br><br>
      Such insights emphasize the importance of personalized, data-driven approaches in fields like health monitoring, workplace 
      productivity, and behavioral research. By recognizing that similar routines do not equate to similar responses, systems can be 
      better tailored to individual needs and biological rhythms, improving outcomes in both well-being and performance.
      <br><br>
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