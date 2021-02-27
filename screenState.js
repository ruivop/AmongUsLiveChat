var localGameState = "unkownInitial";

const possibleGameStates = [
    "unkownInitial",
    "inLoby",
    "inGame",
    "inGameUnkown",
    "deadScreen",
    "votingScreen",
];
var isLocalPlayerDead = false;



function setScreenState(newState) {
    setsCheckedScreens(newState);
    detectDeathByKilling(newState);
    if (newState == "votingScreen" && (globalLocationPoint[0] != 289 || globalLocationPoint[1] != 95)) {
        globalLocationPoint = [289, 95];
    }

    if (localGameState != newState)
        sendMessageToAll("screenState", newState);
    localGameState = newState;
}


//////////////////////////////
//////////////////////////////
//sets what screens should be check for in image processing
//////////////////////////////
//////////////////////////////
var lastDeathScreen = null;
var lastVotingScreen = null;
function setsCheckedScreens(newState) {
    let canEndVotingScreenCheckByVotingScreen = false;
    let canEndVotingScreenCheckByDeathScreen = false;
    if (newState == "votingScreen") {
        lastVotingScreen = Date.now();
        shouldCheckForVotingScreen = true;
    } else if (newState == "deathScreen") {
        lastDeathScreen = Date.now();
        shouldCheckForVotingScreen = true;
    } else {
        if (!lastVotingScreen || (lastVotingScreen && lastVotingScreen - Date.now() > 10000)) {//checks for voting screen for 10 seconds after the last voting screen
            canEndVotingScreenCheckByVotingScreen = true;
            lastVotingScreen = null;
        }
        if (!lastDeathScreen || (lastDeathScreen && lastDeathScreen - Date.now() > 3000)) {//checks for voting screen for 3 seconds after the last death screen
            canEndVotingScreenCheckByDeathScreen = true;
            lastDeathScreen = null;
        }

        if (canEndVotingScreenCheckByVotingScreen && canEndVotingScreenCheckByDeathScreen) {
            shouldCheckForVotingScreen = false;
        }
    }
}

//////////////////////////////
//////////////////////////////
//Detect Death
//////////////////////////////
//////////////////////////////
var deadScreeenTimeBloc1 = null;
var deadScreeenTimeBloc2 = null;
var liveScreenTimeBloc = null;
function detectDeathByKilling(newState) {
    if (newState == "deathScreen") {
        //record the begining time of the deth screen
        //record the end time of the deth screen
        //if it has a very long death screen or 2 screen in a short time, this player is dead
        //if it has a short death screen and it is followed by the normal game, then this user is dead
        //if it has a short death screen and it is followed by the voting screen, then this user did not died
        if (!deadScreeenTimeBloc1) {
            //console.log("deathTime1 started");
            deadScreeenTimeBloc1 = {
                startTime: Date.now(),
                endTime: null,
                totalTime: null
            };
        } else if (deadScreeenTimeBloc1.endTime && !deadScreeenTimeBloc2) {
            //console.log("deathTime2 started");
            liveScreenTimeBloc.endTime = Date.now();
            liveScreenTimeBloc.totalTime = liveScreenTimeBloc.endTime - liveScreenTimeBloc.startTime; //shold be around 1400

            deadScreeenTimeBloc2 = {
                startTime: Date.now(),
                endTime: null,
                totalTime: null
            };
        }
    } else if (deadScreeenTimeBloc1 && !deadScreeenTimeBloc1.endTime) {
        //console.log("deathTime1 ended");
        deadScreeenTimeBloc1.endTime = Date.now();
        deadScreeenTimeBloc1.totalTime = deadScreeenTimeBloc1.endTime - deadScreeenTimeBloc1.startTime; //shold be around 2000

        liveScreenTimeBloc = {
            startTime: Date.now(),
            endTime: null,
            totalTime: null
        };

        if (deadScreeenTimeBloc1.totalTime < 500) { //most likely a false positive
            console.log("false positive (" + deadScreeenTimeBloc1.totalTime + ")");
            cleanDeadRelatedTimeBlocs();
        } else if (deadScreeenTimeBloc1.totalTime > 3500) { // the 2 death screens merged
            didDie("DIED from being a lot of time in the death screen (" + deadScreeenTimeBloc1.totalTime + ")");
        }
    } else if (deadScreeenTimeBloc2 && !deadScreeenTimeBloc2.endTime) {
        //console.log("deathTime2 ended");
        deadScreeenTimeBloc2.endTime = Date.now() - deadScreeenTimeBloc2.startTime;
        if (deadScreeenTimeBloc2.endTime < 200) { //most likely a false positive
            console.log("false positive in the second death screen (" + deadScreeenTimeBloc2.endTime + ")");
            //pretend that the second screen never happened
            liveScreenTimeBloc.endTime = null;
            liveScreenTimeBloc.totalTime = null;
            deadScreeenTimeBloc2 = null;
        }
        didDie("DIED from being 2 times with the death screen");
    } else if (deadScreeenTimeBloc1 && deadScreeenTimeBloc1.endTime) {
        if (newState != "votingScreen") {
            var liveScreenTime = Date.now() - liveScreenTimeBloc.startTime;
            if (liveScreenTime > 2000) { //since the total time to show the second death screen or the voting screen is around 1500, this should be enough
                didDie("DIED the normal way (" + deadScreeenTimeBloc1.totalTime + ")");
            }
        } else {
            cleanDeadRelatedTimeBlocs();
        }
    }
}

//////////////////////////////
//////////////////////////////
//Utilities
//////////////////////////////
//////////////////////////////
function didDie(reason) {
    cleanDeadRelatedTimeBlocs();
    console.log(reason);
    sendMessageToAll("didDie", reason);
    isLocalPlayerDead = true;
}

function cleanDeadRelatedTimeBlocs() {
    deadScreeenTimeBloc1 = null;
    deadScreeenTimeBloc2 = null;
    liveScreenTimeBloc = null;
}