const memberCounts = { green: 0, blue: 0 };

// ── Add members by clicking the Add button ──
function addMembers(team) {
  const countInput = document.getElementById(`count-${team}`);
  const list = document.getElementById(`list-${team}`);
  let count = parseInt(countInput.value) || 1;
  if (count < 1) count = 1;

  for (let i = 0; i < count; i++) {
    memberCounts[team]++;
    const num = memberCounts[team];
    const li = document.createElement('li');
    li.className = 'member-item';
    li.dataset.id = num;
    li.innerHTML = `
      <div class="avatar">U${num}</div>
      <input class="member-name" type="text" value="User${num}" title="Click to rename">
      <button class="btn-remove" onclick="removeMember(this, '${team}')">Remove</button>
    `;
    list.appendChild(li);
  }
  clearError();
}

// ── Remove a member ──
function removeMember(btn, team) {
  const li = btn.closest('.member-item');
  li.style.transition = 'opacity 0.2s, transform 0.2s';
  li.style.opacity = '0';
  li.style.transform = 'translateX(20px)';
  setTimeout(() => li.remove(), 200);
  clearError();
}

// ── Get team data ──
function getTeamData(team) {
  const name = document.getElementById(`name-${team}`).value.trim();
  const members = [...document.getElementById(`list-${team}`).querySelectorAll('.member-name')]
    .map(inp => inp.value.trim() || inp.placeholder);
  return { name, members };
}

// ── Next button validation ──
function handleNext() {
  const green = getTeamData('green');
  const blue  = getTeamData('blue');
  const errors = [];

  if (green.members.length < 1) errors.push('Green Team needs at least 1 member');
  if (blue.members.length  < 1) errors.push('Blue Team needs at least 1 member');

  if (errors.length > 0) {
    const note = document.getElementById('val-note');
    note.textContent = '⚠ ' + errors.join(' · ');
    note.classList.add('validation-error');
    return;
  }

  document.getElementById('success-overlay').classList.add('show');
}

// ── Clear validation error ──
function clearError() {
  const note = document.getElementById('val-note');
  note.textContent = '*Minimum 1 member per team required';
  note.classList.remove('validation-error');
}

// ── Handle missing banner image ──
(function handleBannerImage() {
  const img = document.getElementById('banner-img');
  const placeholder = document.getElementById('banner-placeholder');
  img.onerror = function () {
    img.style.display = 'none';
    placeholder.style.display = 'flex';
  };
})();

// ── Pre-populate teams on load ──
(function init() {
  addMembersDirectly('green', ['User1', 'User2']);
  addMembersDirectly('blue',  ['User1', 'User2']);
})();

function addMembersDirectly(team, names) {
  const list = document.getElementById(`list-${team}`);
  names.forEach(name => {
    memberCounts[team]++;
    const num = memberCounts[team];
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `
      <div class="avatar">U${num}</div>
      <input class="member-name" type="text" value="${name}" title="Click to rename">
      <button class="btn-remove" onclick="removeMember(this, '${team}')">Remove</button>
    `;
    list.appendChild(li);
  });
}