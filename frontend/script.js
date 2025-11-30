const backend = "https://mindescape-b42m.onrender.com";

let currentRoom = 1;
const totalRooms = 10;
let currentCorrect = "A";
let challengeText = "";
let score = 0;
let restartCount = 0;
let startTime = 0;
let roomStartTime = 0;
let responseTimes = [];

// Room cache
const roomCache = {};

// DOM elements
const challengeScreen = document.getElementById("challenge-screen");
const loader = document.getElementById("loader");
const roomContainer = document.getElementById("room");
const message = document.getElementById("message");
const totalTimeEl = document.getElementById("total-time");
const avgRespEl = document.getElementById("avg-response");
const scoreEl = document.getElementById("score");
const restartEl = document.getElementById("restart-count");
const difficultyEl = document.getElementById("difficulty");

// Popup element
const popupEl = document.createElement("div");
popupEl.style.position = "fixed";
popupEl.style.top = "20px";
popupEl.style.left = "50%";
popupEl.style.transform = "translateX(-50%)";
popupEl.style.padding = "12px 20px";
popupEl.style.background = "rgba(0,0,0,0.85)";
popupEl.style.color = "#fff";
popupEl.style.borderRadius = "12px";
popupEl.style.fontSize = "1rem";
popupEl.style.fontWeight = "500";
popupEl.style.zIndex = "50";
popupEl.style.opacity = "0";
popupEl.style.transition = "opacity 0.5s ease";
document.body.appendChild(popupEl);

// tsParticles
tsParticles.load("particles-js", {
  particles: {
    number: { value: 40 },
    color:{ value:"#ffbf38" },
    shape:{ type:"circle" },
    opacity:{ value:0.3 },
    size:{ value:{min:2,max:4} },
    move:{ speed:0.7, outMode:"bounce" }
  },
  interactivity: { events:{ onhover:{ enable:true, mode:"repulse"} } }
});

// Utility: shuffle array
function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// Show loader
function showLoader(show){
  loader.classList.toggle("active", show);
}

// Show popup
function showPopup(msg){ 
  popupEl.innerText = msg; 
  popupEl.style.opacity="1"; 
  setTimeout(()=>popupEl.style.opacity="0",2000); 
}

// Motivation popup
async function showMotivation(type){
  try {
    const url = type==="restart"?`${backend}/motivation/restart`:`${backend}/motivation/correct`;
    const resp = await fetch(url);
    const data = await resp.json();
    if(data.sentence) showPopup(data.sentence);
  } catch(err){ console.error("Motivation fetch error:", err); }
}

// HUD update
function updateHUD(){
  scoreEl.innerText = score;
  restartEl.innerText = restartCount;
  difficultyEl.innerText = getDifficulty();
  const totalTime = Math.floor((Date.now()-startTime)/1000);
  totalTimeEl.innerText = `${totalTime}s`;
  const avgResp = responseTimes.length?Math.floor(responseTimes.reduce((a,b)=>a+b,0)/responseTimes.length):0;
  avgRespEl.innerText = `${avgResp}s`;
}

// Difficulty
function getDifficulty(){
  if(currentRoom>=8) return "Hard";
  if(currentRoom>=5) return "Medium";
  return "Easy";
}

// Start game
document.getElementById("start-btn").addEventListener("click", ()=>{
  const val = document.getElementById("challenge-input").value.trim();
  if(!val){ alert("Enter a challenge!"); return; }
  challengeText = val;
  challengeScreen.classList.remove("active");
  startTime = Date.now();
  currentRoom = 1;
  score = 0;
  restartCount = 0;
  responseTimes = [];
  updateHUD();
  loadRoom();
});

// Load room
async function loadRoom(){
  showLoader(true);
  roomStartTime = Date.now();

  try {
    let room;

    // Use cache if available
    if(roomCache[currentRoom]){
      room = JSON.parse(JSON.stringify(roomCache[currentRoom]));
      room.options = shuffleArray(room.options);
      room.puzzle += " " + ["🤔","😎","🌀","🔥","💡"][Math.floor(Math.random()*5)];
    } else {
      // Fetch from API
      const resp = await fetch(`${backend}/room`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ storyStage:currentRoom, challenge:challengeText, difficulty:getDifficulty() })
      });

      const data = await resp.json();
      if(data.quotaExceeded){
        showPopup(`API quota reached. Wait ${data.waitTime}s`);
        return;
      }

      room = data || { roomDescription:"Fallback room.", puzzle:"Pick one.", options:["A: One","B: Two","C: Three"], correct:"A" };

      // Cache first 20 rooms
      if(currentRoom <= 20) roomCache[currentRoom] = JSON.parse(JSON.stringify(room));
    }

    currentCorrect = (room.correct||"A").toUpperCase();
    document.getElementById("room-num").innerText = currentRoom;
    document.getElementById("progress-fill").style.width = `${(currentRoom/totalRooms)*100}%`;

    roomContainer.style.opacity = 0;
    roomContainer.innerHTML = `
      <p>${room.roomDescription}</p>
      <h3>${room.puzzle}</h3>
      <div class="options">
        ${shuffleArray(room.options).map(o=>`<button class="option" onclick="submitAnswer('${o[0]}',this)">${o}</button>`).join("")}
      </div>
    `;
    let op=0; const fade=setInterval(()=>{op+=0.05; roomContainer.style.opacity=op;if(op>=1) clearInterval(fade);},15);
    message.innerText="";
  } catch(err){ 
    console.error("Room load error:", err); 
    message.innerText="Failed to load room. Please retry."; 
  } finally { showLoader(false); }
}

// Submit answer
async function submitAnswer(playerChoice, btn){
  document.querySelectorAll(".option").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");

  const responseTime = Math.floor((Date.now()-roomStartTime)/1000);
  responseTimes.push(responseTime);
  updateHUD();

  try{
    const resp = await fetch(`${backend}/validate`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ correct:currentCorrect, player:playerChoice })
    });
    const data = await resp.json();
    const result = data?.result ?? "wrong";

    if(result==="correct"){
      message.innerText="✅ Correct!";
      score += 66;

      if([2,4,6,8].includes(currentRoom)) showMotivation("correct");

      currentRoom++;
      updateHUD();
      if(currentRoom>totalRooms) setTimeout(winGame,800);
      else setTimeout(loadRoom,800);

    } else {
      message.innerText="❌ Wrong! Restarting...";
      restartCount++;
      score -= 34;
      score = Math.max(0, score);

      if([5,10,15,20].includes(restartCount)) showMotivation("restart");

      updateHUD();
      setTimeout(restartGame,1200);
    }

  } catch(err){ 
    console.error("Validation error:", err); 
    message.innerText="Validation failed."; 
  }
}

// Restart game
function restartGame(){
  currentRoom = 1;
  responseTimes = [];
  loadRoom();
}

// Win game
function winGame(){
  roomContainer.innerHTML = `
    <h2>🎉 You Escaped!</h2>
    <p>Final Score: ${score}</p>
    <button onclick="restart()">Play Again</button>
  `;
  message.innerText = "";
  document.getElementById("progress-fill").style.width = "100%";
}

// Restart from challenge input
function restart(){
  currentRoom = 1;
  score = 0;
  restartCount = 0;
  responseTimes = [];
  challengeScreen.classList.add("active");
  updateHUD();
}
