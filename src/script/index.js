'use strict';
const NB_MS_DAY = 86400000;

let device_id = "";
let moveChart;
let loadChart;
let dayFilter;
let weekFilter;
let timestampDown;
let timestampUp;
let movePeriod;
let loadPeriod;
let deviceIdInput;
let confirmID;
let currentSchedule = TEAM_DEFAULT;
let scheduleSelect;
let computeRate;
let moveRate;
let loadRate;

let logMoves = [];
let logLoads = [];

document.addEventListener("DOMContentLoaded", function (_e) {
    const wHeight = window.screen.height / 3;
    
    moveChart = new Chart('moveChart', moveConfig);
    moveChart.canvas.parentNode.style.height = wHeight + 'px';
    loadChart = new Chart('loadChart', loadConfig);
    loadChart.canvas.parentNode.style.height = wHeight + 'px';
    
    let checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(elt =>{
        elt.addEventListener('change', (e) => {
            enableLine(e);
        });
    });
    deviceIdInput = document.getElementById("deviceID");
    deviceIdInput.addEventListener("keydown", handleKeydown)
    confirmID = document.getElementById("confirmID");
    confirmID.addEventListener("click", (e) => {
        showDeviceLog();
    });
    
    dayFilter = document.getElementById("dayFilter");
    dayFilter.addEventListener("change", () => {
        applyDayFilter(moveChart, logMoves, moveRate);
        applyDayFilter(loadChart, logLoads, loadRate);
    });
    weekFilter = document.getElementById("weekFilter");
    weekFilter.addEventListener("change", applyWeekFilter);
    
    movePeriod = document.getElementById("movePeriod");
    loadPeriod = document.getElementById("loadPeriod");
    
    document.getElementById("resetZoomMove").addEventListener("click", () => {moveChart.resetZoom()});
    document.getElementById("resetZoomLoad").addEventListener("click", () => {loadChart.resetZoom()});
    
    scheduleSelect = document.getElementById("scheduleSelect");
    scheduleSelect.disabled = true;
    scheduleSelect.addEventListener("change", handleScheduleSelect);
    
    moveRate = document.getElementById("moveRate");
    loadRate = document.getElementById("loadRate");
    computeRate = document.getElementById("computeRate");
    computeRate.addEventListener("click", () => {
        computeUseRate(logMoves, moveRate);
        computeUseRate(logLoads, loadRate);
    });
});

/**
* Display move and load logs of current device
*/
function showDeviceLog(){
    device_id = deviceIdInput.value;
    getLogFromAPI('forkmovestate', device_id, (logs) => {
        logMoves = logs;
        fillDataset(moveChart, logMoves, moveRate, 0, timestampDown, timestampUp);
        scheduleSelect.dispatchEvent(new Event('change'));
    });
    getLogFromAPI('forkloadstate', device_id, (logs) => {
        logLoads = logs;
        fillDataset(loadChart, logLoads, loadRate, 0, timestampDown, timestampUp);
        scheduleSelect.dispatchEvent(new Event('change'));
    });
}

function computeUseRate(data, elt){
    // Filter data if a period is selected
    if(timestampDown && timestampUp){
        data = data.filter(log => {
            if(log.timestamp >= timestampDown && log.timestamp <= timestampUp){
                return log;
            }
        });
    }
    
    if(data.length === 0){
        return;
    }
    let teamWorkDays = [];
    let i = 0;

    let currentSchedule = determineSchedule(data[0].timestamp);
    let currentTeamWorkDay = new TeamWorkDay([], currentSchedule);
    currentTeamWorkDay.addLog(data[0]);
    
    while(i < data.length){
        if(!determineSchedule(data[i].timestamp).equals(currentSchedule)){
            teamWorkDays.push(currentTeamWorkDay);
            currentSchedule = determineSchedule(data[i].timestamp);
            currentTeamWorkDay = new TeamWorkDay([], currentSchedule);
        }
        currentTeamWorkDay.addLog(data[i]);
        i++;
    }
    teamWorkDays.push(currentTeamWorkDay);
    elt.innerText = "\n";
    for(let twd of teamWorkDays){
        elt.innerText += twd.toString() + "\n";
    }
}

/**
* Start a query to the log API and execute resolve or reject function
* @param {String} endpoint endpoint of the API (forkmovestate or forkloadstate)
* @param {String} id the id of device 
* @param {*} resolve callback when succeed
* @param {*} reject callback when failed
*/
function fetchAPI(endpoint, id, resolve, reject){
    const url = 'http://b1198101:8000/' + endpoint + '/?device_id=' + id + '&format=json';
    const init = { method: 'GET',
    headers: new Headers(),
    mode: 'cors',
    cache: 'no-store' };
    fetch(url, init)
    .then(function(response) {
        response.json().then((json) => {
            resolve(json);
        })
    })
    .catch(function(error) {
        reject(error);
    });
}

/**
* Get log from API and create a sorted array of LogEvent
* @param {String} endpoint endpoint of the API (forkmovestate or forkloadstate)
* @param {String} id the id of the device
* @param {*} callback callback when succeed
*/
function getLogFromAPI(endpoint, id, callback){
    fetchAPI(endpoint, id, (json) => {
        let data = [];
        for(var key of json){
            let id = key.device_id;
            let state = key.state;
            let timestamp = key.timestamp;
            data.push(new LogEvent(id, state, timestamp));
        }
        
        // Sort data in chronological order
        const sortedData = data.sort((a, b) => {
            return a.timestamp - b.timestamp;
        });
        callback(sortedData);
    }, 
    (error) => {
        console.error(error);
    });
}

/**
* Display data in given chart
* @param {Chart} chart the chart where fill data set
* @param {Array<LogEvent>} data an sorted LogEvent array
* @param {HTMLElement} rateElt the element where display use rate
* @param {Integer} index the index of data set in chart
* @param {Integer} filterDown minimal timestamp to display a LogEvent
* @param {Integer} filterUp maximal timestamp to display a LogEvent
* @param {Object} timeFormat time unit of data set 
* @see https://www.chartjs.org/docs/latest/axes/cartesian/time.html#time-units
*/
function fillDataset(chart, data, rateElt, index, filterDown = null, filterUp = null, timeFormat = {unit: false} ){
    //@TODO faire disparaitre un graphe vide
    
    const y = [];
    const x = [];
    
    for(let log of data){
        let nX = parseInt(log.timestamp);
        let nY = log.state;
        if(filterDown && filterUp){   
            // Filter data to display log in specific interval 
            if(nX >= filterDown && nX <= filterUp){
                if(currentSchedule.isInSchedule(nX)){
                    x.push(nX);
                    y.push(nY);
                }
            }
        }else{
            if(currentSchedule.isInSchedule(nX)){
                x.push(nX);
                y.push(nY);
            }
        }
    }
    chart.options.scales.x.time = timeFormat;
    
    chart.data.labels = x;
    chart.data.datasets[index].data = y;
    chart.options.plugins.title.text = chart.data.datasets[0].label + ' of ' + device_id;
    chart.resetZoom();
    chart.update();
    setPeriodText(movePeriod, moveChart.data.labels[0], moveChart.data.labels[moveChart.data.labels.length - 1]);
    setPeriodText(loadPeriod, loadChart.data.labels[0], loadChart.data.labels[loadChart.data.labels.length - 1]);
    console.log("ok")
    computeUseRate(data, rateElt);
}

/**
* Update given chart with given data by keeping only logs from a certain day
*/
function applyDayFilter(chart, data, rateElt){
    const day = new Date(dayFilter.value);
    timestampDown = day.getTime();
    timestampUp = timestampDown + NB_MS_DAY;
    fillDataset(chart, data, rateElt, 0, timestampDown, timestampUp, {unit: "hour"});
    weekFilter.value = "";
    scheduleSelect.disabled = false;
}


/**
* Update given chart with given data by keeping only logs from a certain week
*/
function applyWeekFilter(){
    dayFilter.value = "";
    scheduleSelect.disabled = true;
    scheduleSelect.value = -1;
    currentSchedule = TEAM_DEFAULT;
    
    const week = weekFilter.value;
    let temp = week.split("-W");
    let mondayWeek = getDateOfISOWeek(temp[1], temp[0]).getTime(); 
    let sundayWeek = mondayWeek + (7 * NB_MS_DAY) - 1;
    
    timestampDown = mondayWeek;
    timestampUp = sundayWeek;
    fillDataset(moveChart, logMoves, moveRate, 0, timestampDown, timestampUp, {unit: "day"});
    fillDataset(loadChart, logLoads, loadRate, 0, timestampDown, timestampUp, {unit: "day"});
}

/**
* Handle click on schedule selector
* @param {ClickEvent} e 
*/
function handleScheduleSelect(e){
    const value = scheduleSelect.value;
    if(value >= 3 || value <= -2){
        value = -1;
    }
    switch(parseInt(value)){
        case TEAM_DEFAULT.value:
        currentSchedule = TEAM_DEFAULT;
        break;
        case TEAM_MORNING.value:
        currentSchedule = TEAM_MORNING;
        break;
        case TEAM_AFTERNOON.value:
        currentSchedule = TEAM_AFTERNOON;
        break;
        case TEAM_NIGHT.value:
        currentSchedule = TEAM_NIGHT;
        break;
    }
    fillDataset(moveChart, logMoves, moveRate, 0, timestampDown, timestampUp, {unit: "hour"});
    fillDataset(loadChart, logLoads, loadRate, 0, timestampDown, timestampUp, {unit: "hour"});
}

/**
* Handle pan on a chart by updating visible period
* @param {Chart} param0 
*/
function displayVisibleValues({chart}){
    const x = chart.scales["x"];
    const minIndex = x.min;
    const maxIndex = x.max;
    switch(chart){
        case moveChart:
        setPeriodText(movePeriod, minIndex, maxIndex);
        break;
        case loadChart:
        setPeriodText(loadPeriod, minIndex, maxIndex);
        break;
    }
}

/**
* Display period of time in french format in given HTML element
* @param {HTLMElement} elt 
* @param {Integer} timestampDown 
* @param {Integer} timestampeUp 
*/
function setPeriodText(elt, timestampDown, timestampeUp){
    let firstX = new Date(timestampDown);
    let lastX = new Date(timestampeUp);
    let strFirstX = firstX.toLocaleDateString("fr") + ", " + firstX.toLocaleTimeString("fr");
    let strLast = lastX.toLocaleDateString("fr") + ", " + lastX.toLocaleTimeString("fr");
    elt.innerText = "From " + strFirstX + ' to ' + strLast;
}

function emptyRates(){
    moveRate.innerText = "";
    loadRate.innerText = "";
}

/***********************************
** Config and other minor things **
***********************************/
function getDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function handleKeydown(e){
    if(e.key == "Enter"){
        showDeviceLog();
        return false;
    }
}

let moveConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Moves',
            backgroundColor: 'rgb(255, 0, 0)',
            borderColor: 'rgb(255, 0, 0)',
            data: [],
            stepped: true,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: "day"
                }
            }
        },
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: ''
            },
            zoom: {
                pan: {
                    enabled: true,
                    modifierKey: '',
                    mode: 'x',
                    onPanComplete: displayVisibleValues
                },
                
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'x',
                }
            }
        }
        
    }
};

let loadConfig = {
    type: 'line',
    data:  {
        labels: [],
        datasets: [{
            label: 'Loads',
            backgroundColor: 'rgb(0, 0, 255)',
            borderColor: 'rgb(0, 0, 255)',
            data: [],
            stepped: true,
        }]
    },
    options: {
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: "day"
                }
            }
        },
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: ''
            },
            zoom: {
                pan: {
                    enabled: true,
                    modifierKey: '',
                    mode: 'x',
                    onPanComplete: displayVisibleValues
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'x',
                }
            }
        }
        
    }
};