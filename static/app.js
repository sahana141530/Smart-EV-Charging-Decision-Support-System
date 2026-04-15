/* ================= NAVIGATION ================= */
function nav(id){
document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
document.getElementById(id).classList.remove('hidden');

if(id === "map"){
setTimeout(initMap, 200);
}
}

/* ================= COST ================= */
function calc(){
fetch('/api/cost',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
cap:cap.value,curr:curr.value,tar:tar.value,rate:rate.value
})
})
.then(r=>r.json())
.then(d=>{
costOut.innerHTML = `
Energy: ${d.energy} kWh <br>
Cost: ₹${d.cost} 💰 <br>
💡 Charge at night to save money
`;

myChart.data.datasets[0].data[0] = d.cost;
myChart.update();

updateSummary();
});
}

/* ================= RANGE ================= */
function range(){
fetch('/api/range',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
battery:b.value,eff:eff.value,dist:dist.value
})
})
.then(r=>r.json())
.then(d=>{
rangeOut.innerHTML =
d.status==="safe"
? "✔ You can reach destination 🚗"
: "⚠ Not enough range — charge required";
});
}

/* ================= IMPACT ================= */
function impact(){
fetch('/api/impact',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({km:km.value})
})
.then(r=>r.json())
.then(d=>{
impactOut.innerHTML = `
💰 Savings: ₹${d.savings}<br>
🌍 CO₂ Reduced: ${d.co2} kg<br>
🌳 Trees Equivalent: ${Math.floor(d.co2/10)}
`;

myChart.data.datasets[0].data[1] = d.savings;
myChart.update();

updateSummary();
});
}

/* ================= DECISION ================= */
function decision(){

let battery = parseFloat(db.value);
let dist = parseFloat(dd.value);

if(!battery || !dist){
alert("Enter values");
return;
}

let range = battery * 2;

let result = "";

if(range >= dist){
result = "✔ Reachable | Charge later at home | Save money 💰";
}
else if(range + 40 >= dist){
result = "⚠ Partial charge needed | Use nearby station";
}
else{
result = "❌ Not reachable | Charge before trip";
}

smartDecision.innerHTML = result;

let health = "";

if(battery > 70){
health = "✔ Good battery usage";
}
else if(battery > 30){
health = "⚠ Moderate usage";
}
else{
health = "❌ Battery misuse risk";
}

batteryHealth.innerHTML = health;

updateSummary();
}

/* ================= HISTORY ================= */
function loadHistory(){
fetch('/api/history')
.then(r=>r.json())
.then(d=>{
hist.innerHTML="";
d.forEach(i=>{
hist.innerHTML += `
<div class="history-item">
<b>${i[0]}</b> → ${i[1]}
</div>
`;
});
});
}

/* ================= COMPARE ================= */
function compare(){

let d = parseFloat(cmpDist.value);
let petrol = parseFloat(petrolPrice.value);
let diesel = parseFloat(dieselPrice.value);

if(!d || !petrol || !diesel){
alert("Enter values");
return;
}

let petrolCost = (d/15)*petrol;
let dieselCost = (d/20)*diesel;
let evCost = (d/6)*8;

let savePetrol = petrolCost - evCost;
let monthly = savePetrol * 30;
let yearly = monthly * 12;

let suggestion = evCost < petrolCost
? "✔ EV is the best economical choice"
: "⚠ Fuel vehicles may be better";

compareOut.innerHTML = `
⛽ Petrol: ₹${petrolCost.toFixed(2)}<br>
🛢 Diesel: ₹${dieselCost.toFixed(2)}<br>
⚡ EV: ₹${evCost.toFixed(2)}<br><br>

💰 Savings: ₹${savePetrol.toFixed(2)}<br>
💸 Monthly: ₹${monthly.toFixed(0)}<br>
🏆 Yearly: ₹${yearly.toFixed(0)}<br><br>

🧠 ${suggestion}
`;

myChart.data.labels = ['EV','Petrol','Diesel'];
myChart.data.datasets[0].data = [evCost, petrolCost, dieselCost];
myChart.update();

updateSummary();
}

/* ================= SUMMARY ================= */
function updateSummary(){
finalSummary.innerHTML = `
🚗 EV Insights<br><br>
💰 Saves money<br>
🌱 Reduces pollution<br>
⚡ Efficient charging<br><br>
🧠 Recommendation: Use EV for long-term benefit
`;
}

/* ================= CHART ================= */
let myChart;

window.onload = ()=>{
const ctx = document.getElementById('chart');

myChart = new Chart(ctx,{
type:'bar',
data:{
labels:['Cost','Savings'],
datasets:[{
label:'EV Analysis',
data:[0,0]
}]
}
});
};

/* ================= MAP MODULE ================= */

let mapObj;
let userMarker;
let routeLine;

const stations = [
{ name:"Belagavi Bus Stand EV Point", lat:15.8497, lng:74.4977, available:true },
{ name:"KLE Hospital Charging Station", lat:15.8600, lng:74.5200, available:true },
{ name:"Gokak Road EV Station", lat:15.8755, lng:74.5080, available:false },
{ name:"Airport Road Charging Hub", lat:15.8622, lng:74.6180, available:true },
{ name:"RPD Circle Charging Point", lat:15.8609, lng:74.5102, available:true }
];

function distanceKm(a,b){
let R=6371;
let dLat=(b.lat-a.lat)*Math.PI/180;
let dLng=(b.lng-a.lng)*Math.PI/180;
let x=Math.sin(dLat/2)**2 +
Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*
Math.sin(dLng/2)**2;
return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function initMap(){
if(mapObj) return;

mapObj = L.map('mapContainer').setView([15.8497, 74.4977], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(mapObj);

stations.forEach(s=>{
L.circleMarker([s.lat,s.lng],{
radius:8,
color:s.available?'green':'red'
})
.addTo(mapObj)
.bindPopup(`<b>${s.name}</b><br>
${s.available?'Available ⚡':'Busy ❌'}
<br><button onclick="routeTo(${s.lat},${s.lng},'${s.name}',${s.available})">Route</button>`);
});

detectLocation();
}

function detectLocation(){

navigator.geolocation.getCurrentPosition(pos=>{

let user={lat:pos.coords.latitude,lng:pos.coords.longitude};

userMarker = L.marker([user.lat,user.lng])
.addTo(mapObj)
.bindPopup("📍 You");

mapObj.setView([user.lat,user.lng],13);

let nearest=null,min=999;

stations.forEach(s=>{
if(!s.available) return;
let d=distanceKm(user,s);
if(d<min){min=d;nearest=s;}
});

if(nearest){

nearestInfo.innerHTML =
`📍 ${nearest.name}<br>${min.toFixed(2)} km`;

drawRoute(user,nearest);
highlightNearest(nearest);
smartMapDecision(user,nearest,min);
}

});
}

function drawRoute(u,s){
if(routeLine) mapObj.removeLayer(routeLine);
routeLine = L.polyline([[u.lat,u.lng],[s.lat,s.lng]])
.addTo(mapObj);
}

function routeTo(lat,lng,name,available){

let user={
lat:userMarker.getLatLng().lat,
lng:userMarker.getLatLng().lng
};

let station={lat,lng,name,available};

let d=distanceKm(user,station);

drawRoute(user,station);

nearestInfo.innerHTML =
`📍 ${name}<br>${d.toFixed(2)} km`;

smartMapDecision(user,station,d);
}

function tripAdvisor(){

let battery = parseFloat(db.value);
let dist = parseFloat(dd.value);

if(!battery || !dist){
alert("Enter values");
return;
}

// assume 1% = 2km
let range = battery * 2;

let nearest = stations.find(s => s.available);

let result = "";

if(range >= dist){
result = `✔ You can reach destination safely 🚗`;
}
else if(nearest){
result = `⚡ Stop at ${nearest.name} to recharge`;
}
else{
result = `❌ No station available. Plan charging before trip`;
}

document.getElementById("finalSummary").innerHTML = `
🧠 Trip Advisor Result:<br><br>
${result}<br>
🔋 Current Battery: ${battery}%<br>
📏 Distance: ${dist} km
`;
}
function smartMapDecision(user,station,d){

let b=parseFloat(mapBattery.value||0);
let range=b*2;

let msg="";

if(!station.available) msg="❌ Station busy";
else if(range>=d) msg="✔ Reachable";
else if(range+40>=d) msg="⚠ Charge needed";
else msg="❌ Cannot reach";

mapDecision.innerHTML=msg;
}

function highlightNearest(n){

mapObj.eachLayer(l=>{
if(l instanceof L.CircleMarker) mapObj.removeLayer(l);
});

stations.forEach(s=>{
let c=s.available?'green':'red';
if(s.name===n.name) c='blue';

L.circleMarker([s.lat,s.lng],{
radius:10,
color:c,
fillColor:c,
fillOpacity:1
}).addTo(mapObj);
});
}