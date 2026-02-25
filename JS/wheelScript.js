/*
  Handles the spinning wheel logic for determining which team starts the round.
  On spin, the wheel rotates with a random landing angle. Once stopped, the winner
  is determined by using elementFromPoint() to detect which team's half is physically
  under the needle arrowhead tip — no angle math needed, making it 100% accurate.
  The backToGame() function resets the screen and re-syncs the wheel position.
*/
const SPIN_DURATION = 4000;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

let spinning = false;
let currentRotation = 0;

function spinWheel() {
  if (spinning) return;
  spinning = true;

  const btn   = document.getElementById('spinBtn');
  const wheel = document.getElementById('wheel');
  btn.disabled = true;

  const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
  const landing    = Math.floor(Math.random() * 359);
  const totalRotation = currentRotation + extraSpins + landing;

  wheel.style.transition = `transform ${SPIN_DURATION}ms ${EASE}`;
  wheel.style.transform  = `rotate(${totalRotation}deg)`;
  currentRotation = totalRotation;

  setTimeout(() => {
    const needle = document.querySelector('.needle');
    const needleRect = needle.getBoundingClientRect();

    const tipX = needleRect.left + needleRect.width / 2;
    const tipY = needleRect.top; 

    needle.style.visibility = 'hidden';
    const elementUnderTip = document.elementFromPoint(tipX, tipY);
    needle.style.visibility = 'visible';

    // Walk up the DOM to find the wheel-half (in case we hit a child element)
    let target = elementUnderTip;
    while (target && !target.classList.contains('wheel-half')) {
      target = target.parentElement;
    }

    let winner = 'Unknown';
    if (target) {
      const span = target.querySelector('span');
      if (span) winner = span.textContent.trim();
    }

    document.getElementById('resultText').textContent = `It's ${winner}'s turn!`;
    document.getElementById('spinScreen').classList.remove('active');
    document.getElementById('resultScreen').classList.add('active');

    spinning = false;
  }, SPIN_DURATION + 100);
}

function backToGame() {
  document.getElementById('resultScreen').classList.remove('active');
  document.getElementById('spinScreen').classList.add('active');
  document.getElementById('spinBtn').disabled = false;

  currentRotation = ((currentRotation % 360) + 360) % 360;

  const wheel = document.getElementById('wheel');
  wheel.style.transition = 'none';
  wheel.style.transform  = `rotate(${currentRotation}deg)`;
}