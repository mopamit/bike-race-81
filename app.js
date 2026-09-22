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
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');

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

  function evaluateWithOperations(values, operations) {
    let total = values[0];
    for (let i = 1; i < values.length; i++) {
      total = operations[i - 1] === '+' ? total + values[i] : total - values[i];
    }
    return total;
  }

  function buildPlausibleOptions(numbers, operations, correctAnswer) {
    const candidates = [];
    const seen = new Set([correctAnswer]);

    function addCandidate(value) {
      if (!Number.isFinite(value) || seen.has(value)) return;
      seen.add(value);
      candidates.push(value);
    }

    if (numbers.length === 2) {
      // With two directed numbers, the classic student possibilities are built from
      // the sum and difference of the two magnitudes, with either sign.
      // Example: (-11) + (+9) -> -2, +2, +20, -20.
      const a = Math.abs(numbers[0]);
      const b = Math.abs(numbers[1]);
      const magnitudeSum = a + b;
      const magnitudeDifference = Math.abs(a - b);

      [
        magnitudeDifference,
        -magnitudeDifference,
        magnitudeSum,
        -magnitudeSum,
        -correctAnswer,
        numbers[0] + numbers[1],
        numbers[0] - numbers[1],
        numbers[1] - numbers[0]
      ].forEach(addCandidate);
    } else {
      const magnitudes = numbers.map(Math.abs);
      const allMagnitudeSum = magnitudes.reduce((sum, n) => sum + n, 0);

      // Common misconceptions for three terms:
      // 1. Keep the operations but ignore the signs written on the numbers.
      addCandidate(evaluateWithOperations(magnitudes, operations));

      // 2. Ignore subtraction signs between terms and simply add the signed numbers.
      addCandidate(numbers.reduce((sum, n) => sum + n, 0));

      // 3. Treat every number as positive and add all magnitudes.
      addCandidate(allMagnitudeSum);
      addCandidate(-allMagnitudeSum);

      // 4. Reverse only one operation — a very common sign/operation error.
      for (let i = 0; i < operations.length; i++) {
        const flippedOps = [...operations];
        flippedOps[i] = flippedOps[i] === '+' ? '-' : '+';
        addCandidate(evaluateWithOperations(numbers, flippedOps));
      }

      // 5. Correct magnitude, wrong final sign.
      addCandidate(-correctAnswer);
      addCandidate(Math.abs(correctAnswer));
      addCandidate(-Math.abs(correctAnswer));

      // 6. Work only with magnitudes but reverse one operation.
      for (let i = 0; i < operations.length; i++) {
        const flippedOps = [...operations];
        flippedOps[i] = flippedOps[i] === '+' ? '-' : '+';
        addCandidate(evaluateWithOperations(magnitudes, flippedOps));
      }
    }

    // Very rare duplicate-heavy cases (for example equal magnitudes) still need four
    // distinct answers. Keep the fallback structured around sign/magnitude mistakes,
    // rather than arbitrary answers close to the correct result.
    const magnitudeBase = numbers.reduce((sum, n) => sum + Math.abs(n), 0);
    [
      magnitudeBase,
      -magnitudeBase,
      Math.abs(correctAnswer),
      -Math.abs(correctAnswer),
      correctAnswer + magnitudeBase,
      correctAnswer - magnitudeBase
    ].forEach(addCandidate);

    let delta = 1;
    while (candidates.length < 3) {
      addCandidate(correctAnswer + delta);
      addCandidate(correctAnswer - delta);
      delta++;
    }

    return [correctAnswer, ...candidates.slice(0, 3)];
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

    const options = buildPlausibleOptions(numbers, operations, result);

    return {
      expression: `${expression} = ?`,
      correctAnswer: result,
      options: shuffle(options),
      numbers,
      operations
    };
  }

  function getDidacticFeedback(question, isCorrect) {
    const { numbers, operations } = question;

    // Prefer the most conceptually important sign rule that appears in the current exercise.
    let rule = 'general';
    for (let i = 0; i < operations.length; i++) {
      if (operations[i] === '-' && numbers[i + 1] < 0) {
        rule = 'subtractNegative';
        break;
      }
    }

    if (rule === 'general') {
      for (let i = 0; i < operations.length; i++) {
        if (operations[i] === '+' && numbers[i + 1] < 0) {
          rule = 'addNegative';
          break;
        }
      }
    }

    if (rule === 'general') {
      for (let i = 0; i < operations.length; i++) {
        if (operations[i] === '-' && numbers[i + 1] > 0) {
          rule = 'subtractPositive';
          break;
        }
      }
    }

    if (rule === 'general') rule = 'addPositive';

    const messages = {
      subtractNegative: {
        correct: 'מצוין! הבנת שחיסור של מספר שלילי הוא כמו חיבור הנגדי שלו. הילד מתקדם!',
        wrong: 'שימו לב: כשמחסרים מספר שלילי, מוסיפים את הנגדי שלו. המחשב מתקדם.'
      },
      addNegative: {
        correct: 'יפה! הבנת שחיבור של מספר שלילי הוא כמו חיסור הערך החיובי שלו. הילד מתקדם!',
        wrong: 'שימו לב: חיבור של מספר שלילי מקטין את התוצאה — אפשר לחשוב עליו כחיסור. המחשב מתקדם.'
      },
      subtractPositive: {
        correct: 'כל הכבוד! חיסרת נכון מספר חיובי. הילד מתקדם!',
        wrong: 'שימו לב: כשמחסרים מספר חיובי, התוצאה קטנה. המחשב מתקדם.'
      },
      addPositive: {
        correct: 'מעולה! חיברת נכון מספר חיובי. הילד מתקדם!',
        wrong: 'שימו לב: כשמחברים מספר חיובי, התוצאה גדלה. המחשב מתקדם.'
      }
    };

    return messages[rule][isCorrect ? 'correct' : 'wrong'];
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
    nextQuestionBtn.classList.add('hidden');
    nextQuestionBtn.textContent = 'לתרגיל הבא';
    nextQuestionBtn.dataset.action = 'next';
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
      setFeedback(getDidacticFeedback(state.currentQuestion, true), 'success');
    } else {
      state.computerScore += 1;
      clickedButton.classList.add('wrong');
      setFeedback(getDidacticFeedback(state.currentQuestion, false), 'error');
    }

    updateStats();

    const raceFinished = state.playerScore >= RACE_LENGTH || state.computerScore >= RACE_LENGTH;
    nextQuestionBtn.dataset.action = raceFinished ? 'finish' : 'next';
    nextQuestionBtn.textContent = raceFinished ? 'לסיכום המשחק' : 'לתרגיל הבא';
    nextQuestionBtn.classList.remove('hidden');
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

  nextQuestionBtn.addEventListener('click', () => {
    if (nextQuestionBtn.dataset.action === 'finish') {
      finishGame(state.playerScore > state.computerScore ? 'player' : 'computer', false);
      return;
    }

    state.questionIndex += 1;
    updateStats();
    renderQuestion();
  });

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
