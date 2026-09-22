(() => {
  'use strict';

  const RACE_LENGTH = 8;
  const MAX_ABS = { 2: 15, 3: 20 };

  const homeScreen = document.getElementById('homeScreen');
  const gameScreen = document.getElementById('gameScreen');
  const homeBtn = document.getElementById('homeBtn');
  const finishBtn = document.getElementById('finishBtn');
  const modeCards = document.querySelectorAll('.mode-card');

  const modeLabel = document.getElementById('modeLabel');
  const questionIndexEl = document.getElementById('questionIndex');
  const accuracyEl = document.getElementById('accuracyValue');
  const playerProgressText = document.getElementById('playerProgressText');
  const computerProgressText = document.getElementById('computerProgressText');
  const playerSteps = document.getElementById('playerSteps');
  const computerSteps = document.getElementById('computerSteps');
  const playerRacer = document.getElementById('playerRacer');
  const computerRacer = document.getElementById('computerRacer');
  const raceTrack = document.getElementById('raceTrack');

  const questionExpressionEl = document.getElementById('questionExpression');
  const feedbackPill = document.getElementById('feedbackPill');
  const answersGrid = document.getElementById('answersGrid');

  const resultDialog = document.getElementById('resultDialog');
  const resultIllustration = document.getElementById('resultIllustration');
  const resultEyebrow = document.getElementById('resultEyebrow');
  const resultTitle = document.getElementById('resultTitle');
  const resultText = document.getElementById('resultText');
  const summaryMode = document.getElementById('summaryMode');
  const summaryQuestions = document.getElementById('summaryQuestions');
  const summaryCorrect = document.getElementById('summaryCorrect');
  const summaryAccuracy = document.getElementById('summaryAccuracy');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const backHomeBtn = document.getElementById('backHomeBtn');

  let state = {
    mode: 2,
    playerScore: 0,
    computerScore: 0,
    questionIndex: 0,
    correctAnswers: 0,
    totalAnswered: 0,
    currentQuestion: null,
    locked: false,
    active: false
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function nonZeroInt(maxAbs) {
    let value = 0;
    while (value === 0) value = randInt(-maxAbs, maxAbs);
    return value;
  }

  function formatSigned(num) {
    return `(${num >= 0 ? '+' : ''}${num})`;
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function calculateQuestion(mode) {
    const maxAbs = MAX_ABS[mode];
    const numbers = Array.from({ length: mode }, () => nonZeroInt(maxAbs));
    const operations = Array.from({ length: mode - 1 }, () => Math.random() < 0.5 ? '+' : '-');

    let result = numbers[0];
    let expression = formatSigned(numbers[0]);

    for (let i = 1; i < numbers.length; i++) {
      const op = operations[i - 1];
      result = op === '+' ? result + numbers[i] : result - numbers[i];
      expression += ` ${op} ${formatSigned(numbers[i])}`;
    }

    const distractors = new Set();
    const allPlus = numbers.reduce((a, b) => a + b, 0);
    const signFlip = -result;

    [allPlus, signFlip, result + randInt(1, 5), result - randInt(1, 5)].forEach(v => {
      if (v !== result) distractors.add(v);
    });

    while (distractors.size < 3) {
      const guess = result + randInt(-9, 9);
      if (guess !== result) distractors.add(guess);
    }

    return {
      expression: `${expression} = ?`,
      correctAnswer: result,
      options: shuffle([result, ...[...distractors].slice(0, 3)])
    };
  }

  function buildSteps(container) {
    container.innerHTML = '';
    for (let i = 0; i < RACE_LENGTH; i++) {
      const step = document.createElement('span');
      step.className = 'step';
      container.appendChild(step);
    }
  }

  function paintSteps(container, score) {
    [...container.children].forEach((step, index) => {
      step.classList.toggle('active', index < score);
    });
  }

  function showScreen(screen) {
    homeScreen.classList.toggle('hidden', screen !== 'home');
    gameScreen.classList.toggle('hidden', screen !== 'game');
    homeBtn.classList.toggle('hidden', screen !== 'game');
    finishBtn.classList.toggle('hidden', screen !== 'game');
  }

  function updateRacerPositions() {
    const trackWidth = raceTrack.clientWidth;
    if (!trackWidth) return;

    // The background already contains the start line on the right and the finish line on the left.
    // Measure each rider's real starting position and move it far enough that on step 8
    // the rider is visibly crossing the finish line, instead of stopping just before it.
    const playerStartLeft = playerRacer.offsetLeft;
    const computerStartLeft = computerRacer.offsetLeft;

    // Slightly beyond the left edge of the finish stripe. This keeps the rider visible
    // while making it unmistakable that the finish line has been crossed.
    const finishTargetLeft = -trackWidth * 0.012;

    const playerTravel = Math.max(0, playerStartLeft - finishTargetLeft);
    const computerTravel = Math.max(0, computerStartLeft - finishTargetLeft);

    const playerRatio = Math.min(1, state.playerScore / RACE_LENGTH);
    const computerRatio = Math.min(1, state.computerScore / RACE_LENGTH);

    playerRacer.style.transform = `translateX(${-playerTravel * playerRatio}px)`;
    computerRacer.style.transform = `translateX(${-computerTravel * computerRatio}px)`;
  }

  function updateStats() {
    modeLabel.textContent = `${state.mode} מספרים`;
    questionIndexEl.textContent = state.questionIndex;

    const accuracy = state.totalAnswered
      ? Math.round((state.correctAnswers / state.totalAnswered) * 100)
      : 0;

    accuracyEl.textContent = `${accuracy}%`;
    playerProgressText.textContent = `${state.playerScore} מתוך ${RACE_LENGTH}`;
    computerProgressText.textContent = `${state.computerScore} מתוך ${RACE_LENGTH}`;

    paintSteps(playerSteps, state.playerScore);
    paintSteps(computerSteps, state.computerScore);
    updateRacerPositions();
  }

  function setFeedback(text, type = '') {
    feedbackPill.textContent = text;
    feedbackPill.className = `feedback-pill ${type}`.trim();
  }

  function renderQuestion() {
    state.currentQuestion = calculateQuestion(state.mode);
    state.locked = false;
    questionExpressionEl.textContent = state.currentQuestion.expression;
    answersGrid.innerHTML = '';
    setFeedback('בהצלחה!');

    state.currentQuestion.options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-btn';
      button.dataset.value = String(option);
      button.innerHTML = `<span dir="ltr">${formatSigned(option)}</span>`;
      button.addEventListener('click', () => handleAnswer(option, button));
      answersGrid.appendChild(button);
    });
  }

  function handleAnswer(answer, clickedButton) {
    if (state.locked) return;
    state.locked = true;
    state.totalAnswered += 1;

    const buttons = [...answersGrid.querySelectorAll('.answer-btn')];
    buttons.forEach(btn => {
      btn.disabled = true;
      if (Number(btn.dataset.value) === state.currentQuestion.correctAnswer) {
        btn.classList.add('correct');
      }
    });

    if (answer === state.currentQuestion.correctAnswer) {
      state.correctAnswers += 1;
      state.playerScore += 1;
      clickedButton.classList.add('correct');
      setFeedback('נכון! הילד מתקדם.', 'success');
    } else {
      state.computerScore += 1;
      clickedButton.classList.add('wrong');
      setFeedback('לא נכון. המחשב מתקדם.', 'error');
    }

    updateStats();

    if (state.playerScore >= RACE_LENGTH || state.computerScore >= RACE_LENGTH) {
      setTimeout(() => {
        finishGame(state.playerScore > state.computerScore ? 'player' : 'computer', false);
      }, 900);
      return;
    }

    state.questionIndex += 1;
    setTimeout(() => {
      updateStats();
      renderQuestion();
    }, 850);
  }

  function startGame(mode) {
    state = {
      mode,
      playerScore: 0,
      computerScore: 0,
      questionIndex: 1,
      correctAnswers: 0,
      totalAnswered: 0,
      currentQuestion: null,
      locked: false,
      active: true
    };

    showScreen('game');
    updateStats();
    renderQuestion();
  }

  function finishGame(winner = 'manual', early = true) {
    state.active = false;

    const accuracy = state.totalAnswered
      ? Math.round((state.correctAnswers / state.totalAnswered) * 100)
      : 0;

    let eyebrow = 'סיכום המשחק';
    let title = 'המשחק הסתיים';
    let text = 'אפשר להתחיל משחק נוסף או לחזור למסך הבית.';
    let illustration = 'assets/images/kid-bike.png';

    if (winner === 'player') {
      eyebrow = 'ניצחון!';
      title = 'הילד הגיע ראשון לקו הסיום';
      text = 'כל הכבוד! פתרתם מספיק תרגילים נכון וניצחתם את המחשב.';
      illustration = 'assets/images/kid-bike.png';
    } else if (winner === 'computer') {
      eyebrow = 'הפעם המחשב ניצח';
      title = 'אפשר לנסות שוב';
      text = 'המחשב הגיע ראשון לקו הסיום. נסו שוב במשחק נוסף.';
      illustration = 'assets/images/robot-bike.png';
    } else if (early) {
      eyebrow = 'המשחק הופסק';
      title = 'סיימתם את המשחק';
      text = 'אפשר להתחיל שוב באותו מצב או לחזור למסך הבית ולבחור מצב אחר.';
      illustration = state.playerScore >= state.computerScore
        ? 'assets/images/kid-bike.png'
        : 'assets/images/robot-bike.png';
    }

    resultEyebrow.textContent = eyebrow;
    resultTitle.textContent = title;
    resultText.textContent = text;
    resultIllustration.innerHTML = `<img src="${illustration}" alt="" />`;
    summaryMode.textContent = `${state.mode} מספרים`;
    summaryQuestions.textContent = state.totalAnswered;
    summaryCorrect.textContent = state.correctAnswers;
    summaryAccuracy.textContent = `${accuracy}%`;

    resultDialog.showModal();
  }

  function goHome() {
    if (resultDialog.open) resultDialog.close();
    showScreen('home');
  }

  buildSteps(playerSteps);
  buildSteps(computerSteps);

  modeCards.forEach(card => {
    card.addEventListener('click', () => startGame(Number(card.dataset.mode)));
  });

  finishBtn.addEventListener('click', () => finishGame('manual', true));
  homeBtn.addEventListener('click', goHome);

  playAgainBtn.addEventListener('click', () => {
    resultDialog.close();
    startGame(state.mode);
  });

  backHomeBtn.addEventListener('click', goHome);
  window.addEventListener('resize', updateRacerPositions);

  showScreen('home');
})();
