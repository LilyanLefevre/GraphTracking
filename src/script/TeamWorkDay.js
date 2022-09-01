class ComputedRate{
    rate;
    timeTotal;
    timeInState1;

    /**
     * @param {Float} rate 
     * @param {Integer} timeTotal 
     * @param {Integer} timeInState1 
     */
    constructor(rate, timeTotal, timeInState1){
        this.rate = rate;
        this.timeTotal = timeTotal;
        this.timeInState1 = timeInState1;
    }
}

class TeamWorkDay{
    logs;
    schedule;
    #usage;
    
    /**
    * @param {Array<LogEvent>} logs 
    * @param {Schedule} schedule 
    */
    constructor(logs, schedule){
        this.logs = logs;
        this.schedule = schedule;
    }
    
    addLog(log){
        this.logs.push(log);
        this.computeRate()
    }
    
    computeRate(){
        let states = this.logs.map(log => log.state);
        let timestamps = this.logs.map(log => log.timestamp);
        this.#usage = computeUseRate(states, timestamps)
    }

    toString(){
        if(this.schedule === TEAM_NIGHT) return "";
        let nom = "";
        switch (this.schedule.value){
            case TEAM_MORNING_VALUE:
                nom = "matin";
                break;
            case TEAM_AFTERNOON_VALUE:
                nom = "après-midi";
                break;
            case TEAM_NIGHT_VALUE:
                nom = "soir";
                break;
        }
        let date = new Date(parseInt(this.logs[0].timestamp));
        let day = date.getDate();
        let month = date.getMonth();
        let dateStr = DAYS[date.getDay()] + " " + day + " " + MONTHS[month];
        return " - " + dateStr + " " + nom + " : " + Math.round(this.#usage.rate) 
            + "% (" + Math.round(this.#usage.timeInState1) + "/" 
            + Math.round(this.#usage.timeTotal) + "min).";
    }
}

/**
* Compute proportion of time sprent in state 1
* @param {Array<Integer>} states set of states
* @param {Array<Integer>} timestamps set of timestamps
* @returns {ComputedRate}
*/
function computeUseRate(states, timestamps){
    if(states.length <= 0 || timestamps <= 0 || timestamps.length != states.length){
        return 0;
    }
    let firstLogState = states[0];
    let firstLogTimestamp = timestamps[0];
    let totDeltaTimeFirstState = 0;
    let periodLength = timestamps[timestamps.length - 1] - firstLogTimestamp;
    for(let i = 1; i < states.length; i++){
        let currentLogState = states[i];
        let currentLogTimestamp = timestamps[i];
        let previousLogTimestamp = timestamps[i-1];
        if(currentLogState != firstLogState){
            totDeltaTimeFirstState += currentLogTimestamp - previousLogTimestamp;
        }
    }
    let rateInFirstState = (totDeltaTimeFirstState / periodLength) * 100;
    
    if(firstLogState != 1){
        rateInFirstState = 100 - rateInFirstState;
    }
    const timeTot = periodLength * 0.0000166667;
    const timeInState1 = totDeltaTimeFirstState * 0.0000166667;

    if(isNaN(rateInFirstState)) rateInFirstState = 0;
    return new ComputedRate(rateInFirstState, timeTot, timeInState1);
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

