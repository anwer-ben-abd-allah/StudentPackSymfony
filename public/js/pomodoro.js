// Get the HTML elements
let timerDisplay = document.querySelector('.timer');
let startBtn = document.getElementById('start');
let pauseBtn = document.getElementById('pause');
let resetBtn = document.getElementById('reset');

// Set initial values
let minutes = 25;
let seconds = 0;
let interval = null;
let running = false;

// Update the timer on screen
function showTime() {
    // Format with two digits
    let minsStr = minutes < 10 ? '0' + minutes : minutes;
    let secsStr = seconds < 10 ? '0' + seconds : seconds;
    timerDisplay.textContent = minsStr + ':' + secsStr;
}

// This function runs every second
function countDown() {
    if (seconds === 0) {
        if (minutes === 0) {
            // Timer finished
            clearInterval(interval); // clearInterval stops interval
            running = false;
            alert('Time is up!');
            return;
        }
        // One minute left → go to previous minute, 59 seconds
        minutes--;
        seconds = 59;
    } else {
        seconds--;
    }
    showTime();
}

// Start button
startBtn.addEventListener('click', function() {
    if (running) return; // already running
    running = true;
    interval = setInterval(countDown, 1000);
});

// Pause button
pauseBtn.addEventListener('click', function() {
    clearInterval(interval);
    running = false;
});

// Reset button
resetBtn.addEventListener('click', function() {
    clearInterval(interval);
    running = false;
    minutes = 25;
    seconds = 0;
    showTime();
});

// Show initial timer
showTime();