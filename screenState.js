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

var deadScreeenTimeBloc1 = null;
var deadScreeenTimeBloc2 = null;
var liveScreenTimeBloc = null;

function setScreenState(newState) {
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

        if (deadScreeenTimeBloc1.totalTime > 3500) {
            didDie("DIED from being a lot of time in the death screen");
        }
    } else if (deadScreeenTimeBloc2 && !deadScreeenTimeBloc2.endTime) {
        //console.log("deathTime2 ended");
        didDie("DIED from being 2 times with the death screen");
    } else if (deadScreeenTimeBloc1 && deadScreeenTimeBloc1.endTime) {
        if (newState != "votingScreen") {
            var liveScreenTime = Date.now() - liveScreenTimeBloc.startTime;
            if (liveScreenTime > 2000) { //since the total time to show the second death screen or the voting screen is around 1500, this should be enough
                didDie("DIED the normal way");
            }
        } else {
            cleanDeadRelatedTimeBlocs();
        }
    }

    if (newState == "votingScreen" && (globalLocationPoint[0] != 289 || globalLocationPoint[1] != 95)) {
        globalLocationPoint = [289, 95];
    }

    if (localGameState != newState)
        sendMessageToAll("screenState", newState);
    localGameState = newState;
}

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