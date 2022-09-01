class Time{
    hour;
    minute;

    /**
     * @param {Integer} hour 
     * @param {Integer} minute 
     */
    constructor(hour, minute){
        this.hour = hour;
        this.minute = minute;
    }

    toString(){
        let hour = this.hour;
        if(hour < 10){
            hour = "0" + hour;
        }
        let minute = this.minute;
        if(minute < 10){
            minute = "0" + minute;
        }
        return hour + ":" + minute;
    }

    equals(o){
        return this.hour === o.hour && this.minute === o.minute;
    }
}

class DateInterval{
    bInf;
    bSup;

    /**
     * @param {Time} bInf 
     * @param {Time} bSup 
     */
    constructor(bInf, bSup){
        this.bInf = bInf;
        this.bSup = bSup;
    }

    equals(o){
        return this.bInf.equals(o.bInf) && this.bSup.equals(o.bSup);
    }
}

class Schedule{
    value;
    period;
    date;

    /**
     * @param {Integer} value 
     * @param {DateInterval} period 
     * @param {Date} date 
     */
    constructor(value, period, date){
        this.value = value;
        this.period = period;
        this.date = date;
    }

    isInSchedule(timestamp){
        if(this === TEAM_DEFAULT){
            return true;
        }
        
        let dateX = new Date(parseInt(timestamp));
        return isInInterval(dateX, this.period);
    }

    copy(){
        return new Schedule(this.value, this.period, this.date);
    }

    equals(o){
        return this.period.equals(o.period);
    };
}

const TEAM_DEFAULT_VALUE = -1;
const TEAM_MORNING_VALUE = 0;
const TEAM_AFTERNOON_VALUE = 1;
const TEAM_NIGHT_VALUE = 2;

const TEAM_DEFAULT = new Schedule(TEAM_DEFAULT_VALUE, new DateInterval(new Time(0, 0), new Time(23, 59)), null); 
const TEAM_MORNING = new Schedule(TEAM_MORNING_VALUE, new DateInterval(new Time(4, 30), new Time(12, 30)), null); 
const TEAM_AFTERNOON = new Schedule(TEAM_AFTERNOON_VALUE, new DateInterval(new Time(12, 30), new Time(20, 30)), null);
const TEAM_NIGHT = new Schedule(TEAM_NIGHT_VALUE, new DateInterval(new Time(20, 30), new Time(4, 30)), null); 

function determineSchedule(timestamp){    
    let date = new Date(parseInt(timestamp));

    if(isInInterval(date, TEAM_MORNING.period)){
        let r = TEAM_MORNING.copy();
        r.date = date;
        return r;
    }
    if(isInInterval(date, TEAM_AFTERNOON.period)){
        let r = TEAM_AFTERNOON.copy();
        r.date = date;
        return r;
    }

    let r = TEAM_NIGHT.copy();
    r.date = date;
    return r; 
}

function isInInterval(date, dateInterval){
    let time = new Time(date.getHours(), date.getMinutes()).toString();
    let timeInf = dateInterval.bInf.toString();
    let timeSup = dateInterval.bSup.toString();
    return time <= timeSup && time >= timeInf;
}