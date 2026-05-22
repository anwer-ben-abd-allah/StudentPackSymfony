
// Dynamic interactive exam countdown
let countdownInterval = null;

function parseExamsFromTable() {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows
        .map(row => {
            const dt = row.dataset.datetime;
            if (!dt) return null;
            return {
                date: new Date(dt),
                subject: row.dataset.subject || row.querySelector('td:nth-child(3)')?.innerText.trim(),
                room: row.dataset.room || row.querySelector('td:nth-child(4)')?.innerText.trim(),
                rowElement: row
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.date - b.date);
}

function setActiveRow(exam) {
    document.querySelectorAll('table tbody tr').forEach(r => r.classList.remove('active-exam', 'selected'));
    if (!exam) return;
    exam.rowElement.classList.add('active-exam');
}

function selectRow(exam) {
    document.querySelectorAll('table tbody tr').forEach(r => r.classList.remove('selected'));
    if (!exam) return;
    exam.rowElement.classList.add('selected');
}

function startCountdown(targetDate) {
    if (countdownInterval) clearInterval(countdownInterval);

    function update() {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;

        if (distance <= 0) {
            document.getElementById('days').innerText = '00';
            document.getElementById('hours').innerText = '00';
            document.getElementById('minutes').innerText = '00';
            document.getElementById('seconds').innerText = '00';
            document.querySelector('.urgent-box').classList.add('finished');
            document.getElementById('exam-subject').innerText = 'Examen passé';
            clearInterval(countdownInterval);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = days;
        document.getElementById('hours').innerText = ('0' + hours).slice(-2);
        document.getElementById('minutes').innerText = ('0' + minutes).slice(-2);
        document.getElementById('seconds').innerText = ('0' + seconds).slice(-2);
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

function findNextExam(exams) {
    const now = new Date();
    return exams.find(e => e.date.getTime() > now.getTime()) || null;
}

function initInteractiveCountdown() {
    const exams = parseExamsFromTable();
    if (exams.length === 0) return;

    // highlight next upcoming
    const next = findNextExam(exams);
    if (next) {
        document.getElementById('exam-subject').innerText = next.subject;
        // Keep the top location fixed to Amphi A8 per UI requirement
        document.querySelector('.exam-location').innerHTML = '<span class="glyphicon glyphicon-map-marker"></span> Amphi A8';
        setActiveRow(next);
        startCountdown(next.date);
    } else {
        document.getElementById('exam-subject').innerText = 'Tous les examens sont terminés';
        document.getElementById('days').innerText = '00';
        document.getElementById('hours').innerText = '00';
        document.getElementById('minutes').innerText = '00';
        document.getElementById('seconds').innerText = '00';
    }

    // make rows clickable to select any exam
    exams.forEach(exam => registerExamRow(exam));
}

function registerExamRow(exam) {
    exam.rowElement.style.cursor = 'pointer';
    exam.rowElement.addEventListener('click', () => {
        selectRow(exam);
        document.getElementById('exam-subject').innerText = exam.subject;
        document.querySelector('.exam-location').innerHTML = '<span class="glyphicon glyphicon-map-marker"></span> Amphi A8';
        document.querySelector('.urgent-box').classList.remove('finished');
        startCountdown(exam.date);
    });
}

function formatExamLabel(exam) {
    const dateLabel = exam.date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeLabel = exam.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${exam.subject} — ${dateLabel} à ${timeLabel}`;
}

function searchExamFormHandler() {
    const form = document.getElementById('search-exam-form');
    const resultBox = document.getElementById('search-result');
    if (!form || !resultBox) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const query = document.getElementById('search-exam-input').value.trim().toLowerCase();
        if (!query) {
            resultBox.textContent = 'Veuillez entrer le nom de l examen.';
            resultBox.classList.remove('no-result');
            return;
        }

        const exams = parseExamsFromTable();
        const matches = exams.filter(exam => exam.subject.toLowerCase().includes(query));

        if (matches.length === 0) {
            resultBox.textContent = 'Cet examen n existe pas.';
            resultBox.classList.add('no-result');
            resultBox.classList.remove('found-result');
        } else if (matches.length === 1) {
            resultBox.textContent = formatExamLabel(matches[0]);
            resultBox.classList.remove('no-result');
            resultBox.classList.add('found-result');
            selectRow(matches[0]);
        } else {
            resultBox.innerHTML = `Plusieurs examens trouvés :<br>${matches.map(exam => `• ${formatExamLabel(exam)}`).join('<br>')}`;
            resultBox.classList.remove('no-result');
            resultBox.classList.add('found-result');
            selectRow(matches[0]);
        }
    });
}

function addExamFormHandler() {
    const form = document.getElementById('add-exam-form');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const dateInput = document.getElementById('exam-date');
        const timeInput = document.getElementById('exam-time');
        const subjectInput = document.getElementById('exam-subject-input');
        const roomInput = document.getElementById('exam-room');
        const coeffInput = document.getElementById('exam-coeff');

        const date = dateInput.value;
        const time = timeInput.value;
        const subject = subjectInput.value.trim();
        const room = roomInput.value.trim() || 'Amphi A8';
        const coeff = parseFloat(coeffInput.value) || 1.0;
        if (!date || !time || !subject) return;

        const datetime = `${date}T${time}:00`;
        const examDate = new Date(datetime);
        const formattedDate = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

        const tbody = document.querySelector('table tbody');
        const row = document.createElement('tr');
        row.dataset.datetime = datetime;
        row.dataset.subject = subject;
        row.dataset.room = room;

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${time}</td>
            <td><strong>${subject}</strong></td>
            <td>${room}</td>
            <td class="text-center">${coeff.toFixed(1)}</td>
        `;

        tbody.appendChild(row);
        registerExamRow({ rowElement: row, date: examDate, subject, room });
        form.reset();
        roomInput.value = 'Amphi A8';
    });
}

function removeExamFormHandler() {
    const form = document.getElementById('remove-exam-form');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const subjectInput = document.getElementById('remove-exam-subject');
        const dateInput = document.getElementById('remove-exam-date');
        const subject = subjectInput.value.trim().toLowerCase();
        const date = dateInput.value;

        const rows = document.querySelectorAll('table tbody tr');
        let removed = 0;

        rows.forEach(row => {
            const rowSubject = row.dataset.subject?.toLowerCase();
            const rowDatetime = row.dataset.datetime;
            const rowDate = rowDatetime ? new Date(rowDatetime).toISOString().split('T')[0] : null;

            const subjectMatches = rowSubject && rowSubject.includes(subject);
            const dateMatches = !date || rowDate === date;

            if (subjectMatches && dateMatches) {
                row.remove();
                removed++;
            }
        });

        alert(removed > 0 ? `${removed} examen(s) supprimé(s).` : 'Aucun examen trouvé.');
        form.reset();
    });
}

// Init all handlers and countdown when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initInteractiveCountdown();
    searchExamFormHandler();
    addExamFormHandler();
    removeExamFormHandler();
});
