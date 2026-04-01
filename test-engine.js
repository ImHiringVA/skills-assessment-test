// ═══ SHARED TEST ENGINE ═══
// Config is set per-test before loading this script:
// window.TEST_CONFIG = { title, timeMinutes, emailServiceId, emailTemplateId, emailPublicKey }

let timerInterval;
let totalSeconds;
let testStarted = false;
let testSubmitted = false;

function initTest() {
  totalSeconds = window.TEST_CONFIG.timeMinutes * 60;
  updateTimerDisplay();
}

function startTest() {
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('testForm').style.display = 'block';
  document.getElementById('timerBar').style.display = 'flex';
  testStarted = true;
  startTimer();
  window.scrollTo(0, 0);
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    totalSeconds--;
    updateTimerDisplay();
    const bar = document.getElementById('timerBar');
    if (totalSeconds <= 300) bar.className = 'timer-bar danger';
    else if (totalSeconds <= 900) bar.className = 'timer-bar warning';
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      alert('\u23F0 Time is up! Your test will be submitted automatically.');
      submitTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  document.getElementById('timerDisplay').textContent =
    String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function collectFormData() {
  const form = document.getElementById('testForm');
  const formData = new FormData(form);
  const cfg = window.TEST_CONFIG;

  let body = '';
  body += '══════════════════════════════\n';
  body += 'SKILLS TEST SUBMISSION\n';
  body += cfg.title + '\n';
  body += '══════════════════════════════\n\n';

  const timeUsed = (cfg.timeMinutes * 60) - totalSeconds;
  body += 'Time Used: ' + Math.floor(timeUsed / 60) + ' min ' + (timeUsed % 60) + ' sec / ' + cfg.timeMinutes + ' min\n';
  body += 'Submitted: ' + new Date().toLocaleString() + '\n\n';

  // Part 1: About You
  body += '───── PART 1: ABOUT YOU ─────\n\n';

  const radioFields = ['internet', 'backup_internet', 'backup_power', 'work_env', 'other_clients', 'avail_hours', 'years_exp', 'wise'];
  const checkFields = ['device', 'tools'];
  const textAbout = ['full_name', 'email', 'device_specs', 'internet_speed', 'backup_internet_detail',
    'noise_level', 'client_details', 'working_hours', 'time_management', 'letgo_experience',
    'tools_detail', 'weakness', 'why_you', 'rate', 'anything_else'];

  textAbout.forEach(n => {
    const v = formData.get(n);
    if (v && v.trim()) {
      const label = n.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      body += label + ': ' + v.trim() + '\n';
    }
  });

  radioFields.forEach(n => {
    const el = document.querySelector('input[name="' + n + '"]:checked');
    const label = n.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    body += label + ': ' + (el ? el.value : '(not answered)') + '\n';
  });

  checkFields.forEach(n => {
    const els = document.querySelectorAll('input[name="' + n + '"]:checked');
    const vals = Array.from(els).map(e => e.value).join(', ');
    const label = n.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    body += label + ': ' + (vals || '(none selected)') + '\n';
  });

  // Part 2: Skills Assessment
  body += '\n───── PART 2: SKILLS ASSESSMENT ─────\n\n';

  const seen = new Set();
  const allInputs = form.querySelectorAll('input[name^="q"], textarea[name^="q"]');

  allInputs.forEach(el => {
    const n = el.name;
    if (seen.has(n)) return;

    if (el.type === 'radio') {
      const checked = document.querySelector('input[name="' + n + '"]:checked');
      body += n.toUpperCase() + ': ' + (checked ? checked.value : '(not answered)') + '\n';
    } else if (el.tagName === 'TEXTAREA') {
      const v = formData.get(n);
      body += n.toUpperCase() + ':\n' + (v && v.trim() ? v.trim() : '(not answered)') + '\n\n';
    }
    seen.add(n);
  });

  return body;
}

function submitTest() {
  if (testSubmitted) return;

  const name = document.querySelector('input[name="full_name"]').value;
  const email = document.querySelector('input[name="email"]').value;

  if (!name || !email) {
    alert('Please fill in your name and email address before submitting.');
    return;
  }

  if (!confirm('Are you sure you want to submit? You cannot make changes after submitting.')) {
    return;
  }

  testSubmitted = true;
  clearInterval(timerInterval);

  const overlay = document.getElementById('sendingOverlay');
  if (overlay) overlay.style.display = 'flex';

  const body = collectFormData();
  const cfg = window.TEST_CONFIG;

  // Send via EmailJS
  if (window.emailjs && cfg.emailPublicKey) {
    emailjs.send(cfg.emailServiceId, cfg.emailTemplateId, {
      to_email: 'imhiringva@proton.me',
      from_name: name,
      from_email: email,
      test_title: cfg.title,
      message: body
    }).then(function() {
      showSuccess();
    }).catch(function(err) {
      console.error('EmailJS error:', err);
      // Fallback: download file + mailto
      downloadFallback(name, email, body);
    });
  } else {
    // No EmailJS configured, use fallback
    downloadFallback(name, email, body);
  }
}

function downloadFallback(name, email, body) {
  const cfg = window.TEST_CONFIG;
  const safeName = name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  const fileName = 'Skills_Test_' + cfg.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + '_' + safeName + '.txt';

  // Download the file
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Open mailto with short message
  const subject = encodeURIComponent('Skills Test Submission \u2013 ' + cfg.title + ' \u2013 ' + name);
  const mailBody = encodeURIComponent(
    'Hi,\n\nPlease find my skills test submission attached.\n\n' +
    'Name: ' + name + '\nEmail: ' + email + '\nTest: ' + cfg.title +
    '\nFile: ' + fileName + '\n\nThank you.'
  );
  setTimeout(function() {
    window.location.href = 'mailto:imhiringva@proton.me?subject=' + subject + '&body=' + mailBody;
    showSuccess(fileName);
  }, 500);
}

function showSuccess(fileName) {
  const overlay = document.getElementById('sendingOverlay');
  if (overlay) overlay.style.display = 'none';
  document.getElementById('testForm').style.display = 'none';
  document.getElementById('timerBar').style.display = 'none';

  const successEl = document.getElementById('successScreen');
  successEl.style.display = 'block';

  if (fileName) {
    // Fallback mode - they need to attach the file
    const reminder = document.createElement('div');
    reminder.style.cssText = 'background:#fef5e7;border-left:4px solid #e67e22;padding:16px 20px;border-radius:0 10px 10px 0;text-align:left;margin:20px auto;max-width:500px;font-size:0.9rem;';
    reminder.innerHTML = '<strong style="color:#a0522d;">\u26A0\uFE0F One more step:</strong><br><br>' +
      '1. A file called <strong>' + fileName + '</strong> was downloaded.<br>' +
      '2. Your email app opened with a pre-filled message.<br>' +
      '3. <strong>Attach the file</strong> and click <strong>Send</strong>.<br><br>' +
      '<em>If email didn\u2019t open, send the file to: <strong>imhiringva@proton.me</strong></em>';
    successEl.appendChild(reminder);
  }
  // If no fileName, EmailJS sent it automatically - no extra steps needed

  window.scrollTo(0, 0);
}

// Prevent accidental page close
window.addEventListener('beforeunload', function (e) {
  if (testStarted && !testSubmitted) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initTest);
