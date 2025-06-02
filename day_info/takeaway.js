export function initializeConclusionModal() {
  const conclusionButton = document.getElementById('conclusion-button');
  const conclusionModal = document.getElementById('conclusion-modal');
  const closeButton = document.getElementById('conclusion-close-button');

  const titleEl = document.getElementById('conclusion-title');
  const textEl = document.getElementById('conclusion-text');

  const conclusionContent = {
    title: "Conclusion",
    text: `
      Looking at the several healthy participants within the study, it is clear that being a “healthy” person can mean many different things. 
      There is no single structure or lifestyle that is the sole example of what a healthy life consists of. Some individuals live a 
      healthy lifestyle through high activity levels and consistent movement, while others showed similar outcomes despite more sedentary 
      routines but excellent sleep patterns or stable heart rates. This diversity highlights that health is multifaceted and personal. It 
      is shaped by a combination of habits, genetics, and context rather than a one-size-fits-all model. 
      <br><br>
      Taking the information presented by the participants gives inspiration as to how to live a healthy life. This means being active, 
      taking the time to rest and recover, sleeping, and even relaxing by enjoying entertainment. 
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